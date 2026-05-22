# syntax=docker/dockerfile:1.7

# ---------- Base image shared by every stage ----------
ARG NODE_IMAGE=node:22-alpine
FROM ${NODE_IMAGE} AS base
WORKDIR /app
ENV NPM_CONFIG_FUND=false \
    NPM_CONFIG_AUDIT=false \
    NPM_CONFIG_UPDATE_NOTIFIER=false


# ---------- Install all dependencies (incl. dev) ----------
FROM base AS deps
RUN apk add --no-cache libc6-compat openssl python3 make g++
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci


# ---------- Build TypeScript + Prisma client ----------
FROM deps AS build
COPY tsconfig.json ./
COPY src ./src
RUN npx prisma generate \
 && npm run build:ts


# ---------- Lean runtime image ----------
FROM base AS runtime
RUN apk add --no-cache libc6-compat openssl tini

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000

# Bring over the already-built artefacts and node_modules (which contain the
# generated Prisma client *and* the Prisma CLI used for migrations at boot).
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package.json package-lock.json ./
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh

# Strip any CRLF the script might have picked up on a Windows host, then make
# it executable and hand the workdir over to the unprivileged `node` user.
RUN sed -i 's/\r$//' /usr/local/bin/entrypoint.sh \
 && chmod +x /usr/local/bin/entrypoint.sh \
 && chown -R node:node /app

USER node
EXPOSE 3000

ENTRYPOINT ["/sbin/tini", "--", "/usr/local/bin/entrypoint.sh"]
CMD ["./node_modules/.bin/fastify", "start", "-l", "info", "-a", "0.0.0.0", "-p", "3000", "dist/app.js"]
