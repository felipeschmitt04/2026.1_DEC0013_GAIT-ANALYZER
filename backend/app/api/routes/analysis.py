import json
import logging
from datetime import datetime, timezone
import shutil
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.encoders import jsonable_encoder
from fastapi.responses import FileResponse

from app.core.config import get_settings
from app.schemas.error import ErrorInfo
from app.schemas.input import InputSummary, QualityInfo
from app.schemas.job import JobInfo
from app.schemas.result import ResultV1
from app.services.job_store import create_job, list_jobs as list_queued_jobs, read_job as read_queued_job
from app.services.pipeline import run_pipeline
from app.services.report_generator import REPORT_FILENAME, generate_gait_report_pdf
from app.services.video_metadata import get_metadata


logger = logging.getLogger("API.Analysis")
router = APIRouter()

ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv"}
UPLOAD_CHUNK_SIZE = 1024 * 1024
ALLOWED_ARTIFACT_FILENAMES = {"3d_rebuild.mp4", "movimento_exportado.npz", REPORT_FILENAME}


def _clear_accelerator_caches() -> None:
    """Libera caches de aceleradores antes de uma analise local pesada.

    Parametros:
        Nenhum.

    Saida:
        Nao retorna valor. Se JAX/Equinox nao estiverem instalados, apenas registra aviso.
    """
    try:
        import equinox as eqx
        import jax
    except ImportError:
        logger.warning("JAX/Equinox não disponíveis para limpar caches")
        return

    eqx.clear_caches()
    jax.clear_caches()


def _write_json(path: Path, payload) -> None:
    """Salva um objeto Python como JSON formatado.

    Parametros:
        path: Arquivo de destino.
        payload: Objeto serializavel, incluindo modelos Pydantic.

    Saida:
        Nao retorna valor. Cria a pasta pai automaticamente.
    """
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as file:
        json.dump(jsonable_encoder(payload), file, ensure_ascii=False, indent=2)


def _read_json(path: Path):
    """Le um arquivo JSON do disco.

    Parametros:
        path: Caminho do arquivo JSON.

    Retorna:
        O conteudo desserializado como `dict`, `list` ou valor JSON equivalente.
    """
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def _validate_video_upload(video: UploadFile) -> None:
    """Valida rapidamente se o upload parece ser um video aceito.

    Parametros:
        video: Arquivo enviado pelo cliente via multipart/form-data.

    Saida:
        Nao retorna valor. Levanta `HTTPException 415` quando a extensao/tipo nao e aceito.
    """
    suffix = Path(video.filename or "").suffix.lower()
    content_type = (video.content_type or "").lower()
    looks_like_video = content_type.startswith("video/")
    common_binary_upload = content_type in {
        "",
        "application/octet-stream",
        "binary/octet-stream",
    }

    if suffix not in ALLOWED_VIDEO_EXTENSIONS and not looks_like_video and not common_binary_upload:
        raise HTTPException(
            status_code=415,
            detail="Formato de video nao suportado. Use mp4, mov, avi ou mkv.",
        )


def _save_upload_file(video: UploadFile, upload_path: Path, max_bytes: int) -> int:
    """Grava o upload em disco sem carregar o arquivo inteiro em memoria.

    Parametros:
        video: Arquivo recebido pela API.
        upload_path: Destino final do video.
        max_bytes: Limite maximo permitido para evitar uploads gigantes.

    Retorna:
        Quantidade de bytes gravados.
    """
    total_bytes = 0

    with upload_path.open("wb") as buffer:
        while True:
            chunk = video.file.read(UPLOAD_CHUNK_SIZE)
            if not chunk:
                break

            total_bytes += len(chunk)
            if total_bytes > max_bytes:
                buffer.close()
                upload_path.unlink(missing_ok=True)
                raise HTTPException(
                    status_code=413,
                    detail="Arquivo de video excede o tamanho maximo configurado",
                )

            buffer.write(chunk)

    return total_bytes


def _build_queued_result(job_id: str, upload_path: Path, height_mm: int, window_l: int, rotated: bool) -> ResultV1:
    """Monta a resposta inicial quando o backend trabalha em modo fila.

    Parametros:
        job_id: Identificador unico da analise.
        upload_path: Video ja salvo no disco.
        height_mm: Altura informada pelo usuario, em milimetros.
        window_l: Janela usada pelo modelo temporal de marcha.
        rotated: Indica se o front informou que o video deve ser rotacionado.

    Retorna:
        Um `ResultV1` com status `queued`, pronto para o front acompanhar por polling.
    """
    now = datetime.now(timezone.utc)
    video_data = get_metadata(str(upload_path))
    return ResultV1(
        result_version="1.0",
        job=JobInfo(
            job_id=job_id,
            status="queued",
            stage="waiting_worker",
            created_at=now,
            started_at=None,
            finished_at=None,
            duration_ms=0,
        ),
        input_summary=InputSummary(
            video_path=str(upload_path),
            height_mm=height_mm,
            rotated=rotated,
            window_L=window_l,
            fps=video_data["fps"],
            duration_ms=video_data["duration_ms"],
        ),
        quality_info=QualityInfo(
            frames_total=video_data["frame_count"],
            frames_without_detection=0,
            warnings=video_data["warnings"],
        ),
    )


