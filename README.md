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
├── app/                    # API FastAPI, pipeline, schemas e serviços
├── storage/                # Uploads, resultados e temporários
└── Dockerfile.cpu          # Imagem leve para API/mock

engine_dgx/
└── main.py                 # Worker FastAPI para a DGX

frontend-demo/
└── index.html              # Validador Three.js para ResultV1/model3d

docs/
├── backend/                # Documentação desta entrega/backend
│   └── pt-br/00-indice.md  # Índice principal em português
└── frontend/               # Reservado para documentação do frontend
```

## Configuração

Use [backend/.env.example](backend/.env.example) como referência. O arquivo
`.env` real não deve ser versionado.

A configuração completa está em
[Configuração do Ambiente](docs/backend/pt-br/06-configuracao-ambiente.md).

## Execução Com Docker CPU

Na raiz do repositório:

```bash
docker build -f backend/Dockerfile.cpu -t gait-analyzer-backend:cpu .
docker run --rm -p 8000:8000 gait-analyzer-backend:cpu
```

Mais detalhes em [Docker CPU](docs/backend/pt-br/08-docker.md).

## Execução Sem Docker

```bash
cd backend
ENGINE_MODE=mock uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Mais detalhes em
[Execução sem Docker](docs/backend/pt-br/07-execucao-sem-docker.md) e
[DGX UFSC](docs/backend/pt-br/11-dgx-ufsc.md).

## API

Endpoints principais:

- `GET /health`
- `POST /analyze`
- `GET /jobs`
- `GET /status/{job_id}`
- `GET /results/{job_id}`
- `GET /results/{job_id}/artifacts/{filename}`

O contrato completo está em
[Contrato da API](docs/backend/pt-br/10-api.md).

## CI/CD Em Termos Simples

CI significa integracao continua: o GitHub roda automaticamente checagens quando ha push ou pull request. Neste repositorio, a CI instala as dependencias leves do backend, compila os modulos Python e executa os testes.

CD significa entrega/deploy continuo. Este projeto ainda nao faz deploy automatico; atualizar Azure ou DGX continua sendo um passo manual documentado.

## Documentação

O `frontend-demo/` e somente um validador local do `ResultV1` e do `data.model3d`. O frontend final e mantido em outro ambiente pelo responsavel da parte web.

A documentação está separada por área do projeto:

```text
docs/backend/
docs/frontend/
```

A parte preenchida neste repositório é a documentação do backend. A pasta
`docs/frontend/` fica reservada para a documentação do frontend, que será
mantida pelo responsável dessa parte.

Índice da documentação do backend:

1. [Visão Geral](docs/backend/pt-br/01-visao-geral.md)
   Contexto do projeto, objetivo acadêmico, ambientes conhecidos e estado atual.

2. [Arquitetura](docs/backend/pt-br/02-arquitetura.md)
   Fluxos de dados, separação entre frontend, backend, mock e worker DGX.

3. [Criação da VM na Azure](docs/backend/pt-br/03-criacao-vm-azure.md)
   Reservado para o guia de criação da VM.

4. [Conexão via SSH](docs/backend/pt-br/04-conexao-ssh.md)
   Acesso remoto à VM ou DGX por terminal.

5. [GitHub, SSH e Deploy Key](docs/backend/pt-br/05-github-ssh-deploy-key.md)
   Configuração de acesso ao repositório em ambientes sem interface gráfica.

6. [Configuração do Ambiente](docs/backend/pt-br/06-configuracao-ambiente.md)
   Variáveis de ambiente, dependências, perfis de execução e storage.

7. [Execução sem Docker](docs/backend/pt-br/07-execucao-sem-docker.md)
   Execução direta do backend, worker DGX e demo local.

8. [Docker CPU](docs/backend/pt-br/08-docker.md)
   Build e execução da imagem CPU/mock.

9. [Deploy](docs/backend/pt-br/09-deploy.md)
   Atualização do backend na Azure e conexão com DGX quando necessário.

10. [Contrato da API](docs/backend/pt-br/10-api.md)
    Endpoints, parâmetros, `ResultV1`, `pose3d`, `fitting`, `model3d` e exemplos.

11. [DGX UFSC](docs/backend/pt-br/11-dgx-ufsc.md)
    Execução da engine pesada na DGX com conda e `engine_dgx/`.

12. [Segurança](docs/backend/pt-br/12-seguranca.md)
    Cuidados com `.env`, chaves, dados de vídeo, CORS, portas e URLs temporárias.

13. [Troubleshooting](docs/backend/pt-br/13-troubleshooting.md)
    Problemas comuns e caminhos de diagnóstico.

14. [Evidências do Sprint 2](docs/backend/pt-br/14-evidencias-sprint2.md)
    Registro dos testes de Docker CPU, mock, API e contrato JSON.

15. [Testes](docs/backend/pt-br/15-testes.md)
    Tipos de teste e comandos de validação do projeto.

16. [Decisoes de Inferencia DGX](docs/backend/pt-br/16-decisoes-inferencia-dgx.md)
    Decisoes aprovadas sobre fila, DGX pull-based, cache JAX/Equinox e banco.
