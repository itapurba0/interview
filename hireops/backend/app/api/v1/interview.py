import base64
import json
import logging
import os
import tempfile
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from jose import jwt
from jose.exceptions import JWTError
from livekit import api
from livekit.protocol.agent_dispatch import CreateAgentDispatchRequest
from openai import AsyncOpenAI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.db import get_db
from app.models import Application, ApplicationStatus, User

router = APIRouter()
logger = logging.getLogger(__name__)

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
openrouter_client = (
    AsyncOpenAI(base_url="https://openrouter.ai/api/v1", api_key=OPENROUTER_API_KEY)
    if OPENROUTER_API_KEY
    else None
)
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET")
LIVEKIT_ROOM_PREFIX = os.getenv("LIVEKIT_ROOM_PREFIX", "hireops-voice-")

SYSTEM_PROMPT = (
    "You are a friendly, professional technical recruiter for HireOps. "
    "Keep responses concise (1-2 sentences). Ask the candidate about their React and backend experience."
)


def _extract_audio_bytes(payload: Any) -> Optional[bytes]:
    if not payload:
        return None
    if isinstance(payload, bytes):
        return payload
    if isinstance(payload, str):
        try:
            return base64.b64decode(payload)
        except Exception:
            return payload.encode("utf-8")
    if hasattr(payload, "audio"):
        audio = getattr(payload, "audio")
        if isinstance(audio, bytes):
            return audio
        if isinstance(audio, str):
            try:
                return base64.b64decode(audio)
            except Exception:
                return audio.encode("utf-8")
    if isinstance(payload, dict):
        for key in ("audio", "audio_base64", "speech", "data", "content"):
            candidate = payload.get(key)
            if isinstance(candidate, bytes):
                return candidate
            if isinstance(candidate, str):
                try:
                    return base64.b64decode(candidate)
                except Exception:
                    return candidate.encode("utf-8")
    return None


def _require_openrouter_client() -> AsyncOpenAI:
    if not openrouter_client:
        raise HTTPException(
            status_code=503, detail="OpenRouter credentials are not configured."
        )
    return openrouter_client


def _create_livekit_token(
    api_key: str,
    api_secret: str,
    identity: str,
    room: str,
    name: Optional[str] = None,
    metadata: Optional[str] = None,
    ttl: int = 3600,
) -> str:
    grant = api.VideoGrants(room_join=True, room=room)

    access_token = (
        api.AccessToken(api_key, api_secret)
        .with_identity(identity)
        .with_grants(grant)
        .with_ttl(timedelta(seconds=ttl))
    )

    if name:
        access_token.with_name(name)
    if metadata:
        access_token.with_metadata(metadata)

    token = access_token.to_jwt()
    logger.debug(
        "LiveKit token created for identity %s in room %s using official SDK",
        identity,
        room,
    )
    return token


async def _dispatch_recruiter_agent(room_name: str) -> bool:
    async with api.LiveKitAPI() as lkapi:
        existing_dispatches = await lkapi.agent_dispatch.list_dispatch(room_name=room_name)
        recruiter_dispatches = [
            dispatch for dispatch in existing_dispatches if dispatch.agent_name == "hireops-recruiter"
        ]

        if recruiter_dispatches:
            logger.info("Recruiter agent already dispatched for room: %s", room_name)
            return False

        await lkapi.agent_dispatch.create_dispatch(
            CreateAgentDispatchRequest(
                agent_name="hireops-recruiter",
                room=room_name,
            )
        )
        logger.info("Dispatched 'hireops-recruiter' to room: %s", room_name)
        return True


