# API: Express 5 + Prisma 6 ejecutado con tsx.
# CONTEXTO DE BUILD = RAÍZ DEL REPO (no server/). El servidor importa el dominio con rutas
# que salen de su carpeta: `../../../src/app/domain/...` desde server/src/http/ resuelve a
# <raíz>/src/app/domain/ (ADR 0025). La imagen reproduce esa geometría: /app/server y
# /app/src/app/domain.
#
# NO se compila a JavaScript a propósito: el generador `prisma-client` emite el cliente como
# TypeScript con imports sin extensión, que ni tsc reescribe ni Node resuelve tal cual. Se
# ejecuta con tsx, igual que en desarrollo. Ver ADR 0041.
# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS base
# openssl lo necesita el motor de consultas de Prisma; ca-certificates, cualquier salida TLS.
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# ---

FROM base AS deps
WORKDIR /app/server

# Dependencias completas, devDependencies incluidas: tsx ejecuta el servidor y la CLI de
# prisma aplica las migraciones al arrancar. Ambas son devDependencies hoy.
COPY server/package.json server/package-lock.json ./
RUN npm ci

# El dominio compartido tiene que estar en su sitio antes de generar.
COPY src/app/domain /app/src/app/domain
COPY server/prisma ./prisma

# Genera el cliente en server/generated/prisma (output "../generated/prisma" del schema).
# Se genera DENTRO de la imagen, sobre la misma base que el runtime: así el binario del motor
# es el de esta plataforma y no el de la máquina donde se construye.
RUN npx prisma generate

# ---

FROM base AS final
ENV NODE_ENV=production
WORKDIR /app/server

COPY --from=deps /app/server/node_modules ./node_modules
COPY --from=deps /app/server/generated    ./generated
COPY --from=deps /app/src/app/domain      /app/src/app/domain
COPY server/prisma  ./prisma
COPY server/src     ./src
COPY server/package.json server/tsconfig.json ./

# Usuario sin privilegios, presente en la imagen base de node.
USER node

EXPOSE 3000

# Migraciones antes de escuchar: `migrate deploy` es idempotente y no interactivo. Si falla,
# el contenedor muere con código != 0 y se ve en `docker compose logs` — nunca arranca el
# servidor contra un esquema equivocado. `exec` deja a node como PID 1 para que reciba el
# SIGTERM de `docker compose down`.
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && exec ./node_modules/.bin/tsx src/main.ts"]
