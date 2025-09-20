import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js'
import { SlashCommand } from '../models/commands'
import { ColorProvider } from '../utils/color-provider'

export const createPingCommand = (colorProvider: ColorProvider): SlashCommand => ({
  command: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Test the bot\'s latency'),

  async execute (interaction: ChatInputCommandInteraction) {
    const pingEmbed = new EmbedBuilder()
      .setColor(colorProvider.getWarningColor())
      .setTitle('🌐 Ping!')
      .setDescription('Pinging...')

    const start = Date.now()
    await interaction.reply({ embeds: [pingEmbed] })
    const finish = Date.now() - start

    // Wait for 1 second so the user can see the "Pinging..." message
    await new Promise(resolve => setTimeout(resolve, 1000))

    const pongEmbed = new EmbedBuilder()
      .setColor(colorProvider.getSuccessColor())
      .setTitle('🏓 Pong!')
      .setDescription(`Latency: ${finish} ms`)

    await interaction.editReply({ embeds: [pongEmbed] })
  }
})
