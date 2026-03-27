"""
Jobs & Applications API — HireOps Platform
Transitioned from mock-data to PostgreSQL with Async SQLAlchemy.
"""

from typing import Optional, Annotated
from pydantic import BaseModel, ConfigDict
from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db import get_db
from app.models import Job, Application, ApplicationStatus
from app.api.dependencies import get_current_tenant

router = APIRouter()

# ---------------------------------------------------------------------------
# Pydantic Schemas (Using from_attributes=True for SQLAlchemy hydration)
# ---------------------------------------------------------------------------

class JobOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    title: str
    description: str
    skills: Optional[list[str]] = None
    is_active: bool
    company_id: int

class JobCreateRequest(BaseModel):
    title: str
    description: str
    skills: Optional[list[str]] = None

class ApplicationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    job_id: int
    candidate_id: int
    status: str
    ai_match_score: Optional[int]

class HRJobOut(BaseModel):
    """
    Combined schema for the Job Grid UI.
    Includes database-level aggregations for applicant counts.
    """
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    title: str
    description: str
    skills: Optional[list[str]] = None
    is_active: bool
    applicant_count: int
    interviews_pending: int
    date_posted: str # Mapped from created_at in the route

# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/jobs", response_model=list[JobOut])
async def list_jobs(db: AsyncSession = Depends(get_db)):
    """Public listing of all active jobs across the platform."""
    result = await db.execute(select(Job).where(Job.is_active == True))
    return result.scalars().all()


@router.post("/jobs", response_model=JobOut)
async def create_job(
    payload: JobCreateRequest,
    company_id: int = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """Authenticated HR endpoint to post a new job within their tenant."""
    new_job = Job(
        title=payload.title,
        description=payload.description,
        skills=payload.skills,
        company_id=company_id,
        is_active=True
    )
    db.add(new_job)
    await db.commit()
    await db.refresh(new_job)
    return new_job


@router.get("/jobs/hr", response_model=list[HRJobOut])
async def list_jobs_hr(
    company_id: int = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """
    Primary HR Dashboard endpoint.
    Retrieves current jobs with SQL-level aggregations for pipeline summaries.
    """
    # Subquery for counting pending interviews (VOICE_PENDING)
    pending_sub = (
        select(func.count(Application.id))
        .where(Application.job_id == Job.id)
        .where(Application.status == ApplicationStatus.VOICE_PENDING)
        .scalar_subquery()
    )

    # Main query targeting the HR Job Hub grid
    query = (
        select(
            Job,
            func.count(Application.id).label("applicant_count"),
            pending_sub.label("interviews_pending")
        )
        .outerjoin(Application, Job.id == Application.job_id)
        .where(Job.company_id == company_id)
        .group_by(Job.id)
    )

    result = await db.execute(query)
    rows = result.all()

    hr_jobs = []
    for job_obj, app_count, int_count in rows:
        hr_jobs.append({
            "id": job_obj.id,
            "title": job_obj.title,
            "description": job_obj.description,
            "skills": job_obj.skills or [],
            "is_active": job_obj.is_active,
            "applicant_count": app_count,
            "interviews_pending": int_count,
            "date_posted": job_obj.created_at.strftime("%Y-%m-%d") if job_obj.created_at else "2024-03-27"
        })
        
    return hr_jobs


@router.get("/jobs/{job_id}", response_model=JobOut)
async def get_job_by_id(job_id: int, db: AsyncSession = Depends(get_db)):
    """Fetch specific job details for candidates or HR."""
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job Listing not found")
    return job


@router.get("/applications/hr")
async def list_job_applications(
    job_id: Optional[int] = None,
    company_id: int = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
) -> list:
    """
    Retrieve applications for a specific job pipeline.
    Validates that the job belongs to the HR's tenant company.
    """
    # Ensure role isolation
    query = select(Application).join(Job).where(Job.company_id == company_id)
    
    if job_id:
        query = query.where(Application.job_id == job_id)
        
    result = await db.execute(query)
    apps = result.scalars().all()
    
    # Enriching for the Kanban Board UI (Mock identifiers for now as they are global)
    enriched = []
    for a in apps:
        enriched.append({
            "id": a.id,
            "job_id": a.job_id,
            "candidate_id": a.candidate_id,
            "status": a.status,
            "ai_match_score": a.ai_match_score,
            "candidate_name": "Applicant Hub", # Placeholder until User enrichment logic is added
            "candidate_email": "candidate@demo.com",
            "job_title": "Pipeline Context"
        })
        
    return enriched
