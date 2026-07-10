# ==========================
# 1. Dependências
# ==========================
FROM node:20-bookworm-slim AS deps
# Instalamos o openssl e o ca-certificates para requisições seguras e o Prisma
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci

# ==========================
# 2. Build
# ==========================
FROM node:20-bookworm-slim AS builder
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Gera o cliente do Prisma gerando os binários corretos para o Debian Bookworm
RUN npx prisma generate
RUN npm run build

# ==========================
# 3. Produção (Runner)
# ==========================
FROM node:20-bookworm-slim AS runner
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Copia os arquivos gerados pelo standalone do Next.js
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# CHAVE DA SOLUÇÃO: Garante que os motores do Prisma copiados do builder fiquem disponíveis no standalone
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3000

CMD ["node", "server.js"]