@router.websocket("/stream/{application_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    application_id: int,
    db: AsyncSession = Depends(get_db),
):
    await websocket.accept()
    application = None
    client = _require_openrouter_client()

    try:
        result = await db.execute(
            select(Application)
            .where(Application.id == application_id)
            .options(joinedload(Application.candidate).joinedload(User.candidate_profile))
        )
        application = result.scalar_one_or_none()

        if not application:
            await websocket.send_json(
                {
                    "event": "error",
                    "message": "Application not found for the requested interview.",
                }
            )
            await websocket.close(code=1000)
            return

        candidate_user = application.candidate
        candidate_profile = getattr(candidate_user, "candidate_profile", None)
        candidate_context = {
            "candidate_id": candidate_user.id,
            "name": candidate_user.full_name,
            "email": candidate_user.email,
            "overall_score": candidate_profile.overall_score if candidate_profile else None,
        }

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "system",
                "content": (
                    f"Candidate context: {candidate_context} | "
                    f"Application status: {application.status.value}"
                ),
            },
        ]

        await websocket.send_json(
            {
                "event": "ai_context",
                "message": "Voice interview context loaded.",
                "candidate": candidate_context,
                "application_status": application.status.value,
            }
        )

        logger.info(
            "Starting AI voice interview stream for application %s and candidate %s",
            application_id,
            candidate_user.id,
        )

        while True:
            audio_bytes = await websocket.receive_bytes()
            logger.debug(
                "Received %s bytes of audio for application %s",
                len(audio_bytes),
                application_id,
            )

            temp_path = None
            try:
                with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp_file:
                    tmp_file.write(audio_bytes)
                    temp_path = tmp_file.name

                with open(temp_path, "rb") as audio_file:
                    transcription = await client.audio.transcriptions.create(
                        model="whisper-1",
                        file=audio_file,
                    )

                user_text = (
                    getattr(transcription, "text", None)
                    or transcription.get("text")
                    or transcription.get("transcript")
                    or ""
                )
                user_text = user_text.strip()

                if not user_text:
                    await websocket.send_json(
                        {
                            "event": "ai_speaking",
                            "text": "I couldn't hear that. Could you repeat?",
                            "audio_b64": "",
                        }
                    )
                    continue

                messages.append({"role": "user", "content": user_text})

                chat_response = await client.chat.completions.create(
                    model="openai/gpt-4o-mini",
                    messages=messages,
                )

                choices = getattr(chat_response, "choices", None) or chat_response.get("choices", [])
                ai_response_text = ""
                if choices:
                    first_choice = choices[0]
                    assistant_msg = (
                        getattr(first_choice, "message", None)
                        or first_choice.get("message")
                    )
                    if assistant_msg:
                        ai_response_text = (
                            getattr(assistant_msg, "content", None)
                            or assistant_msg.get("content", "")
                        ).strip()

                if not ai_response_text:
                    ai_response_text = "Thanks for sharing. Could you clarify that a bit?"

                messages.append({"role": "assistant", "content": ai_response_text})

                speech_response = await client.audio.speech.create(
                    model="tts-1",
                    voice="alloy",
                    input=ai_response_text,
                )

                audio_bytes_out = _extract_audio_bytes(speech_response)

                if not audio_bytes_out:
                    logger.warning("TTS did not return audio bytes for app %s", application_id)
                    audio_bytes_out = ai_response_text.encode("utf-8")

                audio_b64 = base64.b64encode(audio_bytes_out).decode("utf-8")

                await websocket.send_json(
                    {
                        "event": "ai_speaking",
                        "text": ai_response_text,
                        "audio_b64": audio_b64,
                    }
                )
            except Exception as exc:
                logger.exception(
                    "Realtime interview pipeline failed for application %s: %s",
                    application_id,
                    exc,
                )
                await websocket.send_json(
                    {
                        "event": "error",
                        "message": "AI processing failed. Please try again.",
                    }
                )
                await websocket.close(code=1011)
                return
            finally:
                if temp_path and os.path.exists(temp_path):
                    os.remove(temp_path)

    except WebSocketDisconnect:
        if application:
            application.status = ApplicationStatus.COMPLETED
            await db.commit()
            logger.info(
                "Voice interview ended for application %s. Status set to COMPLETED.",
                application_id,
            )

    except Exception:
        logger.exception("Unexpected error during voice interview stream for %s", application_id)
        await websocket.close(code=1011)


