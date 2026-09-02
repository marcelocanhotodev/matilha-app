# syntax=docker/dockerfile:1

# ==============================================================================
# Dockerfile de produção — build multi-stage.
#
# Uso direto (sem compose):
#   docker build -t matilha-app .
#   docker run -p 3000:3000 --env-file .env matilha-app
#
# Normalmente usado via docker-compose.prod.yml, que também sobe o Postgres.
#
# Estágios:
#   deps    -> instala dependências de produção + dev (precisa do Prisma CLI)
#   builder -> gera o Prisma Client e faz o build do Next.js (output: standalone)
#   runner  -> imagem final, enxuta, só com o necessário para rodar
#
# O estágio "builder" também é reaproveitado pelo serviço "migrate" do
# docker-compose.prod.yml, pois é o único estágio com o Prisma CLI disponível
# (a imagem final "runner" não carrega devDependencies).
# ==============================================================================

FROM node:20-alpine AS base
# Fuso horário da clínica — camada extra de proteção, não a correção
# principal (essa mora em src/lib/timezone.ts; ver
# openspec/changes/corrigir-fuso-horario-agenda/design.md, Decisão 4). Sem
# isso, o container roda em UTC por padrão (Alpine), divergindo do fuso do
# Brasil.
RUN apk add --no-cache tzdata
ENV TZ=America/Sao_Paulo

# ---- deps -------------------------------------------------------------------
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# `npm install`/`npm ci` roda o script "postinstall" (prisma generate), que
# precisa do schema.prisma já presente e de DATABASE_URL definida (só para o
# parser conseguir ler o schema — não conecta de fato nesta etapa).
ENV DATABASE_URL="postgresql://postgres:postgres@db:5432/matilha?schema=public"
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN [ -f package-lock.json ] && npm ci || npm install

# ---- builder ------------------------------------------------------------------
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Necessário para `prisma generate` conseguir ler o datasource do schema.
# Não conecta de fato nesta etapa — só precisa que a env var exista.
ENV DATABASE_URL="postgresql://postgres:postgres@db:5432/matilha?schema=public"

RUN npx prisma generate
RUN npm run build

# ---- runner -------------------------------------------------------------------
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
