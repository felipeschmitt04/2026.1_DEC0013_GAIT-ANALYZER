from pydantic import BaseModel


class ErrorInfo(BaseModel):
    """Formato padrao de erro devolvido no `ResultV1`.

    Guarda codigo, mensagem, etapa e se faz sentido tentar processar de novo.
    """

    code: str
    message: str
    stage: str
    details: str | None = None
    retryable: bool
