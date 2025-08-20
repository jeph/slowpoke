import { Client, GatewayIntentBits, Collection } from 'discord.js'
import dotenv from 'dotenv'
import { GoogleGenAI } from '@google/genai'
import { createGeminiClient, GeminiClient } from './utils/gemini-client'
import { GeminiImagenClient } from './utils/gemini-imagen-client'
import { startActivityRotation } from './utils/activity-manager'
import { logger } from './utils/logger'
import {
  pingCommand,
  eightBallCommand,
  promptCommand,
  chatCommand,
  tftiCommand,
  imagineCommand,
  remixCommand
} from './commands'

// Load environment variables
dotenv.config()

logger.info('Getting discord token from environment')
const token = process.env.DISCORD_TOKEN
if (!token) {
  throw new Error('DISCORD_TOKEN was not found')
}
logger.info('Successfully got discord token from environment')

logger.info('Getting gemini api key from secret store')
const geminiApiKey = process.env.GEMINI_API_KEY
if (!geminiApiKey) {
  throw new Error('GEMINI_API_KEY was not found')
}
logger.info('Successfully got gemini api key from environment')

declare module 'discord.js' {
  interface Client {
    commands: Collection<string, any>;
    geminiClient: GeminiClient;
    geminiImagenClient: GeminiImagenClient;
  }
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
})

// Initialize Gemini clients
const googleGenAI = new GoogleGenAI({ apiKey: geminiApiKey })
const geminiClient = createGeminiClient({
  googleGenAI,
  textGenerationModel: 'gemini-2.5-flash'
})
const geminiImagenClient = new GeminiImagenClient(geminiApiKey)

// Attach to client for easy access
client.geminiClient = geminiClient
client.geminiImagenClient = geminiImagenClient

// Initialize command collection
client.commands = new Collection()

// Register slash commands
client.commands.set(pingCommand.data.name, pingCommand)
client.commands.set(eightBallCommand.data.name, eightBallCommand)
client.commands.set(promptCommand.data.name, promptCommand)
client.commands.set(chatCommand.data.name, chatCommand)
client.commands.set(tftiCommand.data.name, tftiCommand)
client.commands.set(imagineCommand.data.name, imagineCommand)

// Bot ready event
client.once('ready', () => {
  logger.info('Ready!')
  startActivityRotation(client)
  logger.info('Initialized slowpoke!')
})

// Handle slash command interactions
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return

  const command = client.commands.get(interaction.commandName)
  if (!command) return

  try {
    // Pass the appropriate client based on command needs
    if (command === promptCommand || command === chatCommand) {
      await command.execute(interaction, client.geminiClient)
    } else if (command === imagineCommand) {
      await command.execute(interaction, client.geminiImagenClient)
    } else {
      await command.execute(interaction)
    }
  } catch (error) {
    logger.error({ error, commandName: interaction.commandName }, 'Error executing slash command')
    const errorMessage = 'There was an error while executing this command!'

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: errorMessage, ephemeral: true })
    } else {
      await interaction.reply({ content: errorMessage, ephemeral: true })
    }
  }
})

// Handle prefix commands (for remix)
client.on('messageCreate', async (message) => {
  if (message.author.bot) return

  const prefix = '!'
  if (!message.content.startsWith(prefix)) return

  const args = message.content.slice(prefix.length).trim().split(/ +/)
  const commandName = args.shift()?.toLowerCase()

  if (commandName === 'remix') {
    try {
      await remixCommand.execute(message, args, client.geminiImagenClient)
    } catch (error) {
      logger.error({ error }, 'Error executing remix command')
      await message.reply('There was an error while executing this command!')
    }
  }
})

// Login to Discord
client.login(token)
