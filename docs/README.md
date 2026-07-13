# Documentação

Esta pasta reúne a documentação oficial do Gait Analyzer em português. A leitura
foi organizada para começar pela visão geral do sistema, passar pela arquitetura
e pelo contrato entre as partes, e só depois entrar em execução, deploy,
segurança e evidências.

```text
docs/
├── assets/      # Diagrama da arquitetura e relatório PDF de exemplo
├── backend/     # API, fila, DGX, deploy, segurança, testes e contrato ResultV1
└── frontend/    # Next.js, Supabase, telas, upload, polling, Docker e deploy
```

## Roteiro de leitura

1. [README geral do projeto](../README.md)
2. [Backend: visão geral e arquitetura](backend/00-indice.md)
3. [Frontend: visão geral e arquitetura](frontend/00-indice.md)
4. [Contrato da API](backend/10-api.md)
5. [Integração do frontend com a API](frontend/10-integracao-api-polling.md)
6. [Execução do backend](backend/07-execucao-sem-docker.md)
7. [Execução do frontend](frontend/04-execucao-local.md)
8. [Deploy do backend](backend/09-deploy.md)
9. [Deploy do frontend](frontend/06-deploy-azure-app-service.md)
10. [Segurança](backend/12-seguranca.md)
11. [Testes](backend/15-testes.md)

## Materiais visuais

- [Diagrama da arquitetura do Sprint 3](assets/diagrama-arquitetura-sprint3.jpeg)
- [Relatório PDF de exemplo](assets/relatorio-analise-marcha-exemplo.pdf)
