"""
Candidates Profile API — HireOps Platform
PUT /candidates/profile — Update candidate profile (resume, links, skills).
GET /candidates/profile — Retrieve current candidate profile.
"""

from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter

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
