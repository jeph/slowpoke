# slowpoke-typescript

slowpoke is a Discord bot converted from Rust to TypeScript, named after the Pokémon Slowpoke.

## Features

- **Chat and Prompt**: GPT-5.6 text generation through an OpenAI-compatible API and LangChainJS
- **Web Tools**: Anonymous Parallel Search MCP tools for current web information and source extraction
- **Image Generation**: GPT Image 2 text-to-image generation through an OpenAI-compatible API
- **Image Remix**: GPT Image 2 edits of Discord-hosted PNG, JPEG, and WebP images
- **Utilities**: Ping, 8-ball, dice rolling, and TFTI commands

The deployment is intentionally fixed to:

- OpenAI-compatible API: `https://codex.jeph.io/v1`
- text model: `gpt-5.6-terra`
- image model: `gpt-image-2`
- Parallel Search MCP: `https://search.parallel.ai/mcp`

## Setup

Local development requires Node.js 26 and pnpm 11.11.0. TypeScript remains on 6.0.3 because the current `typescript-eslint` release supports TypeScript versions below 6.1; TypeScript 7 currently crashes its parser.

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Create a `.env` file based on `.env.example`:

   ```bash
   cp .env.example .env
   ```

3. Configure the required runtime secrets:

   - `DISCORD_TOKEN`: Discord bot token
   - `DISCORD_APPLICATION_ID`: Discord application ID
   - `CODEX_LB_API_KEY`: API key allowed to use `gpt-5.6-terra` and `gpt-image-2` through the configured OpenAI-compatible endpoint

The API key is sent only to `https://codex.jeph.io/v1`. The existing environment-variable name is retained for deployment compatibility. Do not commit `.env` or put runtime secrets in a Docker image.

Parallel's Search MCP is used anonymously and does not require an API key. Anonymous access has lower rate limits than authenticated Parallel plans. If the MCP cannot be reached during startup, slowpoke starts without web tools; text and image features remain available until the next restart.

## Development

Run offline tests:

```bash
pnpm test
pnpm typecheck
```

Run the bot in development mode:

```bash
pnpm dev
```

Build and run in production:

```bash
pnpm build
pnpm start
```

Live provider smoke tests are manual and never run in CI. They use the local `.env`; image tests can incur provider charges and require a second explicit guard:

```bash
RUN_LIVE_AI_SMOKE_TESTS=1 pnpm smoke:live
RUN_LIVE_AI_SMOKE_TESTS=1 RUN_LIVE_IMAGE_SMOKE_TESTS=1 pnpm smoke:live -- --images
```

## Docker

Use runtime environment injection rather than build arguments or image-level secrets. See `docker-compose.example.yml` for a minimal example:

```bash
cp docker-compose.example.yml docker-compose.yml
docker compose up -d
```

## Commands

### Slash commands

- `/ping` - Test the bot's latency
- `/8ball [question]` - Ask the magic 8-ball
- `/prompt <text>` - Ask the AI a question, with web search when available and useful
- `/chat` - Have slowpoke participate in the current conversation
- `/tfti` - Thanks for the invite
- `/imagine <prompt>` - Generate an image from text
- `/roll [sides]` - Roll a die

### Prefix commands

- `!remix <instructions>` - Reply to a message containing a Discord-hosted or Discord-proxied PNG, JPEG, or WebP image and edit it

Remix downloads are limited to 10 MiB and do not fetch arbitrary external embed URLs.

## Operational notes

- The current OpenAI-compatible gateway accepts `gpt-image-2` generation and edit requests even though that image model is not advertised by `GET /v1/models`.
- GPT-5.6 dashboard cost accounting in gateway version 1.20.1 may be inaccurate; verify provider usage before relying on dashboard totals for budgeting.
- Anonymous Parallel MCP access is best-effort. A startup discovery failure disables web tools until slowpoke restarts.

## Original project

This TypeScript version is converted from the original Rust implementation while adapting to TypeScript, Node.js, and Discord.js conventions.
