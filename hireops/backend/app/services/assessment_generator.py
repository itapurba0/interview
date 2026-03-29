import json
from typing import Any, Dict

from app.services.ollama_client import call_ollama

MCQ_SCHEMA = """{
  "questions": [
    {
      "question": "Text...",
      "options": ["A", "B", "C", "D"],
      "correct_answer": "Text of correct option",
      "explanation": "Why this is correct"
    }
  ]
}
"""


async def generate_custom_mcq(
    resume_summary: str,
    job_title: str,
    job_skills: str,
) -> Dict[str, Any]:
    """Generate a candidate-specific 30-question MCQ assessment via Ollama."""
    prompt = f"""
You are an expert technical interviewer. Generate exactly 30 multiple-choice questions
for a {job_title} candidate. Base the difficulty and topics on this candidate's resume summary:
{resume_summary}
and the required skills: {job_skills}.
Create 15 deep technical/framework questions and 15 language/scenario questions.
You MUST return ONLY valid JSON matching this schema:
{MCQ_SCHEMA}
Do not include any markdown blocks, explanations, or wrapper text—just the raw JSON.
"""

    response_text = await call_ollama(prompt, response_format="json")
    if not response_text:
        raise RuntimeError("Ollama returned no response when generating the MCQ assessment")

    try:
        return json.loads(response_text)
    except json.JSONDecodeError as exc:
        raise RuntimeError("Ollama did not return valid JSON for the MCQ assessment") from exc
