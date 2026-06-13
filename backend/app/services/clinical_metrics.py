def calculate_angle_3d(p1, p2, p3):
    """Calcula a flexão de uma articulação em graus clínicos (0 = esticado)."""
    import numpy as np

    v1 = np.array(p1) - np.array(p2)
    v2 = np.array(p3) - np.array(p2)

    v1_u = v1 / np.linalg.norm(v1)
    v2_u = v2 / np.linalg.norm(v2)

    dot_product = np.clip(np.dot(v1_u, v2_u), -1.0, 1.0)
    internal_angle = float(np.degrees(np.arccos(dot_product)))

    return 180.0 - internal_angle


def calculate_distance_3d(p1, p2):
    """Calcula a distância física entre dois pontos 3D."""
    import numpy as np

    return float(np.linalg.norm(np.array(p1) - np.array(p2)))


def calculate_clinical_metrics(pose3d: list) -> dict:
    metrics = {
        "joelho_direito_graus": [],
        "joelho_esquerdo_graus": [],
        "quadril_direito_graus": [],
        "quadril_esquerdo_graus": [],
        "distancia_tornozelos_mm": [],
    }

    for frame in pose3d:
        # Mapeamento Human3.6M usado pela engine.
        right_shoulder = frame[14]
        right_hip = frame[1]
        right_knee = frame[2]
        right_ankle = frame[3]

        left_shoulder = frame[11]
        left_hip = frame[4]
        left_knee = frame[5]
        left_ankle = frame[6]

        metrics["joelho_direito_graus"].append(
            round(calculate_angle_3d(right_hip, right_knee, right_ankle), 2)
        )
        metrics["joelho_esquerdo_graus"].append(
            round(calculate_angle_3d(left_hip, left_knee, left_ankle), 2)
        )

        metrics["quadril_direito_graus"].append(
            round(calculate_angle_3d(right_shoulder, right_hip, right_knee), 2)
        )
        metrics["quadril_esquerdo_graus"].append(
            round(calculate_angle_3d(left_shoulder, left_hip, left_knee), 2)
        )

        ankle_distance_m = calculate_distance_3d(right_ankle, left_ankle)
        metrics["distancia_tornozelos_mm"].append(round(ankle_distance_m * 1000, 2))

    return metrics

