import { Readable } from 'node:stream'
import { EditableImageMimeType } from './image-client'

export const MAX_REMIX_IMAGE_BYTES = 10 * 1024 * 1024
export const REMIX_IMAGE_TIMEOUT_MS = 15_000

const MAX_REDIRECTS = 3
const ALLOWED_DISCORD_HOSTS = new Set([
  'cdn.discordapp.com',
  'media.discordapp.net'
])
const DISCORD_IMAGE_PROXY_HOST = /^images-ext-\d+\.discordapp\.net$/i

export type ImageDownloadErrorCode =
  | 'disallowed_url'
  | 'too_many_redirects'
  | 'download_failed'
  | 'too_large'
  | 'unsupported_format'

export class ImageDownloadError extends Error {
  constructor (readonly code: ImageDownloadErrorCode, message: string) {
    super(message)
    this.name = 'ImageDownloadError'
  }
}

export interface DownloadedImage {
  mimeType: EditableImageMimeType;
  buffer: Buffer;
}

export interface DownloadImageOptions {
  fetchImplementation?: typeof fetch;
  maxBytes?: number;
  timeoutMs?: number;
  maxRedirects?: number;
}

export const downloadDiscordImage = async (
  sourceUrl: string,
  options: DownloadImageOptions = {}
): Promise<DownloadedImage> => {
  const fetchImplementation = options.fetchImplementation ?? fetch
  const maxBytes = options.maxBytes ?? MAX_REMIX_IMAGE_BYTES
  const timeoutMs = options.timeoutMs ?? REMIX_IMAGE_TIMEOUT_MS
  const maxRedirects = options.maxRedirects ?? MAX_REDIRECTS
  const signal = AbortSignal.timeout(timeoutMs)
  let currentUrl = parseAllowedDiscordUrl(sourceUrl)

  try {
    for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount++) {
      const response = await fetchImplementation(currentUrl, {
        redirect: 'manual',
        signal
      })

      if (isRedirect(response.status)) {
        if (redirectCount === maxRedirects) {
          throw new ImageDownloadError('too_many_redirects', 'The image URL redirected too many times')
        }
        const location = response.headers.get('location')
        if (!location) {
          throw new ImageDownloadError('download_failed', 'The image redirect had no destination')
        }
        await response.body?.cancel().catch(() => {})
        currentUrl = parseAllowedDiscordUrl(new URL(location, currentUrl).toString())
        continue
      }

      if (!response.ok) {
        throw new ImageDownloadError('download_failed', `The image download returned HTTP ${response.status}`)
      }

      const declaredLength = parseContentLength(response.headers.get('content-length'))
      if (declaredLength !== undefined && declaredLength > maxBytes) {
        throw new ImageDownloadError('too_large', 'The image is larger than the allowed limit')
      }

      const buffer = await readResponseBody(response, maxBytes)
      const mimeType = detectImageMimeType(buffer)
      if (!mimeType) {
        throw new ImageDownloadError('unsupported_format', 'The image must be PNG, JPEG, or WebP')
      }
      return { mimeType, buffer }
    }
  } catch (error) {
    if (error instanceof ImageDownloadError) throw error
    if (error instanceof Error && error.name === 'TimeoutError') {
      throw new ImageDownloadError('download_failed', 'The image download timed out')
    }
    throw new ImageDownloadError('download_failed', 'The image could not be downloaded')
  }

  throw new ImageDownloadError('download_failed', 'The image could not be downloaded')
}

export const isAllowedDiscordImageUrl = (sourceUrl: string): boolean => {
  try {
    parseAllowedDiscordUrl(sourceUrl)
    return true
  } catch {
    return false
  }
}

export const detectImageMimeType = (data: Buffer): EditableImageMimeType | undefined => {
  if (data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'image/png'
  }
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) {
    return 'image/jpeg'
  }
  if (data.length >= 12 && data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP') {
    return 'image/webp'
  }
  return undefined
}

const parseAllowedDiscordUrl = (sourceUrl: string): URL => {
  let url: URL
  try {
    url = new URL(sourceUrl)
  } catch {
    throw new ImageDownloadError('disallowed_url', 'The image URL is invalid')
  }

  const hostname = url.hostname.toLowerCase()
  if (
    url.protocol !== 'https:' ||
    url.username !== '' ||
    url.password !== '' ||
    (!ALLOWED_DISCORD_HOSTS.has(hostname) && !DISCORD_IMAGE_PROXY_HOST.test(hostname))
  ) {
    throw new ImageDownloadError('disallowed_url', 'Only Discord-hosted or proxied images are allowed')
  }
  return url
}

const isRedirect = (status: number): boolean => status >= 300 && status < 400

const parseContentLength = (value: string | null): number | undefined => {
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : undefined
}

const readResponseBody = async (response: Response, maxBytes: number): Promise<Buffer> => {
  if (!response.body) {
    throw new ImageDownloadError('download_failed', 'The image response had no body')
  }

  const readable = Readable.fromWeb(response.body)
  const chunks: Buffer[] = []
  let totalBytes = 0

  for await (const chunk of readable) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    totalBytes += buffer.length
    if (totalBytes > maxBytes) {
      throw new ImageDownloadError('too_large', 'The image is larger than the allowed limit')
    }
    chunks.push(buffer)
  }

  if (totalBytes === 0) {
    throw new ImageDownloadError('unsupported_format', 'The image response was empty')
  }
  return Buffer.concat(chunks, totalBytes)
}
