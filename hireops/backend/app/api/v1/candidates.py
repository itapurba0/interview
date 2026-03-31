"""
Candidates Profile API — HireOps Platform
GET /api/v1/candidates/me — Retrieve current candidate profile.
GET /api/v1/candidates/{candidate_id} — Retrieve any candidate profile by user ID (for HR/Managers).
POST /api/v1/candidates/me/resume — Upload and parse resume PDF with comprehensive LLM extraction.
PUT /api/v1/candidates/me — Update current candidate profile with manual data.
"""

from typing import Optional, Annotated
import json
import logging
from pydantic import BaseModel, ConfigDict
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db import get_db
from app.models import User, Candidate
from app.api.dependencies import get_current_user
from app.services.resume_parser import parse_resume_pdf, extract_comprehensive_resume_data
from app.schemas.candidate import CandidateOut

logger = logging.getLogger(__name__)
router = APIRouter()


# ---------------------------------------------------------------------------
# Comprehensive Resume Extraction Schemas (Nested)
# ---------------------------------------------------------------------------
class ExperienceItem(BaseModel):
    """Schema for a single work experience entry."""
    job_title: Optional[str] = None
    company: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    responsibilities: list[str] = []
    
    model_config = ConfigDict(from_attributes=True)


class EducationItem(BaseModel):
    """Schema for a single education entry."""
    degree: Optional[str] = None
    institution: Optional[str] = None
    graduation_year: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


class ProjectItem(BaseModel):
    """Schema for a single project entry."""
    name: Optional[str] = None
    description: Optional[str] = None
    tech_stack: list[str] = []
    
    model_config = ConfigDict(from_attributes=True)


class ComprehensiveResumeExtraction(BaseModel):
    """
    Comprehensive nested schema for complete candidate profile extraction.
    Contains all contact info, experience, education, projects, and skills.
    """
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    github_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    technical_skills: list[str] = []
    soft_skills: list[str] = []
    total_years_experience: Optional[int] = None
    professional_summary: Optional[str] = None
    experience: list[ExperienceItem] = []
    education: list[EducationItem] = []
    projects: list[ProjectItem] = []
    
    model_config = ConfigDict(from_attributes=True)


class ResumeUploadResponse(BaseModel):
    """
    Frontend-compatible response for resume upload endpoint.
    Maps internal field names to frontend expectations.
    """
    resume_text: str = ""
    name: Optional[str] = None  # Mapped from full_name
    email: Optional[str] = None
    phone: Optional[str] = None
    github_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    technical_skills: list[str] = []
    soft_skills: list[str] = []
    experience_years: Optional[int] = None  # Mapped from total_years_experience
    professional_summary: Optional[str] = None
    experience: list[ExperienceItem] = []
    education: list[EducationItem] = []
    projects: list[ProjectItem] = []
    overall_score: int = 0
    
    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------
class CandidateProfileResponse(BaseModel):
    """
    Response schema for candidate profile with user and candidate data.
    Includes resume parsing results, social links, and user contact information.
    """
    id: int
    email: str
    full_name: str
    phone: Optional[str] = None
    professional_summary: Optional[str] = None
    technical_skills: Optional[list[str]] = None
    soft_skills: Optional[list[str]] = None
    experience_years: Optional[float] = None
    education: Optional[dict] = None
    experience: Optional[dict] = None
    projects: Optional[dict] = None
    overall_score: Optional[int] = None
    resume_text: Optional[str] = None
    github: Optional[str] = None
    linkedin: Optional[str] = None
    
    class Config:
        from_attributes = True


