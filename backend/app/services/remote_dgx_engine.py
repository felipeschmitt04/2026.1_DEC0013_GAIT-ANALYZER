import logging
from pathlib import Path
from urllib.parse import urljoin

import httpx


logger = logging.getLogger("RemoteDGXEngine")


class RemoteDgxEngine:
    """Cliente da API de processamento pesado na DGX.

    Mantem a mesma interface esperada pelo pipeline central:
    process_video(...) -> raw_data.
    """

    def __init__(self, base_url: str, timeout_s: int = 3600):
        self.base_url = base_url.rstrip("/")
        self.timeout_s = timeout_s

    def process_video(self, video_path: str, height_mm: int, rotated: bool = False):
        path = Path(video_path)
        logger.info("Enviando video para DGX worker: %s", self.base_url)

        with path.open("rb") as file:
            response = httpx.post(
                f"{self.base_url}/process",
                data={
                    "height_mm": str(height_mm),
                    "rotated": str(rotated).lower(),
                },
                files={
                    "video": (path.name, file, "application/octet-stream"),
                },
                timeout=self.timeout_s,
            )

        response.raise_for_status()
        payload = response.json()

        if "raw_data" in payload:
            raw_data = payload["raw_data"]
            raw_data["artifacts"] = self._download_artifacts(
                payload.get("artifacts", {}),
                target_dir=path.parent,
            )
            return raw_data

        # Fallback defensivo caso o worker retorne o raw_data diretamente.
        return payload

    def _download_artifacts(self, artifacts: dict, target_dir: Path) -> dict:
        downloaded = {}

        for key, artifact_ref in artifacts.items():
            if not artifact_ref:
                continue

            artifact_url = (
                artifact_ref
                if str(artifact_ref).startswith(("http://", "https://"))
                else urljoin(f"{self.base_url}/", str(artifact_ref).lstrip("/"))
            )
            filename = Path(str(artifact_ref)).name
            if filename not in {"3d_rebuild.mp4", "movimento_exportado.npz"}:
                logger.warning("Ignorando artefato remoto inesperado: %s", artifact_ref)
                continue

            target_dir.mkdir(parents=True, exist_ok=True)
            target = target_dir / filename
            logger.info("Baixando artefato remoto %s", artifact_url)
            with httpx.stream("GET", artifact_url, timeout=self.timeout_s) as response:
                response.raise_for_status()
                with target.open("wb") as output:
                    for chunk in response.iter_bytes():
                        output.write(chunk)

            downloaded[key] = str(target)

        return downloaded
