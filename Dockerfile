# ---- Build application ----
FROM node:25-slim AS builder

WORKDIR /usr/src/slowpoke

# Install pnpm
RUN npm install -g pnpm@10.27.0

# Copy package files first for better caching
COPY package.json pnpm-lock.yaml ./
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

# Create a non-root user and group for security
RUN groupadd -r appgroup && useradd -r -g appgroup appuser

# Copy built application
COPY --from=builder /usr/src/slowpoke/dist /app/dist
COPY --from=builder /usr/src/slowpoke/node_modules /app/node_modules
COPY --from=builder /usr/src/slowpoke/package.json /app/package.json

# Change ownership to non-root user
RUN chown -R appuser:appgroup /app

USER appuser

CMD ["node", "dist/main.js"]
