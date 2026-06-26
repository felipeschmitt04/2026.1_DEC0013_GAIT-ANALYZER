from pydantic import BaseModel


class InputSummary(BaseModel):
    video_path: str
    height_mm: int
    rotated: bool
    window_L: int
    fps: float
    duration_ms: int


class QualityInfo(BaseModel):
    frames_total: int
    frames_without_detection: int
    warnings: list[str]

