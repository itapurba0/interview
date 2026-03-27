"""
Jobs & Applications API — HireOps Platform
Transitioned from mock-data to PostgreSQL with Async SQLAlchemy.
"""

from typing import Optional, Annotated
from pydantic import BaseModel, ConfigDict
from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case
from sqlalchemy.orm import joinedload

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
    match_score: Optional[int] = None
    mcq_score: Optional[float] = None
    coding_score: Optional[float] = None
    voice_score: Optional[float] = None
    ai_feedback: Optional[str] = None

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
    result = await db.execute(
        select(Job).where(Job.is_active == True).options(joinedload(Job.company))
    )
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
    # Re-fetch with company eager-loaded so serialization works
    result = await db.execute(
        select(Job).where(Job.id == new_job.id).options(joinedload(Job.company))
    )
    return result.scalar_one()


@router.get("/jobs/hr", response_model=list[HRJobOut])
async def list_jobs_hr(
    company_id: int = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """
    Primary HR Dashboard endpoint.
    Retrieves current jobs with SQL-level aggregations for pipeline summaries.
    """
    # Main query targeting the HR Job Hub grid using outer join instead of subquery
    query = (
        select(
            Job,
            func.count(Application.id).label("applicant_count"),
            func.count(case((Application.status == ApplicationStatus.VOICE_PENDING, 1))).label("interviews_pending")
        )
        .outerjoin(Application, Job.id == Application.job_id)
        .where(Job.company_id == company_id)
        .group_by(Job.id)
    )

    result = await db.execute(query)
    rows = result.all()

    hr_jobs = []
    for row in rows:
        job_obj = row.Job
        hr_jobs.append({
            "id": job_obj.id,
            "title": job_obj.title,
            "description": job_obj.description,
            "skills": job_obj.skills or [],
            "is_active": job_obj.is_active,
            "applicant_count": row.applicant_count,
            "interviews_pending": row.interviews_pending,
            "date_posted": job_obj.created_at.strftime("%Y-%m-%d") if getattr(job_obj, "created_at", None) else "2024-03-27"
        })
        
    return hr_jobs


@router.get("/jobs/{job_id}", response_model=JobOut)
async def get_job_by_id(job_id: int, db: AsyncSession = Depends(get_db)):
    """Fetch specific job details for candidates or HR."""
    result = await db.execute(
        select(Job).where(Job.id == job_id).options(joinedload(Job.company))
    )
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
            "match_score": a.match_score,
            "candidate_name": "Applicant Hub", # Placeholder until User enrichment logic is added
            "candidate_email": "candidate@demo.com",
            "job_title": "Pipeline Context"
        })
        
    return enriched
