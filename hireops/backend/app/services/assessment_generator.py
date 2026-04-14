import asyncio
import json
import os
from typing import Any, Dict

from openai import AsyncOpenAI

client = AsyncOpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("OPENROUTER_API_KEY"),
)

MAX_RETRIES = 10
RETRY_BASE_DELAY_SECONDS = 2


async def generate_custom_mcq(
    resume_summary: str,
    job_title: str,
    job_skills: str,
) -> Dict[str, Any]:
    """Generate a candidate-specific 25-question MCQ assessment via OpenRouter."""
    system_prompt = (
        "You are an expert technical interviewer. Generate EXACTLY 25 multiple-choice questions. No more and no less.\n"
        "Your response MUST be a valid JSON object with exactly 25 items in the 'questions' array.\n"
        "IMPORTANT: The 'question' text MUST NOT include question numbers (e.g. '1. ', 'Question 1:'). Just provide the plain question text.\n"
        "JSON Schema: {\"questions\": [{\"question\": \"...\", \"options\": [\"A\", \"B\", \"C\", \"D\"], \"correct_answer\": \"...\", \"explanation\": \"...\"}]}"
    )
    user_prompt = (
        f"Role: {job_title}. Required Skills: {job_skills}.\n"
        f"Candidate Background:\n{resume_summary}\n\n"
        "TASK:\n"
        "1. Create 13 deep technical questions specifically tailored to the required skills and the candidate's stated skill level.\n"
        "2. Create 12 scenario-based questions. These MUST be derived from the candidate's specific PROJECTS and EXPERIENCE mentioned in their background summary."
    )

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            response = await client.chat.completions.create(
                model="openai/gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                response_format={"type": "json_object"},
            )

            response_text = response.choices[0].message.content
            return json.loads(response_text)
        except Exception as exc:
            print(
                f"Error generating MCQs with OpenRouter (attempt {attempt}/{MAX_RETRIES}): {exc}"
            )
            if attempt >= MAX_RETRIES:
                break
            delay = RETRY_BASE_DELAY_SECONDS * attempt
            await asyncio.sleep(delay)

    return {"questions": []}
