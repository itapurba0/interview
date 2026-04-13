import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from passlib.context import CryptContext
from sqlalchemy import text

from app.db import engine, AsyncSessionLocal
from app.models import Base, User, Company, UserRole, Candidate, Job, Application, ApplicationStatus

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def seed_db():
    """Initializes the database with a default HR tenant for development."""
    async with AsyncSessionLocal() as session:
        # 1. Check if Company exists
        from sqlalchemy import select
        res = await session.execute(select(Company).limit(1))
        if res.scalar():
            return # Already seeded

        # 2. Create Default Company
        company = Company(id=100, name="HireOps Inc.", description="Global AI Talent Orchestrator")
        session.add(company)
        await session.flush()
        
        # 3. Create Default HR User (hr@hireops.com / password123)
        hr_user = User(
            email="hr@hireops.com",
            hashed_password=pwd_context.hash("password123"),
            full_name="HireOps HR Admin",
            role=UserRole.HR,
            company_id=100
        )
        session.add(hr_user)
        await session.flush()
        
        # 4. Create sample candidates
        candidates_data = [
            {"name": "SK Akram Haq", "email": "akram@gmail.com", "resume": "Senior React Developer with 5+ years of experience...", "skills": ["React", "TypeScript", "Node.js"]},
            {"name": "Jane Smith", "email": "jane@example.com", "resume": "Full-stack developer with Python and React...", "skills": ["React", "Python", "PostgreSQL"]},
            {"name": "John Developer", "email": "john@example.com", "resume": "Frontend specialist experienced in React...", "skills": ["React", "CSS", "JavaScript"]},
            {"name": "Alice Engineer", "email": "alice@example.com", "resume": "DevOps and backend engineer...", "skills": ["Node.js", "Docker", "Kubernetes"]},
            {"name": "Bob Coder", "email": "bob@example.com", "resume": "Mobile and web developer...", "skills": ["React Native", "JavaScript"]},
        ]
        
        candidate_users = []
        for cand_data in candidates_data:
            cand_user = User(
                email=cand_data["email"],
                hashed_password=pwd_context.hash("password123"),
                full_name=cand_data["name"],
                role=UserRole.CANDIDATE,
                company_id=None  # Candidates don't belong to a company
            )
            session.add(cand_user)
            await session.flush()
            
            cand_profile = Candidate(
                user_id=cand_user.id,
                resume_text=cand_data["resume"],
                technical_skills=cand_data["skills"],
                soft_skills=["Communication", "Teamwork"],
                experience_years=5
            )
            session.add(cand_profile)
            candidate_users.append(cand_user)
        
        await session.flush()
        
        # 5. Create sample job
        job = Job(
            id=1,
            title="React Developer",
            description="We are looking for a senior React developer with expertise in TypeScript and modern frontend architecture.",
            skills=["React", "TypeScript", "Node.js"],
            company_id=100
        )
        session.add(job)
        await session.flush()
        
        # 6. Create sample applications
        statuses = [ApplicationStatus.APPLIED, ApplicationStatus.TEST_PENDING, ApplicationStatus.VOICE_PENDING, ApplicationStatus.INTERVIEW_EVALUATED, ApplicationStatus.SHORTLISTED]
        for idx, cand_user in enumerate(candidate_users):
            app = Application(
                candidate_id=cand_user.id,
                job_id=job.id,
                status=statuses[idx % len(statuses)],
                match_score=80 + idx * 5,
                mcq_score=85.0 if idx > 0 else None,
                coding_score=90.0 if idx > 1 else None,
                voice_score=88.0 if idx > 3 else None,
            )
            session.add(app)
        
        await session.commit()
        print("✅ SEEDING COMPLETE: Created hr@hireops.com / password123")
        print(f"✅ Created {len(candidate_users)} sample candidates")
        print(f"✅ Created 1 React Developer job")
        print(f"✅ Created {len(candidate_users)} applications")


async def ensure_jobs_skills_column(conn):
    """Add the jobs.skills column if the legacy table lacks it."""
    column_check = await conn.execute(
        text(
            """
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = :table AND column_name = :column
            LIMIT 1
            """
        ),
        {"table": "jobs", "column": "skills"},
    )

    if column_check.scalar_one_or_none() is None:
        await conn.execute(text("ALTER TABLE jobs ADD COLUMN skills JSON"))


async def ensure_application_assessment_columns(conn):
    """Add missing assessment columns to the applications table."""
    needed_columns = {
        "match_score": "INTEGER",
        "mcq_score": "FLOAT",
        "coding_score": "FLOAT",
        "voice_score": "FLOAT",
        "ai_feedback": "TEXT",
        "voice_transcript": "TEXT",
    }

    for column_name, sql_type in needed_columns.items():
        column_check = await conn.execute(
            text(
                """
                SELECT 1
                FROM information_schema.columns
                WHERE table_name = :table AND column_name = :column
                LIMIT 1
                """
            ),
            {"table": "applications", "column": column_name},
        )
        if column_check.scalar_one_or_none() is None:
            await conn.execute(
                text(f"ALTER TABLE applications ADD COLUMN {column_name} {sql_type}")
            )

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database connection and create tables if they don't exist
    print("🔄 Connecting to database and initializing schema...")
    try:
        async with engine.begin() as conn:
            # Create all tables defined in models.py
            await conn.run_sync(Base.metadata.create_all)
            print("✓ Database initialized successfully")
    except Exception as e:
        print(f"⚠ Database initialization warning: {e}")
        print("  App will continue - database operations will retry at request time")
    
    # Seed if in dev mode
    if os.getenv("NODE_ENV") != "production":
        try:
            await seed_db()
            print("✓ Database seeded")
        except Exception as e:
            print(f"⚠ Seeding skipped: {e}")
    
    yield
    
    # Cleanup
    await engine.dispose()

# Initialize FastAPI application
app = FastAPI(
    title="HireOps Platform API",
    description="Agentic WebRTC Hiring Platform core backend",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS for frontend communication
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost",
    "http://127.0.0.1",
]

# Standard Security Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=[
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "Accept",
        "Origin",
    ],
    expose_headers=["Content-Type", "Authorization"],
    max_age=3600,
)

@app.get("/health")
def read_health():
    """
    K8s / Docker-Compose healthcheck endpoint.
    """
    return {"status": "ok", "service": "hireops-api", "version": "1.0.0"}

# --- Active Routers ---
from app.api.v1.jobs import router as jobs_router
from app.api.v1.assessments import router as assessments_router
from app.api.v1.candidates import router as candidates_router
from app.api.v1.analytics import router as analytics_router
from app.api.v1.auth import router as auth_router
from app.api.v1.applications import router as applications_router
from app.api.v1.interview import router as interview_router

app.include_router(jobs_router, prefix="/api/v1", tags=["jobs"])
app.include_router(assessments_router, prefix="/api/v1", tags=["assessments"])
app.include_router(candidates_router, prefix="/api/v1", tags=["candidates"])
app.include_router(analytics_router, prefix="/api/v1/analytics", tags=["analytics"])
app.include_router(auth_router, prefix="/api/v1", tags=["auth"])
app.include_router(applications_router, prefix="/api/v1", tags=["applications"])
app.include_router(interview_router, prefix="/api/v1/interview", tags=["interview"])

# NOTE: Placeholder for future routers.
# from app.api.v1 import auth, proctoring
# app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
# app.include_router(proctoring.router, prefix="/api/v1/proctoring", tags=["proctoring"])

# --- WebSocket Routers ---
from app.api.ws.interview import router as interview_ws_router
app.include_router(interview_ws_router, tags=["websocket"])
