# DGX UFSC

A DGX H100 da UFSC é o ambiente usado para processamento pesado. Diferente da
Azure CPU, ela possui GPU forte, mas o fluxo atual não usa Docker porque Docker
não está disponível para o aluno nesse ambiente.

## Papel Da DGX

A DGX roda somente o worker de engine:

```text
Backend central cria job -> DGX Pull Worker busca job -> raw_data -> Backend central monta ResultV1
```

O frontend não chama a DGX diretamente.

## Pasta Usada

Os arquivos da DGX ficam em:

```text
engine_dgx/
```

Principais arquivos:

- `main.py`: API FastAPI do worker para teste direto/debug;
- `pull_worker.py`: worker que consulta a API central e processa jobs;
- `worker_engine.py`: singleton que carrega a engine uma vez;
- `gait_engine.py`: MeTRAbs, GaitTransformer, fitting e exportação;
- `fitting.py`: ajuste JAX/Equinox/Optax;
- `model3d_export.py`: monta `raw_data.model3d`;
- `requirements.txt`: referência de dependências Python.

## Subir O Worker Para Teste Direto

Na DGX, este modo sobe uma API local do worker. Ele e util para debug ou teste
controlado:

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

## Rodar O Fluxo Pull-Based Recomendado

No backend central/Azure, configure:

```env
ENGINE_MODE=queue
WORKER_TOKEN=um-token-forte
```

Na DGX, aponte o worker para a API central:

```bash
conda activate gait_env
cd engine_dgx
export BACKEND_URL=http://IP-OU-DOMINIO-DA-API:8000
export WORKER_TOKEN=um-token-forte
export WORKER_ID=dgx-h100-ufsc
python pull_worker.py
```

O worker faz polling em `/worker/jobs/next`, baixa o video, executa a engine com
lock de um job por vez e envia o resultado de volta para `/worker/jobs/{job_id}/result`.

A limpeza de caches JAX/Equinox antes e depois de cada job deve ser mantida. Ela
foi adicionada porque, no ambiente real, processar videos diferentes em sequencia
sem essa limpeza gerou erro.


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

## Conectar Backend Central A DGX Em Modo Direto

Este modo e secundario. No backend central:

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
