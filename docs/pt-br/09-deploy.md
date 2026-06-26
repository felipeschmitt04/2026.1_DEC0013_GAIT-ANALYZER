# Deploy

Este documento descreve o fluxo prático para atualizar o backend em um servidor
já criado. A criação da VM Azure fica fora deste guia.

## Estratégia Atual

O deploy recomendado é:

```text
Azure CPU -> Backend FastAPI em Docker CPU/mock ou remote
DGX UFSC  -> Worker engine_dgx rodando por conda
Frontend  -> Consome somente a API da Azure
```

Na Azure, não assuma GPU. O papel dela é expor a API, persistir resultados por
job e entregar o contrato HTTP para o frontend.

## Atualizar Código Na Azure

No servidor:

```bash
cd gait_analyzer
git pull
```

Se estiver em uma branch de PR:

```bash
git fetch origin
git checkout nome-da-branch
git pull
```

## Build Da Imagem CPU

```bash
docker build -f backend/Dockerfile.cpu -t gait-analyzer-backend:cpu .
```

## Subir Em Modo Mock

```bash
docker stop gait-analyzer-api || true

docker run --rm -d \
  --name gait-analyzer-api \
  -p 8000:8000 \
  gait-analyzer-backend:cpu
```

Esse modo é suficiente para o frontend desenvolver telas, upload, consumo do
JSON, gráficos e visualização de esqueleto.

## Subir Apontando Para DGX

Quando o worker DGX estiver online e acessível:

```bash
docker stop gait-analyzer-api || true

docker run --rm -d \
  --name gait-analyzer-api \
  -p 8000:8000 \
  -e ENGINE_MODE=remote \
  -e REMOTE_ENGINE_URL=http://URL-DO-WORKER-DGX:9000 \
  -e REMOTE_ENGINE_TIMEOUT_S=3600 \
  gait-analyzer-backend:cpu
```

Evite registrar URL temporária real em arquivo versionado. Use variável de
ambiente, secret do provedor, ou comando local.

## Smoke Test Pós-Deploy

```bash
curl http://localhost:8000/health
```

Se a porta estiver exposta externamente:

```bash
curl http://IP-OU-DOMINIO:8000/health
```

Resposta esperada:

```json
{"status":"ok"}
```

## Logs

```bash
docker logs gait-analyzer-api
docker logs -f gait-analyzer-api
```

## Conferir Resultado De Um Job

Depois de enviar um vídeo:

```bash
curl http://localhost:8000/status/SEU_JOB_ID
curl http://localhost:8000/results/SEU_JOB_ID
```

## O Que Não Fazer Agora

- Não expor o worker DGX diretamente para o frontend.
- Não depender de Docker GPU na DGX.
- Não versionar `.env`, vídeos, resultados ou URL temporária de túnel.
- Não trocar o contrato JSON sem atualizar `docs/pt-br/10-api.md`.
