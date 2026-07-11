import { Client, Events, GatewayIntentBits, Partials } from 'discord.js'
import dotenv from 'dotenv'
import { createDeezNutsChimeIn } from './chime-ins/deez-nuts'
import { createChatCommand } from './commands/chat'
import { createEightBallCommand } from './commands/eight-ball'
import { createImagineCommand } from './commands/imagine'
import { createPingCommand } from './commands/ping'
import { createPromptCommand } from './commands/prompt'
import { createRemixCommand } from './commands/remix'
import { createRollCommand } from './commands/roll'
import { createTftiCommand } from './commands/tfti'
import {
  loadConfig,
  OPENAI_COMPATIBLE_BASE_URL,
  OPENAI_IMAGE_MODEL,
  OPENAI_TEXT_MODEL,
  PARALLEL_SEARCH_MCP_URL
} from './config'
import { PrefixCommand, SlashCommand } from './models/commands'
import { startActivityRotation } from './utils/activity-manager'
import { createOpenAIImageClient } from './utils/openai-image-client'
import { createColorProvider } from './utils/color-provider'
import { createCommandRegistrar } from './utils/command-registrar'
import { logger } from './utils/logger'
import { createOpenAIClient } from './utils/openai-client'
import { createWebTools } from './utils/web-tools'

dotenv.config({ quiet: true })
process.title = 'slowpoke'

const main = async (): Promise<void> => {
  const config = loadConfig()

  logger.info({
    baseUrl: OPENAI_COMPATIBLE_BASE_URL,
    textModel: OPENAI_TEXT_MODEL,
    imageModel: OPENAI_IMAGE_MODEL,
    parallelSearchMcpUrl: PARALLEL_SEARCH_MCP_URL
  }, 'Configuring AI providers')

  const openAIClient = createOpenAIClient({ apiKey: config.openAIApiKey })
  const imageClient = createOpenAIImageClient({ apiKey: config.openAIApiKey })
  const colorProvider = createColorProvider()
  const webTools = await createWebTools()

  const slashCommandList: SlashCommand[] = [
    createPingCommand(colorProvider),
    createEightBallCommand(colorProvider),
    createPromptCommand(openAIClient, colorProvider, webTools.tools),
    createChatCommand(openAIClient, webTools.tools),
    createTftiCommand(colorProvider),
    createImagineCommand(imageClient, colorProvider),
    createRollCommand(colorProvider)
  ]

  const slashCommands = new Map<string, SlashCommand>(
    slashCommandList.map(command => [command.command.name, command])
  )
  const prefixCommandList: PrefixCommand[] = [
    createRemixCommand(imageClient, colorProvider)
  ]
  const prefixCommands = new Map<string, PrefixCommand>(
    prefixCommandList.map(command => [command.name, command])
  )

  const commandRegistrar = createCommandRegistrar(config.discordToken, config.discordApplicationId)
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
      await command.execute(interaction)
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

  const deezNutsChimeIn = createDeezNutsChimeIn(openAIClient, { chimeInProbability: 0.01 })

  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return

    const prefix = '!'
    if (!message.content.startsWith(prefix)) {
      await deezNutsChimeIn.execute(message)
      return
    }

    const args = message.content.slice(prefix.length).trim().split(/ +/)
    const commandName = args.shift()?.toLowerCase()
    if (!commandName) return

    const prefixCommand = prefixCommands.get(commandName)
    if (!prefixCommand) return

    try {
      await prefixCommand.execute(message)
    } catch (error) {
      logger.error({ error }, 'Error executing prefix command')
      await message.reply('There was an error while executing this command!')
    }
  })

  client.once(Events.ClientReady, async () => {
    logger.info('Client ready!')
    try {
      await commandRegistrar.register(slashCommandList)
      startActivityRotation(client)
    } catch (error) {
      logger.error({ error }, 'Unable to register slash commands')
    }
  })

  let shuttingDown = false
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return
    shuttingDown = true
    logger.info({ signal }, 'Shutting down slowpoke')
    client.destroy()
    await webTools.close()
  }
  process.once('SIGINT', () => { void shutdown('SIGINT') })
  process.once('SIGTERM', () => { void shutdown('SIGTERM') })

  try {
    await client.login(config.discordToken)
    logger.info('Initialized slowpoke!')
  } catch (error) {
    await webTools.close()
    throw error
  }
}

void main().catch(error => {
  logger.fatal({ error }, 'Failed to initialize slowpoke')
  process.exitCode = 1
})
