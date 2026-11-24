# study-japanese 이미지 — GitHub Actions가 빌드해 GHCR에 올린다. 서버에서는 빌드하지 않는다.
#
# 이미지에는 교재 자료가 없다. 서버 폴더를 붙여 쓴다:
#   /app/media    교재 오디오(읽기 전용)        MEDIA_DIR
#   /app/content  교재에서 뽑은 글(읽기 전용)    CONTENT_DIR
#   /app/data     학습 기록 study.db(읽고 쓰기)  DATA_DIR

FROM node:24-bookworm-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# pnpm 기본(심볼릭 링크) 구조에서는 Next standalone이 일부 모듈을 빠뜨린다. 이미지 안에서만 평평하게 깐다.
RUN echo "node-linker=hoisted" > .npmrc && pnpm install --frozen-lockfile --ignore-scripts

FROM deps AS build
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm run build

FROM node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000 \
    MEDIA_DIR=/app/media CONTENT_DIR=/app/content DATA_DIR=/app/data
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
RUN mkdir -p /app/data && chown node:node /app/data
# 배포 뒤 점검이 새 커밋이 떴는지 보는 값(/api/version). 맨 끝 단계에 두어 빌드 캐시를 깨지 않는다
ARG GIT_SHA=""
ENV GIT_SHA=$GIT_SHA
USER node
EXPOSE 3000
CMD ["node", "server.js"]
