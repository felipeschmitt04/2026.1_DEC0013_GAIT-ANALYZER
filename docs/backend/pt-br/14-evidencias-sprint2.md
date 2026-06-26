# Evidencias do Sprint 2

Data da validacao: 2026-06-18  
Ambiente: Acer Nitro 5, WSL2 Ubuntu 24.04, Docker Desktop  
Imagem Docker validada: `gait-analyzer-backend:cpu`  
Modo de execucao: `USE_MOCK_ENGINE=true`

Este documento registra os comandos executados, os resultados observados e o
significado tecnico de cada validacao. O objetivo e servir como base para a
apresentacao do Sprint 2 e como evidencia de que as partes principais do backend
funcionam isoladamente antes da integracao final.

## Objetivo Do Sprint 2

Validar que o backend FastAPI consegue:

- subir em Docker CPU;
- operar em modo mock sem depender de GPU ou modelos pesados;
- receber um video via `POST /analyze`;
- criar um `job_id`;
- salvar o resultado em storage;
- expor o status e o resultado por HTTP;
- entregar um JSON com dados suficientes para o frontend iniciar a integracao.

## Contexto Da Arquitetura Validada

Fluxo validado:

```text
Video local -> Backend FastAPI em Docker CPU -> MockGaitAnalysisEngine -> ResultV1 JSON
```

Neste Sprint, a validacao usa `MockGaitAnalysisEngine`. Isso e intencional:
permite testar API, storage, contrato JSON, Docker e integracao com frontend sem
depender de MeTRAbs, GaitTransformer, JAX, MuJoCo, TensorFlow Hub ou GPU.

## 1. Verificacao Do Estado Do Docker

Comando:

```bash
docker ps
```

Resultado observado:

```text
CONTAINER ID   IMAGE                       COMMAND                  CREATED         STATUS         PORTS                                         NAMES
0a5fedadbdcd   gait-analyzer-backend:cpu   "uvicorn app.main:ap…"   6 minutes ago   Up 6 minutes   0.0.0.0:8000->8000/tcp, [::]:8000->8000/tcp   gait-analyzer-sprint2-demo
```

Significado:

- confirma se o Docker Desktop esta ativo;
- mostra se ja existe algum container usando a porta `8000`;
- ajuda a evitar conflito antes de subir a API.

## 2. Build Da Imagem Docker CPU

Comando:

```bash
docker build -f backend/Dockerfile.cpu -t gait-analyzer-backend:cpu .
```

Resultado esperado:

```text
Imagem gait-analyzer-backend:cpu criada com sucesso.
```

Significado:

- valida que o `Dockerfile.cpu` esta correto;
- instala as dependencias leves da API;
- copia `backend/app`, `backend/storage` e `backend/tests`;
- configura a imagem para rodar em modo mock por padrao.

Trecho relevante do Dockerfile:

```dockerfile
ENV USE_MOCK_ENGINE=true
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Interpretacao:

O backend sobe em modo mock automaticamente dentro do container, o que e adequado
para Azure CPU e integracao inicial com frontend.

## 3. Testes Automatizados Leves

Comando:

```bash
docker run --rm gait-analyzer-backend:cpu python -m pytest tests/test_clinical_metrics.py
```

Resultado esperado:

```text
4 passed
```

Significado:

- valida funcoes matematicas simples usadas nas metricas clinicas;
- confirma que os testes foram copiados para a imagem Docker;
- prova que o ambiente Docker consegue executar `pytest`.

Testes cobertos:

- distancia entre pontos iguais;
- distancia entre `[0, 0, 0]` e `[3, 4, 0]`;
- angulo clinico de uma linha reta;
- angulo clinico de 90 graus.

Limite desta validacao:

Esses testes nao validam a engine pesada nem a biomecanica completa. Eles apenas
garantem que funcoes deterministicas e simples continuam corretas.

## 4. Subida Da API Em Docker

Comando:

```bash
docker run --rm -d \
  --name gait-analyzer-sprint2-demo \
  -p 8000:8000 \
  gait-analyzer-backend:cpu
```

Resultado observado:

```text
0a5fedadbdcdb98afea54564e20c25c93b006f2c8a8014aaf72de3da86b7c266
```

Significado:

- cria um container a partir da imagem `gait-analyzer-backend:cpu`;
- expõe a porta `8000` do container na porta `8000` da maquina local;
- deixa a API acessivel em `http://localhost:8000`.

## 5. Health Check Da API

Comando:

```bash
curl -i http://localhost:8000/health
```

Resultado esperado:

```text
HTTP/1.1 200 OK

{"status":"ok"}
```

Significado:

- confirma que a API FastAPI esta online;
- valida que o container esta aceitando requisicoes HTTP;
- nao valida ainda o pipeline de analise, apenas a saude basica do servico.

## 6. Envio De Video Para Analise

Comando:

```bash
curl -F video=@misc/meu_video.mp4 \
  -F height_mm=1750 \
  http://localhost:8000/analyze \
  -o backend/storage/temp/sprint2_analyze_result.json
```

Resultado observado no terminal:

```text
100 16.1M  100 29899  100 16.0M
```

Resumo extraido do JSON:

```bash
python3 -c "import json; r=json.load(open('backend/storage/temp/sprint2_analyze_result.json')); d=r['data']; f=d['fitting']; print('job_id:', r['job']['job_id']); print('status:', r['job']['status']); print('pose3d frames:', len(d['pose3d'])); print('juntas por frame:', len(d['pose3d'][0])); print('fitting coordenadas:', len(f['coordinate_names'])); print('fitting frames:', len(f['angles'])); print('warnings:', r['quality_info']['warnings'])"
```

