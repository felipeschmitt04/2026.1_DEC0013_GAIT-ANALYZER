from types import SimpleNamespace

from fastapi.testclient import TestClient

import app.api.routes.analysis as analysis_route
import app.api.routes.worker as worker_route
import app.services.job_store as job_store
from app.main import app


def fake_video_metadata(_path):
    return {
        "frame_count": 12,
        "fps": 30.0,
        "duration_ms": 400,
        "width": 640,
        "height": 480,
        "warnings": [],
    }


def minimal_raw_data():
    return {
        "events": [],
        "kinematics": {"angles": [[0.0] * 40], "timestamps": [0.0]},
        "pose3d": [[[0.0, 0.0, 0.0] for _ in range(17)]],
    }


def configure_queue(monkeypatch, tmp_path, worker_token="secret"):
    settings = SimpleNamespace(
        upload_dir=tmp_path / "uploads",
        results_dir=tmp_path / "results",
        jobs_dir=tmp_path / "jobs",
        window_l=150,
        max_upload_bytes=1024 * 1024,
        engine_mode="queue",
        worker_token=worker_token,
        worker_claim_ttl_s=900,
    )
    monkeypatch.setattr(analysis_route, "get_settings", lambda: settings)
    monkeypatch.setattr(worker_route, "get_settings", lambda: settings)
    monkeypatch.setattr(job_store, "get_settings", lambda: settings)
    monkeypatch.setattr(analysis_route, "get_metadata", fake_video_metadata)
    monkeypatch.setattr(worker_route, "get_metadata", fake_video_metadata)
    monkeypatch.setattr(worker_route, "calculate_clinical_metrics", lambda _pose: {})
    return settings


def test_analyze_queue_mode_creates_pull_job(monkeypatch, tmp_path):
    settings = configure_queue(monkeypatch, tmp_path, worker_token=None)
    client = TestClient(app)

    response = client.post(
        "/analyze",
        files={"video": ("walk.mp4", b"fake video bytes", "video/mp4")},
        data={"height_mm": "1750"},
    )

    assert response.status_code == 200
    payload = response.json()
    job_id = payload["job"]["job_id"]
    assert payload["job"]["status"] == "queued"
    assert (settings.upload_dir / job_id / "input.mp4").exists()
    assert (settings.results_dir / job_id / "result.json").exists()
    stored_job = job_store.read_job(job_id)
    assert stored_job["status"] == "queued"
    assert stored_job["height_mm"] == 1750


def test_worker_token_is_required_when_configured(monkeypatch, tmp_path):
    configure_queue(monkeypatch, tmp_path, worker_token="secret")
    client = TestClient(app)

    response = client.get("/worker/jobs/next")

    assert response.status_code == 401


def test_worker_can_claim_download_and_submit_result(monkeypatch, tmp_path):
    settings = configure_queue(monkeypatch, tmp_path, worker_token="secret")
    client = TestClient(app)
    headers = {"X-Worker-Token": "secret"}

    upload_path = settings.upload_dir / "job-1" / "input.mp4"
    upload_path.parent.mkdir(parents=True)
    upload_path.write_bytes(b"video bytes")
    job_store.create_job(
        job_id="job-1",
        upload_path=upload_path,
        height_mm=1750,
        rotated=False,
        window_l=150,
        original_filename="walk.mp4",
    )

    next_response = client.get("/worker/jobs/next", headers=headers)
    assert next_response.status_code == 200
    assert next_response.json()["job"]["job_id"] == "job-1"

    claim_response = client.post(
        "/worker/jobs/job-1/claim",
        headers=headers,
        json={"worker_id": "dgx-1"},
    )
    assert claim_response.status_code == 200
    assert claim_response.json()["job"]["status"] == "claimed"

    status_response = client.get("/status/job-1")
    assert status_response.status_code == 200
    assert status_response.json()["status"] == "claimed"

    input_response = client.get("/worker/jobs/job-1/input", headers=headers)
    assert input_response.status_code == 200
    assert input_response.content == b"video bytes"

    result_response = client.post(
        "/worker/jobs/job-1/result",
        headers=headers,
        files={
            "raw_result": ("raw_result.json", __import__("json").dumps({"raw_data": minimal_raw_data()}), "application/json"),
            "movement_npz": ("movimento_exportado.npz", b"npz", "application/octet-stream"),
        },
    )

    assert result_response.status_code == 200
    payload = result_response.json()
    assert payload["job"]["status"] == "completed"
    assert payload["data"]["artifacts"]["movement_npz"] == "/results/job-1/artifacts/movimento_exportado.npz"
    assert (settings.results_dir / "job-1" / "result.json").exists()
    assert job_store.read_job("job-1")["status"] == "completed"
