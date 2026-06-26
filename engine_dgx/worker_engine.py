import logging
import os
import sys
from pathlib import Path
from threading import Lock


logger = logging.getLogger("EngineDGX.Worker")
BASE_DIR = Path(__file__).resolve().parent

_engine = None
_engine_lock = Lock()


def configure_runtime() -> None:
    os.environ.setdefault("XLA_PYTHON_CLIENT_PREALLOCATE", "false")
    os.environ.setdefault("TF_FORCE_GPU_ALLOW_GROWTH", "true")
    os.environ.setdefault("MUJOCO_GL", os.getenv("MUJOCO_GL", "egl"))


class _EngineFactory:
    loaded = False

    def __call__(self):
        global _engine

        if _engine is None:
            with _engine_lock:
                if _engine is None:
                    configure_runtime()
                    if str(BASE_DIR) not in sys.path:
                        sys.path.insert(0, str(BASE_DIR))
                    logger.info("Carregando GaitAnalysisEngine na DGX")
                    from gait_engine import GaitAnalysisEngine

                    _engine = GaitAnalysisEngine()
                    self.loaded = True
                    logger.info("GaitAnalysisEngine pronta")

        return _engine


get_engine = _EngineFactory()
