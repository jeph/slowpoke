import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js'
import { SlashCommand } from '../models/commands'

export const createPingCommand = (): SlashCommand => ({
  command: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Test the bot\'s latency'),

  async execute (interaction: ChatInputCommandInteraction) {
    const pingEmbed = new EmbedBuilder()
      .setColor(0xFAB387) // RGB(250, 179, 135)
      .setTitle('🌐 Ping!')
      .setDescription('Pinging...')

    const start = Date.now()
    await interaction.reply({ embeds: [pingEmbed] })
    const finish = Date.now() - start

    // Wait for 1 second so the user can see the "Pinging..." message
    await new Promise(resolve => setTimeout(resolve, 1000))

    const pongEmbed = new EmbedBuilder()
      .setColor(0x74C7EC) // RGB(116, 199, 236)
      .setTitle('🏓 Pong!')
      .setDescription(`Latency: ${finish} ms`)

    await interaction.editReply({ embeds: [pongEmbed] })
  }
})
