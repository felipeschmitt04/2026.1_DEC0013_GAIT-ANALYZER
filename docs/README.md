# Documentação

Esta pasta reúne a documentação oficial do Gait Analyzer em português. A
estrutura foi padronizada para evitar duplicação por idioma e para separar o que
pertence ao backend, ao frontend e às decisões de arquitetura.

```text
docs/
├── backend/     # API, fila, DGX, deploy, segurança, testes e contrato ResultV1
└── frontend/    # Next.js, Supabase, telas, upload, polling, Docker e deploy
```

## Leitura recomendada

1. [README geral do projeto](../README.md)
2. [Índice do backend](backend/00-indice.md)
3. [Índice do frontend](frontend/00-indice.md)
4. [Arquitetura do backend](backend/02-arquitetura.md)
5. [Contrato da API](backend/10-api.md)
6. [Integração do frontend com a API](frontend/10-integracao-api-polling.md)
7. [Deploy do backend](backend/09-deploy.md)
8. [Deploy do frontend](frontend/06-deploy-azure-app-service.md)
