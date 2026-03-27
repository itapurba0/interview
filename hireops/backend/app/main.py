import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from passlib.context import CryptContext
from sqlalchemy import text

from app.db import engine, AsyncSessionLocal
from app.models import Base, User, Company, UserRole, Candidate

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
        
        # 3. Create Default HR User (hr@hireops.com / password123)
        hr_user = User(
            email="hr@hireops.com",
            hashed_password=pwd_context.hash("password123"),
            full_name="HireOps HR Admin",
            role=UserRole.HR,
            company_id=100
        )
        session.add(hr_user)
        await session.commit()
        print("SEEDING COMPLETE: Created hr@hireops.com / password123")


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

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Asynchronous Table Creation
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await ensure_jobs_skills_column(conn)
    
    # Check if a seed is needed
    if os.getenv("NODE_ENV") != "production": # Always seed in dev for ease of use
        await seed_db()
        
    yield

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
]

# Standard Security Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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

app.include_router(jobs_router, prefix="/api/v1", tags=["jobs"])
app.include_router(assessments_router, prefix="/api/v1", tags=["assessments"])
app.include_router(candidates_router, prefix="/api/v1", tags=["candidates"])
app.include_router(analytics_router, prefix="/api/v1/analytics", tags=["analytics"])
app.include_router(auth_router, prefix="/api/v1", tags=["auth"])
app.include_router(applications_router, prefix="/api/v1", tags=["applications"])

# NOTE: Placeholder for future routers.
# from app.api.v1 import auth, proctoring
# app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
# app.include_router(proctoring.router, prefix="/api/v1/proctoring", tags=["proctoring"])

# --- WebSocket Routers ---
from app.api.ws.interview import router as interview_ws_router
app.include_router(interview_ws_router, tags=["websocket"])
