import json
import logging
from datetime import datetime, timezone
import shutil
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.encoders import jsonable_encoder
from fastapi.responses import FileResponse

from app.core.config import get_settings
from app.schemas.input import InputSummary, QualityInfo
from app.schemas.job import JobInfo
from app.schemas.result import ResultV1
from app.services.job_store import create_job, list_jobs as list_queued_jobs, read_job as read_queued_job
from app.services.pipeline import run_pipeline
from app.services.video_metadata import get_metadata


logger = logging.getLogger("API.Analysis")
router = APIRouter()

ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv"}
UPLOAD_CHUNK_SIZE = 1024 * 1024


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


def _validate_video_upload(video: UploadFile) -> None:
    suffix = Path(video.filename or "").suffix.lower()
    content_type = (video.content_type or "").lower()
    looks_like_video = content_type.startswith("video/")
    common_binary_upload = content_type in {
        "",
        "application/octet-stream",
        "binary/octet-stream",
    }

    if suffix not in ALLOWED_VIDEO_EXTENSIONS and not looks_like_video and not common_binary_upload:
        raise HTTPException(
            status_code=415,
            detail="Formato de video nao suportado. Use mp4, mov, avi ou mkv.",
        )


def _save_upload_file(video: UploadFile, upload_path: Path, max_bytes: int) -> int:
    total_bytes = 0

    with upload_path.open("wb") as buffer:
        while True:
            chunk = video.file.read(UPLOAD_CHUNK_SIZE)
            if not chunk:
                break

            total_bytes += len(chunk)
            if total_bytes > max_bytes:
                buffer.close()
                upload_path.unlink(missing_ok=True)
                raise HTTPException(
                    status_code=413,
                    detail="Arquivo de video excede o tamanho maximo configurado",
                )

            buffer.write(chunk)

    return total_bytes


def _build_queued_result(job_id: str, upload_path: Path, height_mm: int, window_l: int, rotated: bool) -> ResultV1:
    now = datetime.now(timezone.utc)
    video_data = get_metadata(str(upload_path))
    return ResultV1(
        result_version="1.0",
        job=JobInfo(
            job_id=job_id,
            status="queued",
            stage="waiting_worker",
            created_at=now,
            started_at=None,
            finished_at=None,
            duration_ms=0,
        ),
        input_summary=InputSummary(
            video_path=str(upload_path),
            height_mm=height_mm,
            rotated=rotated,
            window_L=window_l,
            fps=video_data["fps"],
            duration_ms=video_data["duration_ms"],
        ),
        quality_info=QualityInfo(
            frames_total=video_data["frame_count"],
            frames_without_detection=0,
            warnings=video_data["warnings"],
        ),
    )


def _store_generated_artifacts(result_dir: Path, job_id: str, source_artifacts: dict | None = None) -> dict:
    artifacts = {}

    for filename, key in (
        ("3d_rebuild.mp4", "video_3d"),
        ("movimento_exportado.npz", "movement_npz"),
    ):
        candidates = []
        if source_artifacts and source_artifacts.get(key):
            candidates.append(Path(source_artifacts[key]))
        candidates.append(Path.cwd() / filename)

        source = next((candidate for candidate in candidates if candidate.exists()), None)
        if source is not None:
            result_dir.mkdir(parents=True, exist_ok=True)
            target = result_dir / filename
            if source.resolve() != target.resolve():
                shutil.move(str(source), str(target))
            artifacts[key] = f"/results/{job_id}/artifacts/{filename}"

    return artifacts


def _job_summary_from_result(job_id: str, payload: dict) -> dict:
    data = payload.get("data") or {}
    artifacts = data.get("artifacts") or {}
    return {
        "job_id": job_id,
        "job": payload.get("job"),
        "status": (payload.get("job") or {}).get("status"),
        "stage": (payload.get("job") or {}).get("stage"),
        "created_at": (payload.get("job") or {}).get("created_at"),
        "finished_at": (payload.get("job") or {}).get("finished_at"),
        "has_result": True,
        "has_model3d": data.get("model3d") is not None,
        "artifacts": artifacts,
    }


