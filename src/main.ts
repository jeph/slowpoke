import { Client, Events, GatewayIntentBits, Partials } from 'discord.js'
import dotenv from 'dotenv'
import { GoogleGenAI } from '@google/genai'
import { createGeminiClient } from './utils/gemini-client'
import { GeminiImagenClient } from './utils/gemini-imagen-client'
import { startActivityRotation } from './utils/activity-manager'
import { logger } from './utils/logger'
import { createCommandRegistrar } from './utils/command-registrar'
import { createColorProvider } from './utils/color-provider'
import { createChatCommand } from './commands/chat'
import { createEightBallCommand } from './commands/eight-ball'
import { createImagineCommand } from './commands/imagine'
import { createPingCommand } from './commands/ping'
import { createPromptCommand } from './commands/prompt'
import { createRemixCommand } from './commands/remix'
import { createTftiCommand } from './commands/tfti'
import { createRollCommand } from './commands/roll'
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

logger.info('Getting application id from environment')
const discordApplicationId = process.env.DISCORD_APPLICATION_ID
if (!discordApplicationId) {
  throw new Error('DISCORD_APPLICATION_ID was not found')
}
logger.info('Successfully got application id from environment')

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
const colorProvider = createColorProvider()

const pingCommand = createPingCommand(colorProvider)
const eightBallCommand = createEightBallCommand(colorProvider)
const promptCommand = createPromptCommand(geminiClient, colorProvider)
const chatCommand = createChatCommand(geminiClient)
const tftiCommand = createTftiCommand(colorProvider)
const imagineCommand = createImagineCommand(geminiClient)
const rollCommand = createRollCommand(colorProvider)

const slashCommands = new Map<string, SlashCommand>([
  [pingCommand.command.name, pingCommand],
  [eightBallCommand.command.name, eightBallCommand],
  [promptCommand.command.name, promptCommand],
  [chatCommand.command.name, chatCommand],
  [tftiCommand.command.name, tftiCommand],
  [imagineCommand.command.name, imagineCommand],
  [rollCommand.command.name, rollCommand]
])

const commandRegistrar = createCommandRegistrar(token, discordApplicationId)

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
      await interaction.followUp({ content: errorMessage })
      return
    }
    await interaction.reply({ content: errorMessage })
  }
})

client.on(Events.MessageCreate, async (message) => {
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

client.once(Events.ClientReady, async () => {
  logger.info('Client ready!')
  await commandRegistrar.register([...slashCommands.values()])
  startActivityRotation(client)
})

client.login(token)
  .then(() => logger.info('Initialized slowpoke!'))
  .catch(err => logger.error(err))
