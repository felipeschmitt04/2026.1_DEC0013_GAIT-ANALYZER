import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[2]


def _resolve_path(value: str) -> Path:
    """Resolve caminhos configurados por variavel de ambiente.

    Parametros:
        value: Caminho absoluto ou relativo ao diretorio `backend`.

    Retorna:
        Um `Path` absoluto apontando para o local configurado.
    """
    path = Path(value)
    if path.is_absolute():
        return path
    return BACKEND_DIR / path


def _parse_cors_origins(value: str) -> list[str]:
    """Transforma a string de CORS em uma lista limpa de origens.

    Parametros:
        value: Texto separado por virgulas, como `"http://localhost:3000,https://app.com"`.

    Retorna:
        Lista apenas com origens preenchidas, sem espacos extras.
    """
    origins = [origin.strip() for origin in value.split(",")]
    return [origin for origin in origins if origin]


def _parse_bool(value: str) -> bool:
    """Interpreta valores comuns de ambiente como booleanos.

    Parametros:
        value: Texto vindo de uma variavel de ambiente.

    Retorna:
        `True` para valores afirmativos como `true`, `yes`, `on` ou `1`.
    """
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _is_production(app_env: str) -> bool:
    """Indica se a API esta rodando em ambiente de producao.

    Parametros:
        app_env: Valor da variavel `APP_ENV`.

    Retorna:
        `True` quando o ambiente foi marcado como `prod` ou `production`.
    """
    return app_env.strip().lower() in {"prod", "production"}


def _is_unsafe_token(value: str | None) -> bool:
    """Detecta tokens vazios ou ainda deixados com valor de exemplo.

    Parametros:
        value: Token configurado para proteger as rotas do worker.

    Retorna:
        `True` quando o token nao existe, esta vazio ou ainda e `change-me`.
    """
    return value is None or value.strip() in {"", "change-me"}


@dataclass(frozen=True)
class Settings:
    """Agrupa todas as configuracoes de runtime da API.

    Os valores saem de variaveis de ambiente, mas ficam tipados em um unico
    objeto para o restante do backend nao precisar conhecer detalhes de parsing.
    """

    app_env: str
    app_host: str
    app_port: int
    upload_dir: Path
    results_dir: Path
    temp_dir: Path
    jobs_dir: Path
    window_l: int
    cors_origins: list[str]
    use_mock_engine: bool
    engine_mode: str
    remote_engine_url: str | None
    remote_engine_timeout_s: int
    max_upload_bytes: int
    worker_token: str | None
    worker_claim_ttl_s: int


@lru_cache
def get_settings() -> Settings:
    """Carrega as configuracoes da aplicacao uma unica vez por processo.

    Parametros:
        Nenhum. A funcao le variaveis de ambiente do processo atual.

    Retorna:
        Uma instancia imutavel de `Settings` usada pela API, fila e pipeline.
    """
    use_mock_engine = _parse_bool(os.getenv("USE_MOCK_ENGINE", "false"))
    engine_mode = os.getenv("ENGINE_MODE", "mock" if use_mock_engine else "local")
    max_upload_mb = int(os.getenv("MAX_UPLOAD_MB", "200"))

    return Settings(
        app_env=os.getenv("APP_ENV", "development"),
        app_host=os.getenv("APP_HOST", "0.0.0.0"),
        app_port=int(os.getenv("APP_PORT", "8000")),
        upload_dir=_resolve_path(os.getenv("UPLOAD_DIR", "storage/uploads")),
        results_dir=_resolve_path(os.getenv("RESULTS_DIR", "storage/results")),
        temp_dir=_resolve_path(os.getenv("TEMP_DIR", "storage/temp")),
        jobs_dir=_resolve_path(os.getenv("JOBS_DIR", "storage/jobs")),
        window_l=int(os.getenv("WINDOW_L", "150")),
        cors_origins=_parse_cors_origins(os.getenv("CORS_ORIGINS", "*")),
        use_mock_engine=use_mock_engine,
        engine_mode=engine_mode,
        remote_engine_url=os.getenv("REMOTE_ENGINE_URL"),
        remote_engine_timeout_s=int(os.getenv("REMOTE_ENGINE_TIMEOUT_S", "3600")),
        max_upload_bytes=max_upload_mb * 1024 * 1024,
        worker_token=os.getenv("WORKER_TOKEN") or None,
        worker_claim_ttl_s=int(os.getenv("WORKER_CLAIM_TTL_S", "900")),
    )


def validate_runtime_settings(settings: Settings | None = None) -> None:
    """Valida configuracoes que seriam perigosas em producao.

    Parametros:
        settings: Configuracoes ja carregadas. Quando omitido, usa `get_settings()`.

    Saida:
        Nao retorna valor. Levanta `RuntimeError` se encontrar configuracao insegura.
    """
    settings = settings or get_settings()
    if not _is_production(settings.app_env):
        return

    if "*" in settings.cors_origins:
        raise RuntimeError("CORS_ORIGINS nao pode conter * quando APP_ENV=production")

    if _is_unsafe_token(settings.worker_token):
        raise RuntimeError("WORKER_TOKEN forte e obrigatorio quando APP_ENV=production")


def ensure_storage_dirs() -> None:
    """Garante que as pastas de upload, resultado, temporarios e jobs existam.

    Parametros:
        Nenhum.

    Saida:
        Nao retorna valor. Cria diretorios no disco quando necessario.
    """
    settings = get_settings()
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    settings.results_dir.mkdir(parents=True, exist_ok=True)
    settings.temp_dir.mkdir(parents=True, exist_ok=True)
    settings.jobs_dir.mkdir(parents=True, exist_ok=True)
