# Backend

Documentação do backend FastAPI responsável por receber vídeos, criar jobs,
orquestrar o processamento, armazenar resultados e gerar o relatório clínico em
PDF.

## O que foi implementado

- API FastAPI com health check, upload de vídeo, status, resultado e artefatos.
- Contrato `ResultV1` para o frontend consumir dados de vídeo, pose, fitting,
  métricas clínicas, visualização 3D e artefatos.
- Modo `mock` para desenvolvimento sem a engine pesada.
- Modo `local` para execução direta da engine no mesmo processo.
- Modo `remote` para debug chamando um worker externo.
- Modo `queue` com worker DGX pull-based.
- Armazenamento local em `backend/storage` para uploads, jobs, resultados e
  temporários.
- Rotas internas `/worker/*` protegidas por `WORKER_TOKEN`.
- Geração sob demanda do relatório PDF em `/results/{job_id}/report.pdf`.
- Scripts de limpeza, renderização local e conversão de resultados da DGX.
- Testes automatizados para API, pipeline, fila, worker, limpeza e metadados.

## Documentos

1. [Visão geral](01-visao-geral.md)
   Contexto acadêmico, limites de responsabilidade e estado atual do backend.

2. [Arquitetura](02-arquitetura.md)
   Fluxo entre frontend, backend, fila, DGX, storage e contrato de resultado.

3. [Criação da VM na Azure](03-criacao-vm-azure.md)
   Passo a passo para criar uma VM usando os créditos acadêmicos.

4. [Conexão via SSH](04-conexao-ssh.md)
   Acesso à VM, chaves SSH, portas e comandos úteis de diagnóstico.

5. [GitHub, SSH e Deploy Key](05-github-ssh-deploy-key.md)
   Como permitir `git pull` em servidores sem depender de senha.

6. [Configuração do ambiente](06-configuracao-ambiente.md)
   Variáveis de ambiente, diretórios, modos de engine e dependências.

7. [Execução sem Docker](07-execucao-sem-docker.md)
   Como rodar a API e o worker DGX direto pelo terminal.

8. [Docker CPU](08-docker.md)
   Build e execução do backend em contêiner leve.

9. [Deploy](09-deploy.md)
   Atualização do backend na Azure, volumes, portas, HTTPS e conexão com a DGX.

10. [Contrato da API](10-api.md)
    Endpoints, payloads, `ResultV1`, `model3d`, `fitting`, artefatos e PDF.

11. [DGX UFSC](11-dgx-ufsc.md)
    Execução do processamento pesado por conda e worker pull-based.

12. [Segurança](12-seguranca.md)
    Tokens, CORS, dados sensíveis, storage, rede e exposição de portas.

13. [Troubleshooting](13-troubleshooting.md)
    Erros comuns e caminhos rápidos de diagnóstico.

14. [Evidências do Sprint 2](14-evidencias-sprint2.md)
    Registro histórico de validações da etapa anterior.

15. [Testes](15-testes.md)
    Cobertura existente e comandos de validação.

16. [Decisões de inferência e DGX](16-decisoes-inferencia-dgx.md)
    Decisões tomadas sobre fila, DGX, cache e limites de escopo.

## Decisões principais

- A Azure hospeda a API central, mas não é tratada como ambiente de GPU.
- A DGX não roda Docker neste projeto; a engine pesada roda por conda.
- O fluxo recomendado é pull-based: a DGX busca jobs na API central.
- O frontend consome somente o backend central e nunca chama a DGX diretamente.
- O relatório PDF é gerado pelo backend, porque depende do resultado completo da
  análise e deve ficar consistente com o contrato `ResultV1`.
- Arquivos grandes gerados em runtime ficam fora do Git.
