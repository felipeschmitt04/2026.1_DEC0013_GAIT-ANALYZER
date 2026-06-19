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
                engine_mode = settings.engine_mode.lower()

                if engine_mode == "mock":
                    logger.info("Iniciando mock engine")
                    from app.services.mock_engine import MockGaitAnalysisEngine

                    _engine = MockGaitAnalysisEngine()
                    logger.info("Mock engine pronta")
                    return _engine

                if engine_mode == "remote":
                    if not settings.remote_engine_url:
                        raise RuntimeError(
                            "REMOTE_ENGINE_URL deve ser definido quando ENGINE_MODE=remote"
                        )

                    logger.info("Iniciando remote DGX engine em %s", settings.remote_engine_url)
                    from app.services.remote_dgx_engine import RemoteDgxEngine

                    _engine = RemoteDgxEngine(
                        base_url=settings.remote_engine_url,
                        timeout_s=settings.remote_engine_timeout_s,
                    )
                    logger.info("Remote DGX engine pronta")
                    return _engine

                if engine_mode != "local":
                    raise RuntimeError(
                        f"ENGINE_MODE invalido: {settings.engine_mode}. Use mock, local ou remote."
                    )

                os.environ["XLA_PYTHON_CLIENT_PREALLOCATE"] = "false"
                os.environ["TF_FORCE_GPU_ALLOW_GROWTH"] = "true"
                os.environ["MUJOCO_GL"] = "egl"

                logger.info("Iniciando a Engine de IA")
                from app.services.gait_engine import GaitAnalysisEngine

                _engine = GaitAnalysisEngine()
                logger.info("Engine pronta")

    return _engine
