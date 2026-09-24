FROM node:22-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production \
    PORT=8787

RUN groupadd --system --gid 1001 gateway \
    && useradd --system --uid 1001 --gid gateway gateway

COPY --chown=gateway:gateway services/ai-gateway/handler.mjs ./services/ai-gateway/handler.mjs
COPY --chown=gateway:gateway services/ai-gateway/server.mjs ./services/ai-gateway/server.mjs

USER gateway
EXPOSE 8787

CMD ["node", "services/ai-gateway/server.mjs"]
