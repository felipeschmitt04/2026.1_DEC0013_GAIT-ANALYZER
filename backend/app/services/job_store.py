import json
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from threading import Lock
from uuid import uuid4

from fastapi.encoders import jsonable_encoder

from app.core.config import get_settings

_JOB_LOCK = Lock()


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def iso_now() -> str:
    return utc_now().isoformat()


def new_job_id() -> str:
    return str(uuid4())


def job_dir(job_id: str) -> Path:
    return get_settings().jobs_dir / job_id


def job_path(job_id: str) -> Path:
    return job_dir(job_id) / "job.json"


def _atomic_write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = path.with_suffix(path.suffix + ".tmp")
    temp_path.write_text(
        json.dumps(jsonable_encoder(payload), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    os.replace(temp_path, path)


def read_job(job_id: str) -> dict:
    path = job_path(job_id)
    if not path.exists():
        raise FileNotFoundError(job_id)
    return json.loads(path.read_text(encoding="utf-8"))


def write_job(job: dict) -> dict:
    _atomic_write_json(job_path(job["job_id"]), job)
    return job


def create_job(
    *,
    job_id: str,
    upload_path: Path,
    height_mm: int,
    rotated: bool,
    window_l: int,
    original_filename: str | None,
) -> dict:
    now = iso_now()
    job = {
        "job_id": job_id,
        "status": "queued",
        "stage": "waiting_worker",
        "created_at": now,
        "updated_at": now,
        "started_at": None,
        "finished_at": None,
        "claimed_by": None,
        "claimed_at": None,
        "heartbeat_at": None,
        "attempts": 0,
        "height_mm": height_mm,
        "rotated": rotated,
        "window_l": window_l,
        "upload_path": str(upload_path),
        "original_filename": original_filename,
        "result_path": None,
        "artifacts": {},
        "error": None,
    }
    with _JOB_LOCK:
        return write_job(job)


def list_jobs() -> list[dict]:
    settings = get_settings()
    if not settings.jobs_dir.exists():
        return []

    jobs = []
    for path in settings.jobs_dir.glob("*/job.json"):
        try:
            jobs.append(json.loads(path.read_text(encoding="utf-8")))
        except (json.JSONDecodeError, OSError):
            continue

    return sorted(jobs, key=lambda item: item.get("created_at") or "", reverse=True)


def _is_stale(job: dict, now: datetime | None = None) -> bool:
    if job.get("status") not in {"claimed", "running"}:
        return False

    heartbeat = job.get("heartbeat_at") or job.get("claimed_at")
    if not heartbeat:
        return True

    now = now or utc_now()
    heartbeat_at = datetime.fromisoformat(heartbeat)
    if heartbeat_at.tzinfo is None:
        heartbeat_at = heartbeat_at.replace(tzinfo=timezone.utc)

    return now - heartbeat_at > timedelta(seconds=get_settings().worker_claim_ttl_s)


def next_available_job() -> dict | None:
    with _JOB_LOCK:
        now = utc_now()
        for job in sorted(list_jobs(), key=lambda item: item.get("created_at") or ""):
            if job.get("status") == "queued":
                return job
            if _is_stale(job, now):
                job["status"] = "queued"
                job["stage"] = "waiting_worker"
                job["claimed_by"] = None
                job["claimed_at"] = None
                job["heartbeat_at"] = None
                job["updated_at"] = iso_now()
                write_job(job)
                return job
    return None


def claim_job(job_id: str, worker_id: str) -> dict | None:
    with _JOB_LOCK:
        job = read_job(job_id)
        if job.get("status") != "queued" and not _is_stale(job):
            return None

        now = iso_now()
        job["status"] = "claimed"
        job["stage"] = "claimed"
        job["claimed_by"] = worker_id
        job["claimed_at"] = now
        job["heartbeat_at"] = now
        job["updated_at"] = now
        job["attempts"] = int(job.get("attempts") or 0) + 1
        return write_job(job)


def heartbeat_job(job_id: str, worker_id: str, status: str = "running", stage: str = "processing") -> dict:
    with _JOB_LOCK:
        job = read_job(job_id)
        if job.get("claimed_by") not in {None, worker_id}:
            raise PermissionError("job claimed by another worker")

        now = iso_now()
        job["status"] = status
        job["stage"] = stage
        job["claimed_by"] = worker_id
        job["heartbeat_at"] = now
        job["updated_at"] = now
        if job.get("started_at") is None:
            job["started_at"] = now
        return write_job(job)


def complete_job(job_id: str, result_path: Path, artifacts: dict[str, str]) -> dict:
    with _JOB_LOCK:
        job = read_job(job_id)
        now = iso_now()
        job["status"] = "completed"
        job["stage"] = "finished"
        job["finished_at"] = now
        job["updated_at"] = now
        job["result_path"] = str(result_path)
        job["artifacts"] = artifacts
        job["error"] = None
        return write_job(job)


def fail_job(job_id: str, error: dict, retryable: bool = True) -> dict:
    with _JOB_LOCK:
        job = read_job(job_id)
        now = iso_now()
        job["status"] = "failed_retryable" if retryable else "failed"
        job["stage"] = "failed"
        job["finished_at"] = now
        job["updated_at"] = now
        job["error"] = error
        return write_job(job)
