import logging
from datetime import datetime, timezone
from uuid import uuid4

from app.core.engine import get_engine
from app.schemas.error import ErrorInfo
from app.schemas.input import InputSummary, QualityInfo
from app.schemas.job import JobInfo
from app.schemas.result import BiomechanicalData, ResultV1
from app.services.clinical_metrics import calculate_clinical_metrics
from app.services.fitting_metadata import build_fitting_payload
from app.services.skeleton import get_pose3d_skeleton_info
from app.services.video_metadata import get_metadata

logger = logging.getLogger("Pipeline")


def run_pipeline(video_path, height_mm, window_L, engine=None, job_id=None, rotated: bool = False):
    logger.info("Iniciando pipeline")
    logger.debug("Criando job")

    job = JobInfo(
        job_id=job_id or str(uuid4()),
        status="running",
        stage="ingest",
        created_at=datetime.now(timezone.utc),
        started_at=datetime.now(timezone.utc),
        finished_at=None,
        duration_ms=0,
    )

    def finish_job(status: str, stage: str | None = None) -> None:
        job.status = status
        if stage is not None:
            job.stage = stage
        job.finished_at = datetime.now(timezone.utc)
        job.duration_ms = int((job.finished_at - job.started_at).total_seconds() * 1000)

    logger.debug("Job criado, entrando no try")
    input_summary = None
    quality_info = None

    try:
        logger.info("Extraindo metadados")

        video_data = get_metadata(video_path)  # Extrai todos os metadados dos vídeos

        logger.info("Metadados extraídos, instanciando classes")

        input_summary = InputSummary(  # Com base nos metadados, preenche o InputSummary
            video_path=video_path,
            height_mm=height_mm,
            window_L=window_L,
            rotated=rotated,
            fps=video_data["fps"],
            duration_ms=video_data["duration_ms"],
        )

        logger.debug("InputSummary foi")

        quality_info = QualityInfo(  # Aqui, com base nos metadados também, são preenchidos os dados da qualidade dos frames
            frames_total=video_data["frame_count"],
            frames_without_detection=0,
            warnings=video_data["warnings"],
        )

        logger.debug("QualityInfo foi")

        if video_data["is_valid"]:
            job.status = "processing"
            job.stage = "fase_1"

            logger.info("Video validado, começando Fase 1")

            if engine is None:
                engine = get_engine()

            raw_data = (
                engine.process_video(  # Aqui chama a função que vai processar o vídeo
                    video_path=video_path,
                    height_mm=height_mm,
                    rotated=rotated,
                )
            )

            logger.info("Vídeo processado com sucesso")

            diagnostics = raw_data.get("diagnostics", {}) if isinstance(raw_data, dict) else {}
            gait_pose_frames = diagnostics.get("gait_pose_frames")
            if isinstance(gait_pose_frames, int):
                quality_info.frames_without_detection = max(
                    0,
                    video_data["frame_count"] - gait_pose_frames,
                )
                if quality_info.frames_without_detection > 0:
                    quality_info.warnings.append("WARNING_201_PARTIAL_POSE_DETECTION")
            finish_job(status="completed", stage="finished")

            dados_biomecanicos = BiomechanicalData(
                events=raw_data["events"],
                kinematics=raw_data["kinematics"],
                pose3d=raw_data["pose3d"],
                skeleton=get_pose3d_skeleton_info(),
                fitting=build_fitting_payload(raw_data["kinematics"]),
                model3d=raw_data.get("model3d"),
                metricas_clinicas=calculate_clinical_metrics(raw_data["pose3d"]),
                artifacts=raw_data.get("artifacts"),
                video_3d=None,
            )

            return ResultV1(
                result_version="1.0",
                job=job,
                input_summary=input_summary,
                quality_info=quality_info,
                data=dados_biomecanicos,
            )

        else:
            logger.error("Video inválido")

            error_info = ErrorInfo(
                code="ERROR_VIDEO_INVALID",
                message="O vídeo enviado não pôde ser aberto ou não atende aos requisitos básicos",
                stage=job.stage,
                retryable=False,
                details=str(video_data["warnings"]),
            )

            finish_job(status="failed")

            return ResultV1(
                result_version="1.0",
                job=job,
                error=error_info,
                input_summary=input_summary,
                quality_info=quality_info,
            )

    except ValueError as e:
        error_code = str(e)

        error_info = ErrorInfo(
            code=error_code,
            message="O vídeo falhou na validação inicial do OpenCV",
            stage="ingest",
            retryable=False,
        )

        finish_job(status="failed", stage="ingest")

        return ResultV1(result_version="1.0", job=job, error=error_info)

    except Exception as e:
        logger.exception("Falha inesperada no pipeline")

        error_info = ErrorInfo(
            code="ERROR_PIPELINE_FAILED",
            message="Falha inesperada durante o processamento do video",
            stage=job.stage,
            retryable=True,
            details=f"{type(e).__name__}: {e}",
        )

        finish_job(status="failed", stage=job.stage)

        return ResultV1(
            result_version="1.0",
            job=job,
            error=error_info,
            input_summary=input_summary,
            quality_info=quality_info,
        )
