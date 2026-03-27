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

router = APIRouter(prefix="/auth", tags=["Authentication"])

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = "CANDIDATE"
    company_name: Optional[str] = None

# Configuration for SaaS JWT Issuance
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "hireops_dev_secret_2026_xyz")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 1 day

# Password Hashing Strategy
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

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
    tenant_roles = {UserRole.HR.value, UserRole.MANAGER.value}
    if user_role not in {UserRole.CANDIDATE.value, *tenant_roles}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be CANDIDATE, HR, or MANAGER."
        )

    # 1. Check existing
    result = await db.execute(select(User).where(User.email == payload.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered."
        )

    company_id = None
    if user_role in tenant_roles:
        if not payload.company_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Company name required for HR/Manager registration."
            )
        new_company = Company(name=payload.company_name)
        db.add(new_company)
        await db.flush()
        company_id = new_company.id

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
    
    # 3. Issue Token with Tenant Scope
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # Critical Metadata for Frontend & Dashboard Routing
    jwt_payload = {
        "sub": str(user.id),
        "email": user.email,
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
