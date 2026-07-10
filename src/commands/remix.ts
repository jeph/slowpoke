import { AttachmentBuilder, EmbedBuilder, Message } from 'discord.js'
import { PrefixCommand } from '../models/commands'
import { ColorProvider } from '../utils/color-provider'
import {
  downloadDiscordImage,
  DownloadedImage,
  ImageDownloadError,
  MAX_REMIX_IMAGE_BYTES
} from '../utils/image-downloader'
import { ImageClient } from '../utils/image-client'
import { logger } from '../utils/logger'

export const createRemixCommand = (
  imageClient: ImageClient,
  colorProvider: ColorProvider
): PrefixCommand => ({
  name: 'remix',
  async execute (message) {
    const prompt = parseRemixPrompt(message.content)
    logger.info({ promptLength: prompt.length }, 'Processing remix command')

    if (!prompt) {
      await replyWithError(message, colorProvider, 'Please provide instructions on how to remix.')
      return
    }

    if (!message.reference?.messageId) {
      await replyWithError(message, colorProvider, 'Please reply to a message with an image to remix it.')
      return
    }

    try {
      const replyMessage = await message.channel.messages.fetch(message.reference.messageId)
      const image = await getFirstUsableImage(replyMessage)

      if (!image) {
        await replyWithError(message, colorProvider, 'Could not find a Discord-hosted image in the referenced message.')
        return
      }

      const response = await imageClient.editImage({
        prompt,
        imageMimeType: image.mimeType,
        imageData: image.buffer
      })

      const attachment = new AttachmentBuilder(response, { name: 'image.png' })
      await message.reply({ files: [attachment] })
    } catch (error) {
      logger.error({ error }, 'Error in remix command')
      await replyWithError(message, colorProvider, getRemixErrorDescription(error))
    }
  }
})

export const getFirstUsableImage = async (message: Message): Promise<DownloadedImage | undefined> => {
  const candidates: Array<{ source: 'attachment' | 'embed'; url: string }> = []
  for (const attachment of message.attachments.values()) {
    candidates.push({ source: 'attachment', url: attachment.url })
  }

  for (const embed of message.embeds) {
    if (embed.image?.proxyURL) {
      candidates.push({ source: 'embed', url: embed.image.proxyURL })
    }
  }

  let lastError: unknown
  for (const candidate of candidates) {
    try {
      return await downloadDiscordImage(candidate.url)
    } catch (error) {
      lastError = error
      logger.info({
        source: candidate.source,
        errorCode: error instanceof ImageDownloadError ? error.code : 'unknown'
      }, 'Unable to use remix image candidate')
    }
  }

  if (lastError) throw lastError
  return undefined
}

export const parseRemixPrompt = (content: string): string =>
  content.replace(/^!remix(?:\s+|$)/i, '').trim()

const replyWithError = async (
  message: Message,
  colorProvider: ColorProvider,
  description: string
): Promise<void> => {
  const embed = new EmbedBuilder()
    .setTitle('Error')
    .setDescription(description)
    .setColor(colorProvider.getErrorColor())
  await message.reply({ embeds: [embed] })
}

const getRemixErrorDescription = (error: unknown): string => {
  if (!(error instanceof ImageDownloadError)) {
    return 'There was an error processing the remix command.'
  }

  switch (error.code) {
    case 'unsupported_format':
      return 'Only PNG, JPEG, and WebP images can be remixed.'
    case 'too_large':
      return `The source image is too large. Use an image under ${MAX_REMIX_IMAGE_BYTES / 1024 / 1024} MiB.`
    case 'disallowed_url':
      return 'Only Discord-hosted or Discord-proxied images can be remixed.'
    case 'too_many_redirects':
    case 'download_failed':
      return 'The source image could not be downloaded from Discord.'
  }
}
