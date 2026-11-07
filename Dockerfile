FROM node:24-alpine AS build
WORKDIR /app
ARG COMMIT_SHA=local
ENV GITHUB_SHA=${COMMIT_SHA}
COPY package.json ./
COPY src ./src
COPY public ./public
COPY scripts/build.mjs ./scripts/build.mjs
COPY server ./server
COPY tests ./tests
RUN npm test && npm run build

FROM node:24-alpine
WORKDIR /app
ARG COMMIT_SHA=local
LABEL org.opencontainers.image.source="https://github.com/scienthoon/hw2-python-quiz"
LABEL org.opencontainers.image.revision=${COMMIT_SHA}
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/src ./src
COPY --from=build --chown=node:node /app/server ./server
ENV HOST=0.0.0.0 PORT=8080
USER node
EXPOSE 8080
HEALTHCHECK --interval=2s --timeout=2s --start-period=2s --retries=10 CMD ["node","-e","fetch('http://127.0.0.1:8080/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]
CMD ["node","server/run.mjs"]
