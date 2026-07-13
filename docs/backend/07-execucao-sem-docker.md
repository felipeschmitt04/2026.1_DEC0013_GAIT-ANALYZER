# Execução Sem Docker

Este guia cobre execução direta por Python. Ele é útil para desenvolvimento
local, debug e DGX, onde o fluxo atual usa conda.

## Backend Em Modo Mock

Dentro da pasta `backend`, instale as dependências leves e suba a API:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.api.txt
ENGINE_MODE=mock uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Teste:

```bash
curl http://localhost:8000/health
```

Resposta esperada:

```json
{"status":"ok"}
```

## Backend Apontando Para Worker DGX

Quando o worker DGX estiver exposto em uma URL acessível pelo backend:

```bash
cd backend
source .venv/bin/activate
ENGINE_MODE=remote \
REMOTE_ENGINE_URL=http://localhost:9000 \
REMOTE_ENGINE_TIMEOUT_S=3600 \
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

O frontend continua usando `http://backend:8000`, não a URL da DGX.

## Worker DGX

Na DGX, entre na pasta do worker e rode com o ambiente conda preparado:

```bash
conda activate gait_env
cd engine_dgx
uvicorn main:app --host 0.0.0.0 --port 9000
```

Valide:

```bash
curl http://localhost:9000/health
curl -X POST http://localhost:9000/warmup
```

O `/warmup` pode demorar porque carrega os modelos pesados.

## Demo 3D Local

A demo em `frontend-demo/` permite carregar um JSON salvo ou buscar um job pela
API local.

```bash
cd frontend-demo
python3 -m http.server 5173
```

Abra:

```text
http://localhost:5173
```

Para buscar um `job_id`, o backend precisa estar rodando em
`http://localhost:8000`.

## Envio De Vídeo

Exemplo contra o backend:

```bash
curl -F video=@misc/meu_video.mp4 \
  -F height_mm=1750 \
  -F rotated=false \
  http://localhost:8000/analyze \
  -o result.json
```

Campos importantes:

- `video`: arquivo de vídeo;
- `height_mm`: altura do paciente em milímetros;
- `rotated`: opcional, usado quando o vídeo precisa ser transposto para a
  detecção funcionar.
