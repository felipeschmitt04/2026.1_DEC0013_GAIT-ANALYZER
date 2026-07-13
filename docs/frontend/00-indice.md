# Frontend

Documentação do frontend Next.js responsável pela experiência do usuário,
cadastro de pacientes, envio de vídeos, acompanhamento das análises, gráficos,
visualização 3D e download do relatório PDF.

## O que foi implementado

- Autenticação e telas separadas para login comum e login administrativo.
- Dashboard com navegação protegida.
- Cadastro e listagem de pacientes.
- Cadastro e gestão de profissionais no módulo administrativo.
- Tela de nova análise com upload de vídeo e envio para o backend.
- Persistência de pacientes e análises no Supabase usando Prisma.
- Estado global para paciente, análise e job ativos.
- Tela de relatório com dados da análise e botão para baixar o PDF do backend.
- Visualização 3D baseada no resultado da análise.
- Rotas internas do Next.js para intermediar banco, login, análise e relatório.
- Dockerfile para empacotar a aplicação em produção.
- Documentação de deploy no Azure App Service.

## Roteiro de leitura

1. [Visão geral](01-visao-geral.md)
   Papel do frontend, fluxo de análise e limites de responsabilidade.

2. [Arquitetura e stack](02-arquitetura-stack.md)
   Organização do projeto, tecnologias usadas e responsabilidades das pastas.

3. [Configuração do ambiente](03-configuracao-ambiente.md)
   Pré-requisitos, `.env`, Supabase, Prisma e ferramentas de desenvolvimento.

4. [Execução local](04-execucao-local.md)
   Como preparar banco, migrations e servidor Next.js local.

5. [Persistência com Supabase](07-persistencia-supabase.md)
   Como o frontend salva pacientes, profissionais e histórico de análises.

6. [Estado global](08-estado-global.md)
   Uso do `PacienteContext` para manter paciente, análise e job selecionados.

7. [Upload e usabilidade](09-upload-usabilidade.md)
   UX do envio de vídeo, validações, altura em milímetros e prevenção de duplicidade.

8. [Integração com API e polling](10-integracao-api-polling.md)
   Como o frontend envia vídeos, acompanha jobs, busca resultados e baixa PDFs.

9. [Componentização e design system](11-componentizacao-design-system.md)
   Uso de Shadcn UI, Radix, TailwindCSS e Lucide React.

10. [Segurança e CORS](12-seguranca-cors.md)
    Proteção de credenciais, rotas internas e política de origem.

11. [Docker](05-docker.md)
    Build da imagem, estratégia standalone e publicação da imagem.

12. [Deploy no Azure App Service](06-deploy-azure-app-service.md)
    Hospedagem gerenciada, HTTPS, variáveis de ambiente e atualização de imagem.

## Decisões principais

- O frontend salva o `job_id` retornado pelo backend como identificador da
  análise no Supabase, facilitando a busca posterior do resultado.
- O navegador não acessa o Supabase diretamente; as operações passam por rotas
  internas do Next.js.
- O download do PDF passa por `app/api/analises/relatorio/route.ts`, que faz
  proxy para `/results/{job_id}/report.pdf`.
- A URL do backend precisa apontar para a API central publicada. No estado atual,
  ela aparece nas rotas internas de análise e relatório.
- A visualização 3D deve priorizar `data.model3d` quando disponível e usar
  `pose3d`/`skeleton` como apoio ou fallback.
