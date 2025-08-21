import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, AttachmentBuilder } from 'discord.js'
import { GeminiImagenClient } from '../utils/gemini-imagen-client'
import { logger } from '../utils/logger'
import { SlashCommand } from '../models/commands'

export const createImagineCommand = (geminiImagenClient: GeminiImagenClient): SlashCommand => ({
  command: new SlashCommandBuilder()
    .setName('imagine')
    .setDescription('Image generation with slowpoke')
    .addStringOption(option =>
      option
        .setName('prompt')
        .setDescription('Prompt for image generation')
        .setRequired(true)
    ),

  async execute (interaction: ChatInputCommandInteraction) {
    // Defer the reply as AI models take time to respond
    await interaction.deferReply()

    const promptText = interaction.options.get('prompt')?.value as string

    try {
      const response = await geminiImagenClient.prompt({
        prompt: promptText
      })

      const attachment = new AttachmentBuilder(response.imageData, { name: 'image.png' })

      const embed = new EmbedBuilder()
        .setTitle('Imagine')
        .setDescription(promptText)
        .setColor(0x89DCEB) // RGB(137, 220, 235)
        .setImage('attachment://image.png')

      await interaction.editReply({
        embeds: [embed],
        files: [attachment]
      })
    } catch (error) {
      logger.error({ error }, 'Error imagining image')

      const errorEmbed = new EmbedBuilder()
        .setTitle('Error imagining image')
        .setDescription('Failed to imagine image. Try altering the prompt or trying again later.')
        .setColor(0x89DCEB) // RGB(137, 220, 235)

      await interaction.editReply({ embeds: [errorEmbed] })
    }
  }
})
