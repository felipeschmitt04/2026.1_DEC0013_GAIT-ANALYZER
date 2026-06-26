# DGX UFSC

A DGX H100 da UFSC é o ambiente usado para processamento pesado. Diferente da
Azure CPU, ela possui GPU forte, mas o fluxo atual não usa Docker porque Docker
não está disponível para o aluno nesse ambiente.

## Papel Da DGX

A DGX roda somente o worker de engine:

```text
Backend central -> Engine DGX Worker -> raw_data -> Backend central
```

O frontend não chama a DGX diretamente.

## Pasta Usada

Os arquivos da DGX ficam em:

```text
engine_dgx/
```

Principais arquivos:

- `main.py`: API FastAPI do worker;
- `worker_engine.py`: singleton que carrega a engine uma vez;
- `gait_engine.py`: MeTRAbs, GaitTransformer, fitting e exportação;
- `fitting.py`: ajuste JAX/Equinox/Optax;
- `model3d_export.py`: monta `raw_data.model3d`;
- `requirements.txt`: referência de dependências Python.

## Subir O Worker

Na DGX:

```bash
conda activate gait_env
cd engine_dgx
uvicorn main:app --host 0.0.0.0 --port 9000
```

Verificar se está online:

```bash
curl http://localhost:9000/health
```

Carregar a engine antes do primeiro processamento:

```bash
curl -X POST http://localhost:9000/warmup
```

Esse comando pode demorar porque carrega modelos pesados.

## Processar Um Vídeo Diretamente No Worker

```bash
curl -F video=@/caminho/video.mp4 \
  -F height_mm=1750 \
  -F rotated=false \
  http://localhost:9000/process \
  -o dgx_raw_result.json
```

O retorno tem este formato geral:

```json
{
  "job_id": "uuid",
  "status": "completed",
  "raw_data": {
    "events": [],
    "pose3d": [],
    "kinematics": {
      "angles": [],
      "timestamps": []
    },
    "model3d": {}
  },
  "artifacts": {}
}
```

O backend central transforma `raw_data` em `ResultV1`.

## Conectar Backend Central À DGX

No backend central:

```env
ENGINE_MODE=remote
REMOTE_ENGINE_URL=http://URL-DO-WORKER-DGX:9000
REMOTE_ENGINE_TIMEOUT_S=3600
```

Em Docker:

```bash
docker run --rm -d \
  --name gait-analyzer-api \
  -p 8000:8000 \
  -e ENGINE_MODE=remote \
  -e REMOTE_ENGINE_URL=http://URL-DO-WORKER-DGX:9000 \
  -e REMOTE_ENGINE_TIMEOUT_S=3600 \
  gait-analyzer-backend:cpu
```

## Modelo 3D

Quando disponível, a DGX retorna `raw_data.model3d` com geometrias MuJoCo e
frames exportados por forward kinematics. Esse bloco vira `data.model3d` no
`ResultV1` e é a melhor fonte para visualização 3D no frontend.

Se `model3d` não vier, o frontend pode usar `data.fitting` e `data.pose3d` como
fallback.

## Limitações E Cuidados

- Não usar Docker na DGX neste fluxo.
- Não expor a DGX publicamente sem necessidade.
- Não registrar URLs temporárias de túnel em arquivos versionados.
- Evitar processamentos paralelos pesados; o worker já usa lock para executar um
  job por vez.
- Limpar caches JAX/Equinox se houver pressão de memória:

```bash
curl -X POST http://localhost:9000/clear-cache
```
