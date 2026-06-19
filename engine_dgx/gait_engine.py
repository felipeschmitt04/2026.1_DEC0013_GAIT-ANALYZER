import logging
import os

import numpy as np
import tensorflow as tf
import tensorflow_hub as hub
from jax import numpy as jnp

from fitting import fit_model
from model3d_export import build_model3d_payload


logger = logging.getLogger("EngineDGX.GaitEngine")

os.environ.setdefault("XLA_PYTHON_CLIENT_PREALLOCATE", "false")
os.environ.setdefault("TF_FORCE_GPU_ALLOW_GROWTH", "true")
os.environ.setdefault("MUJOCO_GL", "egl")

from gait_transformer.gait_phase_kalman import gait_kalman_smoother
from gait_transformer.gait_phase_transformer import (
    gait_phase_stride_inference,
    load_default_model,
)
from monocular_demos.biomechanics_mjx.monocular_trajectory import get_default_wrapper
from monocular_demos.utils import video_reader


class GaitAnalysisEngine:
    def __init__(self, window_L: int = 150):
        self.window_L = window_L
        self.metrabs_model = None
        self.transformer_model = None
        self.gait_skeleton = "mpi_inf_3dhp_17"
        self.fitting_skeleton = "bml_movi_87"
        self.skeleton = self.gait_skeleton

        self._setup_gpu()
        self._load_models()

    def _setup_gpu(self):
        gpus = tf.config.list_physical_devices("GPU")
        if gpus:
            try:
                for gpu in gpus:
                    tf.config.experimental.set_memory_growth(gpu, True)
                logger.info("TensorFlow GPUs detectadas: %s", gpus)
            except RuntimeError as exc:
                logger.warning("Nao foi possivel ativar memory growth: %s", exc)
        else:
            logger.warning("Nenhuma GPU detectada pelo TensorFlow")

    def _load_models(self):
        logger.info("Carregando MeTRAbs")
        self.metrabs_model = hub.load("https://bit.ly/metrabs_l")

        logger.info("Carregando GaitTransformer")
        self.transformer_model = load_default_model()

        logger.info("Modelos carregados")

    def calculate_kinematics(self, raw_pose3d):
        pose = raw_pose3d.copy()
        pose = pose[:, :, [0, 2, 1]]
        pose[:, :, 2] *= -1
        pose /= 1000.0
        pose = pose - np.min(pose, axis=1, keepdims=True)

        timestamps = jnp.arange(len(pose)) / 30.0
        dataset = (timestamps, pose)

        fkw = get_default_wrapper()
        updated_model, _metrics = fit_model(fkw, dataset)

        (state, _constraints, _next_states), (ang, _vel, _action), _ = updated_model(
            dataset[0], skip_vel=True, skip_action=True
        )
        model3d = build_model3d_payload(updated_model, state, pose=ang)

        return ang, dataset[0], model3d

    def process_video(self, video_path: str, height_mm: int, rotated: bool = False):
        logger.info("Processando video real: %s", video_path)

        vid, n_frames = video_reader(video_path)
        gait_joint_names = (
            self.metrabs_model.per_skeleton_joint_names[self.gait_skeleton]
            .numpy()
            .astype(str)
        )
        accumulated_gait = None
        accumulated_fitting = None

        logger.info("Extraindo pose 3D com MeTRAbs para gait e fitting")
        for frame_batch in vid:
            if rotated:
                frame_batch = frame_batch.transpose(0, 2, 1, 3)

            pred_gait = self.metrabs_model.detect_poses_batched(
                frame_batch,
                skeleton=self.gait_skeleton,
            )
            pred_fitting = self.metrabs_model.detect_poses_batched(
                frame_batch,
                skeleton=self.fitting_skeleton,
            )

            if accumulated_gait is None:
                accumulated_gait = pred_gait
                accumulated_fitting = pred_fitting
            else:
                for key in accumulated_gait.keys():
                    accumulated_gait[key] = tf.concat([accumulated_gait[key], pred_gait[key]], axis=0)
                for key in accumulated_fitting.keys():
                    accumulated_fitting[key] = tf.concat([accumulated_fitting[key], pred_fitting[key]], axis=0)

        gait_people_per_frame = [len(p) for p in accumulated_gait["poses3d"]]
        fitting_people_per_frame = [len(p) for p in accumulated_fitting["poses3d"]]
        pose3d_gait = np.array([p[0] for p in accumulated_gait["poses3d"] if len(p) > 0])
        pose3d_fitting = np.array([p[0] for p in accumulated_fitting["poses3d"] if len(p) > 0])
        if len(pose3d_gait) == 0 or len(pose3d_fitting) == 0:
            raise ValueError("Nenhuma pose foi detectada no video")

        diagnostics = {
            "video_reader_frames": int(n_frames),
            "rotated": bool(rotated),
            "gait_skeleton": self.gait_skeleton,
            "fitting_skeleton": self.fitting_skeleton,
            "gait_pose_frames": int(len(pose3d_gait)),
            "fitting_pose_frames": int(len(pose3d_fitting)),
            "gait_frames_without_detection": int(sum(count == 0 for count in gait_people_per_frame)),
            "fitting_frames_without_detection": int(sum(count == 0 for count in fitting_people_per_frame)),
        }
        logger.info("Diagnostico de deteccao: %s", diagnostics)

        expected_order = [
            "pelv",
            "rhip",
            "rkne",
            "rank",
            "lhip",
            "lkne",
            "lank",
            "spin",
            "neck",
            "head",
            "htop",
            "lsho",
            "lelb",
            "lwri",
            "rsho",
            "relb",
            "rwri",
        ]
        expected_order_idx = np.array(
            [gait_joint_names.tolist().index(joint) for joint in expected_order]
        )

        pose3d_ordered = pose3d_gait[:, expected_order_idx]

        keypoints = pose3d_ordered - pose3d_ordered[:, 0, None]
        keypoints = keypoints / 1000.0
        keypoints = keypoints[:, :, [0, 2, 1]]
        keypoints[:, :, 2] *= -1

        phase, _stride = gait_phase_stride_inference(
            keypoints,
            height_mm,
            self.transformer_model,
            self.window_L,
        )
        phase_ordered = np.take(phase, [0, 4, 1, 5, 2, 6, 3, 7], axis=-1)
        state, _predictions, _errors = gait_kalman_smoother(phase_ordered)

        angles_3d, timestamps_jax, model3d = self.calculate_kinematics(pose3d_fitting)

        np.savez("movimento_exportado.npz", angulos=angles_3d, timestamps=timestamps_jax)

        return {
            "status": "sucesso",
            "video_3d": None,
            "pose3d": keypoints.tolist(),
            "events": state.tolist(),
            "kinematics": {
                "angles": angles_3d.tolist(),
                "timestamps": timestamps_jax.tolist(),
            },
            "model3d": model3d,
            "diagnostics": diagnostics,
        }
