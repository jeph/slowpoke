# slowpoke-typescript

slowpoke is a Discord bot converted from Rust to TypeScript, named after the Pokémon Slowpoke. This bot provides various commands including AI-powered conversations, image generation, and fun utilities.

## Features

- **Chat**: Engage in conversations with the bot using Google's Gemini AI
- **Prompt**: Ask questions and get AI-powered responses
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
   - `GEMINI_API_KEY`: Your Google Gemini API key

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
- `/prompt <text>` - Ask the AI a question
- `/chat` - Have the bot participate in the conversation
- `/tfti` - Thanks for the invite, asshole
- `/imagine <prompt>` - Generate an image from text
- `/remix <instructions>` - Remix an image (reply to a message with an image)

### Prefix Commands
- `!remix <instructions>` - Remix an image (reply to a message with an image)

## Original Project

This TypeScript version is converted from the original Rust implementation, maintaining 1:1 functionality while adapting to TypeScript/Node.js patterns and Discord.js library conventions.
