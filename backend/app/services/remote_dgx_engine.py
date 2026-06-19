import logging
from pathlib import Path

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
            return payload["raw_data"]

        # Fallback defensivo caso o worker retorne o raw_data diretamente.
        return payload
