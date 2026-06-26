from pydantic import BaseModel


class ErrorInfo(BaseModel):
    code: str
    message: str
    stage: str
    details: str | None = None
    retryable: bool

