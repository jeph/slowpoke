# ---- Build application ----
FROM node:25-slim AS builder

WORKDIR /usr/src/slowpoke

# Install pnpm
RUN npm install -g pnpm@10.28.0

# Copy package files and pnpm workspace config first for better caching.
# pnpm-workspace.yaml contains the override/build-script policy that must
# match pnpm-lock.yaml for frozen installs.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source code
COPY ./src ./src
COPY tsconfig.json ./
COPY eslint.config.mjs ./

# Build the application
RUN pnpm run build
RUN pnpm prune --prod

# ---- Create runtime image ----
FROM node:25-slim AS runtime

# Set the working directory
WORKDIR /app

ENV HOME=/app
ENV LANGCHAINJS_CODEX_OAUTH_HOME=/app/.langchainjs-codex-oauth
ENV PATH="/app/node_modules/.bin:${PATH}"

# Create a non-root user and group for security
RUN groupadd -r appgroup && useradd -r -g appgroup -d /app appuser

# Copy built application
COPY --from=builder /usr/src/slowpoke/dist /app/dist
COPY --from=builder /usr/src/slowpoke/node_modules /app/node_modules
COPY --from=builder /usr/src/slowpoke/package.json /app/package.json

# Keep credentials out of the image. This empty directory is where a runtime
# Docker volume should be mounted so OAuth refreshes persist across deploys.
RUN mkdir -p /app/.langchainjs-codex-oauth

# Verify npm/npx are available for one-time auth bootstrapping in the container.
RUN npm --version && npx --version

# Change ownership to non-root user
RUN chown -R appuser:appgroup /app

USER appuser

CMD ["node", "dist/main.js"]
