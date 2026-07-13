# Decisões De Inferência E DGX

Este documento registra as decisões aprovadas para a fase atual do projeto. Ele
serve como memoria tecnica para a documentacao final e para evitar que a
arquitetura mude sem necessidade.

## Decisões Aprovadas

- Não usar vídeos pre-gerados como solucao de apresentação. A demo deve
  processar o vídeo enviado, mesmo que a execução completa leve alguns minutos.
- Não usar Docker GPU na DGX da UFSC, porque esse ambiente não oferece Docker ao
  aluno. A DGX roda por conda.
- Preferir fluxo pull-based: a DGX consulta a API central, baixa jobs pendentes e
  envia resultados. A Azure não precisa chamar a DGX diretamente.
- Não introduzir banco de dados na inferencia agora. A fila usa arquivos em
  `backend/storage/jobs/{job_id}/job.json`, e os resultados continuam em
  `backend/storage/results/{job_id}/result.json`.
- O banco de dados da parte web/cadastros fica separado e e responsabilidade do
  frontend/integração do Eduardo.
- Manter processamento pesado com um job por vez na DGX, usando lock no worker,
  para evitar disputa de GPU/memoria durante a apresentação.
- Manter a limpeza de caches JAX/Equinox antes e depois de cada processamento.
  Essa limpeza é uma medida de estabilidade porque processar vídeos diferentes
  em sequencia sem limpar cache ja causou erro no ambiente real.
- Manter o modo mock para o frontend e para a Azure CPU enquanto a integração com
  a DGX não estiver ativa.

## Implementacao Atual

- `ENGINE_MODE=queue` faz `POST /analyze` salvar upload, criar estado de fila e
  retornar `ResultV1` com `job.status=queued`.
- `backend/app/services/job_store.py` gerencia a fila em filesystem, incluindo
  claim, heartbeat, conclusao, falha e reentrada de jobs stale.
- `backend/app/api/routes/worker.py` expõe endpoints internos `/worker/*` com
  autenticacao simples via `X-Worker-Token`.
- `engine_dgx/pull_worker.py` faz polling, baixa o vídeo, chama a engine local da
  DGX e envia `raw_result`/artefatos para a API central.

## Proximas Conversas

- Persistencia mais forte com banco ou Redis pode entrar depois, se a fila por
  arquivos deixar de ser suficiente.
- Métricas operacionais, painel administrativo e cancelamento de job são úteis,
  mas não são obrigatórios para a apresentação atual.
- Otimizacoes profundas de JAX/XLA, batch, warmup persistente e profiling na DGX
  devem ser discutidas depois de medir o fluxo real com o worker pull-based.
