import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, AttachmentBuilder } from 'discord.js'
import { GeminiClient } from '../utils/gemini-client'
import { logger } from '../utils/logger'
import { SlashCommand } from '../models/commands'
import { ColorProvider } from '../utils/color-provider'

export const createImagineCommand = (geminiClient: GeminiClient, colorProvider: ColorProvider): SlashCommand => ({
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
      const imageData = await geminiClient.generateImage({
        prompt: promptText
      })

      const attachment = new AttachmentBuilder(imageData, { name: 'image.png' })

      const embed = new EmbedBuilder()
        .setTitle('Imagine')
        .setDescription(promptText)
        .setColor(colorProvider.getPrimaryColor())
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
        .setColor(colorProvider.getErrorColor())

      await interaction.editReply({ embeds: [errorEmbed] })
    }
  }
})
