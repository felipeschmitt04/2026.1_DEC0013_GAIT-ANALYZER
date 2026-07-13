from datetime import datetime, timedelta, timezone

from storage.scripts import cleanup_storage


def test_collect_old_job_dirs_reports_old_directories(monkeypatch, tmp_path):
    storage_dir = tmp_path / "storage"
    uploads_dir = storage_dir / "uploads"
    old_dir = uploads_dir / "old-job"
    old_dir.mkdir(parents=True)
    (old_dir / "input.mp4").write_bytes(b"old")

    monkeypatch.setattr(cleanup_storage, "STORAGE_DIR", storage_dir)
    cutoff = datetime.now(timezone.utc) + timedelta(seconds=1)

    items = cleanup_storage.collect_old_job_dirs(uploads_dir, cutoff)

    assert len(items) == 1
    assert items[0]["path"].endswith("old-job")
    assert items[0]["size_bytes"] == 3


def test_cleanup_rejects_paths_outside_storage(monkeypatch, tmp_path):
    monkeypatch.setattr(cleanup_storage, "STORAGE_DIR", tmp_path / "storage")

    try:
        cleanup_storage.ensure_inside_storage(tmp_path / "outside")
    except ValueError as exc:
        assert "fora de backend/storage" in str(exc)
    else:
        raise AssertionError("expected ValueError")
