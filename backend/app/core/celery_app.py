from __future__ import annotations

import os
from celery import Celery
from dotenv import load_dotenv

load_dotenv()

# Use environment variables for Redis configuration, fallback to local defaults
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "resume_optimizer",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=["app.workers.optimization_tasks"]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300, # 5 minute timeout for optimization tasks
)

if __name__ == "__main__":
    celery_app.start()