def _build_failed_ingest_result(job_id: str, error_code: str) -> ResultV1:
    """Monta uma resposta de falha quando o video nao passa pela validacao inicial.

    Parametros:
        job_id: Identificador da analise criada.
        error_code: Codigo tecnico que explica a falha de ingestao.

    Retorna:
        Um `ResultV1` com `error` preenchido e status `failed`.
    """
    now = datetime.now(timezone.utc)
    return ResultV1(
        result_version="1.0",
        job=JobInfo(
            job_id=job_id,
            status="failed",
            stage="ingest",
            created_at=now,
            started_at=now,
            finished_at=now,
            duration_ms=0,
        ),
        error=ErrorInfo(
            code=error_code,
            message="O vídeo falhou na validação inicial do OpenCV",
            stage="ingest",
            retryable=False,
        ),
    )


def _store_generated_artifacts(result_dir: Path, job_id: str, source_artifacts: dict | None = None) -> dict:
    """Move artefatos gerados pela engine para a pasta publica do resultado.

    Parametros:
        result_dir: Pasta final do job dentro de `storage/results`.
        job_id: Identificador usado para montar URLs publicas dos artefatos.
        source_artifacts: Caminhos temporarios retornados pela engine.

    Retorna:
        Dicionario com chaves do contrato (`video_3d`, `movement_npz`) e URLs publicas.
    """
    artifacts = {}

    for filename, key in (
        ("3d_rebuild.mp4", "video_3d"),
        ("movimento_exportado.npz", "movement_npz"),
    ):
        candidates = []
        if source_artifacts and source_artifacts.get(key):
            candidates.append(Path(source_artifacts[key]))

        source = next((candidate for candidate in candidates if candidate.exists()), None)
        if source is not None:
            result_dir.mkdir(parents=True, exist_ok=True)
            target = result_dir / filename
            if source.resolve() != target.resolve():
                shutil.move(str(source), str(target))
            artifacts[key] = f"/results/{job_id}/artifacts/{filename}"

    return artifacts


def _job_summary_from_result(job_id: str, payload: dict) -> dict:
    """Extrai um resumo leve a partir de um `result.json`.

    Parametros:
        job_id: Identificador do job.
        payload: Conteudo completo do resultado salvo.

    Retorna:
        Dicionario compacto para alimentar a rota `/jobs`.
    """
    data = payload.get("data") or {}
    artifacts = data.get("artifacts") or {}
    if (get_settings().results_dir / job_id / REPORT_FILENAME).exists():
        artifacts = {**artifacts, "report_pdf": f"/results/{job_id}/report.pdf"}
    return {
        "job_id": job_id,
        "job": payload.get("job"),
        "status": (payload.get("job") or {}).get("status"),
        "stage": (payload.get("job") or {}).get("stage"),
        "created_at": (payload.get("job") or {}).get("created_at"),
        "finished_at": (payload.get("job") or {}).get("finished_at"),
        "has_result": True,
        "has_model3d": data.get("model3d") is not None,
        "artifacts": artifacts,
    }


def _read_result_summary_from_path(job_id: str, result_path: Path | None) -> dict | None:
    """Tenta ler o resumo de um resultado ja salvo.

    Parametros:
        job_id: Identificador do job.
        result_path: Caminho do `result.json`, quando conhecido.

    Retorna:
        Resumo do resultado ou `None` se o arquivo nao existe/esta invalido.
    """
    if result_path is None or not result_path.exists():
        return None

    try:
        return _job_summary_from_result(job_id, _read_json(result_path))
    except (json.JSONDecodeError, OSError) as exc:
        logger.warning("Ignorando resultado invalido do job %s: %s", job_id, exc)
        return None