class CandidateProfileUpdate(BaseModel):
    """
    Schema for updating candidate profile with manual data (skills, URLs, contact info).
    """
    email: Optional[str] = None
    phone: Optional[str] = None
    professional_summary: Optional[str] = None
    technical_skills: Optional[list[str]] = None
    soft_skills: Optional[list[str]] = None
    years_of_experience: Optional[float] = None
    experience: Optional[list] = None
    education: Optional[list] = None
    projects: Optional[list] = None


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
            phone=None,
            professional_summary=None,
            technical_skills=None,
            soft_skills=None,
            experience_years=None,
            education=None,
            experience=None,
            projects=None,
            overall_score=None,
            resume_text=None,
            github=None,
            linkedin=None
        )
    
    # Return combined user + candidate data
    return CandidateProfileResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        phone=candidate.phone if hasattr(candidate, 'phone') else None,
        professional_summary=candidate.professional_summary if hasattr(candidate, 'professional_summary') else None,
        technical_skills=candidate.technical_skills,
        soft_skills=candidate.soft_skills,
        experience_years=candidate.experience_years,
        education=candidate.education,
        experience=candidate.experience,
        projects=candidate.projects,
        overall_score=candidate.overall_score,
        resume_text=candidate.resume_text,
        github=candidate.github,
        linkedin=candidate.linkedin
    )


