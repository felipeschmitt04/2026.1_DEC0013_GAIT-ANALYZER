import json
import logging
import shutil
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.encoders import jsonable_encoder
from fastapi.responses import FileResponse

from app.core.config import get_settings
from app.core.engine import get_engine
from app.services.pipeline import run_pipeline


logger = logging.getLogger("API.Analysis")
router = APIRouter()


def _clear_accelerator_caches() -> None:
    try:
        import equinox as eqx
        import jax
    except ImportError:
        logger.warning("JAX/Equinox não disponíveis para limpar caches")
        return

    eqx.clear_caches()
    jax.clear_caches()


def _write_json(path: Path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as file:
        json.dump(jsonable_encoder(payload), file, ensure_ascii=False, indent=2)


def _read_json(path: Path):
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def _store_generated_artifacts(result_dir: Path, job_id: str) -> dict:
    artifacts = {}

    for filename, key in (
        ("3d_rebuild.mp4", "video_3d"),
        ("movimento_exportado.npz", "movement_npz"),
    ):
        source = Path.cwd() / filename
        if source.exists():
            result_dir.mkdir(parents=True, exist_ok=True)
            target = result_dir / filename
            shutil.move(str(source), str(target))
            artifacts[key] = f"/results/{job_id}/artifacts/{filename}"

    return artifacts


@router.post("/analyze")
async def analyze_video(
    video: UploadFile = File(...),
    height_mm: int = Form(...),
):
    if height_mm <= 0:
        raise HTTPException(status_code=422, detail="height_mm deve ser maior que zero")

    settings = get_settings()
    job_id = str(uuid4())
    upload_dir = settings.upload_dir / job_id
    result_dir = settings.results_dir / job_id
    upload_path = upload_dir / "input.mp4"
    result_path = result_dir / "result.json"

    upload_dir.mkdir(parents=True, exist_ok=True)
    result_dir.mkdir(parents=True, exist_ok=True)

    with upload_path.open("wb") as buffer:
        shutil.copyfileobj(video.file, buffer)

    logger.info("Vídeo salvo para job %s. Iniciando análise", job_id)

    _clear_accelerator_caches()
    engine = get_engine()
    result = run_pipeline(
        video_path=str(upload_path),
        height_mm=height_mm,
        window_L=settings.window_l,
        engine=engine,
        job_id=job_id,
    )

    artifacts = _store_generated_artifacts(result_dir, job_id)
    if result.data is not None and artifacts:
        result.data.artifacts = artifacts
        if "video_3d" in artifacts:
            result.data.video_3d = artifacts["video_3d"]

    _write_json(result_path, result)

    return result


@router.get("/status/{job_id}")
async def get_status(job_id: str):
    settings = get_settings()
    result_path = settings.results_dir / job_id / "result.json"
    upload_path = settings.upload_dir / job_id / "input.mp4"

    if result_path.exists():
        result = _read_json(result_path)
        return result["job"]

    if upload_path.exists():
        return {"job_id": job_id, "status": "processing", "stage": "unknown"}

    raise HTTPException(status_code=404, detail="Job não encontrado")


@router.get("/results/{job_id}")
async def get_result(job_id: str):
    settings = get_settings()
    result_path = settings.results_dir / job_id / "result.json"

    if not result_path.exists():
        raise HTTPException(status_code=404, detail="Resultado não encontrado")

    return _read_json(result_path)


@router.get("/results/{job_id}/artifacts/{filename}")
async def get_result_artifact(job_id: str, filename: str):
    allowed_filenames = {"3d_rebuild.mp4", "movimento_exportado.npz"}
    if filename not in allowed_filenames:
        raise HTTPException(status_code=404, detail="Artefato não encontrado")

    settings = get_settings()
    artifact_path = settings.results_dir / job_id / filename

    if not artifact_path.exists():
        raise HTTPException(status_code=404, detail="Artefato não encontrado")

    return FileResponse(artifact_path)
