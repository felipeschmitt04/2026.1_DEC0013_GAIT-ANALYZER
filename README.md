# Gait Analyzer

Sistema acadêmico de análise de marcha humana desenvolvido para a disciplina de
Projeto Integrador em Engenharia da Computação. O backend recebe vídeos de
marcha, executa reconstrução 3D e retorna métricas biomecânicas para consumo por
um frontend web.

## Visão Geral

O projeto usa FastAPI para expor a API e uma engine de processamento baseada em
MeTRAbs, GaitTransformer, JAX, TensorFlow, Equinox e Optax. A arquitetura foi
organizada para permitir execução em diferentes ambientes:

- Azure CPU ou máquina local com Docker CPU em modo mock;
- DGX H100 da UFSC com ambiente conda para a engine pesada;
- frontend web externo consumindo somente a API HTTP.

O Docker GPU não é o caminho atual do projeto, porque a DGX disponível não roda
Docker para o aluno. O processamento pesado na DGX fica isolado em
`engine_dgx/`.

## Estrutura

```text
backend/
├── app/                    # API FastAPI, pipeline, schemas e services
├── storage/                # Uploads, resultados e temporários
├── Dockerfile.cpu          # Imagem leve para API/mock
├── requirements.api.txt    # Dependências leves
├── requirements.cpu.txt    # Perfil CPU completo experimental
└── requirements.txt        # Fotografia ampla do ambiente original

engine_dgx/
├── main.py                 # Worker FastAPI para a DGX
├── worker_engine.py        # Singleton da engine pesada
├── gait_engine.py          # MeTRAbs, GaitTransformer, fitting e model3d
└── requirements.txt        # Referência do ambiente DGX

frontend-demo/
└── index.html              # Demo Three.js para inspecionar ResultV1

docs/
├── backend/                # Documentação desta entrega/backend
│   └── pt-br/00-indice.md  # Índice principal em português
└── frontend/               # Reservado para documentação do frontend
```

Estrutura interna principal do backend:

```text
backend/
├── app/
│   ├── api/routes/        # Endpoints HTTP
│   ├── core/              # Configuração e singleton da engine
│   ├── ml/                # Ajuste cinemático/JAX
│   ├── schemas/           # Modelos Pydantic
│   └── services/          # Pipeline, engine, metadata e métricas
├── storage/
│   ├── uploads/           # Uploads por job_id
│   ├── results/           # Resultados por job_id
│   └── temp/              # Arquivos temporários
└── Dockerfile.cpu
```

## Configuração

Use [backend/.env.example](backend/.env.example) como referência para variáveis
de ambiente. O arquivo `.env` real não deve ser versionado.

Principais variáveis:

```env
APP_ENV=development
APP_HOST=0.0.0.0
APP_PORT=8000
UPLOAD_DIR=storage/uploads
RESULTS_DIR=storage/results
TEMP_DIR=storage/temp
WINDOW_L=150
CORS_ORIGINS=*
ENGINE_MODE=mock
```

`ENGINE_MODE=mock` permite testar API, storage e frontend sem carregar modelos
pesados de IA. Também é possível usar `ENGINE_MODE=remote` para apontar o
backend para o worker DGX.

## Execução Com Docker CPU

Na raiz do repositório:

```bash
docker build -f backend/Dockerfile.cpu -t gait-analyzer-backend:cpu .
docker run --rm -p 8000:8000 gait-analyzer-backend:cpu
```

Por padrão, esse build usa `backend/requirements.api.txt` e sobe em modo mock.
Para apontar o container para um worker DGX remoto:

```bash
docker run --rm -p 8000:8000 \
  -e ENGINE_MODE=remote \
  -e REMOTE_ENGINE_URL=http://URL-DO-WORKER-DGX:9000 \
  gait-analyzer-backend:cpu
```

## Execução Sem Docker

Backend em modo mock:

```bash
cd backend
ENGINE_MODE=mock uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Worker DGX com conda:

```bash
conda activate gait_env
cd engine_dgx
uvicorn main:app --host 0.0.0.0 --port 9000
```

## API

### `GET /health`

Retorna o status básico da API.

```json
{"status": "ok"}
```

### `POST /analyze`

Recebe um vídeo e a altura do paciente.

Campos `multipart/form-data`:

- `video`: arquivo de vídeo.
- `height_mm`: altura do paciente em milímetros.

O backend cria um `job_id`, salva o upload em
`backend/storage/uploads/{job_id}/input.mp4`, processa o vídeo e salva o JSON em
`backend/storage/results/{job_id}/result.json`.

### `GET /status/{job_id}`

Retorna o status conhecido do job.

### `GET /results/{job_id}`

Retorna o resultado salvo do job.

## Documentação

A documentação está separada por área do projeto:

```text
docs/backend/
docs/frontend/
```

A parte preenchida neste PR é a documentação do backend. A pasta
`docs/frontend/` fica reservada para a documentação do frontend, que será
mantida pelo responsável dessa parte.

Arquivos principais do backend:

- [Índice](docs/backend/pt-br/00-indice.md)
- [Visão Geral](docs/backend/pt-br/01-visao-geral.md)
- [Arquitetura](docs/backend/pt-br/02-arquitetura.md)
- [Docker CPU](docs/backend/pt-br/08-docker.md)
- [Contrato da API](docs/backend/pt-br/10-api.md)
- [DGX UFSC](docs/backend/pt-br/11-dgx-ufsc.md)
- [Testes](docs/backend/pt-br/15-testes.md)