@router.get("/candidates/{candidate_id}", response_model=CandidateProfileResponse)
async def get_candidate_by_id(
    candidate_id: int,
    current_user: Annotated[User, Depends(get_current_user)] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieve a candidate's profile by their user ID.
    
    Accessible to HR and Manager users who need to view candidate details.
    Returns 404 if candidate not found.
    
    Args:
        candidate_id: The user_id of the candidate to retrieve.
    """
    # Query candidate record by user_id
    result = await db.execute(select(Candidate).where(Candidate.user_id == candidate_id))
    candidate = result.scalar_one_or_none()
    
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate not found"
        )
    
    # Get user info for the candidate
    user_result = await db.execute(select(User).where(User.id == candidate_id))
    user = user_result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate user not found"
        )
    
    # Return combined user + candidate data
    return CandidateProfileResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        phone=candidate.phone if hasattr(candidate, 'phone') else None,
        professional_summary=candidate.professional_summary if hasattr(candidate, 'professional_summary') else None,
        technical_skills=candidate.technical_skills,
        soft_skills=candidate.soft_skills,
        experience_years=candidate.experience_years,
        education=candidate.education,
        experience=candidate.experience,
        projects=candidate.projects,
        overall_score=candidate.overall_score,
        resume_text=candidate.resume_text,
        github=candidate.github,
        linkedin=candidate.linkedin
    )


@router.post("/candidates/me/resume", response_model=ResumeUploadResponse)
async def upload_and_parse_resume(
    file: UploadFile = File(...),
    current_user: Annotated[User, Depends(get_current_user)] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Upload a resume PDF and extract comprehensive profile data using LLM.
    
    This endpoint uses intelligent LLM-based extraction to:
    - Extract contact information (name, email, phone, GitHub, LinkedIn)
    - Parse work experience with responsibilities
    - Extract education details
    - Identify projects and tech stack
    - Categorize technical and soft skills
    - Calculate total years of experience
    
    Returns the complete structured JSON for frontend auto-population.
    Also stores the data in the Candidate record (UPSERT operation).
    
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
    
    # Parse resume with LLM-based comprehensive extraction
    try:
        resume_data = parse_resume_pdf(resume_bytes)  # Returns dict
        resume_text = resume_data.get("resume_text", "")  # Extract actual text string
        
        if not resume_text:
            raise ValueError("Failed to extract text from resume")
        
        parsed_data = await extract_comprehensive_resume_data(resume_text)
        logger.info(f"[Resume Upload] Successfully extracted data for user {current_user.id}")
    except Exception as e:
        logger.error(
            f"[Resume Upload] Error extracting resume: {type(e).__name__}: {str(e)}",
            exc_info=e,
        )
        error_text = str(e).strip()
        if not error_text:
            error_text = f"{type(e).__name__} occurred while parsing the resume"

        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Error parsing resume: {error_text}"
        )
    
    # Find or create Candidate record (UPSERT)
    result = await db.execute(select(Candidate).where(Candidate.user_id == current_user.id))
    candidate = result.scalar_one_or_none()
    
    if not candidate:
        candidate = Candidate(user_id=current_user.id)
        db.add(candidate)
    
    # Update candidate record with extracted data
    candidate.resume_text = resume_text  # Store only the text string, not the dict
    candidate.phone = parsed_data.phone
    candidate.professional_summary = parsed_data.professional_summary
    candidate.technical_skills = parsed_data.technical_skills
    candidate.soft_skills = parsed_data.soft_skills
    candidate.experience_years = parsed_data.total_years_experience
    candidate.github = parsed_data.github_url
    candidate.linkedin = parsed_data.linkedin_url
    
    # Store the full extracted data as JSON for reference
    candidate.education = {
        "education_list": [
            {
                "degree": edu.degree,
                "institution": edu.institution,
                "graduation_year": edu.graduation_year
            }
            for edu in parsed_data.education
        ]
    }
    
    # Store experience data
    candidate.experience = {
        "experience_list": [
            {
                "job_title": exp.job_title,
                "company": exp.company,
                "start_date": exp.start_date,
                "end_date": exp.end_date,
                "responsibilities": exp.responsibilities
            }
            for exp in parsed_data.experience
        ]
    } if parsed_data.experience else None
    
    # Store projects data
    candidate.projects = {
        "projects_list": [
            {
                "name": proj.name,
                "description": proj.description,
                "tech_stack": proj.tech_stack
            }
            for proj in parsed_data.projects
        ]
    } if parsed_data.projects else None
    
    # Update user full_name if we extracted one
    if parsed_data.full_name and parsed_data.full_name.strip():
        if not current_user.full_name or current_user.full_name.lower() in ["user", "candidate", "unknown", ""]:
            current_user.full_name = parsed_data.full_name
    
    await db.commit()
    logger.info(f"[Resume Upload] Saved candidate record for user {current_user.id}")
    
    # Return comprehensive extracted data to frontend for auto-population
    # Map internal field names to frontend expectations
    return ResumeUploadResponse(
        resume_text=resume_text,
        name=parsed_data.full_name,
        email=parsed_data.email,
        phone=parsed_data.phone,
        github_url=parsed_data.github_url,
        linkedin_url=parsed_data.linkedin_url,
        technical_skills=parsed_data.technical_skills,
        soft_skills=parsed_data.soft_skills,
        experience_years=parsed_data.total_years_experience,
        professional_summary=parsed_data.professional_summary,
        experience=parsed_data.experience,
        education=parsed_data.education,
        projects=parsed_data.projects,
        overall_score=0
    )


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
    if payload.email is not None:
        current_user.email = payload.email
    if payload.phone is not None:
        candidate.phone = payload.phone
    if payload.professional_summary is not None:
        candidate.professional_summary = payload.professional_summary
    if payload.technical_skills is not None:
        candidate.technical_skills = payload.technical_skills
    if payload.soft_skills is not None:
        candidate.soft_skills = payload.soft_skills
    if payload.years_of_experience is not None:
        candidate.experience_years = payload.years_of_experience
    if payload.education is not None:
        candidate.education = {"education_list": payload.education} if payload.education else None
    if payload.experience is not None:
        candidate.experience = {"experience_list": payload.experience} if payload.experience else None
    if payload.projects is not None:
        candidate.projects = {"projects_list": payload.projects} if payload.projects else None
    
    await db.commit()
    
    # Return updated profile
    return CandidateProfileResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        phone=candidate.phone if hasattr(candidate, 'phone') else None,
        professional_summary=candidate.professional_summary if hasattr(candidate, 'professional_summary') else None,
        technical_skills=candidate.technical_skills,
        soft_skills=candidate.soft_skills,
        experience_years=candidate.experience_years,
        education=candidate.education,
        experience=candidate.experience,
        projects=candidate.projects,
        overall_score=candidate.overall_score,
        resume_text=candidate.resume_text,
        github=candidate.github,
        linkedin=candidate.linkedin
    )
