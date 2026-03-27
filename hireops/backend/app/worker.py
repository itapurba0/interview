import os
from celery import Celery

# Initialize Celery app with Redis broker
celery_app = Celery(
    "hireops_worker",
    broker=os.environ.get("CELERY_BROKER_URL", "redis://redis:6379/1"),
    backend=os.environ.get("CELERY_RESULT_BACKEND", "redis://redis:6379/2"),
)

# Optional configuration, see the application user guide.
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],  # Ignore other content
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

@celery_app.task
def process_resume_nlp(resume_id: str):
    """
    Dummy task for processing resumes asynchronously.
    """
    return {"status": "processed", "resume_id": resume_id}
