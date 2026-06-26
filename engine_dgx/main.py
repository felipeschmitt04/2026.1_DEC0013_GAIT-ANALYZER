import logging
import os
import shutil
from pathlib import Path
from threading import Lock
from uuid import uuid4

from fastapi import FastAPI, File, Form, HTTPException, UploadFile

from worker_engine import get_engine


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("EngineDGX")

BASE_DIR = Path(__file__).resolve().parent
STORAGE_DIR = Path(os.getenv("DGX_STORAGE_DIR", BASE_DIR / "storage"))
UPLOAD_DIR = STORAGE_DIR / "uploads"
RESULTS_DIR = STORAGE_DIR / "results"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
RESULTS_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Gait Analyzer DGX Worker")
process_lock = Lock()


def clear_accelerator_caches() -> None:
    try:
        import equinox as eqx
        import jax
    except ImportError:
        logger.warning("JAX/Equinox indisponiveis para limpar caches")
        return

    logger.info("Limpando caches JAX/Equinox")
    eqx.clear_caches()
    jax.clear_caches()


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "engine_loaded": get_engine.loaded,
        "role": "dgx-worker",
    }


@app.post("/warmup")
async def warmup():
    try:
        engine = get_engine()
    except Exception as exc:
        logger.exception("Falha ao carregar engine")
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return {
        "status": "ok",
        "engine": type(engine).__name__,
        "engine_loaded": get_engine.loaded,
    }


@app.post("/clear-cache")
async def clear_cache():
    clear_accelerator_caches()
    return {"status": "ok", "message": "Caches JAX/Equinox limpos"}


@app.post("/process")
async def process_video(
    video: UploadFile = File(...),
    height_mm: int = Form(...),
    rotated: bool = Form(False),
    job_id: str | None = Form(None),
):
    if height_mm <= 0:
        raise HTTPException(status_code=422, detail="height_mm deve ser maior que zero")

    current_job_id = job_id or str(uuid4())
    job_dir = UPLOAD_DIR / current_job_id
    result_dir = RESULTS_DIR / current_job_id
    upload_path = job_dir / "input.mp4"

    job_dir.mkdir(parents=True, exist_ok=True)
    result_dir.mkdir(parents=True, exist_ok=True)

    with upload_path.open("wb") as buffer:
        shutil.copyfileobj(video.file, buffer)

    logger.info("Job %s recebido. Iniciando engine pesada", current_job_id)

    previous_cwd = Path.cwd()
    with process_lock:
        clear_accelerator_caches()
        try:
            os.chdir(result_dir)
            engine = get_engine()
            raw_data = engine.process_video(
                video_path=str(upload_path),
                height_mm=height_mm,
                rotated=rotated,
            )
        except Exception as exc:
            logger.exception("Falha no processamento do job %s", current_job_id)
            raise HTTPException(status_code=500, detail=str(exc)) from exc
        finally:
            os.chdir(previous_cwd)
            clear_accelerator_caches()

    artifacts = {}
    for filename, key in (
        ("3d_rebuild.mp4", "video_3d"),
        ("movimento_exportado.npz", "movement_npz"),
    ):
        artifact_path = result_dir / filename
        if artifact_path.exists():
            artifacts[key] = str(artifact_path)

    return {
        "job_id": current_job_id,
        "status": "completed",
        "raw_data": raw_data,
        "artifacts": artifacts,
    }
