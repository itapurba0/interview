from datetime import datetime
import enum
from typing import Optional, List

from sqlalchemy import String, Text, ForeignKey, Enum, Integer, DateTime, Boolean, JSON
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

class Base(DeclarativeBase):
    pass

class ApplicationStatus(str, enum.Enum):
    APPLIED = "APPLIED"
    AI_SCREENING = "AI_SCREENING"              # Step 2: Agent evaluates resume/skills
    TEST_PENDING = "TEST_PENDING"              # Step 3: Candidate assigned test
    REJECTED = "REJECTED"                      # Rejected (e.g., < 75% AI match)
    VOICE_PENDING = "VOICE_PENDING"            # Step 4: Async voice interview
    SHORTLISTED = "SHORTLISTED"                # Step 5: Passed all async steps
    SCHEDULED = "SCHEDULED"                    # Step 6: Scheduled with human manager
    COMPLETED = "COMPLETED"                    # Interview completed (AI + human review)
    INTERVIEW_EVALUATED = "INTERVIEW_EVALUATED"  # AI evaluation completed
    HIRED = "HIRED"                            # Candidate accepted for the role

class UserRole(str, enum.Enum):
    CANDIDATE = "CANDIDATE"                    # Global user
    HR = "HR"                                  # Tenant-scoped
    MANAGER = "MANAGER"                        # Tenant-scoped
    ADMIN = "ADMIN"

class Company(Base):
    """
    Tenant entity. Isolates all Jobs, HR/Managers, and data.
    """
    __tablename__ = "companies"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    users: Mapped[List["User"]] = relationship(back_populates="company", cascade="all, delete-orphan")
    jobs: Mapped[List["Job"]] = relationship(back_populates="company", cascade="all, delete-orphan")

class User(Base):
    """
    Represents users across the platform. 
    Candidates are global. HR/Managers are bound to a specific company_id.
    """
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.CANDIDATE, nullable=False)
    
    # Nullable for global candidates, REQUIRED for scoped HR/Managers
    company_id: Mapped[Optional[int]] = mapped_column(ForeignKey("companies.id"))
    
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    company: Mapped[Optional["Company"]] = relationship(back_populates="users")
    applications: Mapped[List["Application"]] = relationship(back_populates="candidate", cascade="all, delete-orphan")
    candidate_profile: Mapped[Optional["Candidate"]] = relationship(back_populates="user", cascade="all, delete-orphan")

class Candidate(Base):
    """
    Stores structured resume profile data extracted by the AI resume parser.
    One-to-one relationship with User (only for users with role=CANDIDATE).
    """
    __tablename__ = "candidates"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, nullable=False, index=True)
    
    # Resume parsing results
    resume_text: Mapped[Optional[str]] = mapped_column(Text)
    phone: Mapped[Optional[str]] = mapped_column(String(20))
    professional_summary: Mapped[Optional[str]] = mapped_column(Text)
    technical_skills: Mapped[Optional[List[str]]] = mapped_column(JSON)
    soft_skills: Mapped[Optional[List[str]]] = mapped_column(JSON)
    experience_years: Mapped[Optional[float]] = mapped_column()
    education: Mapped[Optional[dict]] = mapped_column(JSON)
    experience: Mapped[Optional[dict]] = mapped_column(JSON)  # Store experience as JSON
    projects: Mapped[Optional[dict]] = mapped_column(JSON)  # Store projects as JSON
    overall_score: Mapped[Optional[int]] = mapped_column(Integer)  # Parser score (0-100)
    
    # Social links from resume
    github: Mapped[Optional[str]] = mapped_column(String(255))
    linkedin: Mapped[Optional[str]] = mapped_column(String(255))
    
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user: Mapped["User"] = relationship(back_populates="candidate_profile")

class Job(Base):
    """
    Tenant-scoped Job Listing.
    """
    __tablename__ = "jobs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    skills: Mapped[Optional[List[str]]] = mapped_column(JSON) # Store as list of strings
    is_active: Mapped[bool] = mapped_column(default=True)
    
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"))
    
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    company: Mapped["Company"] = relationship(back_populates="jobs")
    applications: Mapped[List["Application"]] = relationship(back_populates="job", cascade="all, delete-orphan")

class Application(Base):
    """
    Links a global Candidate to a specific Job Pipeline. 
    Tracks the state machine of the progression and stores assessment results.
    """
    __tablename__ = "applications"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    candidate_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    job_id: Mapped[int] = mapped_column(ForeignKey("jobs.id"))
    
    status: Mapped[ApplicationStatus] = mapped_column(Enum(ApplicationStatus), default=ApplicationStatus.APPLIED, nullable=False)
    
    # Scoring fields
    match_score: Mapped[Optional[int]] = mapped_column(Integer)  # AI match score (0-100)
    mcq_score: Mapped[Optional[float]] = mapped_column()  # MCQ assessment score
    coding_score: Mapped[Optional[float]] = mapped_column()  # Coding assessment score
    voice_score: Mapped[Optional[float]] = mapped_column()  # Voice interview score
    
    # Interview feedback and summary
    ai_feedback: Mapped[Optional[str]] = mapped_column(Text)  # JSON or text feedback from AI
    voice_transcript: Mapped[Optional[str]] = mapped_column(Text)
    custom_mcq_data: Mapped[Optional[dict]] = mapped_column(JSON)
    mcq_answers: Mapped[Optional[dict]] = mapped_column(JSON) # Store candidate's actual MCQ answers
    
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)

    candidate: Mapped["User"] = relationship(back_populates="applications")
    job: Mapped["Job"] = relationship(back_populates="applications")
