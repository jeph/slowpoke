# ---- Build application ----
FROM rust:1.87-slim AS builder

WORKDIR /usr/src/slowpoke

RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

COPY Cargo.toml Cargo.lock ./
COPY ./resources ./resources
COPY ./src ./src

RUN cargo build --release --locked

# ---- Create runtime image ----
FROM debian:bookworm-slim AS runtime

# Set the working directory
WORKDIR /app

# Create a non-root user and group for security
RUN groupadd -r appgroup && useradd -r -g appgroup appuser

RUN apt-get update && apt-get install -y \
    libssl3 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /usr/src/slowpoke/target/release/slowpoke /app/slowpoke

COPY --from=builder /usr/src/slowpoke/resources /app/resources

RUN chmod +x /app/slowpoke

USER appuser

CMD ["./slowpoke"]
