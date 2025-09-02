import { Client, Events, GatewayIntentBits, Partials } from 'discord.js'
import dotenv from 'dotenv'
import { GoogleGenAI } from '@google/genai'
import { createGeminiClient } from './utils/gemini-client'
import { GeminiImagenClient } from './utils/gemini-imagen-client'
import { startActivityRotation } from './utils/activity-manager'
import { logger } from './utils/logger'
import {
  createChatCommand,
  createEightBallCommand,
  createImagineCommand,
  createPingCommand,
  createPromptCommand,
  createRemixCommand,
  createTftiCommand,
  createRollCommand
} from './commands'
import { PrefixCommand, SlashCommand } from './models/commands'

// Load environment variables
dotenv.config()

process.title = 'slowpoke'

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

const googleGenAI = new GoogleGenAI({ apiKey: geminiApiKey })
const geminiClient = createGeminiClient({
  googleGenAI,
  textGenerationModel: 'gemini-2.5-flash'
})
const geminiImagenClient = new GeminiImagenClient(geminiApiKey)

const pingCommand = createPingCommand()
const eightBallCommand = createEightBallCommand()
const promptCommand = createPromptCommand(geminiClient)
const chatCommand = createChatCommand(geminiClient)
const tftiCommand = createTftiCommand()
const imagineCommand = createImagineCommand(geminiClient)
const rollCommand = createRollCommand(geminiClient)

const slashCommands = new Map<string, SlashCommand>([
  [pingCommand.command.name, pingCommand],
  [eightBallCommand.command.name, eightBallCommand],
  [promptCommand.command.name, promptCommand],
  [chatCommand.command.name, chatCommand],
  [tftiCommand.command.name, tftiCommand],
  [imagineCommand.command.name, imagineCommand],
  [rollCommand.command.name, rollCommand]
])

const remixCommand = createRemixCommand(geminiImagenClient)

const prefixCommands = new Map<string, PrefixCommand>([
  [remixCommand.name, remixCommand]
])

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel]
})

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return

  const command = slashCommands.get(interaction.commandName)
  if (!command) return

  try {
    command.execute(interaction)
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

client.on(Events.MessageCreate, async (message) => {
  // Log every message the bot can see/receive if running in development mode
  if (process.env.NODE_ENV === 'development') {
    logger.debug({
      author: {
        id: message.author.id,
        username: message.author.username,
        discriminator: message.author.discriminator,
        bot: message.author.bot
      },
      content: message.content,
      channelId: message.channel.id,
      guildId: message.guild?.id ?? null,
      isDM: message.guild === null
    }, 'Received message')
  }

  if (message.author.bot) return

  const prefix = '!'
  if (!message.content.startsWith(prefix)) return

  const args = message.content.slice(prefix.length).trim().split(/ +/)
  const commandName = args.shift()?.toLowerCase()
  if (!commandName) return

  const prefixCommand = prefixCommands.get(commandName)
  if (!prefixCommand) return

  try {
    prefixCommand.execute(message, args)
  } catch (error) {
    logger.error({ error }, 'Error executing remix command')
    await message.reply('There was an error while executing this command!')
  }
})

client.once(Events.ClientReady, () => {
  logger.info('Client ready!')
  startActivityRotation(client)
})

client.login(token)
  .then(() => logger.info('Initialized slowpoke!'))
  .catch(err => logger.error(err))
