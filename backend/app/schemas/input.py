from pydantic import BaseModel


class InputSummary(BaseModel):
    """Resumo do video e parametros usados na analise.

    Ajuda o front e a auditoria a saber exatamente qual entrada gerou o resultado.
    """

    video_path: str
    height_mm: int
    rotated: bool
    window_L: int
    fps: float
    duration_ms: int


class QualityInfo(BaseModel):
    """Indicadores de qualidade coletados antes e durante o processamento.

    Warnings aqui nao significam necessariamente falha; eles avisam limitacoes do video.
    """

    frames_total: int
    frames_without_detection: int
    warnings: list[str]
