"""
Job Applications API — HireOps Platform
POST /api/v1/applications — Submit a job application with 75% match threshold enforcement.
GET /api/v1/applications — Retrieve applications for current user.
"""

from typing import Annotated, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import joinedload
from datetime import datetime

from app.db import get_db
from app.models import User, Candidate, Job, Application, ApplicationStatus
from app.api.dependencies import get_current_user
from app.services.job_matcher import calculate_job_match

router = APIRouter()


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------
class ApplicationCreate(BaseModel):
    """Schema for submitting a job application."""
    job_id: int


class JobBasic(BaseModel):
    """Schema for basic job information in application responses."""
    id: int
    title: str
    company: str
    description: Optional[str] = None
    
    class Config:
        from_attributes = True


class ApplicationOut(BaseModel):
    """Schema for returning application data."""
    id: int
    candidate_id: int
    job_id: int
    status: str
    ai_match_score: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ApplicationWithJobOut(BaseModel):
    """Schema for returning application data with related job details."""
    id: int
    candidate_id: int
    job_id: int
    status: str
    ai_match_score: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    job: JobBasic
    
    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@router.post("/applications", response_model=ApplicationOut, status_code=status.HTTP_201_CREATED)
async def create_application(
    payload: ApplicationCreate,
    current_user: Annotated[User, Depends(get_current_user)] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Submit a job application with 75% match threshold enforcement.
    
    Flow:
    1. Verify user is a CANDIDATE
    2. Load the Candidate profile (must have uploaded resume)
    3. Load the Job posting
    4. Calculate match score
    5. If score < 75%, reject with 403
    6. Otherwise, create Application record
    """
    if current_user.role.value != "CANDIDATE":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only candidates can apply for jobs."
        )
    
    # Load Candidate profile
    candidate_result = await db.execute(
        select(Candidate).where(Candidate.user_id == current_user.id)
    )
    candidate = candidate_result.scalar_one_or_none()
    
    if not candidate or not candidate.technical_skills:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please upload a resume first before applying."
        )
    
    # Load Job
    job_result = await db.execute(select(Job).where(Job.id == payload.job_id))
    job = job_result.scalar_one_or_none()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found."
        )
    
    # Check for duplicate application (strict enforcement)
    existing_app = await db.execute(
        select(Application).where(
            Application.candidate_id == current_user.id,
            Application.job_id == payload.job_id
        )
    )
    
    if existing_app.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already applied for this role."
        )
    
    # Calculate match score and get AI reasoning
    candidate_dict = {
        "technical_skills": candidate.technical_skills or [],
        "soft_skills": candidate.soft_skills or [],
        "experience_years": candidate.experience_years,
        "name": candidate.user.full_name if candidate.user else "Candidate",
        "education": candidate.education or "Not provided"
    }
    
    match_result = await calculate_job_match(candidate_dict, job.description)
    score = match_result["score"]
    reasoning = match_result["reasoning"]
    
    # Enforce 75% threshold (The Bouncer)
    if score < 75:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Match score: {score}%. Minimum required is 75%. AI Feedback: {reasoning}"
        )
    
    # Create Application record
    application = Application(
        candidate_id=current_user.id,
        job_id=job.id,
        status=ApplicationStatus.APPLIED,
        ai_match_score=score
    )
    
    db.add(application)
    await db.commit()
    await db.refresh(application)
    
    return ApplicationOut.model_validate(application)


@router.get("/applications/me", response_model=list[ApplicationWithJobOut])
async def get_my_applications(
    current_user: Annotated[User, Depends(get_current_user)] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieve all applications for the logged-in candidate with related job details.
    
    Returns:
    - List of applications with full job information (title, company, description)
    - Sorted by created_at descending (newest first)
    
    Raises:
    - 403: If user is not a candidate
    - 404: If candidate profile not found
    """
    # Verify user is a CANDIDATE
    if current_user.role.value != "CANDIDATE":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only candidates can view their applications."
        )
    
    # Load Candidate profile
    candidate_result = await db.execute(
        select(Candidate).where(Candidate.user_id == current_user.id)
    )
    candidate = candidate_result.scalar_one_or_none()
    
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate profile not found. Please complete your profile."
        )
    
    # Query applications with eager-loaded job details
    result = await db.execute(
        select(Application)
        .where(Application.candidate_id == current_user.id)
        .options(joinedload(Application.job))
        .order_by(Application.created_at.desc())
    )
    
    applications = result.scalars().all()
    
    return [ApplicationWithJobOut.model_validate(app) for app in applications]


@router.get("/applications")
async def get_user_applications(
    current_user: Annotated[User, Depends(get_current_user)] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieve all applications for the current user (candidate or hr/manager).
    
    Candidates see applications they submitted.
    HR/Managers see applications for jobs in their company.
    """
    if current_user.role.value == "CANDIDATE":
        # Candidates see their own applications
        result = await db.execute(
            select(Application).where(Application.candidate_id == current_user.id)
        )
    else:
        # HR/Managers see applications for their company's jobs
        result = await db.execute(
            select(Application).join(Job).where(Job.company_id == current_user.company_id)
        )
    
    applications = result.scalars().all()
    
    return [ApplicationOut.model_validate(app) for app in applications]
