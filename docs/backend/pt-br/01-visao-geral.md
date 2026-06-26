# Visão Geral

O Gait Analyzer é um projeto acadêmico de Engenharia da Computação da UFSC para
análise de marcha humana a partir de vídeos comuns. A ideia é receber um vídeo
de uma pessoa caminhando, extrair pose 3D, ajustar um modelo biomecânico e
entregar dados úteis para visualização, gráficos e relatório.

O frontend é desenvolvido separadamente e deve conversar somente com o backend
por HTTP. Isso mantém a interface web independente dos detalhes pesados de IA,
JAX, TensorFlow, MuJoCo e DGX.

## Objetivo Do Backend

O backend precisa:

- receber upload de vídeo;
- validar metadados básicos com OpenCV;
- criar um `job_id`;
- salvar upload e resultado em storage local;
- executar uma engine mock, local ou remota;
- devolver um JSON estável para o frontend;
- documentar claramente o contrato da API.

O backend não precisa, neste momento:

- ter banco de dados;
- ter fila assíncrona;
- gerar render 3D em vídeo como fluxo principal;
- rodar Docker GPU na DGX;
- expor a engine pesada diretamente para o frontend.

## Ambientes Conhecidos

### MacBook De Desenvolvimento

É o workspace principal para organização do código e documentação. Nem sempre
possui as dependências pesadas instaladas. As validações mais seguras aqui são:

```bash
cd backend
python3 -m compileall app storage/scripts
```

### Azure CPU

A VM conhecida é uma `Standard D4s v3`, com 4 vCPUs e 16 GiB de RAM. Ela não tem
GPU. Por isso, o papel recomendado dela é hospedar a API, rodar o modo mock e
servir como contrato estável para o frontend.

### DGX H100 UFSC

A DGX é o ambiente com GPU forte. Como Docker não está disponível para o aluno
nesse ambiente, os arquivos usados lá ficam em `engine_dgx/` e rodam com conda.

### Frontend

O frontend fica em outro ambiente. Ele deve consumir:

- `POST /analyze` para enviar vídeo;
- `GET /status/{job_id}` para status;
- `GET /results/{job_id}` para recuperar resultado;
- `data.model3d`, `data.fitting`, `data.pose3d` e `data.metricas_clinicas` para
  visualização e gráficos.

## Modos De Execução

### Mock

Usado para desenvolvimento, Azure CPU, Docker leve e integração inicial com o
frontend. Não baixa modelos pesados e não depende de GPU.

```env
ENGINE_MODE=mock
```

ou, por compatibilidade:

```env
USE_MOCK_ENGINE=true
```

### Local

Carrega a `GaitAnalysisEngine` dentro do próprio processo do backend. Esse modo
depende das bibliotecas pesadas e de um ambiente compatível.

```env
ENGINE_MODE=local
```

### Remote

O backend recebe o vídeo, valida metadados e envia o processamento pesado para o
worker DGX.

```env
ENGINE_MODE=remote
REMOTE_ENGINE_URL=http://servidor-dgx:9000
```

O frontend continua falando somente com o backend central.

## Estado Atual

O projeto já possui:

- API FastAPI organizada em routers;
- schemas Pydantic separados;
- storage por `job_id`;
- mock engine;
- cliente para worker remoto DGX;
- worker DGX em `engine_dgx/`;
- documentação do contrato da API;
- demo Three.js para inspecionar `model3d`, `fitting` e `pose3d`.

Os próximos pontos de estabilização são testes automatizados, documentação de
deploy mais operacional e validação contínua do fluxo mock com Docker CPU.
