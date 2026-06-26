"""Diagnostico rapido do runtime pesado em ambientes com GPU."""

import os
import sys
from pathlib import Path


def main() -> None:
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

    os.environ.setdefault("XLA_PYTHON_CLIENT_PREALLOCATE", "false")
    os.environ.setdefault("TF_FORCE_GPU_ALLOW_GROWTH", "true")
    os.environ.setdefault("MUJOCO_GL", "egl")

    import jax
    import mujoco
    import tensorflow as tf
    import tensorflow_hub as hub
    import equinox
    import optax

    from app.services.gait_engine import GaitAnalysisEngine

    print("TensorFlow GPUs:", tf.config.list_physical_devices("GPU"))
    print("JAX devices:", jax.devices())
    print("MuJoCo:", mujoco.__version__)
    print("TensorFlow Hub:", hub.__version__)
    print("Equinox:", equinox.__version__)
    print("Optax:", optax.__version__)
    print("GaitAnalysisEngine import: ok")


if __name__ == "__main__":
    main()
