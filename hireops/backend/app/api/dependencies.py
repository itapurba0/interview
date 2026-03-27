import os
from typing import Annotated, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db import get_db
from app.models import User, UserRole

# SaaS Configuration with fail-safe local fallback
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "hireops_dev_secret_2026_xyz")
ALGORITHM = "HS256"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")

async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    Core security dependency. Decodes the JWT, validates the signature,
    and hydrates the full User model from PostgreSQL.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    # Async database lookup
    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()
    
    if user is None:
        raise credentials_exception
        
    return user

async def get_current_tenant(
    current_user: Annotated[User, Depends(get_current_user)]
) -> int:
    """
    Tenant-Isolation Gateway.
    Ensures that HR and Managers are strictly contained within their company_id scope.
    Returns the company_id for direct use in multi-tenant queries.
    """
    if current_user.role in [UserRole.HR, UserRole.MANAGER]:
        if current_user.company_id is not None:
            return current_user.company_id
            
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account isolation error: No associated company_id found."
        )
            
    # Candidates are not allowed to access HR-scoped tenant resources
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Insufficient permissions for tenant-level access."
    )
