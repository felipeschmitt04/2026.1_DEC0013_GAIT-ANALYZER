# Arquitetura

A arquitetura atual separa tres responsabilidades:

- frontend web: interface, upload, visualizacao 3D, graficos e relatorio;
- backend FastAPI: contrato HTTP, validacao, storage, fila e montagem do `ResultV1`;
- engine: processamento mock, local pesado, remoto direto ou worker DGX pull-based.

## Fluxo Principal

```text
Frontend -> Backend FastAPI -> mock/local ou fila DGX pull-based -> ResultV1 -> Frontend
```

O frontend nunca chama a DGX diretamente. Mesmo quando o processamento pesado
acontece fora da Azure, o backend central continua sendo a API publica do
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

Esse e o fluxo recomendado para integracao inicial. Ele valida upload, storage,
contrato JSON e consumo pelo frontend sem depender de GPU ou modelos externos.

## Fluxo Com DGX Pull-Based

```text
Frontend
  -> Backend FastAPI na Azure
  -> storage/jobs/{job_id}/job.json
  -> DGX Pull Worker consulta /worker/jobs/next
  -> DGX baixa o video, processa e envia raw_data
  -> Backend monta ResultV1
  -> Frontend consulta /status ou /results
```

Esse e o desenho preferido para a apresentacao: a DGX olha para a API central e
busca trabalho quando estiver disponivel. Assim a Azure nao precisa abrir
conexao para dentro da rede da DGX, e a DGX nao precisa ficar exposta ao
frontend.

O modo `ENGINE_MODE=remote`, em que o backend chama diretamente o worker DGX,
continua existindo como alternativa de debug ou ambiente controlado. Na DGX, o
worker roda por conda. O caminho Docker GPU foi abandonado para esse ambiente
porque o aluno nao possui Docker disponivel na DGX.

## Organizacao Do Backend

```text
backend/app/
|-- main.py                  # Monta FastAPI, CORS e routers
|-- api/routes/
|   |-- health.py            # GET /health
|   |-- analysis.py          # /analyze, /jobs, /status, /results
|   `-- worker.py            # Endpoints internos para worker DGX pull-based
|-- core/
|   |-- config.py            # Variaveis de ambiente e paths
|   `-- engine.py            # Selecao mock/local/remote
|-- schemas/                 # Contratos Pydantic
|-- services/                # Pipeline, engines, fila filesystem, metricas e metadata
`-- ml/                      # Fitting JAX/Equinox/Optax
```

O arquivo `backend/app/core/engine.py` decide qual engine usar nos fluxos
sincronos:

- `ENGINE_MODE=mock`: `MockGaitAnalysisEngine`;
- `ENGINE_MODE=local`: `GaitAnalysisEngine`;
- `ENGINE_MODE=remote`: `RemoteDgxEngine`.

O modo `ENGINE_MODE=queue` e tratado pelo endpoint `POST /analyze`: ele salva o
upload, cria o estado em `storage/jobs` e deixa a DGX buscar o trabalho.

## Organizacao Da DGX

```text
engine_dgx/
|-- main.py              # API FastAPI do worker DGX para teste direto/debug
|-- pull_worker.py       # Worker que consulta a API central e processa jobs
|-- worker_engine.py     # Singleton da engine pesada
|-- gait_engine.py       # MeTRAbs, GaitTransformer e fitting
|-- fitting.py           # Ajuste do modelo
|-- model3d_export.py    # Exporta geometrias MuJoCo para o frontend
`-- requirements.txt     # Dependencias do ambiente DGX
```

Essa pasta e independente do Docker do backend. Ela existe para ser copiada ou
atualizada na DGX e executada dentro do ambiente conda preparado.

## Dados Para O Frontend

O backend retorna `ResultV1`. Dentro de `data`, os blocos mais importantes sao:

- `model3d`: geometrias e frames exportados do MuJoCo, quando a DGX gera esse
  bloco;
- `fitting`: 40 coordenadas do modelo biomecanico, com metadados;
- `pose3d` e `skeleton`: keypoints 3D simples para preview e fallback;
- `metricas_clinicas`: series calculadas para joelho, quadril e distancia entre
  tornozelos;
- `quality_info`: avisos e contagem de frames sem deteccao.

O contrato detalhado fica em [10-api.md](10-api.md).

## Decisoes Mantidas

- O frontend conversa somente com a API.
- A API funciona em modo mock.
- A Azure atual e CPU e nao deve ser tratada como ambiente de GPU.
- A DGX roda a engine pesada por conda, nao por Docker.
- Nao introduzir banco de dados para inferencia agora; a fila usa arquivos em
  `storage/jobs`.
- O banco do frontend/cadastros fica separado e e responsabilidade da parte web.
- O backend entrega dados para o frontend renderizar no navegador.
