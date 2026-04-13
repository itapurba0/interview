import asyncio
import os
import sys

# Ensure backend path is in sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db import engine
from app.models import Base

async def init_db():
    print(f"DEBUG: DATABASE_URL is {os.getenv('DATABASE_URL')}")
    try:
        async with engine.begin() as conn:
            print("DEBUG: Connection established. Creating tables...")
            await conn.run_sync(Base.metadata.create_all)
            print("✓ Tables created successfully")
    except Exception as e:
        print(f"❌ Error during initialization: {e}")

if __name__ == "__main__":
    asyncio.run(init_db())
