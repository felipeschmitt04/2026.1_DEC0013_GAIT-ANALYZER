import pytest

from app.services.video_metadata import get_metadata


def test_get_metadata_raises_for_missing_file(tmp_path):
    missing_file = tmp_path / "missing.mp4"

    with pytest.raises(ValueError, match="ERROR_104_PATH"):
        get_metadata(str(missing_file))
