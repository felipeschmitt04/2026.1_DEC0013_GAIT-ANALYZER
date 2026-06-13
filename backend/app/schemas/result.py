from pydantic import BaseModel

from app.schemas.error import ErrorInfo
from app.schemas.input import InputSummary, QualityInfo
from app.schemas.job import JobInfo


class BiomechanicalData(BaseModel):
    events: list
    kinematics: dict
    pose3d: list
    metricas_clinicas: dict | None = None
    artifacts: dict | None = None
    video_3d: str | None = None


class ResultV1(BaseModel):
    result_version: str
    job: JobInfo
    error: ErrorInfo | None = None
    input_summary: InputSummary | None = None
    quality_info: QualityInfo | None = None
    data: BiomechanicalData | None = None
