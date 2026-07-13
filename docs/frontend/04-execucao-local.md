# Execução local

Este guia cobre o fluxo local do frontend: dependências, banco, Prisma e servidor
Next.js.

## Pré-requisitos

- Node.js 18 ou superior.
- npm.
- Acesso ao projeto Supabase usado pelo grupo.
- URL pública ou local do backend FastAPI.

## Instalar dependências

Na raiz do repositório:

```bash
npm install
```

## Configurar ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
DATABASE_URL="postgresql://postgres:SENHA@db.PROJETO.supabase.co:5432/postgres"
```

Essa variável é usada pelo Prisma nas rotas internas do Next.js. Ela não deve
ser enviada ao Git.

## Preparar Prisma

Gerar o client TypeScript:

```bash
npx prisma generate
```

Aplicar migrations em ambiente de desenvolvimento:

```bash
npx prisma migrate dev
```

Quando uma tabela ou coluna for alterada em `prisma/schema.prisma`, crie uma
nova migration com nome descritivo:

```bash
npx prisma migrate dev --name adiciona_campo_exemplo
```

## Rodar o servidor

```bash
npm run dev
```

Por padrão, o Next.js fica disponível em:

```text
http://localhost:3000
```

## Validar integração

1. Confirme que o backend responde:

```bash
curl https://sua-api.sslip.io/health
```

2. Confirme que a URL do backend usada nas rotas internas do frontend aponta para
   o ambiente correto.
3. Faça login, selecione ou cadastre um paciente e envie um vídeo pela tela de
   nova análise.
4. Acompanhe se a análise aparece no histórico usando o mesmo `job_id` retornado
   pelo backend.

## Comandos úteis

```bash
npm run lint
npm run build
npx prisma studio
```

`npm run build` é o comando mais importante antes de gerar a imagem Docker,
porque valida se o Next.js consegue compilar a aplicação de produção.
