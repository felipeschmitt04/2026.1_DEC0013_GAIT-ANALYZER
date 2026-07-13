from datetime import datetime

from pydantic import BaseModel


class JobInfo(BaseModel):
    """Estado resumido de uma analise dentro da API.

    Esse modelo acompanha a vida do job: criacao, processamento, fim e duracao.
    """

    job_id: str
    status: str
    stage: str
    created_at: datetime
    started_at: datetime | None = None
    finished_at: datetime | None = None
    duration_ms: int
