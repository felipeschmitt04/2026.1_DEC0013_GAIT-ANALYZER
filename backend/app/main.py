import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import analysis, health, worker
from app.core.config import ensure_storage_dirs, get_settings


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("API")
settings = get_settings()
ensure_storage_dirs()

app = FastAPI(title="Gait Analysis API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(analysis.router)
app.include_router(worker.router)
