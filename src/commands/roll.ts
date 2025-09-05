import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js'
import { SlashCommand } from '../models/commands'

const COLORS = [
  0xF5C2E7, 0xCBA6F7, 0xF38BA8, 0xEBA0AC, 0xFAB387,
  0xF9E2AF, 0xA6E3A1, 0x94E2D5, 0x89DCEB, 0x74C7EC, 0x89B4FA, 0xB4BEFE,
]

function getRandomColor () {
  return COLORS[Math.floor(Math.random() * COLORS.length)]
}

export const createRollCommand = (): SlashCommand => ({
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
      .setColor(getRandomColor())
      .setTitle('**Roll**')
      .setDescription(`🍀 Rolled a **${diceRoll}**\n🎲 **d${sides}**`)
    await interaction.reply({ embeds: [embed] })
  }
})
