import json
import logging
import shutil
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Body, File, Header, HTTPException, UploadFile
from fastapi.encoders import jsonable_encoder
from fastapi.responses import FileResponse

from app.core.config import get_settings
from app.schemas.error import ErrorInfo
from app.schemas.input import InputSummary, QualityInfo
from app.schemas.job import JobInfo
from app.schemas.result import BiomechanicalData, ResultV1
from app.services.clinical_metrics import calculate_clinical_metrics
from app.services.fitting_metadata import build_fitting_payload
from app.services.job_store import (
    claim_job,
    complete_job,
    fail_job,
    heartbeat_job,
    next_available_job,
    read_job,
)
from app.services.skeleton import get_pose3d_skeleton_info
from app.services.video_metadata import get_metadata

logger = logging.getLogger("API.Worker")
router = APIRouter(prefix="/worker", tags=["worker"])
ALLOWED_ARTIFACTS = {"3d_rebuild.mp4": "video_3d", "movimento_exportado.npz": "movement_npz"}


def _require_worker_token(x_worker_token: str | None) -> None:
    settings = get_settings()
    if settings.worker_token and x_worker_token != settings.worker_token:
        raise HTTPException(status_code=401, detail="Worker token invalido")


def _write_json(path: Path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(jsonable_encoder(payload), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def _build_result_from_raw(job: dict, raw_data: dict, artifacts: dict[str, str]) -> ResultV1:
    video_data = get_metadata(job["upload_path"])
    created_at = datetime.fromisoformat(job["created_at"])
    started_at = datetime.fromisoformat(job["started_at"] or job["created_at"])
    finished_at = datetime.now(timezone.utc)

    quality_info = QualityInfo(
        frames_total=video_data["frame_count"],
        frames_without_detection=0,
        warnings=video_data["warnings"],
    )
    diagnostics = raw_data.get("diagnostics", {}) if isinstance(raw_data, dict) else {}
    gait_pose_frames = diagnostics.get("gait_pose_frames")
    if isinstance(gait_pose_frames, int):
        quality_info.frames_without_detection = max(0, video_data["frame_count"] - gait_pose_frames)
        if quality_info.frames_without_detection > 0:
            quality_info.warnings.append("WARNING_201_PARTIAL_POSE_DETECTION")

    data = BiomechanicalData(
        events=raw_data["events"],
        kinematics=raw_data["kinematics"],
        pose3d=raw_data["pose3d"],
        skeleton=get_pose3d_skeleton_info(),
        fitting=build_fitting_payload(raw_data["kinematics"]),
        model3d=raw_data.get("model3d"),
        metricas_clinicas=calculate_clinical_metrics(raw_data["pose3d"]),
        artifacts=artifacts or None,
        video_3d=artifacts.get("video_3d") if artifacts else None,
    )

    return ResultV1(
        result_version="1.0",
        job=JobInfo(
            job_id=job["job_id"],
            status="completed",
            stage="finished",
            created_at=created_at,
            started_at=started_at,
            finished_at=finished_at,
            duration_ms=int((finished_at - started_at).total_seconds() * 1000),
        ),
        input_summary=InputSummary(
            video_path=job["upload_path"],
            height_mm=job["height_mm"],
            rotated=job["rotated"],
            window_L=job["window_l"],
            fps=video_data["fps"],
            duration_ms=video_data["duration_ms"],
        ),
        quality_info=quality_info,
        data=data,
    )


@router.get("/jobs/next")
async def get_next_job(x_worker_token: str | None = Header(None)):
    _require_worker_token(x_worker_token)
    job = next_available_job()
    return {"job": job}


@router.post("/jobs/{job_id}/claim")
async def claim_next_job(
    job_id: str,
    worker_id: str = Body(..., embed=True),
    x_worker_token: str | None = Header(None),
):
    _require_worker_token(x_worker_token)
    job = claim_job(job_id, worker_id=worker_id)
    if job is None:
        raise HTTPException(status_code=409, detail="Job nao esta disponivel para claim")
    return {"job": job}


@router.post("/jobs/{job_id}/heartbeat")
async def worker_heartbeat(
    job_id: str,
    worker_id: str = Body(..., embed=True),
    status: str = Body("running", embed=True),
    stage: str = Body("processing", embed=True),
    x_worker_token: str | None = Header(None),
):
    _require_worker_token(x_worker_token)
    try:
        job = heartbeat_job(job_id, worker_id=worker_id, status=status, stage=stage)
    except PermissionError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return {"job": job}


@router.get("/jobs/{job_id}/input")
async def get_job_input(job_id: str, x_worker_token: str | None = Header(None)):
    _require_worker_token(x_worker_token)
    try:
        job = read_job(job_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Job nao encontrado") from exc

    upload_path = Path(job["upload_path"])
    if not upload_path.exists():
        raise HTTPException(status_code=404, detail="Video do job nao encontrado")

    return FileResponse(upload_path, filename="input.mp4")


@router.post("/jobs/{job_id}/result")
async def submit_job_result(
    job_id: str,
    raw_result: UploadFile = File(...),
    movement_npz: UploadFile | None = File(None),
    video_3d: UploadFile | None = File(None),
    x_worker_token: str | None = Header(None),
):
    _require_worker_token(x_worker_token)
    try:
        job = read_job(job_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Job nao encontrado") from exc

    try:
        payload = json.loads((await raw_result.read()).decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        raise HTTPException(status_code=422, detail="raw_result invalido") from exc

    raw_data = payload.get("raw_data", payload)
    result_dir = get_settings().results_dir / job_id
    result_dir.mkdir(parents=True, exist_ok=True)

    artifacts = {}
    for upload, filename in ((movement_npz, "movimento_exportado.npz"), (video_3d, "3d_rebuild.mp4")):
        if upload is None:
            continue
        target = result_dir / filename
        with target.open("wb") as output:
            shutil.copyfileobj(upload.file, output)
        artifacts[ALLOWED_ARTIFACTS[filename]] = f"/results/{job_id}/artifacts/{filename}"

    result = _build_result_from_raw(job, raw_data, artifacts)
    result_path = result_dir / "result.json"
    _write_json(result_path, result)
    complete_job(job_id, result_path=result_path, artifacts=artifacts)

    return result


@router.post("/jobs/{job_id}/failed")
async def submit_job_failure(
    job_id: str,
    code: str = Body("ERROR_WORKER_FAILED", embed=True),
    message: str = Body(..., embed=True),
    retryable: bool = Body(True, embed=True),
    details: str | None = Body(None, embed=True),
    x_worker_token: str | None = Header(None),
):
    _require_worker_token(x_worker_token)
    error = {"code": code, "message": message, "retryable": retryable, "details": details}
    try:
        job = fail_job(job_id, error=error, retryable=retryable)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Job nao encontrado") from exc

    result = ResultV1(
        result_version="1.0",
        job=JobInfo(
            job_id=job_id,
            status=job["status"],
            stage="failed",
            created_at=datetime.fromisoformat(job["created_at"]),
            started_at=datetime.fromisoformat(job["started_at"]) if job.get("started_at") else None,
            finished_at=datetime.fromisoformat(job["finished_at"]) if job.get("finished_at") else None,
            duration_ms=0,
        ),
        error=ErrorInfo(
            code=code,
            message=message,
            stage="failed",
            details=details,
            retryable=retryable,
        ),
    )
    result_path = get_settings().results_dir / job_id / "result.json"
    _write_json(result_path, result)
    return {"job": job}
