import os
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from jose import jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from passlib.context import CryptContext

from app.db import get_db
from app.models import User, UserRole, Company, Candidate
from pydantic import BaseModel, EmailStr
from app.api.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = "CANDIDATE"
    company_name: Optional[str] = None
    join_code: Optional[str] = None

# Configuration for SaaS JWT Issuance
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "hireops_dev_secret_2026_xyz")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 1 day

# Password Hashing Strategy
pwd_context = CryptContext(
    schemes=["argon2", "bcrypt"],
    default="argon2",
    deprecated="auto",
)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

async def _upgrade_password_hash_if_needed(
    db: AsyncSession, user: User, plain_password: str
):
    """Rehash passwords stored with deprecated schemes during login."""
    if pwd_context.needs_update(user.hashed_password):
        user.hashed_password = get_password_hash(plain_password)
        db.add(user)
        await db.commit()
        await db.refresh(user)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta if expires_delta else timedelta(minutes=15))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_candidate(
    payload: RegisterRequest, 
    db: AsyncSession = Depends(get_db)
):
    """
    Creates a new global candidate or tenant-scoped HR/Manager account.
    """
    user_role = payload.role.strip().upper()
    valid_roles = {UserRole.CANDIDATE.value, UserRole.HR.value, UserRole.MANAGER.value}
    if user_role not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be CANDIDATE, HR, or MANAGER."
        )

    # 1. Check existing email
    result = await db.execute(select(User).where(User.email == payload.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered."
        )

    company_id = None
    
    # 2. Handle Multi-Tenant Logic
    if user_role == UserRole.HR.value:
        if not payload.company_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Company name required for HR registration."
            )
        # Verify company name isn't taken
        comp_result = await db.execute(select(Company).where(Company.name == payload.company_name))
        if comp_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Company name is already taken."
            )
        # Create new company
        new_company = Company(name=payload.company_name)
        db.add(new_company)
        await db.flush() # Flush to let database set the ID and uniquely generated join_code
        company_id = new_company.id

    elif user_role == UserRole.MANAGER.value:
        if not payload.join_code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Join code required for Manager registration."
            )
        # Lookup company by code securely
        comp_result = await db.execute(select(Company).where(Company.join_code == payload.join_code))
        existing_company = comp_result.scalar_one_or_none()
        
        if not existing_company:
            # Prevents blind enumeration or code guessing
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invalid join code. Company not found."
            )
        company_id = existing_company.id

    # 2. Hash and Create User
    new_user = User(
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
        full_name=payload.full_name,
        role=UserRole(user_role),
        company_id=company_id
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    if user_role == UserRole.CANDIDATE.value:
        # Create Candidate profile record in database
        new_candidate = Candidate(user_id=new_user.id)
        db.add(new_candidate)
        await db.commit()
    
    # 3. Issue Token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    jwt_payload = {
        "sub": str(new_user.id),
        "email": new_user.email,
        "full_name": new_user.full_name,
        "role": new_user.role,
        "company_id": new_user.company_id
    }
    
    access_token = create_access_token(
        data=jwt_payload, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": new_user.id
    }

@router.post("/login", response_model=dict)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    """
    Production-grade login. Authenticates against PostgreSQL and returns
    a tenant-aware JWT. 
    """
    # 1. Lookup User
    result = await db.execute(select(User).where(User.email == form_data.username))
    user = result.scalar_one_or_none()
    
    # 2. Verify Credentials
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    await _upgrade_password_hash_if_needed(db, user, form_data.password)

    # 3. Issue Token with Tenant Scope
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # Critical Metadata for Frontend & Dashboard Routing
    jwt_payload = {
        "sub": str(user.id),
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "company_id": user.company_id
    }
    
    access_token = create_access_token(
        data=jwt_payload, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

@router.get("/companies/me")
async def get_my_company(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Fetch the authenticated user's assigned company details."""
    if not current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="User is not linked to any company workspace."
        )
    result = await db.execute(select(Company).where(Company.id == current_user.company_id))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Company not found."
        )
    return {
        "id": company.id,
        "name": company.name,
        "description": company.description or f"{company.name} workspace.",
        "join_code": company.join_code,
        "created_at": company.created_at.isoformat() if company.created_at else None
    }
