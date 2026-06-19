import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[2]


def _resolve_path(value: str) -> Path:
    path = Path(value)
    if path.is_absolute():
        return path
    return BACKEND_DIR / path


def _parse_cors_origins(value: str) -> list[str]:
    origins = [origin.strip() for origin in value.split(",")]
    return [origin for origin in origins if origin]


def _parse_bool(value: str) -> bool:
    return value.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    app_env: str
    app_host: str
    app_port: int
    upload_dir: Path
    results_dir: Path
    temp_dir: Path
    window_l: int
    cors_origins: list[str]
    use_mock_engine: bool
    engine_mode: str
    remote_engine_url: str | None
    remote_engine_timeout_s: int


@lru_cache
def get_settings() -> Settings:
    use_mock_engine = _parse_bool(os.getenv("USE_MOCK_ENGINE", "false"))
    engine_mode = os.getenv("ENGINE_MODE", "mock" if use_mock_engine else "local")

    return Settings(
        app_env=os.getenv("APP_ENV", "development"),
        app_host=os.getenv("APP_HOST", "0.0.0.0"),
        app_port=int(os.getenv("APP_PORT", "8000")),
        upload_dir=_resolve_path(os.getenv("UPLOAD_DIR", "storage/uploads")),
        results_dir=_resolve_path(os.getenv("RESULTS_DIR", "storage/results")),
        temp_dir=_resolve_path(os.getenv("TEMP_DIR", "storage/temp")),
        window_l=int(os.getenv("WINDOW_L", "150")),
        cors_origins=_parse_cors_origins(os.getenv("CORS_ORIGINS", "*")),
        use_mock_engine=use_mock_engine,
        engine_mode=engine_mode,
        remote_engine_url=os.getenv("REMOTE_ENGINE_URL"),
        remote_engine_timeout_s=int(os.getenv("REMOTE_ENGINE_TIMEOUT_S", "3600")),
    )


def ensure_storage_dirs() -> None:
    settings = get_settings()
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    settings.results_dir.mkdir(parents=True, exist_ok=True)
    settings.temp_dir.mkdir(parents=True, exist_ok=True)
