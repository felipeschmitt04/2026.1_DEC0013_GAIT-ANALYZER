import math


class MockGaitAnalysisEngine:
    """Engine leve para testar contrato da API sem modelos de IA."""

    def __init__(self, window_L: int = 150):
        self.window_L = window_L

    def process_video(self, video_path: str, height_mm: int, rotated: bool = False):
        frame_count = 30
        pose3d = []

        for index in range(frame_count):
            phase = math.sin(index / 4)
            frame = [[0.0, 0.0, 0.0] for _ in range(17)]

            frame[0] = [0.0, 0.9, 0.0]
            frame[1] = [0.12, 0.9, 0.0]
            frame[2] = [0.12, 0.48 + 0.04 * phase, 0.02]
            frame[3] = [0.12, 0.05, 0.12 + 0.08 * phase]
            frame[4] = [-0.12, 0.9, 0.0]
            frame[5] = [-0.12, 0.48 - 0.04 * phase, -0.02]
            frame[6] = [-0.12, 0.05, -0.12 - 0.08 * phase]
            frame[7] = [0.0, 1.1, 0.0]
            frame[8] = [0.0, 1.35, 0.0]
            frame[9] = [0.0, 1.5, 0.0]
            frame[10] = [0.0, 1.62, 0.0]
            frame[11] = [-0.18, 1.32, 0.0]
            frame[12] = [-0.34, 1.05, 0.0]
            frame[13] = [-0.42, 0.82, 0.0]
            frame[14] = [0.18, 1.32, 0.0]
            frame[15] = [0.34, 1.05, 0.0]
            frame[16] = [0.42, 0.82, 0.0]

            pose3d.append(frame)

        timestamps = [index / 30 for index in range(frame_count)]

        return {
            "status": "sucesso_mock",
            "video_3d": None,
            "pose3d": pose3d,
            "events": [[0.0] * 8 for _ in range(frame_count)],
            "kinematics": {
                "angles": [[0.0] * 10 for _ in range(frame_count)],
                "timestamps": timestamps,
            },
        }

