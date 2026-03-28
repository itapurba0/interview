import asyncio
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.db import get_db
from app.models import Application, ApplicationStatus, User

router = APIRouter()
logger = logging.getLogger(__name__)


@router.websocket("/stream/{application_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    application_id: int,
    db: AsyncSession = Depends(get_db),
):
    """MVP WebSocket that receives candidate audio and replies with canned AI text."""

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
            data = await websocket.receive_bytes()
            logger.debug("Received %s bytes of audio for application %s", len(data), application_id)

            await asyncio.sleep(1)

            await websocket.send_json(
                {
                    "event": "ai_speaking",
                    "text": "That is a great point about React hooks. Can you tell me more?",
                    "audio_chunk": None,
                }
            )

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