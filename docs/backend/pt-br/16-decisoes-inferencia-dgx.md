# Decisoes De Inferencia E DGX

Este documento registra as decisoes aprovadas para a fase atual do projeto. Ele
serve como memoria tecnica para a documentacao final e para evitar que a
arquitetura mude sem necessidade.

## Decisoes Aprovadas

- Nao usar videos pre-gerados como solucao de apresentacao. A demo deve
  processar o video enviado, mesmo que a execucao completa leve alguns minutos.
- Nao usar Docker GPU na DGX da UFSC, porque esse ambiente nao oferece Docker ao
  aluno. A DGX roda por conda.
- Preferir fluxo pull-based: a DGX consulta a API central, baixa jobs pendentes e
  envia resultados. A Azure nao precisa chamar a DGX diretamente.
- Nao introduzir banco de dados na inferencia agora. A fila usa arquivos em
  `backend/storage/jobs/{job_id}/job.json`, e os resultados continuam em
  `backend/storage/results/{job_id}/result.json`.
- O banco de dados da parte web/cadastros fica separado e e responsabilidade do
  frontend/integracao do Eduardo.
- Manter processamento pesado com um job por vez na DGX, usando lock no worker,
  para evitar disputa de GPU/memoria durante a apresentacao.
- Manter a limpeza de caches JAX/Equinox antes e depois de cada processamento.
  Essa limpeza e uma medida de estabilidade porque processar videos diferentes
  em sequencia sem limpar cache ja causou erro no ambiente real.
- Manter o modo mock para o frontend e para a Azure CPU enquanto a integracao com
  a DGX nao estiver ativa.

## Implementacao Atual

- `ENGINE_MODE=queue` faz `POST /analyze` salvar upload, criar estado de fila e
  retornar `ResultV1` com `job.status=queued`.
- `backend/app/services/job_store.py` gerencia a fila em filesystem, incluindo
  claim, heartbeat, conclusao, falha e reentrada de jobs stale.
- `backend/app/api/routes/worker.py` expoe endpoints internos `/worker/*` com
  autenticacao simples via `X-Worker-Token`.
- `engine_dgx/pull_worker.py` faz polling, baixa o video, chama a engine local da
  DGX e envia `raw_result`/artefatos para a API central.

## Proximas Conversas

- Persistencia mais forte com banco ou Redis pode entrar depois, se a fila por
  arquivos deixar de ser suficiente.
- Metricas operacionais, painel administrativo e cancelamento de job sao uteis,
  mas nao sao obrigatorios para a apresentacao atual.
- Otimizacoes profundas de JAX/XLA, batch, warmup persistente e profiling na DGX
  devem ser discutidas depois de medir o fluxo real com o worker pull-based.
