FROM node:22-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production \
    PORT=8787

RUN groupadd --system --gid 1001 gateway \
    && useradd --system --uid 1001 --gid gateway gateway

COPY --chown=gateway:gateway cloudflare-worker/worker.js ./cloudflare-worker/worker.js
COPY --chown=gateway:gateway cloudflare-worker/package.json ./cloudflare-worker/package.json
COPY --chown=gateway:gateway services/ai-gateway/server.mjs ./services/ai-gateway/server.mjs

USER gateway
EXPOSE 8787

CMD ["node", "services/ai-gateway/server.mjs"]
