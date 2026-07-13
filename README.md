# Gait Analyzer

Sistema acadêmico de análise de marcha humana desenvolvido para a disciplina de
Projeto Integrador em Engenharia da Computação. O projeto recebe vídeos de
marcha, processa a movimentação com uma engine biomecânica, exibe resultados no
frontend e gera um relatório clínico em PDF.

## Visão geral

O sistema foi dividido em três responsabilidades principais:

- **Frontend web**: interface para login, cadastro de pacientes, envio de vídeo,
  acompanhamento de análises, visualização 3D, gráficos e download do relatório.
- **Backend FastAPI**: API central, validação de uploads, fila de jobs,
  contrato `ResultV1`, armazenamento de resultados e geração do PDF clínico.
- **Engine DGX**: processamento pesado executado na DGX da UFSC por ambiente
  conda, consumindo jobs da API central em modo pull-based.

O frontend nunca chama a DGX diretamente. A DGX consulta a API, busca jobs
pendentes, processa o vídeo e envia o resultado de volta. O frontend conversa
com o backend central e usa o Supabase para persistir pacientes, profissionais e
histórico das análises.

## Tecnologias

| Área | Tecnologias |
| --- | --- |
| Frontend | Next.js App Router, React, TypeScript, TailwindCSS, Shadcn UI, Radix UI, Lucide React, Three.js |
| Banco do frontend | Supabase PostgreSQL e Prisma ORM |
| Backend | Python, FastAPI, Pydantic, Uvicorn, OpenCV, ReportLab, Matplotlib |
| Engine de marcha | MeTRAbs, GaitTransformer, TensorFlow, JAX, Equinox, Optax, MuJoCo/MJX |
| Infraestrutura | Docker CPU, Azure VM, Azure App Service, sslip.io para HTTPS temporário |
| Qualidade | Pytest, ESLint, tipagem TypeScript e documentação em Markdown |

## Estrutura

```text
.
├── app/                    # Frontend Next.js e rotas internas de API
├── components/             # Componentes visuais reutilizáveis
├── lib/                    # Utilitários do frontend e conexão Prisma
├── prisma/                 # Schema e migrations do banco Supabase
├── backend/                # API FastAPI, schemas, serviços, storage e testes
├── engine_dgx/             # Worker/engine pesada para execução na DGX
├── docs/                   # Documentação técnica em português
└── Dockerfile              # Imagem do frontend
```

## Fluxo de análise

1. O profissional seleciona um paciente e envia um vídeo pelo frontend.
2. O frontend cria um `FormData` com `video`, `height_mm` e `rotated`.
3. A rota interna do Next.js encaminha o upload para `POST /analyze`.
4. O backend salva o vídeo, cria o job e devolve um `job_id`.
5. O frontend salva a análise no Supabase usando o mesmo `job_id`.
6. A DGX consulta `/worker/jobs/next`, baixa o vídeo e processa a marcha.
7. A DGX envia o resultado para o backend, que monta o `ResultV1`.
8. O frontend consulta `/status/{job_id}` e `/results/{job_id}` para exibir o
   resultado.
9. O relatório clínico é baixado por `/results/{job_id}/report.pdf`, passando
   pela rota interna `app/api/analises/relatorio/route.ts`.

## Rodar o backend

Copie [backend/.env.example](backend/.env.example) para `backend/.env` ou defina
as variáveis no ambiente.

Modo mock/local de desenvolvimento:

```bash
cd backend
ENGINE_MODE=mock uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Com Docker CPU:

```bash
docker build -f backend/Dockerfile.cpu -t gait-analyzer-backend:cpu .
docker run --rm -p 8000:8000 -e ENGINE_MODE=mock gait-analyzer-backend:cpu
```

Modo fila com DGX:

```bash
docker run -d --name gait-api \
  -p 8000:8000 \
  -e ENGINE_MODE=queue \
  -e WORKER_TOKEN="troque-este-token" \
  -e CORS_ORIGINS="https://seu-front.azurewebsites.net" \
  gait-analyzer-backend:cpu
```

Na DGX:

```bash
cd engine_dgx
export BACKEND_URL="https://sua-api.sslip.io"
export WORKER_TOKEN="mesmo-token-do-backend"
python pull_worker.py
```

## Rodar o frontend

Crie `.env` na raiz com a conexão do Supabase:

```env
DATABASE_URL="postgresql://postgres:SENHA@db.PROJETO.supabase.co:5432/postgres"
```

Instale dependências e rode o Next.js:

```bash
npm install
npx prisma generate
npm run dev
```

O frontend usa rotas internas em `app/api/` para proteger credenciais e
intermediar chamadas ao backend. A URL pública atual do backend fica nas rotas
internas de análise e relatório; em produção, ela deve apontar para a API
publicada na Azure.

## Relatório PDF

O backend gera o relatório clínico sob demanda em:

```text
GET /results/{job_id}/report.pdf
```

O PDF inclui identificação do job, resumo do vídeo, métricas clínicas, gráficos
comparativos entre lados direito e esquerdo e observações técnicas. O arquivo é
salvo em `backend/storage/results/{job_id}/relatorio_analise_marcha.pdf` e não
deve ser versionado.

## Deploy

- **Backend**: roda em VM Azure com Docker CPU. Para integração real com a DGX,
  use `ENGINE_MODE=queue` e mantenha volume persistente para `backend/storage`.
- **DGX**: roda `engine_dgx/pull_worker.py` por conda. Ela precisa acessar a URL
  pública do backend e usar o mesmo `WORKER_TOKEN`.
- **Frontend**: pode rodar no Azure App Service ou Vercel. O App Service já
  fornece HTTPS no domínio padrão `azurewebsites.net`.
- **HTTPS temporário do backend**: pode ser obtido com domínio `sslip.io`
  apontando para o IP público da VM, por exemplo `https://IP-com-hifens.sslip.io`.

## Documentação

Toda a documentação oficial do projeto está em português:

- [Índice geral da documentação](docs/README.md)
- [Backend](docs/backend/00-indice.md)
- [Frontend](docs/frontend/00-indice.md)
- [Contrato da API](docs/backend/10-api.md)
- [Deploy do backend](docs/backend/09-deploy.md)
- [Deploy do frontend](docs/frontend/06-deploy-azure-app-service.md)
