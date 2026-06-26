from datetime import datetime

from pydantic import BaseModel


class JobInfo(BaseModel):
    job_id: str
    status: str
    stage: str
    created_at: datetime
    started_at: datetime | None = None
    finished_at: datetime | None = None
    duration_ms: int

