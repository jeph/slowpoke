import { Message, EmbedBuilder, AttachmentBuilder } from 'discord.js'
import { GeminiClient } from '../utils/gemini-client'
import { logger } from '../utils/logger'
import { PrefixCommand } from '../models/commands'
import { ColorProvider } from '../utils/color-provider'

export const createRemixCommand = (geminiClient: GeminiClient, colorProvider: ColorProvider): PrefixCommand => ({
  name: 'remix',
  async execute (message) {
    const prompt = message.content.replace(/^!remix\s*/, '').trim()
    logger.info(`Got the following prompt: ${prompt}`)

    if (!prompt) {
      logger.info('No prompt provided for remix command')
      const embed = new EmbedBuilder()
        .setTitle('Error')
        .setDescription('Please provide instructions on how to remix.')
        .setColor(colorProvider.getErrorColor())

      await message.reply({ embeds: [embed] })
      return
    }

    if (!message.reference?.messageId) {
      const embed = new EmbedBuilder()
        .setTitle('Error')
        .setDescription('Please reply to a message with an image to remix it.')
        .setColor(colorProvider.getErrorColor())

      await message.reply({ embeds: [embed] })
      return
    }

    try {
      const replyMessage = await message.channel.messages.fetch(message.reference.messageId)
      logger.info('Got reply message')

      const imageDataFromAttachments = await getFirstImageFromAttachments(replyMessage)
      const imageDataFromEmbed = !imageDataFromAttachments ? await getImageDataFromEmbed(replyMessage) : undefined

      if (!imageDataFromAttachments && !imageDataFromEmbed) {
        logger.info('No image found in attachments or embeds of the replied message')
        const embed = new EmbedBuilder()
          .setTitle('Error getting image')
          .setDescription('Could not extract image from the referenced message.')
          .setColor(colorProvider.getErrorColor())

        await message.reply({ embeds: [embed] })
        return
      }

      const imageData = imageDataFromAttachments || imageDataFromEmbed
      const [mimeType, imageBuffer] = imageData!

      const response = await geminiClient.editImage({
        prompt,
        imageMimeType: mimeType,
        imageData: imageBuffer
      })

      const attachment = new AttachmentBuilder(response, { name: 'image.png' })
      await message.reply({ files: [attachment] })
    } catch (error) {
      logger.error({ error }, 'Error in remix command')
      const embed = new EmbedBuilder()
        .setTitle('Error')
        .setDescription('There was an error processing the remix command.')
        .setColor(colorProvider.getErrorColor())

      await message.reply({ embeds: [embed] })
    }
  }
})

type ImageData = [string, Buffer] // [mimeType, imageData]

async function getFirstImageFromAttachments (message: Message): Promise<ImageData | undefined> {
  logger.info('Getting first image from message attachments...')

  const imageAttachment = message.attachments.find(attachment =>
    attachment.contentType?.startsWith('image/')
  )

  if (!imageAttachment || !imageAttachment.contentType) {
    logger.info('No image found from message attachments!')
    return undefined
  }

  const response = await fetch(imageAttachment.url)
  if (!response.ok) {
    logger.info(`Failed to fetch image from attachment URL: ${response}`)
    throw new Error(`Failed to fetch image from attachment URL: ${response}`)
  }
  const arrayBuffer = await response.arrayBuffer()
  const imageData = Buffer.from(arrayBuffer)
  return [imageAttachment.contentType, imageData]
}

async function getImageDataFromEmbed (message: Message): Promise<ImageData | undefined> {
  const embed = message.embeds.find(embed => embed.image)
  if (!embed?.image?.url) {
    return undefined
  }

  const response = await fetch(embed.image.url)
  if (!response.ok) {
    logger.info(`Failed to fetch image from embed URL: ${response}`)
    throw new Error(`Failed to fetch image from embed URL: ${response}`)
  }

  const mimeType = response.headers.get('content-type')
  if (!mimeType) {
    return undefined
  }

  const arrayBuffer = await response.arrayBuffer()
  const imageData = Buffer.from(arrayBuffer)

  return [mimeType, imageData]
}
