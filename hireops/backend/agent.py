import asyncio
import json
import logging
import os
from typing import Dict, Any
from livekit import rtc
from faster_whisper import WhisperModel
from livekit.agents import AutoSubscribe, JobContext, WorkerOptions, JobProcess, JobRequest, cli, stt
from livekit.agents.llm import ChatContext
from livekit.agents.pipeline import VoicePipelineAgent
from livekit.plugins import openai, silero

from local_audio import LocalSTT, LocalTTS

logger = logging.getLogger(__name__)
DEFAULT_OPENROUTER_LLM_MODEL = os.getenv("OPENROUTER_LLM_MODEL", "openai/gpt-4o-mini")
DEFAULT_WHISPER_MODEL_NAME = os.getenv("WHISPER_MODEL_NAME", "tiny.en")

def prewarm(proc: JobProcess):
    """
    Loads heavy models into memory during Docker boot.
    This entirely eliminates the 5-10 second cold start delay.
    """
    logger.info("Prewarming Silero VAD...")
    proc.userdata["vad"] = silero.VAD.load()

    logger.info("Prewarming Faster-Whisper STT (%s)...", DEFAULT_WHISPER_MODEL_NAME)
    proc.userdata["whisper_model"] = WhisperModel(
        DEFAULT_WHISPER_MODEL_NAME,
        device="cpu",
        compute_type="int8",
    )
    logger.info("All models prewarmed and ready.")

async def request_fnc(req: JobRequest) -> None:
    """
    Called when the LiveKit server has a job (room) that needs an agent.
    We automatically accept all incoming requests for this interview room.
    """
    logger.info("🚨 Received job request for room: %s", req.room.name)
    await req.accept()

async def entrypoint(ctx: JobContext) -> None:
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
    logger.info("LiveKit connected successfully")

    # Wait for the candidate to join so we can read their metadata
    while not ctx.room.remote_participants:
        await asyncio.sleep(0.5)

    participant = next(iter(ctx.room.remote_participants.values()))
    metadata: Dict[str, Any] = {}
    if participant.metadata:
        try:
            metadata = json.loads(participant.metadata)
        except json.JSONDecodeError:
            metadata = {}

    candidate_name = metadata.get("candidate_name", "Candidate")
    job_title = metadata.get("job_title", "Open Role")
    job_skills = metadata.get("job_skills", [])
    resume_summary = metadata.get("resume_summary", "")
    recent_experience = metadata.get("recent_experience", [])

    if isinstance(job_skills, list):
        job_skills = ", ".join(job_skills)
    if isinstance(recent_experience, list):
        recent_experience = json.dumps(recent_experience)

    system_prompt = f"""
You are a friendly, professional technical recruiter for HireOps.
You are interviewing {candidate_name} for the position of {job_title}.

JOB REQUIREMENTS:
{job_skills}

CANDIDATE BACKGROUND:
Summary: {resume_summary}
Recent Work: {recent_experience}

YOUR INSTRUCTIONS:
1. Start by welcoming {candidate_name} by name to the interview for the {job_title} role.
2. Ask 3-4 technical questions based on how their background aligns with the job requirements.
3. Keep your responses concise (1-2 sentences). Do not give long monologues.
4. If they give a good answer, acknowledge it before moving to the next question.
"""

    chat_ctx = ChatContext().append(role="system", text=system_prompt)

    # Grab the pre-loaded models from RAM
    vad = ctx.proc.userdata["vad"]
    prewarmed_whisper = ctx.proc.userdata["whisper_model"]

    streaming_stt = stt.StreamAdapter(
        stt=LocalSTT(model=prewarmed_whisper),
        vad=vad,
    )

    agent = VoicePipelineAgent(
        vad=vad,
        stt=streaming_stt,
        llm=openai.LLM(
            model=DEFAULT_OPENROUTER_LLM_MODEL,
            base_url="https://openrouter.ai/api/v1",
            api_key=os.getenv("OPENROUTER_API_KEY"),
        ),
        tts=LocalTTS(),
        chat_ctx=chat_ctx,
    )

    agent.start(ctx.room)

    await agent.say(
        "Hello! I'm ready when you are.",
        allow_interruptions=True,
    )


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            agent_name="hireops-recruiter",
            entrypoint_fnc=entrypoint,
            prewarm_fnc=prewarm,
            request_fnc=request_fnc,
            initialize_process_timeout=60.0,
            num_idle_processes=1,
        )
    )
