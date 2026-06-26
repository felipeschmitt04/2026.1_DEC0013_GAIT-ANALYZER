# Docker CPU

Docker empacota a aplicação com o ambiente necessário para ela rodar. Neste
projeto, a imagem CPU junta:

```text
Código FastAPI + dependências leves + comando de inicialização
```

O Docker suportado agora é o `backend/Dockerfile.cpu`, usado para subir a API em
modo mock. O Docker GPU foi abandonado para a DGX porque o ambiente disponível
lá roda por conda, não por Docker.

## Construir A Imagem

Na raiz do repositório:

```bash
docker build -f backend/Dockerfile.cpu -t gait-analyzer-backend:cpu .
```

Significado:

- `docker build`: constrói uma imagem;
- `-f backend/Dockerfile.cpu`: usa esse arquivo como receita;
- `-t gait-analyzer-backend:cpu`: dá nome e tag para a imagem;
- `.`: usa a raiz do projeto como contexto de build.

## Rodar A API

```bash
docker run --rm -d \
  --name gait-analyzer-api \
  -p 8000:8000 \
  gait-analyzer-backend:cpu
```

Significado:

- `docker run`: cria e roda um container;
- `--rm`: remove o container quando ele parar;
- `-d`: roda em segundo plano;
- `--name`: define um nome fácil para logs e comandos;
- `-p 8000:8000`: liga a porta 8000 do computador à porta 8000 do container;
- `gait-analyzer-backend:cpu`: imagem que será executada.

A porta fica assim:

```text
localhost:8000 no computador -> porta 8000 no container -> FastAPI
```

Teste:

```bash
curl http://localhost:8000/health
```

## Como O Dockerfile.cpu Funciona

Resumo da receita:

- `FROM python:3.11-slim`: começa com uma imagem Linux pequena com Python;
- `WORKDIR /app`: define `/app` como pasta de trabalho;
- `apt-get install`: instala bibliotecas de sistema necessárias para OpenCV e
  runtime;
- `COPY backend/requirements.api.txt`: copia dependências leves;
- `pip install -r requirements.api.txt`: instala FastAPI, OpenCV headless, pytest
  e httpx;
- `COPY backend/app ./app`: copia a API;
- `COPY backend/storage ./storage`: copia a estrutura de storage;
- `ENV USE_MOCK_ENGINE=true`: sobe em modo mock por padrão;
- `CMD ["uvicorn", ...]`: inicia a API.

## Rodar Com Worker DGX Remoto

O mesmo container CPU pode atuar como backend central e chamar a DGX remotamente:

```bash
docker run --rm -d \
  --name gait-analyzer-remote \
  -p 8000:8000 \
  -e ENGINE_MODE=remote \
  -e REMOTE_ENGINE_URL=http://URL-DO-WORKER-DGX:9000 \
  -e REMOTE_ENGINE_TIMEOUT_S=3600 \
  gait-analyzer-backend:cpu
```

Não coloque URLs temporárias reais no repositório. Quando usar túnel ou endereço
provisório, passe por variável de ambiente no comando ou no serviço de deploy.

## Rodar Testes No Container

```bash
docker run --rm gait-analyzer-backend:cpu \
  python -m pytest tests/test_clinical_metrics.py
```

Quando houver mais testes leves, rode:

```bash
docker run --rm gait-analyzer-backend:cpu python -m pytest tests
```

## Comandos Básicos

```bash
docker ps
docker ps -a
docker images
docker logs gait-analyzer-api
docker exec -it gait-analyzer-api bash
docker stop gait-analyzer-api
```

## Usando Volume Em Desenvolvimento

Volume monta arquivos locais dentro do container. Isso permite alterar código
sem reconstruir a imagem a cada teste.

```bash
docker run --rm -d \
  --name gait-analyzer-dev \
  -p 8000:8000 \
  -v "$PWD/backend/app:/app/app" \
  -v "$PWD/backend/tests:/app/tests" \
  gait-analyzer-backend:cpu
```

Use volume apenas para desenvolvimento. Para deploy, prefira imagem reconstruída
a partir do commit correto.
