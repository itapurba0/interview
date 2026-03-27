"""
Candidates Profile API — HireOps Platform
PUT /candidates/profile — Update candidate profile (resume, links, skills).
GET /candidates/profile — Retrieve current candidate profile.
POST /candidates/me/resume — Upload and parse resume PDF.
"""

from typing import Optional, Annotated
from pydantic import BaseModel
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db import get_db
from app.models import User, Candidate
from app.api.dependencies import get_current_user
from app.services.resume_parser import parse_resume_pdf
from app.schemas.candidate import CandidateOut

router = APIRouter()

# ---------------------------------------------------------------------------
# In-memory profile storage (replaces DB until Alembic migrations are wired)
# ---------------------------------------------------------------------------
_profiles: dict[int, dict] = {}


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------
class CandidateProfileUpdate(BaseModel):
    resume_filename: Optional[str] = None  # mock file upload — just the name
    github_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    skills: list[str] = []


class CandidateProfileOut(BaseModel):
    candidate_id: int
    resume_filename: Optional[str] = None
    github_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    skills: list[str] = []
    profile_complete: bool = False


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@router.get("/candidates/profile", response_model=CandidateProfileOut)
async def get_candidate_profile(candidate_id: int = 1):
    """
    Retrieve the current candidate's profile.
    Defaults to mock candidate_id=1 until real auth is wired.
    """
    profile = _profiles.get(candidate_id, {})
    has_data = bool(profile.get("skills") or profile.get("github_url") or profile.get("resume_filename"))
    return CandidateProfileOut(
        candidate_id=candidate_id,
        resume_filename=profile.get("resume_filename"),
        github_url=profile.get("github_url"),
        linkedin_url=profile.get("linkedin_url"),
        skills=profile.get("skills", []),
        profile_complete=has_data,
    )


@router.put("/candidates/profile", response_model=CandidateProfileOut)
async def update_candidate_profile(payload: CandidateProfileUpdate, candidate_id: int = 1):
    """
    Update the candidate's profile. Merges with existing data.
    """
    existing = _profiles.get(candidate_id, {})

    # Merge — only overwrite non-None fields
    if payload.resume_filename is not None:
        existing["resume_filename"] = payload.resume_filename
    if payload.github_url is not None:
        existing["github_url"] = payload.github_url
    if payload.linkedin_url is not None:
        existing["linkedin_url"] = payload.linkedin_url
    if payload.skills:
        existing["skills"] = payload.skills

    _profiles[candidate_id] = existing

    has_data = bool(existing.get("skills") or existing.get("github_url") or existing.get("resume_filename"))
    return CandidateProfileOut(
        candidate_id=candidate_id,
        resume_filename=existing.get("resume_filename"),
        github_url=existing.get("github_url"),
        linkedin_url=existing.get("linkedin_url"),
        skills=existing.get("skills", []),
        profile_complete=has_data,
    )


@router.post("/candidates/me/resume", response_model=CandidateOut)
async def upload_and_parse_resume(
    file: UploadFile = File(...),
    current_user: Annotated[User, Depends(get_current_user)] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Upload a resume PDF and parse it to extract skills, experience, and education.
    
    Stores the parsed data in the Candidate record for the current user.
    Only accessible to users with role=CANDIDATE.
    """
    if current_user.role.value != "CANDIDATE":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only candidates can upload resumes."
        )
    
    # Read file bytes
    try:
        resume_bytes = await file.read()
        if not resume_bytes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Resume file is empty."
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error reading file: {str(e)}"
        )
    
    # Parse resume
    try:
        parsed_data = parse_resume_pdf(resume_bytes)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Error parsing resume PDF: {str(e)}"
        )
    
    # Find or create Candidate record
    result = await db.execute(select(Candidate).where(Candidate.user_id == current_user.id))
    candidate = result.scalar_one_or_none()
    
    if not candidate:
        candidate = Candidate(user_id=current_user.id)
        db.add(candidate)
    
    # Update with parsed data
    candidate.resume_text = parsed_data.get("resume_text")
    candidate.technical_skills = parsed_data.get("technical_skills")
    candidate.soft_skills = parsed_data.get("soft_skills")
    candidate.experience_years = parsed_data.get("experience_years")
    candidate.education = parsed_data.get("education")
    candidate.overall_score = parsed_data.get("overall_score")
    
    await db.commit()
    await db.refresh(candidate)
    
    return CandidateOut.model_validate(candidate)
