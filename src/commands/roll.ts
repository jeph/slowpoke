import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { SlashCommand } from '../models/commands'

export const createRollCommand = (): SlashCommand => ({
    command: new SlashCommandBuilder()
      .setName('roll')
      .setDescription('Roll a 6-sided dice'),
    async execute(interaction: ChatInputCommandInteraction) {
      const diceRoll = Math.floor(Math.random() * 6) + 1
      await interaction.reply(`🎲 You rolled a **${diceRoll}**!`)
    }
  })

