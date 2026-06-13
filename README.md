# Gait Analyzer

Sistema acadêmico de análise de marcha humana desenvolvido para a disciplina de
Projeto Integrador em Engenharia da Computação. O backend recebe vídeos de
marcha, executa reconstrução 3D e retorna métricas biomecânicas para consumo por
um frontend web.

## Visão Geral

O projeto usa FastAPI para expor a API e uma engine de processamento baseada em
MeTRAbs, GaitTransformer, JAX, TensorFlow, Equinox e Optax. A arquitetura foi
organizada para permitir execução em diferentes ambientes: CPU na Azure para
integração e contrato com o frontend, GPU NVIDIA quando disponível para
processamento pesado, e modo mock para testes sem carregar modelos de IA.

## Estrutura

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
├── Dockerfile.cpu
├── requirements.cpu.txt
├── requirements.gpu.txt
└── requirements.txt
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
USE_MOCK_ENGINE=true
```

`USE_MOCK_ENGINE=true` permite testar API, storage e frontend sem carregar os
modelos pesados de IA.

## Execução Com Docker CPU

Na raiz do repositório:

```bash
docker build -f backend/Dockerfile.cpu -t gait-analyzer-backend:cpu .
docker run --rm -p 8000:8000 gait-analyzer-backend:cpu
```

Por padrão, esse build usa `backend/requirements.api.txt` e sobe em modo mock.
Para tentar instalar o perfil CPU completo com TensorFlow/JAX e a engine real:

```bash
docker build \
  -f backend/Dockerfile.cpu \
  --build-arg REQUIREMENTS_FILE=requirements.cpu.txt \
  -t gait-analyzer-backend:cpu-full .
```

Depois, sobrescreva o mock:

```bash
docker run --rm -p 8000:8000 -e USE_MOCK_ENGINE=false gait-analyzer-backend:cpu-full
```

## Execução Sem Docker

Dentro de `backend`, em um ambiente com dependências instaladas:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
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

## Próximas Etapas

- Testar o Docker CPU em ambiente com internet para instalar dependências.
- Ajustar versões do perfil GPU em uma máquina NVIDIA.
- Criar testes automatizados leves para `/health`, metadata e métricas clínicas.
- Preencher a documentação técnica em `docs/`.
