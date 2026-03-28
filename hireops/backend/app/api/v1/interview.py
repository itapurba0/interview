import base64
import logging
import os
import tempfile
from typing import Any, Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from openai import OpenAI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.db import get_db
from app.models import Application, ApplicationStatus, User

router = APIRouter()
logger = logging.getLogger(__name__)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
openai_client = OpenAI(api_key=OPENAI_API_KEY)

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


@router.websocket("/stream/{application_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    application_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Voice interview WebSocket that streams audio through Whisper/Chat+TTS."""

    await websocket.accept()
    application = None

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
                    transcription = openai_client.audio.transcriptions.create(
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

                chat_response = openai_client.chat.completions.create(
                    model="gpt-4o",
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

                speech_response = openai_client.audio.speech.create(
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