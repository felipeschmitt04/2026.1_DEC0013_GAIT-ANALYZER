# Arquitetura e stack

O frontend foi implementado em Next.js com App Router. Ele concentra a
experiência do profissional de saúde e também executa rotas internas de servidor
para proteger credenciais e intermediar chamadas ao banco e ao backend de IA.

## Tecnologias usadas

- **Next.js App Router**: estrutura de rotas, páginas, layouts e handlers em
  `app/api`.
- **React e TypeScript**: construção da interface com tipagem dos dados usados
  nas telas.
- **TailwindCSS**: estilização utilitária e responsiva.
- **Shadcn UI e Radix UI**: componentes acessíveis, versionados dentro de
  `components/ui`.
- **Lucide React**: ícones da interface.
- **Three.js, React Three Fiber e Drei**: base da visualização 3D.
- **Prisma ORM**: camada tipada de acesso ao banco.
- **Supabase PostgreSQL**: persistência de pacientes, profissionais e análises.

## Estrutura principal

```text
.
├── app/
│   ├── (autenticacao)/
│   │   ├── login/
│   │   └── login-admin/
│   ├── (dashboard)/
│   │   ├── admin/profissionais/
│   │   ├── configuracoes/
│   │   ├── nova-analise/
│   │   ├── pacientes/
│   │   ├── relatorio/
│   │   └── visualizacao/
│   │       └── 3d/
│   ├── api/
│   │   ├── analises/
│   │   │   └── relatorio/
│   │   ├── login/
│   │   ├── pacientes/
│   │   └── profissionais/
│   ├── PacienteContext.tsx
│   ├── globals.css
│   └── layout.tsx
├── components/
│   ├── ProtecaoPaciente.tsx
│   └── ui/
├── hooks/
├── lib/
│   ├── db.ts
│   └── utils.ts
├── prisma/
│   ├── migrations/
│   └── schema.prisma
├── Dockerfile
├── next.config.ts
└── package.json
```

## Responsabilidades das camadas

- `app/(autenticacao)`: telas públicas de entrada.
- `app/(dashboard)`: telas privadas usadas depois da seleção de paciente.
- `app/api`: rotas internas do Next.js. Elas rodam no servidor do frontend e
  evitam expor `DATABASE_URL` ou regras sensíveis no navegador.
- `PacienteContext.tsx`: estado global para paciente, análise e job ativos.
- `components/ui`: componentes base gerados pelo Shadcn UI.
- `lib/db.ts`: instância do Prisma usada pelas rotas internas.
- `prisma/schema.prisma`: modelo das tabelas do Supabase.

## Integração com o backend

O frontend não processa marcha. A tela de nova análise envia o vídeo para uma
rota interna do Next.js, que encaminha o upload para `POST /analyze` no backend.
Depois disso, o frontend acompanha o job por `GET /status/{job_id}` e busca o
resultado por `GET /results/{job_id}`.

Para relatório em PDF, a tela chama a rota interna
`app/api/analises/relatorio/route.ts`, que faz proxy para
`GET /results/{job_id}/report.pdf`.
