import { REST, Routes } from 'discord.js'
import { SlashCommand } from '../models/commands'
import { logger } from './logger'

export interface CommandRegistrar {
  register: (commands: SlashCommand[]) => Promise<void>
}

export function createCommandRegistrar (discordToken: string, applicationId: string): CommandRegistrar {
  const rest = new REST().setToken(discordToken)

  return {
    async register (commands: SlashCommand[]): Promise<void> {
      const commandData = commands.map(command => command.command.toJSON())
      logger.info(`Registering ${commandData.length} application (/) commands`)

      await rest.put(
        Routes.applicationCommands(applicationId),
        { body: commandData }
      )

      logger.info(`Successfully registered ${commandData.length} application (/) commands`)
    }
  }
}
