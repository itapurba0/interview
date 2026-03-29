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
    """Generate a candidate-specific 30-question MCQ assessment via OpenRouter."""
    system_prompt = (
        "You are an expert technical interviewer. Generate exactly 30 multiple-choice questions.\n"
        "You MUST return ONLY a valid JSON object matching this exact schema:\n"
        "{\"questions\": [{\"question\": \"...\", \"options\": [\"A\", \"B\", \"C\", \"D\"], \"correct_answer\": \"...\", \"explanation\": \"...\"}]}"
    )
    user_prompt = (
        f"Role: {job_title}. Required Skills: {job_skills}. Candidate Summary: {resume_summary}."
        " Create 15 deep technical questions and 15 scenario questions."
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
