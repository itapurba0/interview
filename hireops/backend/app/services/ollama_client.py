"""
Ollama LLM Client — Low-level API communication with Ollama server.

Handles HTTP requests to the local Ollama instance running at localhost:11434.
On Docker Desktop, uses host.docker.internal to reach the host machine.
"""

import httpx
import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)

# Use host.docker.internal for Docker Desktop to reach host machine
# Use localhost for standalone/non-containerized environments
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://host.docker.internal:11434")
OLLAMA_MODEL = "qwen3.5:2b"
OLLAMA_TIMEOUT = 30.0


async def call_ollama(prompt: str, model: str = OLLAMA_MODEL) -> Optional[str]:
    """
    Call Ollama API with a given prompt.
    
    Args:
        prompt: The complete prompt to send to Ollama
        model: The model name to use (default: qwen3.5:2b)
        
    Returns:
        Response text from Ollama, or None if request fails
        
    Raises:
        httpx.ConnectError: If Ollama server is unreachable
        httpx.TimeoutException: If request exceeds timeout
    """
    try:
        logger.info(f"[Ollama] Calling {OLLAMA_BASE_URL}/api/generate with model {model}")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{OLLAMA_BASE_URL}/api/generate",
                json={
                    "model": model,
                    "prompt": prompt,
                    "stream": False,
                    "format": "json",
                    "options": {
                        "temperature": 0.0  # Deterministic scoring: 0 = no randomness
                    }
                },
                timeout=OLLAMA_TIMEOUT
            )
            response.raise_for_status()
            response_data = response.json()
            
            # Check for error in response
            if "error" in response_data:
                logger.error(f"[Ollama] Error in response: {response_data.get('error')}")
                return None
            
            # Try 'response' field first (standard Ollama)
            result = response_data.get("response", "").strip()
            
            # Fallback to 'thinking' field for models that use extended thinking
            if not result:
                thinking = response_data.get("thinking", "").strip()
                if thinking:
                    logger.info(f"[Ollama] Using 'thinking' field as response ({len(thinking)} chars)")
                    result = thinking
            
            if result:
                logger.info(f"[Ollama] Response: {result[:200]}...")
            else:
                logger.error(f"[Ollama] No response from model. Available keys: {list(response_data.keys())}")
            
            return result if result else None
            
    except httpx.ConnectError as e:
        logger.warning(f"[Ollama] Server not reachable at {OLLAMA_BASE_URL}: {str(e)}")
        raise
    except httpx.TimeoutException as e:
        logger.warning(f"[Ollama] Request timed out after {OLLAMA_TIMEOUT}s: {str(e)}")
        raise
    except Exception as e:
        logger.error(f"[Ollama] Unexpected error: {type(e).__name__}: {str(e)}")
        raise


def is_ollama_available() -> bool:
    """
    Check if Ollama server is available.
    
    Returns:
        True if Ollama is reachable, False otherwise
    """
    try:
        import httpx as sync_httpx
        with sync_httpx.Client() as client:
            response = client.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=5.0)
            return response.status_code == 200
    except Exception:
        return False
