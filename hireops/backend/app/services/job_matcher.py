"""
Job Matcher — AI-powered job-candidate matching using Ollama LLM.

Evaluates candidate fit for positions using semantic evaluation
instead of deterministic point-based scoring.
"""

import json
import re
import logging
from typing import Dict, Any

from app.services.ollama_client import call_ollama

logger = logging.getLogger(__name__)


def _get_system_prompt() -> str:
    """
    Returns the system prompt for Ollama to act as an Expert Technical Recruiter.
    
    Returns:
        System prompt string with instructions and output format.
    """
    return """You are an Expert Technical Recruiter. Your task is to evaluate how well a candidate matches a job position.

Consider the following factors:
1. Technical Skills Alignment: Do the candidate's technical skills match the job requirements?
2. Soft Skills: Are relevant soft skills present?
3. Experience Level: Does the candidate have sufficient years of experience?
4. Domain Relevance: Is their background relevant to the industry/domain?

Provide a match score from 0 to 100 based on overall fit, and a short 1-2 sentence reasoning.

OUTPUT ONLY a valid JSON object with no markdown, no explanation, no additional text:
{"score": <number>, "reasoning": "<1-2 sentence explanation of the score>"}"""


def _build_candidate_context(candidate_data: Dict[str, Any], job_description: str) -> str:
    """
    Build the candidate context string for the evaluation prompt.
    
    Args:
        candidate_data: Dictionary with candidate information
        job_description: The job posting text
        
    Returns:
        Formatted candidate context string.
    """
    technical_skills = ", ".join(candidate_data.get("technical_skills", []))
    soft_skills = ", ".join(candidate_data.get("soft_skills", []))
    experience_years = candidate_data.get("experience_years", 0)
    education = candidate_data.get("education", "Not provided")
    name = candidate_data.get("name", "Candidate")
    
    return f"""
Candidate: {name}
Technical Skills: {technical_skills if technical_skills else "Not provided"}
Soft Skills: {soft_skills if soft_skills else "Not provided"}
Years of Experience: {experience_years}
Education: {education}

Job Description:
{job_description}

Evaluate this candidate's fit for this job."""


def _parse_match_response(response_text: str) -> Dict[str, Any]:
    """
    Extract and validate the match score and reasoning from Ollama response.
    
    Handles Markdown code blocks from LLM output, then attempts JSON parsing.
    Falls back to regex extraction if JSON parsing fails.
    
    Args:
        response_text: Raw response text from Ollama
        
    Returns:
        Dictionary with keys:
        - "score": Integer score between 0 and 100
        - "reasoning": String explanation (or fallback text if extraction fails)
    """
    default_reasoning = "AI reasoning unavailable"
    
    logger.debug(f"[LLM Response] Raw: {response_text[:200]}...")  # Log first 200 chars
    
    # Strip Markdown code blocks if the LLM wrapped JSON in backticks
    # Handles patterns like: ```json{...}``` or ```{...}```
    cleaned_text = re.sub(r'```(?:json)?\s*\n?', '', response_text)
    cleaned_text = re.sub(r'\n?```', '', cleaned_text)
    cleaned_text = cleaned_text.strip()
    
    logger.debug(f"[Cleaned Response] {cleaned_text[:200]}...")  # Log cleaned version
    
    try:
        # Try to parse as JSON first
        score_data = json.loads(cleaned_text)
        score = int(score_data.get("score", 0))
        reasoning = str(score_data.get("reasoning", default_reasoning))
        
        result = {
            "score": min(100, max(0, score)),
            "reasoning": reasoning if reasoning and len(reasoning) > 0 else default_reasoning
        }
        logger.info(f"[Parse Success] Score: {result['score']}, Reasoning: {result['reasoning'][:100]}...")
        return result
    except (json.JSONDecodeError, ValueError, KeyError, TypeError) as e:
        logger.warning(f"[JSON Parse Failed] {type(e).__name__}: {str(e)}")
        
        # Fallback: extract first number found using regex
        try:
            match = re.search(r'\d+', cleaned_text)
            score = int(match.group()) if match else 0
            score = min(100, max(0, score))
            
            result = {
                "score": score,
                "reasoning": default_reasoning
            }
            logger.warning(f"[Regex Fallback] Extracted score: {score}")
            return result
        except (ValueError, AttributeError) as e:
            logger.error(f"[Regex Fallback Failed] {type(e).__name__}: {str(e)}")
    
    logger.error(f"[Parse Complete Failure] Returning score 0")
    return {
        "score": 0,
        "reasoning": default_reasoning
    }


async def calculate_job_match(candidate_data: Dict[str, Any], job_description: str) -> Dict[str, Any]:
    """
    Calculate job-candidate match score and reasoning using AI semantic evaluation via Ollama.
    
    Uses a local Ollama instance running qwen3.5:2b model for intelligent,
    context-aware job matching instead of deterministic point-based scoring.
    
    Flow:
    1. Prepare system prompt (Expert Recruiter role)
    2. Build candidate context with parsed resume data
    3. Combine into full evaluation prompt
    4. Call Ollama API
    5. Parse response JSON to extract score and reasoning
    6. Handle errors gracefully
    
    Args:
        candidate_data: Dictionary with parsed candidate info (from parse_resume_pdf output)
        job_description: Job description text
        
    Returns:
        Dictionary with keys:
        - "score": Integer from 0 to 100 representing match quality
        - "reasoning": String explanation of the score
        Returns {"score": 0, "reasoning": "AI reasoning unavailable"} on error.
    """
    try:
        # Prepare prompts
        system_prompt = _get_system_prompt()
        candidate_context = _build_candidate_context(candidate_data, job_description)
        full_prompt = system_prompt + "\n\n" + candidate_context
        
        logger.info("[Job Match] Calling Ollama API...")
        
        # Call Ollama API
        response_text = await call_ollama(full_prompt)
        
        logger.info(f"[Job Match] Ollama returned: {response_text[:150] if response_text else 'None'}...")
        
        if not response_text:
            logger.error("[Job Match] Ollama returned empty/None response")
            return {
                "score": 0,
                "reasoning": "AI reasoning unavailable"
            }
        
        # Parse and return match result
        result = _parse_match_response(response_text)
        logger.info(f"[Job Match] Final result: Score={result['score']}, Reasoning={result['reasoning'][:80]}...")
        return result
            
    except Exception as e:
        logger.error(f"[Job Match] Error in calculate_job_match: {type(e).__name__}: {str(e)}")
        import traceback
        logger.error(f"[Job Match] Traceback: {traceback.format_exc()}")
        return {
            "score": 0,
            "reasoning": "AI reasoning unavailable"
        }
