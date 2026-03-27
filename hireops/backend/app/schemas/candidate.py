"""
Pydantic schemas for Candidate model serialization and validation.
Used for API request/response handling in resume parsing and profile management.
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class CandidateUpdate(BaseModel):
    """
    Schema for updating candidate profile via API.
    Allows partial updates to resume parsing results.
    """
    resume_text: Optional[str] = None
    technical_skills: Optional[List[str]] = None
    soft_skills: Optional[List[str]] = None
    experience_years: Optional[float] = None
    education: Optional[dict] = None
    overall_score: Optional[int] = Field(None, ge=0, le=100)
    
    class Config:
        validate_assignment = True


class CandidateOut(BaseModel):
    """
    Schema for retrieving candidate profile data.
    Serializes Candidate model for API responses.
    """
    id: int
    user_id: int
    resume_text: Optional[str] = None
    technical_skills: Optional[List[str]] = None
    soft_skills: Optional[List[str]] = None
    experience_years: Optional[float] = None
    education: Optional[dict] = None
    overall_score: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class CandidateIn(BaseModel):
    """
    Schema for creating a new candidate profile.
    Used when registering or initializing a candidate with resume data.
    """
    user_id: int
    resume_text: Optional[str] = None
    technical_skills: Optional[List[str]] = None
    soft_skills: Optional[List[str]] = None
    experience_years: Optional[float] = None
    education: Optional[dict] = None
    overall_score: Optional[int] = Field(None, ge=0, le=100)
    
    class Config:
        validate_assignment = True
