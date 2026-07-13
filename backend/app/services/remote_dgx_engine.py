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
        """Configura o cliente HTTP para falar com a DGX.

        Parametros:
            base_url: URL base da API remota de processamento.
            timeout_s: Tempo maximo de espera para requests longos.

        Saida:
            Nao retorna valor. Guarda as configuracoes na instancia.
        """
        self.base_url = base_url.rstrip("/")
        self.timeout_s = timeout_s

    def process_video(self, video_path: str, height_mm: int, rotated: bool = False, output_dir=None):
        """Envia um video para a DGX e baixa os artefatos retornados.

        Parametros:
            video_path: Caminho local do video.
            height_mm: Altura do usuario em milimetros.
            rotated: Indica se a engine remota deve rotacionar o video.
            output_dir: Pasta onde artefatos remotos devem ser salvos.

        Retorna:
            `raw_data` bruto no formato esperado pelo pipeline central.
        """
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
                target_dir=Path(output_dir) if output_dir is not None else path.parent,
            )
            return raw_data

        # Fallback defensivo caso o worker retorne o raw_data diretamente.
        return payload

    def _download_artifacts(self, artifacts: dict, target_dir: Path) -> dict:
        """Baixa arquivos opcionais produzidos pela DGX.

        Parametros:
            artifacts: Mapa de chaves do contrato para URLs/caminhos remotos.
            target_dir: Pasta local onde os arquivos serao gravados.

        Retorna:
            Dicionario com as mesmas chaves apontando para caminhos locais baixados.
        """
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
