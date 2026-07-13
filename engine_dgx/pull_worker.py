import json
import logging
import os
import time
from pathlib import Path

import httpx

from main import RESULTS_DIR, UPLOAD_DIR, process_job_file

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("EngineDGX.PullWorker")

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000").rstrip("/")
WORKER_TOKEN = os.getenv("WORKER_TOKEN", "")
WORKER_ID = os.getenv("WORKER_ID", os.uname().nodename if hasattr(os, "uname") else "dgx-worker")
POLL_INTERVAL_S = float(os.getenv("POLL_INTERVAL_S", "10"))
RUN_ONCE = os.getenv("RUN_ONCE", "false").lower() in {"1", "true", "yes", "on"}


def headers() -> dict[str, str]:
    """Monta os headers de autenticacao do worker.

    Parametros:
        Nenhum. Usa `WORKER_TOKEN` do ambiente.

    Retorna:
        Dicionario com `X-Worker-Token` quando o token foi configurado.
    """
    return {"X-Worker-Token": WORKER_TOKEN} if WORKER_TOKEN else {}


def post_json(client: httpx.Client, path: str, payload: dict):
    """Envia um POST JSON para o backend principal.

    Parametros:
        client: Cliente HTTP reutilizado pelo loop do worker.
        path: Caminho relativo da rota no backend.
        payload: Corpo JSON a enviar.

    Retorna:
        Resposta JSON ja validada por `raise_for_status`.
    """
    response = client.post(f"{BACKEND_URL}{path}", headers=headers(), json=payload)
    response.raise_for_status()
    return response.json()


def download_input(client: httpx.Client, job: dict) -> Path:
    """Baixa o video de entrada de um job para a DGX.

    Parametros:
        client: Cliente HTTP do worker.
        job: Dicionario do job recebido da fila.

    Retorna:
        Caminho local do `input.mp4` baixado.
    """
    job_id = job["job_id"]
    target_dir = UPLOAD_DIR / job_id
    target_dir.mkdir(parents=True, exist_ok=True)
    target = target_dir / "input.mp4"

    with client.stream("GET", f"{BACKEND_URL}/worker/jobs/{job_id}/input", headers=headers()) as response:
        response.raise_for_status()
        with target.open("wb") as output:
            for chunk in response.iter_bytes():
                output.write(chunk)

    return target


def submit_result(client: httpx.Client, job: dict, payload: dict) -> None:
    """Envia ao backend o resultado bruto e artefatos gerados.

    Parametros:
        client: Cliente HTTP do worker.
        job: Job processado.
        payload: Saida bruta de `process_job_file`.

    Saida:
        Nao retorna valor. Levanta erro HTTP se o backend rejeitar o envio.
    """
    job_id = job["job_id"]
    result_dir = RESULTS_DIR / job_id
    raw_bytes = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    files = {"raw_result": ("raw_result.json", raw_bytes, "application/json")}

    movement_npz = result_dir / "movimento_exportado.npz"
    video_3d = result_dir / "3d_rebuild.mp4"
    opened_files = []
    try:
        if movement_npz.exists():
            opened_files.append(movement_npz.open("rb"))
            files["movement_npz"] = ("movimento_exportado.npz", opened_files[-1], "application/octet-stream")
        if video_3d.exists():
            opened_files.append(video_3d.open("rb"))
            files["video_3d"] = ("3d_rebuild.mp4", opened_files[-1], "video/mp4")

        response = client.post(
            f"{BACKEND_URL}/worker/jobs/{job_id}/result",
            headers=headers(),
            files=files,
            timeout=None,
        )
        response.raise_for_status()
    finally:
        for file in opened_files:
            file.close()


def process_one_job(client: httpx.Client) -> bool:
    """Tenta processar um unico job da fila.

    Parametros:
        client: Cliente HTTP reutilizavel.

    Retorna:
        `True` quando encontrou um job e tentou processar; `False` quando a fila estava vazia.
    """
    response = client.get(f"{BACKEND_URL}/worker/jobs/next", headers=headers())
    response.raise_for_status()
    job = response.json().get("job")
    if not job:
        return False

    job_id = job["job_id"]
    logger.info("Claiming job %s", job_id)
    claimed = post_json(client, f"/worker/jobs/{job_id}/claim", {"worker_id": WORKER_ID})["job"]

    try:
        upload_path = download_input(client, claimed)
        post_json(client, f"/worker/jobs/{job_id}/heartbeat", {"worker_id": WORKER_ID, "status": "running", "stage": "processing"})
        payload = process_job_file(
            current_job_id=job_id,
            upload_path=upload_path,
            height_mm=int(claimed["height_mm"]),
            rotated=bool(claimed.get("rotated", False)),
        )
        submit_result(client, claimed, payload)
        logger.info("Job %s completed", job_id)
        return True
    except Exception as exc:
        logger.exception("Job %s failed", job_id)
        try:
            post_json(
                client,
                f"/worker/jobs/{job_id}/failed",
                {
                    "code": "ERROR_DGX_WORKER_FAILED",
                    "message": str(exc),
                    "retryable": True,
                    "details": type(exc).__name__,
                },
            )
        finally:
            return True


def main() -> None:
    """Loop principal do pull worker da DGX.

    Parametros:
        Nenhum. Configuracao vem de variaveis de ambiente.

    Saida:
        Nao retorna enquanto `RUN_ONCE` for falso; fica consultando a fila periodicamente.
    """
    logger.info("Starting pull worker %s against %s", WORKER_ID, BACKEND_URL)
    with httpx.Client(timeout=None) as client:
        while True:
            processed = process_one_job(client)
            if RUN_ONCE:
                break
            if not processed:
                time.sleep(POLL_INTERVAL_S)


if __name__ == "__main__":
    main()
