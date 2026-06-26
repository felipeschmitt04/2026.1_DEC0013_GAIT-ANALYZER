import os
import cv2
import numpy as np
import tensorflow as tf
import logging
import tensorflow_hub as hub
from app.ml.fitting import fit_model

logger = logging.getLogger("Engine")

"""
    Esse código abaixo serve para que a VRAM não seja alocada
    toda de uma vez pelos algoritmos e modelos pesados.
"""
logger.info("Definindo alocação dinâmica de VRAM")
# Impede o JAX de pré-alocar toda a memória
os.environ['XLA_PYTHON_CLIENT_PREALLOCATE'] = 'false'
# Impede o TensorFlow de alocar tudo
os.environ['TF_FORCE_GPU_ALLOW_GROWTH'] = 'true'

os.environ['MUJOCO_GL'] = 'egl'

from monocular_demos.utils import joint_names as get_joint_names, video_reader
from gait_transformer.gait_phase_transformer import load_default_model, gait_phase_stride_inference
from gait_transformer.gait_phase_kalman import gait_kalman_smoother

from jax import numpy as jnp
import equinox as eqx
import optax
from monocular_demos.biomechanics_mjx.monocular_trajectory import KineticsWrapper, get_default_wrapper
# from monocular_demos.biomechanics_mjx.visualize import render_trajectory

class GaitAnalysisEngine:
    def __init__(_self, window_L: int = 150):
        _self.window_L = window_L
        _self.metrabs_model = None
        _self.transformer_model = None
        _self.skeleton = 'mpi_inf_3dhp_17'
        
        _self._setup_gpu()
        _self._load_models()

    """
        Essa função configura o TensorFlow para usar memória VRAM
        conforme precisar usando memory growth.
    """
    def _setup_gpu(_self):
        gpus = tf.config.list_physical_devices("GPU")
        logger.debug("Configurando TensorFlow")
        if gpus:
            try:
                for gpu in gpus:
                    tf.config.experimental.set_memory_growth(gpu, True)
            except RuntimeError as e:
                logger.error("Erro ao ativar memory growth: {e}")
        else:
            logger.warning("Nenhuma GPU detectada")

    def _load_models(_self):
        """
            Carrega os modelos que serão usados (MeTRAbs e Transformer).
        """
        logger.debug("Carregando modelos")
        try:
            logger.info("Baixando/Carregando MeTRAbs.")
            _self.metrabs_model = hub.load('https://bit.ly/metrabs_l')
            
            logger.info("Carregando GaitTransformer")
            _self.transformer_model = load_default_model()
            
            logger.info("Modelos carregados com sucesso")
        except Exception as e:
            logger.error("Erro ao carregar os modelos")
            raise e

    def calculate_kinematics(_self, raw_pose3d):
        pose = raw_pose3d.copy()
        pose = pose[:, :, [0,2,1]]
        pose[:, :, 2] *= -1
        pose /= 1000.0
        pose = pose - np.min(pose, axis=1, keepdims=True)

        timestamps = jnp.arange(len(pose)) / 30.0
        dataset = (timestamps, pose)

        fkw = get_default_wrapper()

        updated_model, metrics = fit_model(fkw, dataset)

        (state, constraints, next_states), (ang, vel, action), _ = updated_model(
            dataset[0], skip_vel=True, skip_action=True
        )

        return ang, dataset[0]

    def process_video(_self, video_path: str, height_mm: int, rotated: bool = False):
        logger.info("Começando processamento real do vídeo")

        vid, n_frames = video_reader(video_path)
        joint_names = _self.metrabs_model.per_skeleton_joint_names[_self.skeleton].numpy().astype(str)
        accumulated = None

        logger.info("Extraindo Esqueleto (17 pontos) no MeTRAbs...")
        for i, frame_batch in enumerate(vid):
            if rotated:
                frame_batch = frame_batch.transpose(0, 2, 1, 3)

            pred = _self.metrabs_model.detect_poses_batched(frame_batch, skeleton=_self.skeleton)

            if accumulated is None:
                accumulated = pred
            else:
                for key in accumulated.keys():
                    accumulated[key] = tf.concat([accumulated[key], pred[key]], axis=0)

        pose3d = np.array([p[0] for p in accumulated['poses3d'] if len(p)>0])

        expected_order = ['pelv', 'rhip', 'rkne', 'rank', 'lhip', 'lkne', 'lank', 'spin', 'neck', 'head', 'htop', 'lsho', 'lelb', 'lwri', 'rsho', 'relb', 'rwri']
        expected_order_idx = np.array([joint_names.tolist().index(j) for j in expected_order])

        pose3d_ordenado = pose3d[:, expected_order_idx]

        keypoints = pose3d_ordenado - pose3d_ordenado[:, 0, None]
        keypoints = keypoints / 1000.0      
        keypoints = keypoints[:, :, [0, 2, 1]]
        keypoints[:, :, 2] *= -1

        phase, stride = gait_phase_stride_inference(
            keypoints, 
            height_mm, 
            _self.transformer_model, 
            _self.window_L
        )
        phase_ordered = np.take(phase, [0, 4, 1, 5, 2, 6, 3, 7], axis=-1)
        state, predictions, errors = gait_kalman_smoother(phase_ordered)

        angulos_3d, timestamps_jax = _self.calculate_kinematics(pose3d_ordenado)

        # Renderiza o vídeo final
        exit_file = '3d_rebuild.mp4'
        #render_trajectory(angulos_3d, exit_file, xml_path=None)
        np.savez('movimento_exportado.npz', angulos=angulos_3d, timestamps=timestamps_jax)

        return {
            "status": "sucesso",
            "video_3d": exit_file,
            "pose3d": keypoints.tolist(),
            "events": state.tolist(),
            "kinematics": {
                "angles": angulos_3d.tolist(),
                "timestamps": timestamps_jax.tolist()
            }
        }
