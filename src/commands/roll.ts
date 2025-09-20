import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js'
import { SlashCommand } from '../models/commands'
import { ColorProvider } from '../utils/color-provider'

export const createRollCommand = (colorProvider: ColorProvider): SlashCommand => ({
  command: new SlashCommandBuilder()
    .setName('roll')
    .setDescription('Roll an n sided die')
    .addIntegerOption(option =>
      option
        .setName('sides')
        .setDescription('Number of sides on the die (default is 6)')
        .setRequired(false)
        .setMinValue(2)
        .setMaxValue(100)
    ),

  async execute (interaction: ChatInputCommandInteraction) {
    const sides = interaction.options.getInteger('sides') ?? 6

    if (sides < 2 || sides > 100) {
      await interaction.reply({ content: 'Please provide a valid number of sides between 2 and 100.' })
      return
    }

    const diceRoll = Math.floor(Math.random() * sides) + 1
    const embed = new EmbedBuilder()
      .setColor(colorProvider.getRandomColor())
      .setTitle('**Roll**')
      .setDescription(`🍀 Rolled a **${diceRoll}**\n🎲 **d${sides}**`)
    await interaction.reply({ embeds: [embed] })
  }
})
