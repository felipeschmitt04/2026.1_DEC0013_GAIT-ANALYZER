from datetime import datetime, timezone
from types import SimpleNamespace

from fastapi.testclient import TestClient

import app.api.routes.analysis as analysis_route
from app.main import app
from app.schemas.input import InputSummary, QualityInfo
from app.schemas.job import JobInfo
from app.schemas.result import BiomechanicalData, ResultV1


def build_result(job_id: str) -> ResultV1:
    now = datetime.now(timezone.utc)
    pose3d = [[[0.0, 0.0, 0.0] for _ in range(17)]]
    return ResultV1(
        result_version="1.0",
        job=JobInfo(
            job_id=job_id,
            status="completed",
            stage="finished",
            created_at=now,
            started_at=now,
            finished_at=now,
            duration_ms=1,
        ),
        input_summary=InputSummary(
            video_path="input.mp4",
            height_mm=1750,
            rotated=False,
            window_L=150,
            fps=30.0,
            duration_ms=33,
        ),
        quality_info=QualityInfo(
            frames_total=1,
            frames_without_detection=0,
            warnings=[],
        ),
        data=BiomechanicalData(
            events=[],
            kinematics={"angles": [[0.0] * 40], "timestamps": [0.0]},
            pose3d=pose3d,
            skeleton={"joint_count": 17},
            fitting={"coordinate_names": [f"q{i}" for i in range(40)], "angles": [[0.0] * 40]},
            metricas_clinicas={},
        ),
    )


def client_with_temp_storage(monkeypatch, tmp_path, max_upload_bytes=1024):
    settings = SimpleNamespace(
        upload_dir=tmp_path / "uploads",
        results_dir=tmp_path / "results",
        jobs_dir=tmp_path / "jobs",
        window_l=150,
        max_upload_bytes=max_upload_bytes,
        engine_mode="local",
        worker_token=None,
        worker_claim_ttl_s=900,
    )
    monkeypatch.setattr(analysis_route, "get_settings", lambda: settings)
    monkeypatch.setattr(analysis_route, "_clear_accelerator_caches", lambda: None)
    return TestClient(app), settings


def test_health_returns_ok():
    client = TestClient(app)

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_analyze_saves_result_and_allows_fetch(monkeypatch, tmp_path):
    client, settings = client_with_temp_storage(monkeypatch, tmp_path)

    def fake_run_pipeline(video_path, height_mm, window_L, job_id, rotated=False):
        assert height_mm == 1750
        assert window_L == 150
        assert (settings.upload_dir / job_id / "input.mp4").exists()
        return build_result(job_id)

    monkeypatch.setattr(analysis_route, "run_pipeline", fake_run_pipeline)

    response = client.post(
        "/analyze",
        files={"video": ("walk.mp4", b"fake video bytes", "video/mp4")},
        data={"height_mm": "1750"},
    )

    assert response.status_code == 200
    payload = response.json()
    job_id = payload["job"]["job_id"]
    assert payload["job"]["status"] == "completed"
    assert (settings.results_dir / job_id / "result.json").exists()

    fetch_response = client.get(f"/results/{job_id}")
    assert fetch_response.status_code == 200
    assert fetch_response.json()["job"]["job_id"] == job_id


def test_analyze_rejects_invalid_height(monkeypatch, tmp_path):
    client, _settings = client_with_temp_storage(monkeypatch, tmp_path)

    response = client.post(
        "/analyze",
        files={"video": ("walk.mp4", b"fake", "video/mp4")},
        data={"height_mm": "0"},
    )

    assert response.status_code == 422


def test_analyze_rejects_upload_above_configured_limit(monkeypatch, tmp_path):
    client, _settings = client_with_temp_storage(monkeypatch, tmp_path, max_upload_bytes=4)

    response = client.post(
        "/analyze",
        files={"video": ("walk.mp4", b"too large", "video/mp4")},
        data={"height_mm": "1750"},
    )

    assert response.status_code == 413


def test_list_jobs_returns_saved_and_processing_jobs(monkeypatch, tmp_path):
    client, settings = client_with_temp_storage(monkeypatch, tmp_path)
    completed_job = "completed-job"
    processing_job = "processing-job"

    result_dir = settings.results_dir / completed_job
    result_dir.mkdir(parents=True)
    analysis_route._write_json(result_dir / "result.json", build_result(completed_job))

    upload_dir = settings.upload_dir / processing_job
    upload_dir.mkdir(parents=True)
    (upload_dir / "input.mp4").write_bytes(b"video")

    response = client.get("/jobs")

    assert response.status_code == 200
    payload = response.json()
    assert payload["total"] == 2
    jobs = {item["job_id"]: item for item in payload["jobs"]}
    assert jobs[completed_job]["status"] == "completed"
    assert jobs[completed_job]["has_result"] is True
    assert jobs[processing_job]["status"] == "processing"
    assert jobs[processing_job]["has_result"] is False