def _collect_job_summaries() -> list[dict]:
    """Consolida jobs vindos de uploads, resultados e fila.

    Parametros:
        Nenhum.

    Retorna:
        Lista ordenada do job mais recente para o mais antigo, usada pela rota `/jobs`.
    """
    settings = get_settings()
    jobs_by_id = {}

    if settings.results_dir.exists():
        for result_path in settings.results_dir.glob("*/result.json"):
            job_id = result_path.parent.name
            try:
                jobs_by_id[job_id] = _job_summary_from_result(job_id, _read_json(result_path))
            except (json.JSONDecodeError, OSError) as exc:
                logger.warning("Ignorando resultado invalido do job %s: %s", job_id, exc)

    if settings.upload_dir.exists():
        for upload_path in settings.upload_dir.glob("*/input.mp4"):
            job_id = upload_path.parent.name
            jobs_by_id.setdefault(
                job_id,
                {
                    "job_id": job_id,
                    "job": None,
                    "status": "processing",
                    "stage": "unknown",
                    "created_at": None,
                    "finished_at": None,
                    "has_result": False,
                    "has_model3d": False,
                    "artifacts": {},
                },
            )

    if hasattr(settings, "jobs_dir"):
        for job in list_queued_jobs():
            job_id = job["job_id"]
            result_path = Path(job["result_path"]) if job.get("result_path") else None
            result_summary = jobs_by_id.get(job_id) or _read_result_summary_from_path(job_id, result_path) or {}
            artifacts = result_summary.get("artifacts") or {}
            artifacts.update(job.get("artifacts") or {})
            jobs_by_id[job_id] = {
                "job_id": job_id,
                "job": job,
                "status": job.get("status"),
                "stage": job.get("stage"),
                "created_at": job.get("created_at"),
                "finished_at": job.get("finished_at"),
                "has_result": bool(job.get("result_path")) or bool(result_summary.get("has_result")),
                "has_model3d": bool(result_summary.get("has_model3d")),
                "artifacts": artifacts,
            }

    return sorted(
        jobs_by_id.values(),
        key=lambda item: item.get("finished_at") or item.get("created_at") or "",
        reverse=True,
    )


def _report_is_outdated(result_path: Path, report_path: Path) -> bool:
    """Verifica se o PDF precisa ser gerado novamente.

    Parametros:
        result_path: Caminho do `result.json`.
        report_path: Caminho do PDF.

    Retorna:
        `True` quando o PDF nao existe ou e mais antigo que o resultado.
    """
    if not report_path.exists():
        return True
    return report_path.stat().st_mtime < result_path.stat().st_mtime


def _ensure_report_pdf(job_id: str) -> Path:
    """Garante que o relatorio PDF existe para um job finalizado.

    Parametros:
        job_id: Identificador da analise.

    Retorna:
        Caminho do PDF gerado ou reutilizado.
    """
    settings = get_settings()
    result_dir = settings.results_dir / job_id
    result_path = result_dir / "result.json"
    report_path = result_dir / REPORT_FILENAME

    if not result_path.exists():
        raise HTTPException(status_code=404, detail="Resultado nao encontrado")

    payload = _read_json(result_path)
    if (payload.get("job") or {}).get("status") != "completed" or not payload.get("data"):
        raise HTTPException(status_code=409, detail="Relatorio disponivel apenas para analises concluidas")

    if _report_is_outdated(result_path, report_path):
        data = payload.setdefault("data", {})
        artifacts = data.get("artifacts") or {}
        data["artifacts"] = artifacts
        if artifacts.get("report_pdf") != f"/results/{job_id}/report.pdf":
            artifacts["report_pdf"] = f"/results/{job_id}/report.pdf"
            _write_json(result_path, payload)

        try:
            generate_gait_report_pdf(payload, report_path)
        except ValueError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc
        except RuntimeError as exc:
            logger.exception("Falha de dependencia ao gerar relatorio do job %s", job_id)
            raise HTTPException(status_code=500, detail=str(exc)) from exc

    return report_path


