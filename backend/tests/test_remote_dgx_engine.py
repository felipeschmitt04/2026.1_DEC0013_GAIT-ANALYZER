from pathlib import Path

import app.services.remote_dgx_engine as remote_module
from app.services.remote_dgx_engine import RemoteDgxEngine


class FakePostResponse:
    def __init__(self, payload):
        self.payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self.payload


class FakeStreamResponse:
    def __init__(self, chunks):
        self.chunks = chunks

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, traceback):
        return False

    def raise_for_status(self):
        return None

    def iter_bytes(self):
        yield from self.chunks


def minimal_raw_data():
    return {
        "events": [],
        "kinematics": {"angles": [], "timestamps": []},
        "pose3d": [],
    }


def test_remote_dgx_engine_posts_video_and_downloads_allowed_artifacts(monkeypatch, tmp_path):
    video_path = tmp_path / "input.mp4"
    video_path.write_bytes(b"video")
    post_calls = []
    stream_calls = []

    def fake_post(url, data, files, timeout):
        post_calls.append({"url": url, "data": data, "files": files, "timeout": timeout})
        return FakePostResponse(
            {
                "raw_data": minimal_raw_data(),
                "artifacts": {"movement_npz": "/results/job-1/artifacts/movimento_exportado.npz"},
            }
        )

    def fake_stream(method, url, timeout):
        stream_calls.append({"method": method, "url": url, "timeout": timeout})
        return FakeStreamResponse([b"npz", b" bytes"])

    monkeypatch.setattr(remote_module.httpx, "post", fake_post)
    monkeypatch.setattr(remote_module.httpx, "stream", fake_stream)

    result = RemoteDgxEngine("http://dgx:9000", timeout_s=12).process_video(
        str(video_path),
        height_mm=1750,
        rotated=True,
    )

    assert post_calls[0]["url"] == "http://dgx:9000/process"
    assert post_calls[0]["data"] == {"height_mm": "1750", "rotated": "true"}
    assert stream_calls[0]["url"] == "http://dgx:9000/results/job-1/artifacts/movimento_exportado.npz"
    artifact_path = Path(result["artifacts"]["movement_npz"])
    assert artifact_path == tmp_path / "movimento_exportado.npz"
    assert artifact_path.read_bytes() == b"npz bytes"


def test_remote_dgx_engine_ignores_unexpected_artifact_names(monkeypatch, tmp_path):
    video_path = tmp_path / "input.mp4"
    video_path.write_bytes(b"video")

    monkeypatch.setattr(
        remote_module.httpx,
        "post",
        lambda *args, **kwargs: FakePostResponse(
            {
                "raw_data": minimal_raw_data(),
                "artifacts": {"bad": "/results/job-1/artifacts/secrets.txt"},
            }
        ),
    )

    result = RemoteDgxEngine("http://dgx:9000").process_video(str(video_path), height_mm=1750)

    assert result["artifacts"] == {}
