import logging
import os
from threading import Lock

from app.core.config import get_settings


logger = logging.getLogger("Core.Engine")

_engine = None
_engine_lock = Lock()


def get_engine():
    global _engine

    if _engine is None:
        with _engine_lock:
            if _engine is None:
                settings = get_settings()

                if settings.use_mock_engine:
                    logger.info("Iniciando mock engine")
                    from app.services.mock_engine import MockGaitAnalysisEngine

                    _engine = MockGaitAnalysisEngine()
                    logger.info("Mock engine pronta")
                    return _engine

                os.environ["XLA_PYTHON_CLIENT_PREALLOCATE"] = "false"
                os.environ["TF_FORCE_GPU_ALLOW_GROWTH"] = "true"
                os.environ["MUJOCO_GL"] = "egl"

                logger.info("Iniciando a Engine de IA")
                from app.services.gait_engine import GaitAnalysisEngine

                _engine = GaitAnalysisEngine()
                logger.info("Engine pronta")

    return _engine