@router.post("/analyze")
async def analyze_video(
    video: UploadFile = File(...),
    height_mm: int = Form(...),
    rotated: bool = Form(False),
):
    """Recebe um video e inicia a analise de marcha.

    Parametros:
        video: Arquivo de video enviado pelo front.
        height_mm: Altura do paciente/usuario em milimetros.
        rotated: Indica se o video deve ser tratado como rotacionado.

    Retorna:
        `ResultV1`. Em modo `queue`, retorna status `queued`; em modo local, retorna o resultado final.
    """
    if height_mm <= 0:
        raise HTTPException(status_code=422, detail="height_mm deve ser maior que zero")

    settings = get_settings()
    _validate_video_upload(video)

    job_id = str(uuid4())
    upload_dir = settings.upload_dir / job_id
    result_dir = settings.results_dir / job_id
    upload_path = upload_dir / "input.mp4"
    result_path = result_dir / "result.json"

    upload_dir.mkdir(parents=True, exist_ok=True)
    result_dir.mkdir(parents=True, exist_ok=True)

    stored_bytes = _save_upload_file(video, upload_path, settings.max_upload_bytes)

    logger.info("Video salvo para job %s (%s bytes). Iniciando analise", job_id, stored_bytes)

    if getattr(settings, "engine_mode", "local").lower() == "queue":
        try:
            result = _build_queued_result(
                job_id=job_id,
                upload_path=upload_path,
                height_mm=height_mm,
                window_l=settings.window_l,
                rotated=rotated,
            )
        except ValueError as exc:
            result = _build_failed_ingest_result(job_id=job_id, error_code=str(exc))
            _write_json(result_path, result)
            return result

        create_job(
            job_id=job_id,
            upload_path=upload_path,
            height_mm=height_mm,
            rotated=rotated,
            window_l=settings.window_l,
            original_filename=video.filename,
        )
        _write_json(result_path, result)
        return result

    _clear_accelerator_caches()
    result = run_pipeline(
        video_path=str(upload_path),
        height_mm=height_mm,
        window_L=settings.window_l,
        job_id=job_id,
        rotated=rotated,
        output_dir=result_dir,
    )

    source_artifacts = result.data.artifacts if result.data is not None else None
    artifacts = _store_generated_artifacts(result_dir, job_id, source_artifacts)
    if result.data is not None and artifacts:
        result.data.artifacts = artifacts
        if "video_3d" in artifacts:
            result.data.video_3d = artifacts["video_3d"]

    _write_json(result_path, result)

    return result


@router.get("/jobs")
async def list_jobs():
    """Lista analises conhecidas pela API.

    Parametros:
        Nenhum.

    Retorna:
        Total e lista resumida de jobs, incluindo status, artefatos e disponibilidade de resultado.
    """
    jobs = _collect_job_summaries()
    return {"total": len(jobs), "jobs": jobs}


@router.get("/status/{job_id}")
async def get_status(job_id: str):
    """Consulta o estado atual de uma analise.

    Parametros:
        job_id: Identificador retornado pela rota `/analyze`.

    Retorna:
        O bloco `job` do resultado final ou o estado atual salvo na fila.
    """
    settings = get_settings()
    result_path = settings.results_dir / job_id / "result.json"
    upload_path = settings.upload_dir / job_id / "input.mp4"

    if hasattr(settings, "jobs_dir"):
        try:
            queued_job = read_queued_job(job_id)
        except FileNotFoundError:
            queued_job = None
        if queued_job is not None and (queued_job.get("status") != "completed" or not result_path.exists()):
            return queued_job

    if result_path.exists():
        result = _read_json(result_path)
        return result["job"]

    if upload_path.exists():
        return {"job_id": job_id, "status": "processing", "stage": "unknown"}

    raise HTTPException(status_code=404, detail="Job nao encontrado")


@router.get("/results/{job_id}")
async def get_result(job_id: str):
    """Entrega o resultado completo de uma analise finalizada.

    Parametros:
        job_id: Identificador retornado pela rota `/analyze`.

    Retorna:
        Conteudo do `result.json` salvo para o job.
    """
    settings = get_settings()
    result_path = settings.results_dir / job_id / "result.json"

    if not result_path.exists():
        raise HTTPException(status_code=404, detail="Resultado não encontrado")

    return _read_json(result_path)


@router.get("/results/{job_id}/report.pdf")
async def get_result_report(job_id: str):
    """Gera ou baixa o relatorio PDF de uma analise concluida.

    Parametros:
        job_id: Identificador retornado pela rota `/analyze`.

    Retorna:
        `FileResponse` com o PDF clinico da analise de marcha.
    """
    report_path = _ensure_report_pdf(job_id)
    return FileResponse(
        report_path,
        media_type="application/pdf",
        filename=REPORT_FILENAME,
    )


@router.get("/results/{job_id}/artifacts/{filename}")
async def get_result_artifact(job_id: str, filename: str):
    """Baixa um artefato gerado pela analise.

    Parametros:
        job_id: Identificador do job.
        filename: Nome permitido do arquivo, como `3d_rebuild.mp4`,
            `movimento_exportado.npz` ou `relatorio_analise_marcha.pdf`.

    Retorna:
        `FileResponse` com o arquivo solicitado.
    """
    if filename not in ALLOWED_ARTIFACT_FILENAMES:
        raise HTTPException(status_code=404, detail="Artefato não encontrado")

    if filename == REPORT_FILENAME:
        return await get_result_report(job_id)

    settings = get_settings()
    artifact_path = settings.results_dir / job_id / filename

    if not artifact_path.exists():
        raise HTTPException(status_code=404, detail="Artefato não encontrado")

    return FileResponse(artifact_path)
