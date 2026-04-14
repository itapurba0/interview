import asyncio
import json
import os
import sys

# Add the current directory to sys.path to import app
sys.path.append(os.getcwd())

from app.db import AsyncSessionLocal
from app.models import Application
from sqlalchemy import select

async def check_app(app_id: int):
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Application).where(Application.id == app_id))
        app = result.scalar_one_or_none()
        
        if not app:
            print(f"Application {app_id} not found.")
            return

        print(f"APPLICATION {app_id}")
        print(f"Status: {app.status}")
        print(f"MCQ Score: {app.mcq_score}")
        print(f"Match Score: {app.match_score}")
        
        if app.custom_mcq_data:
            print("\nCUSTOM MCQ DATA:")
            questions = app.custom_mcq_data.get("questions", [])
            print(f"Number of questions: {len(questions)}")
            
            # Print the first few questions and answers to check format
            for i, q in enumerate(questions[:3]):
                print(f"\nQ{i+1}: {q.get('question')}")
                print(f"Options: {q.get('options')}")
                print(f"Correct Answer: {q.get('correct_answer')}")
        else:
            print("\nNo custom_mcq_data found.")

if __name__ == "__main__":
    app_id = 8
    asyncio.run(check_app(app_id))
