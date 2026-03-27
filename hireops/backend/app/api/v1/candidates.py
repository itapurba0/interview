"""
Candidates Profile API — HireOps Platform
GET /api/v1/candidates/me — Retrieve current candidate profile.
POST /api/v1/candidates/me/resume — Upload and parse resume PDF.
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
# Pydantic schemas
# ---------------------------------------------------------------------------
class CandidateProfileResponse(BaseModel):
    """
    Response schema for candidate profile with user and candidate data.
    Includes resume parsing results and user contact information.
    """
    id: int
    email: str
    full_name: str
    technical_skills: Optional[list[str]] = None
    soft_skills: Optional[list[str]] = None
    experience_years: Optional[float] = None
    education: Optional[dict] = None
    overall_score: Optional[int] = None
    resume_text: Optional[str] = None
    
    class Config:
        from_attributes = True


class CandidateProfileUpdate(BaseModel):
    """
    Schema for updating candidate profile with manual data (skills, URLs).
    """
    technical_skills: Optional[list[str]] = None
    soft_skills: Optional[list[str]] = None


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
@router.get("/candidates/me", response_model=CandidateProfileResponse)
async def get_candidate_profile(
    current_user: Annotated[User, Depends(get_current_user)] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieve the current candidate's profile with resume parsing results.
    
    Returns:
        CandidateProfileResponse with user and candidate data.
        Returns 404 if no candidate record exists yet (user can start fresh).
    
    Only accessible to users with role=CANDIDATE.
    """
    if current_user.role.value != "CANDIDATE":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only candidates can access their profile."
        )
    
    # Query candidate record
    result = await db.execute(select(Candidate).where(Candidate.user_id == current_user.id))
    candidate = result.scalar_one_or_none()
    
    # If no candidate record exists yet, return user info with empty fields
    if not candidate:
        return CandidateProfileResponse(
            id=current_user.id,
            email=current_user.email,
            full_name=current_user.full_name,
            technical_skills=None,
            soft_skills=None,
            experience_years=None,
            education=None,
            overall_score=None,
            resume_text=None
        )
    
    # Return combined user + candidate data
    return CandidateProfileResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        technical_skills=candidate.technical_skills,
        soft_skills=candidate.soft_skills,
        experience_years=candidate.experience_years,
        education=candidate.education,
        overall_score=candidate.overall_score,
        resume_text=candidate.resume_text
    )


@router.post("/candidates/me/resume")
async def upload_and_parse_resume(
    file: UploadFile = File(...),
    current_user: Annotated[User, Depends(get_current_user)] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Upload a resume PDF and parse it to extract skills, experience, education, and contact info.
    
    This is an UPSERT operation:
    - If a candidate record exists for the user, it updates the fields
    - If no record exists, it creates a new one
    
    Returns the parsed data immediately for frontend auto-population.
    Also stores the parsed data in the Candidate record for the current user.
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
    
    # Find or create Candidate record (UPSERT)
    result = await db.execute(select(Candidate).where(Candidate.user_id == current_user.id))
    candidate = result.scalar_one_or_none()
    
    if not candidate:
        # Create new candidate record
        candidate = Candidate(user_id=current_user.id)
        db.add(candidate)
    
    # Update with parsed data (both for new and existing records)
    candidate.resume_text = parsed_data.get("resume_text")
    candidate.technical_skills = parsed_data.get("technical_skills")
    candidate.soft_skills = parsed_data.get("soft_skills")
    candidate.experience_years = parsed_data.get("experience_years")
    candidate.education = parsed_data.get("education")
    candidate.overall_score = parsed_data.get("overall_score")
    
    await db.commit()
    
    # Return parsed data directly for frontend auto-population
    return parsed_data


@router.put("/candidates/me", response_model=CandidateProfileResponse)
async def update_candidate_profile(
    payload: CandidateProfileUpdate,
    current_user: Annotated[User, Depends(get_current_user)] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Update candidate profile with manually entered or edited data.
    
    This endpoint allows updating skills and other data without uploading a resume.
    Used by the "Save Profile" button on the profile setup page.
    
    Only accessible to users with role=CANDIDATE.
    """
    if current_user.role.value != "CANDIDATE":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only candidates can update their profile."
        )
    
    # Find or create Candidate record
    result = await db.execute(select(Candidate).where(Candidate.user_id == current_user.id))
    candidate = result.scalar_one_or_none()
    
    if not candidate:
        # Create new candidate record if it doesn't exist
        candidate = Candidate(user_id=current_user.id)
        db.add(candidate)
    
    # Update with provided data (only non-None fields)
    if payload.technical_skills is not None:
        candidate.technical_skills = payload.technical_skills
    if payload.soft_skills is not None:
        candidate.soft_skills = payload.soft_skills
    
    await db.commit()
    
    # Return updated profile
    return CandidateProfileResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        technical_skills=candidate.technical_skills,
        soft_skills=candidate.soft_skills,
        experience_years=candidate.experience_years,
        education=candidate.education,
        overall_score=candidate.overall_score,
        resume_text=candidate.resume_text
    )
