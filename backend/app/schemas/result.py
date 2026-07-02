from typing import Any

from pydantic import BaseModel

from app.schemas.error import ErrorInfo
from app.schemas.input import InputSummary, QualityInfo
from app.schemas.job import JobInfo

Point3D = tuple[float, float, float]
PoseFrame = list[Point3D]
Pose3D = list[PoseFrame]


class BiomechanicalData(BaseModel):
    events: list[list[float]]
    kinematics: dict[str, Any]
    pose3d: Pose3D
    skeleton: dict[str, Any] | None = None
    fitting: dict[str, Any] | None = None
    model3d: dict[str, Any] | None = None
    metricas_clinicas: dict[str, Any] | None = None
    artifacts: dict[str, str] | None = None
    video_3d: str | None = None


class ResultV1(BaseModel):
    result_version: str
    job: JobInfo
    error: ErrorInfo | None = None
    input_summary: InputSummary | None = None
    quality_info: QualityInfo | None = None
    data: BiomechanicalData | None = None