@router.get("/token")
async def livekit_token(
    application_id: int,
    db: AsyncSession = Depends(get_db),
):
    if not LIVEKIT_API_KEY or not LIVEKIT_API_SECRET:
        raise HTTPException(status_code=503, detail="LiveKit credentials are not configured.")

    result = await db.execute(
        select(Application)
        .where(Application.id == application_id)
        .options(
            joinedload(Application.job),
            joinedload(Application.candidate).joinedload(User.candidate_profile),
        )
    )
    application = result.scalar_one_or_none()

    if not application:
        raise HTTPException(status_code=404, detail="Application not found.")

    candidate = application.candidate
    candidate_profile = getattr(candidate, "candidate_profile", None)
    job = application.job

    job_title = job.title if job else "Open Role"
    job_description = job.description or ""
    job_skills = job.skills or []

    resume_summary = (candidate_profile.resume_text or "").strip() if candidate_profile else ""
    technical_skills = candidate_profile.technical_skills or [] if candidate_profile else []
    soft_skills = candidate_profile.soft_skills or [] if candidate_profile else []
    education_details = []
    if candidate_profile and isinstance(candidate_profile.education, dict):
        education_details = candidate_profile.education.get("education_list", [])

    context_dict = {
        "candidate_name": candidate.full_name,
        "candidate_email": candidate.email,
        "job_title": job_title,
        "job_skills": job_skills,
        "technical_skills": technical_skills,
        "soft_skills": soft_skills,
        "resume_summary": resume_summary[:600],
        "recent_experience": education_details[:2],
        "job_description": job_description[:600],
    }
    metadata_string = json.dumps(context_dict, ensure_ascii=False)

    room_name = f"{LIVEKIT_ROOM_PREFIX}{application_id}"
    token = _create_livekit_token(
        LIVEKIT_API_KEY,
        LIVEKIT_API_SECRET,
        identity=f"candidate-{candidate.id}",
        name=candidate.full_name,
        metadata=metadata_string,
        room=room_name,
    )

    try:
        decoded_payload = jwt.decode(token, LIVEKIT_API_SECRET, algorithms=["HS256"])
    except JWTError as exc:
        logger.warning(
            "LiveKit token decode failed for application %s: %s",
            application_id,
            exc,
        )
    else:
        expires_at = None
        if "exp" in decoded_payload:
            expires_at = datetime.fromtimestamp(decoded_payload["exp"], timezone.utc).isoformat()
        logger.debug(
            "LiveKit token payload for application %s candidate %s: identity=%s room=%s expires=%s grants=%s",
            application_id,
            candidate.id,
            decoded_payload.get("identity"),
            decoded_payload.get("grants", {}).get("room"),
            expires_at,
            decoded_payload.get("grants"),
        )

    return {
        "token": token,
        "room": room_name,
    }


@router.post("/dispatch")
async def dispatch_livekit_agent(
    application_id: int,
    db: AsyncSession = Depends(get_db),
):
    if not LIVEKIT_API_KEY or not LIVEKIT_API_SECRET:
        raise HTTPException(status_code=503, detail="LiveKit credentials are not configured.")

    result = await db.execute(select(Application.id).where(Application.id == application_id))
    application = result.scalar_one_or_none()

    if not application:
        raise HTTPException(status_code=404, detail="Application not found.")

    room_name = f"{LIVEKIT_ROOM_PREFIX}{application_id}"

    try:
        created = await _dispatch_recruiter_agent(room_name)
    except Exception as exc:
        logger.warning("Agent dispatch failed for room %s: %s", room_name, exc)
        raise HTTPException(status_code=502, detail="Failed to dispatch recruiter agent.") from exc

    return {
        "room": room_name,
        "dispatched": created,
    }
