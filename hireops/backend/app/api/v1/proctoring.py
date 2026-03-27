import base64
import cv2
import numpy as np
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
import logging

# Assuming the SQLAlchemy models and session deps are structured here
# from sqlalchemy.ext.asyncio import AsyncSession
# from sqlalchemy import update
# from app.db.session import get_db
# from app.models import AssessmentScore

router = APIRouter(prefix="/api/v1/proctoring", tags=["Computer Vision Proctoring"])
logger = logging.getLogger(__name__)

class SnapshotPayload(BaseModel):
    assessmentId: str
    candidateId: str
    image: str  # Base64 encoded JPEG buffer

# Lightweight initialization of OpenCV's Face Detection DNN or Cascade
# Fallback to a Try/Except block to prevent global server crash if cv2 weights are missing
try:
    # Requires cv2.data to reference standard cascades
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
except Exception as e:
    face_cascade = None
    logger.error(f"Failed to initialize OpenCV Haar Cascade: {e}")

@router.post("/analyze")
async def analyze_snapshot(
    payload: SnapshotPayload,
    # db: AsyncSession = Depends(get_db)
):
    """
    Ingests high-frequency base64 snapshots from the Candidate's WebRTC hook.
    Applies Computer Vision logic to flag missing users or multiple faces.
    """
    if face_cascade is None:
        return {"anomalyDetected": False, "faces": 1, "message": "Proctoring CV model offline/disabled in development."}

    try:
        # Strip the data:image prefix if present, and decode raw bytes
        img_str = payload.image.split(",")[1] if "," in payload.image else payload.image
        img_bytes = base64.b64decode(img_str)
        
        # Convert to numpy array and decode to OpenCV BGR format
        nparr = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if frame is None:
             raise ValueError("CV Engine failed to decode base64 buffer")

        # Grayscale transition is standard for performant Haar Cascade evaluation
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
        # Detect faces
        faces = face_cascade.detectMultiScale(
            gray, 
            scaleFactor=1.1, 
            minNeighbors=5, 
            minSize=(30, 30)
        )
        
        face_count = len(faces)
        
        # Core Anomaly Logic: Is the user gone? Is a proxy friend helping?
        anomaly_detected = face_count == 0 or face_count > 1
        
        if anomaly_detected:
            # === Mock Async DB Update ===
            """
            stmt = update(AssessmentScore).where(
                AssessmentScore.assessment_id == payload.assessmentId,
                AssessmentScore.candidate_id == payload.candidateId
            ).values(proctoring_flags=AssessmentScore.proctoring_flags + 1)
            
            await db.execute(stmt)
            await db.commit()
            """
            logger.warning(f"Proctoring Anomaly for Candidate {payload.candidateId}: Faces detected -> {face_count}")

        return {
            "anomalyDetected": anomaly_detected,
            "faceCount": face_count,
            "message": "Anomaly Found" if anomaly_detected else "Safe"
        }

    except Exception as e:
         logger.error(f"Proctoring Pipeline Error: {e}")
         # Fail OPEN so we don't block the candidate unfairly if the vision pipeline crashes
         return {"anomalyDetected": False, "error": str(e)}
