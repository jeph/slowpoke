import { ChatInputCommandInteraction, SlashCommandBuilder, SlashCommandOptionsOnlyBuilder, Message } from 'discord.js'

export interface SlashCommand {
  command: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder,
  execute: (interaction: ChatInputCommandInteraction) => void,
}

export interface PrefixCommand {
  name: string;
  execute: (message: Message, args: string[]) => void
}
