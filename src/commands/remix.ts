import { Message, EmbedBuilder, AttachmentBuilder } from 'discord.js'
import { GeminiImagenClient } from '../utils/gemini-imagen-client'
import { logger } from '../utils/logger'
import { PrefixCommand } from '../models/commands'

const ERROR_EMBED_COLOR = 0xFF0000 // Red

type ImageData = [string, Buffer] // [mimeType, imageData]

async function getImageDataFromAttachments (message: Message): Promise<ImageData | null> {
  logger.debug('Getting first image from message attachments...')

  const imageAttachment = message.attachments.find(attachment =>
    attachment.contentType?.startsWith('image/')
  )

  if (!imageAttachment || !imageAttachment.contentType) {
    return null
  }

  try {
    const response = await fetch(imageAttachment.url)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const arrayBuffer = await response.arrayBuffer()
    const imageData = Buffer.from(arrayBuffer)
    return [imageAttachment.contentType, imageData]
  } catch (error) {
    logger.error({ error }, 'Error downloading image from attachment')
    return null
  }
}

async function getImageDataFromEmbed (message: Message): Promise<ImageData | null> {
  const embed = message.embeds.find(embed => embed.image)
  if (!embed?.image?.url) {
    return null
  }

  try {
    const response = await fetch(embed.image.url)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const arrayBuffer = await response.arrayBuffer()
    const imageData = Buffer.from(arrayBuffer)

    // Simple mime type detection based on URL extension
    const url = embed.image.url.toLowerCase()
    let mimeType = 'image/png' // default
    if (url.includes('.jpg') || url.includes('.jpeg')) {
      mimeType = 'image/jpeg'
    } else if (url.includes('.gif')) {
      mimeType = 'image/gif'
    } else if (url.includes('.webp')) {
      mimeType = 'image/webp'
    }

    return [mimeType, imageData]
  } catch (error) {
    logger.error({ error }, 'Error downloading image from embed')
    return null
  }
}

export const createRemixCommand = (geminiImagenClient: GeminiImagenClient): PrefixCommand => ({
  name: 'remix',
  async execute (message: Message, args: string[]) {
    const prompt = args.join(' ')

    if (!prompt) {
      logger.debug('No prompt provided for remix command')
      const embed = new EmbedBuilder()
        .setTitle('Error')
        .setDescription('Please provide instructions on how to remix.')
        .setColor(ERROR_EMBED_COLOR)

      await message.reply({ embeds: [embed] })
      return
    }

    logger.debug({ prompt }, 'Remix command invoked')

    // Check if this is a reply to another message
    if (!message.reference?.messageId) {
      const embed = new EmbedBuilder()
        .setTitle('Error')
        .setDescription('Please reply to a message with an image to remix it.')
        .setColor(ERROR_EMBED_COLOR)

      await message.reply({ embeds: [embed] })
      return
    }

    try {
      // Get the referenced message
      const replyMessage = await message.channel.messages.fetch(message.reference.messageId)
      logger.debug('Got reply message')

      // Try to get image data from attachments first, then embeds
      logger.debug('Getting image from message...')
      let imageData = await getImageDataFromAttachments(replyMessage)

      if (!imageData) {
        logger.debug('No image found in attachments... Checking embeds...')
        imageData = await getImageDataFromEmbed(replyMessage)
      }

      if (!imageData) {
        logger.debug('No image found in attachments or embeds.')
        const embed = new EmbedBuilder()
          .setTitle('Error getting image')
          .setDescription('Could not extract image from the referenced message.')
          .setColor(ERROR_EMBED_COLOR)

        await message.reply({ embeds: [embed] })
        return
      }

      logger.debug('Got image from reply message')

      const [mimeType, imageBuffer] = imageData

      try {
        const response = await geminiImagenClient.promptWithImage({
          prompt,
          imageMimeType: mimeType,
          imageData: imageBuffer
        })

        const attachment = new AttachmentBuilder(response.imageData, { name: 'image.png' })
        await message.reply({ files: [attachment] })
      } catch (error) {
        logger.error({ error }, 'Error remixing image')
        const embed = new EmbedBuilder()
          .setTitle('Error remixing image')
          .setDescription('Failed to generate the remixed image. Try altering the remix prompt.')
          .setColor(ERROR_EMBED_COLOR)

        await message.reply({ embeds: [embed] })
      }
    } catch (error) {
      logger.error({ error }, 'Error in remix command')
      const embed = new EmbedBuilder()
        .setTitle('Error')
        .setDescription('There was an error processing the remix command.')
        .setColor(ERROR_EMBED_COLOR)

      await message.reply({ embeds: [embed] })
    }
  }
})
