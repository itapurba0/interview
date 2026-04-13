import os
import ssl
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://hireops_user:enterprise_secure_password@localhost:5432/hireops_db",
)

# Automatic SSL and connectivity settings
connect_args = {}
if "neon.tech" in DATABASE_URL:
    connect_args["ssl"] = "require"
elif "supabase.co" in DATABASE_URL:
    # Supabase connection pooler setup
    connect_args["ssl"] = "require"
elif "aws.com" in DATABASE_URL:
    connect_args["ssl"] = True

# Async engine with cloud-aware connectivity
engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    future=True,
    pool_pre_ping=True,
    pool_recycle=3600,
    connect_args=connect_args,
)

# Session factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency for FastAPI route injection.
    Ensures that the session is automatically closed after the request.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