Resultado observado:

```text
job_id: 34aebd23-a01e-4d7d-9e7f-e8015ac871ea
status: completed
pose3d frames: 30
juntas por frame: 17
fitting coordenadas: 40
fitting frames: 30
warnings: []
```

Significado:

- o endpoint `POST /analyze` recebeu o video `misc/meu_video.mp4`;
- o backend criou um `job_id`;
- o arquivo foi salvo no storage interno do container;
- o pipeline foi executado em modo mock;
- o job terminou com `status = completed`;
- o JSON retornado contem dados suficientes para o frontend iniciar a
  visualizacao e os graficos.

## 7. Recuperacao Do Resultado Salvo

Comando:

```bash
curl -s http://localhost:8000/results/34aebd23-a01e-4d7d-9e7f-e8015ac871ea \
  -o backend/storage/temp/sprint2_get_result.json
```

Resumo extraido do JSON recuperado:

```bash
python3 -c "import json; r=json.load(open('backend/storage/temp/sprint2_get_result.json')); print(r['job']['status']); print(len(r['data']['pose3d'])); print(len(r['data']['fitting']['coordinate_names']))"
```

Resultado observado:

```text
completed
30
40
```

Significado:

- confirma que o resultado foi persistido;
- confirma que `GET /results/{job_id}` consegue recuperar o JSON salvo;
- valida o fluxo esperado para recarregar resultados no frontend sem reenviar o
  video.

## 8. Campos Do JSON Relevantes Para O Frontend

Campos principais validados:

```text
job.job_id
job.status
job.stage
input_summary.height_mm
input_summary.fps
input_summary.duration_ms
quality_info.frames_total
quality_info.warnings
data.pose3d
data.skeleton
data.fitting.coordinate_names
data.fitting.coordinates
data.fitting.angles
data.fitting.timestamps
data.metricas_clinicas
```

Interpretacao:

- `data.pose3d` pode ser usado para preview visual com esqueleto simples;
- `data.skeleton` informa nomes das juntas e conexoes;
- `data.fitting` e o bloco principal para graficos biomecanicos e futura
  animacao de modelo 3D;
- `data.metricas_clinicas` fornece series ja calculadas em unidades mais
  amigaveis para relatorio.

## 9. Conclusao Da Validacao

A validacao confirma que o backend esta apto para o Sprint 2 no escopo proposto:

- API sobe em Docker CPU;
- modo mock funciona;
- upload de video funciona;
- pipeline retorna `ResultV1`;
- resultado e salvo e recuperado por `job_id`;
- contrato JSON esta suficientemente estavel para integracao inicial com o
  frontend.

## 10. Limitacoes Conhecidas

- A validacao usa `MockGaitAnalysisEngine`, nao a engine real.
- A engine real com MeTRAbs, GaitTransformer, JAX e MuJoCo depende de ambiente
  com dependencias pesadas e/ou GPU.
- A Azure atual e CPU, portanto nao deve ser tratada como ambiente de
  processamento pesado.
- A visualizacao 3D final sera implementada no frontend.
- O backend ainda processa de forma sincrona; fila/worker fica para evolucao
  futura.

## 11. Proximos Passos Sugeridos

Para integracao com frontend:

- publicar o backend na VM Azure;
- configurar `CORS_ORIGINS` com a URL do frontend do Eduardo;
- entregar a URL base da API;
- entregar exemplo real de JSON;
- validar `POST /analyze` a partir da VM/frontend.

Para Sprint 3:

- estudar worker remoto para processamento pesado na DGX;
- manter o contrato `ResultV1` estavel;
- avaliar uma abstracao de engine com modos `mock`, `local` e `remote`;
- criar visualizacao Three.js inicialmente baseada em `data.pose3d` e
  `data.skeleton`;
- deixar `data.fitting` como base para uma visualizacao biomecanica mais
  precisa no futuro.

## 12. Comandos Limpos Para Repetir A Validacao

```bash
docker build -f backend/Dockerfile.cpu -t gait-analyzer-backend:cpu .
```

```bash
docker run --rm gait-analyzer-backend:cpu python -m pytest tests/test_clinical_metrics.py
```

```bash
docker run --rm -d \
  --name gait-analyzer-sprint2-demo \
  -p 8000:8000 \
  gait-analyzer-backend:cpu
```

```bash
curl -i http://localhost:8000/health
```

```bash
curl -F video=@misc/meu_video.mp4 \
  -F height_mm=1750 \
  http://localhost:8000/analyze \
  -o backend/storage/temp/sprint2_analyze_result.json
```

```bash
python3 -c "import json; r=json.load(open('backend/storage/temp/sprint2_analyze_result.json')); d=r['data']; f=d['fitting']; print('job_id:', r['job']['job_id']); print('status:', r['job']['status']); print('pose3d frames:', len(d['pose3d'])); print('juntas por frame:', len(d['pose3d'][0])); print('fitting coordenadas:', len(f['coordinate_names'])); print('fitting frames:', len(f['angles'])); print('warnings:', r['quality_info']['warnings'])"
```

```bash
curl -s http://localhost:8000/results/SEU_JOB_ID \
  -o backend/storage/temp/sprint2_get_result.json
```

```bash
python3 -c "import json; r=json.load(open('backend/storage/temp/sprint2_get_result.json')); print(r['job']['status']); print(len(r['data']['pose3d'])); print(len(r['data']['fitting']['coordinate_names']))"
```

```bash
docker stop gait-analyzer-sprint2-demo
```
