import app.services.pipeline as pipeline


def test_run_pipeline_returns_structured_error_for_engine_failure(monkeypatch, tmp_path):
    def fake_metadata(_video_path):
        return {
            "is_valid": True,
            "warnings": [],
            "fps": 30.0,
            "frame_count": 10,
            "duration_ms": 333,
        }

    class BrokenEngine:
        def process_video(self, video_path, height_mm, rotated=False):
            raise RuntimeError("engine unavailable")

    monkeypatch.setattr(pipeline, "get_metadata", fake_metadata)

    result = pipeline.run_pipeline(
        video_path=str(tmp_path / "input.mp4"),
        height_mm=1750,
        window_L=150,
        engine=BrokenEngine(),
        job_id="job-1",
    )

    assert result.job.status == "failed"
    assert result.error.code == "ERROR_PIPELINE_FAILED"
    assert result.error.retryable is True
    assert result.input_summary.height_mm == 1750
    assert result.quality_info.frames_total == 10


def test_run_pipeline_returns_validation_error_for_missing_video(tmp_path):
    result = pipeline.run_pipeline(
        video_path=str(tmp_path / "missing.mp4"),
        height_mm=1750,
        window_L=150,
        engine=None,
        job_id="job-2",
    )

    assert result.job.status == "failed"
    assert result.error.code == "ERROR_104_PATH"
    assert result.error.retryable is False
