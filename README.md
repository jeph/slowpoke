# slowpoke-typescript

slowpoke is a Discord bot converted from Rust to TypeScript, named after the Pokémon Slowpoke. This bot provides various commands including AI-powered conversations, image generation, and fun utilities.

## Features

- **Chat**: Engage in conversations with the bot using Codex through LangChainJS
- **Prompt**: Ask questions and get AI-powered responses, including web search when useful
- **Web Tools**: Search the web with Brave Search and read public webpages through LangChain
- **Image Generation**: Create images from text prompts using Gemini Imagen
- **Image Remix**: Transform existing images with AI
- **8-Ball**: Ask the magic 8-ball for answers
- **Ping**: Test the bot's latency
- **TFTI**: A fun "thanks for the invite" command with escalating responses

## Setup

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

3. Fill in your environment variables:
    - `DISCORD_TOKEN`: Your Discord bot token
    - `GEMINI_API_KEY`: Your Google Gemini API key for image commands
    - `DISCORD_APPLICATION_ID`: Your Discord application ID
    - `BRAVE_SEARCH_API_KEY`: Your Brave Search API key for `/prompt` and `/chat` web tools

4. Authenticate Codex text generation once on the machine running the bot:
   ```bash
   pnpm run codex:auth:login
   pnpm run codex:auth:status
   ```

   Codex OAuth credentials are stored by `langchainjs-codex-oauth` outside the app source tree by default. Treat the auth file as a secret.

## Docker Auth

The public Docker image does not include Codex OAuth credentials. Mount a persistent volume at `/app/.langchainjs-codex-oauth` and authenticate once against that volume.

```yaml
services:
  slowpoke:
    image: ghcr.io/jeph/slowpoke:latest
    environment:
      LANGCHAINJS_CODEX_OAUTH_HOME: /app/.langchainjs-codex-oauth
    volumes:
      - slowpoke-codex-oauth:/app/.langchainjs-codex-oauth

volumes:
  slowpoke-codex-oauth:
    name: slowpoke-codex-oauth
```

Bootstrap auth with the same image and volume:

```bash
docker compose run --rm -it slowpoke npm run codex:auth:login -- --manual
docker compose run --rm slowpoke npm run codex:auth:status
```

`npx` is available in the container too:

```bash
docker compose run --rm -it slowpoke npx langchainjs-codex-oauth auth status
```

Named volumes persist across image pulls and container recreation. Do not run `docker compose down -v`, remove the volume in Portainer, or prune volumes unless you intend to delete the stored OAuth credentials.

## Development

Run the bot in development mode:
```bash
pnpm run dev
```

Build and run in production:
```bash
pnpm run build
pnpm start
```

## Commands

### Slash Commands
- `/ping` - Test the bot's latency
- `/8ball [question]` - Ask the magic 8-ball
- `/prompt <text>` - Ask the AI a question, with automatic web search/page reading when useful
- `/chat` - Have the bot participate in the conversation, with automatic web search/page reading when useful
- `/tfti` - Thanks for the invite, asshole
- `/imagine <prompt>` - Generate an image from text
- `/remix <instructions>` - Remix an image (reply to a message with an image)

### Prefix Commands
- `!remix <instructions>` - Remix an image (reply to a message with an image)

## Original Project

This TypeScript version is converted from the original Rust implementation, maintaining 1:1 functionality while adapting to TypeScript/Node.js patterns and Discord.js library conventions.
