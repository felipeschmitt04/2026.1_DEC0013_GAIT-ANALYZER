import os


def get_metadata(file_path):
    if not os.path.isfile(file_path):
        raise ValueError("ERROR_104_PATH")

    import cv2

    cap = cv2.VideoCapture(file_path)

    try:
        if not cap.isOpened():
            raise ValueError("ERROR_103_VIDEO_OPEN")

        warnings = []

        fps = cap.get(cv2.CAP_PROP_FPS)
        if fps <= 0:
            raise ValueError("ERROR_101_FPS_INVALID")
        if fps < 30:
            warnings.append("WARNING_101_LOW_FPS")

        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        if width < 400 or height < 400:
            warnings.append("WARNING_103_LOW_RES")

        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration_s = frame_count / fps
        if duration_s <= 0:
            raise ValueError("ERROR_102_VIDEO_DURATION")
        if duration_s < 2:
            warnings.append("WARNING_102_VIDEO_SHORT")

        return {
            "is_valid": True,
            "warnings": warnings,
            "fps": fps,
            "width": width,
            "height": height,
            "frame_count": frame_count,
            "duration_ms": int(duration_s * 1000),
            "is_portrait": height > width,
            "rotated": False,
        }
    finally:
        cap.release()