def _collect_job_summaries() -> list[dict]:
    settings = get_settings()
    jobs_by_id = {}

    if settings.results_dir.exists():
        for result_path in settings.results_dir.glob("*/result.json"):
            job_id = result_path.parent.name
            try:
                jobs_by_id[job_id] = _job_summary_from_result(job_id, _read_json(result_path))
            except (json.JSONDecodeError, OSError) as exc:
                logger.warning("Ignorando resultado invalido do job %s: %s", job_id, exc)

    if settings.upload_dir.exists():
        for upload_path in settings.upload_dir.glob("*/input.mp4"):
            job_id = upload_path.parent.name
            jobs_by_id.setdefault(
                job_id,
                {
                    "job_id": job_id,
                    "job": None,
                    "status": "processing",
                    "stage": "unknown",
                    "created_at": None,
                    "finished_at": None,
                    "has_result": False,
                    "has_model3d": False,
                    "artifacts": {},
                },
            )

    if hasattr(settings, "jobs_dir"):
        for job in list_queued_jobs():
            job_id = job["job_id"]
            jobs_by_id[job_id] = {
                "job_id": job_id,
                "job": job,
                "status": job.get("status"),
                "stage": job.get("stage"),
                "created_at": job.get("created_at"),
                "finished_at": job.get("finished_at"),
                "has_result": bool(job.get("result_path")),
                "has_model3d": False,
                "artifacts": job.get("artifacts") or {},
            }

    return sorted(
        jobs_by_id.values(),
        key=lambda item: item.get("finished_at") or item.get("created_at") or "",
        reverse=True,
    )


@router.post("/analyze")
async def analyze_video(
    video: UploadFile = File(...),
    height_mm: int = Form(...),
    rotated: bool = Form(False),
):
    if height_mm <= 0:
        raise HTTPException(status_code=422, detail="height_mm deve ser maior que zero")

    settings = get_settings()
    _validate_video_upload(video)

    job_id = str(uuid4())
    upload_dir = settings.upload_dir / job_id
    result_dir = settings.results_dir / job_id
    upload_path = upload_dir / "input.mp4"
    result_path = result_dir / "result.json"

    upload_dir.mkdir(parents=True, exist_ok=True)
    result_dir.mkdir(parents=True, exist_ok=True)

    stored_bytes = _save_upload_file(video, upload_path, settings.max_upload_bytes)

    logger.info("Video salvo para job %s (%s bytes). Iniciando analise", job_id, stored_bytes)

    if getattr(settings, "engine_mode", "local").lower() == "queue":
        result = _build_queued_result(
            job_id=job_id,
            upload_path=upload_path,
            height_mm=height_mm,
            window_l=settings.window_l,
            rotated=rotated,
        )
        create_job(
            job_id=job_id,
            upload_path=upload_path,
            height_mm=height_mm,
            rotated=rotated,
            window_l=settings.window_l,
            original_filename=video.filename,
        )
        _write_json(result_path, result)
        return result

    _clear_accelerator_caches()
    result = run_pipeline(
        video_path=str(upload_path),
        height_mm=height_mm,
        window_L=settings.window_l,
        job_id=job_id,
        rotated=rotated,
    )

    source_artifacts = result.data.artifacts if result.data is not None else None
    artifacts = _store_generated_artifacts(result_dir, job_id, source_artifacts)
    if result.data is not None and artifacts:
        result.data.artifacts = artifacts
        if "video_3d" in artifacts:
            result.data.video_3d = artifacts["video_3d"]

    _write_json(result_path, result)

    return result


@router.get("/jobs")
async def list_jobs():
    jobs = _collect_job_summaries()
    return {"total": len(jobs), "jobs": jobs}


@router.get("/status/{job_id}")
async def get_status(job_id: str):
    settings = get_settings()
    result_path = settings.results_dir / job_id / "result.json"
    upload_path = settings.upload_dir / job_id / "input.mp4"

    if hasattr(settings, "jobs_dir"):
        try:
            queued_job = read_queued_job(job_id)
        except FileNotFoundError:
            queued_job = None
        if queued_job is not None and (queued_job.get("status") != "completed" or not result_path.exists()):
            return queued_job

    if result_path.exists():
        result = _read_json(result_path)
        return result["job"]

    if upload_path.exists():
        return {"job_id": job_id, "status": "processing", "stage": "unknown"}

    raise HTTPException(status_code=404, detail="Job n?o encontrado")


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
