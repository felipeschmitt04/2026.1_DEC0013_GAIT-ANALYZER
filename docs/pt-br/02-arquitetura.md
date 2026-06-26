# Arquitetura

A arquitetura atual separa três responsabilidades:

- frontend web: interface, upload, visualização 3D, gráficos e relatório;
- backend FastAPI: contrato HTTP, validação, storage, montagem do `ResultV1`;
- engine: processamento mock, local pesado ou remoto na DGX.

## Fluxo Principal

```text
Frontend -> Backend FastAPI -> Engine mock/local/remote -> ResultV1 -> Frontend
```

O frontend nunca chama a DGX diretamente. Mesmo quando o processamento pesado
acontece fora da Azure, o backend central continua sendo a API pública do
projeto.

## Fluxo Mock

```text
Frontend
  -> POST /analyze
  -> Backend FastAPI
  -> MockGaitAnalysisEngine
  -> result.json
  -> ResultV1
```

Esse é o fluxo recomendado para integração inicial. Ele valida upload, storage,
contrato JSON e consumo pelo frontend sem depender de GPU ou modelos externos.

## Fluxo Remoto Com DGX

```text
Frontend
  -> Backend FastAPI na Azure
  -> RemoteDgxEngine
  -> Engine DGX Worker em engine_dgx/
  -> raw_data
  -> Backend monta ResultV1
  -> Frontend
```

Na DGX, o worker roda por conda. O caminho Docker GPU foi abandonado para esse
ambiente porque o aluno não possui Docker disponível na DGX.

## Organização Do Backend

```text
backend/app/
├── main.py                  # Monta FastAPI, CORS e routers
├── api/routes/
│   ├── health.py            # GET /health
│   └── analysis.py          # /analyze, /status, /results
├── core/
│   ├── config.py            # Variáveis de ambiente e paths
│   └── engine.py            # Seleção mock/local/remote
├── schemas/                 # Contratos Pydantic
├── services/                # Pipeline, engines, métricas e metadata
└── ml/                      # Fitting JAX/Equinox/Optax
```

O arquivo `backend/app/core/engine.py` decide qual engine usar:

- `ENGINE_MODE=mock`: `MockGaitAnalysisEngine`;
- `ENGINE_MODE=local`: `GaitAnalysisEngine`;
- `ENGINE_MODE=remote`: `RemoteDgxEngine`.

## Organização Da DGX

```text
engine_dgx/
├── main.py              # API FastAPI do worker DGX
├── worker_engine.py     # Singleton da engine pesada
├── gait_engine.py       # MeTRAbs, GaitTransformer e fitting
├── fitting.py           # Ajuste do modelo
├── model3d_export.py    # Exporta geometrias MuJoCo para o frontend
└── requirements.txt     # Dependências do ambiente DGX
```

Essa pasta é independente do Docker do backend. Ela existe para ser copiada ou
atualizada na DGX e executada dentro do ambiente conda preparado.

## Dados Para O Frontend

O backend retorna `ResultV1`. Dentro de `data`, os blocos mais importantes são:

- `model3d`: geometrias e frames exportados do MuJoCo, quando a DGX gera esse
  bloco;
- `fitting`: 40 coordenadas do modelo biomecânico, com metadados;
- `pose3d` e `skeleton`: keypoints 3D simples para preview e fallback;
- `metricas_clinicas`: séries calculadas para joelho, quadril e distância entre
  tornozelos;
- `quality_info`: avisos e contagem de frames sem detecção.

O contrato detalhado fica em [10-api.md](10-api.md).

## Decisões Mantidas

- O frontend conversa somente com a API.
- A API funciona em modo mock.
- A Azure atual é CPU e não deve ser tratada como ambiente de GPU.
- A DGX roda a engine pesada por conda, não por Docker.
- Banco de dados e fila assíncrona ficam fora do escopo atual.
- O backend entrega dados para o frontend renderizar no navegador.
