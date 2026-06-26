POSE3D_JOINT_NAMES = [
    "pelvis",
    "right_hip",
    "right_knee",
    "right_ankle",
    "left_hip",
    "left_knee",
    "left_ankle",
    "spine",
    "neck",
    "head",
    "head_top",
    "left_shoulder",
    "left_elbow",
    "left_wrist",
    "right_shoulder",
    "right_elbow",
    "right_wrist",
]

POSE3D_CONNECTIONS = [
    [0, 1],
    [1, 2],
    [2, 3],
    [0, 4],
    [4, 5],
    [5, 6],
    [0, 7],
    [7, 8],
    [8, 9],
    [9, 10],
    [8, 11],
    [11, 12],
    [12, 13],
    [8, 14],
    [14, 15],
    [15, 16],
]


def get_pose3d_skeleton_info() -> dict:
    return {
        "name": "mpi_inf_3dhp_17_normalized",
        "joint_names": POSE3D_JOINT_NAMES,
        "connections": POSE3D_CONNECTIONS,
        "root_joint": "pelvis",
        "units": "meters",
        "coordinate_system": {
            "x": "lateral",
            "y": "vertical",
            "z": "depth",
            "origin": "pelvis",
        },
    }
