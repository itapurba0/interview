"""
Ollama LLM Client — Low-level API communication with Ollama server.

Handles HTTP requests to the local Ollama instance running at localhost:11434.
"""

import httpx
import logging
from typing import Optional

logger = logging.getLogger(__name__)

OLLAMA_BASE_URL = "http://localhost:11434"
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
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{OLLAMA_BASE_URL}/api/generate",
                json={
                    "model": model,
                    "prompt": prompt,
                    "stream": False,
                    "format": "json"
                },
                timeout=OLLAMA_TIMEOUT
            )
            response.raise_for_status()
            response_data = response.json()
            return response_data.get("response", "")
    except httpx.ConnectError as e:
        logger.warning(f"Ollama server not reachable at {OLLAMA_BASE_URL}: {str(e)}")
        raise
    except httpx.TimeoutException as e:
        logger.warning(f"Ollama request timed out after {OLLAMA_TIMEOUT}s: {str(e)}")
        raise
    except Exception as e:
        logger.error(f"Error calling Ollama: {str(e)}")
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
