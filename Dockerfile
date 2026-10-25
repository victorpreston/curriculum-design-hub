FROM node:22-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci --no-audit --no-fund

FROM dependencies AS web-build
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/web apps/web
RUN npm run build -w @hub/web

FROM nginx:stable-alpine AS web
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=web-build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80

FROM dependencies AS api
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
COPY corpus corpus
COPY scripts/docker-start.mjs scripts/docker-start.mjs
RUN mkdir -p .cache/models .docker-state && chown -R node:node .cache .docker-state
USER node
EXPOSE 4000
CMD ["node", "scripts/docker-start.mjs"]
