import OpenAI, { APIError, toFile, Uploadable } from 'openai'
import {
  ImageEditParamsNonStreaming,
  ImageGenerateParamsNonStreaming,
  ImagesResponse
} from 'openai/resources/images'
import { CODEX_LB_BASE_URL, CODEX_LB_IMAGE_MODEL } from '../config'
import { EditableImageMimeType, ImageClient } from './image-client'

const IMAGE_REQUEST_TIMEOUT_MS = 10 * 60 * 1000
const IMAGE_REQUEST_MAX_RETRIES = 0

interface ImagesApi {
  generate(body: ImageGenerateParamsNonStreaming): Promise<ImagesResponse>;
  edit(body: ImageEditParamsNonStreaming): Promise<ImagesResponse>;
}

type FileFactory = (data: Buffer, name: string, options: { type: string }) => Promise<Uploadable>

export interface CodexLbImageClientOptions {
  apiKey: string;
  imagesApi?: ImagesApi;
  fileFactory?: FileFactory;
}

export class ImageProviderError extends Error {
  readonly status: number | undefined
  readonly code: string | undefined
  readonly requestId: string | undefined

  constructor (options: { status?: number; code?: string; requestId?: string } = {}) {
    super('The image provider request failed')
    this.name = 'ImageProviderError'
    this.status = options.status
    this.code = options.code
    this.requestId = options.requestId
  }
}

export const createCodexLbImageClient = (options: CodexLbImageClientOptions): ImageClient => {
  const openAI = options.imagesApi
    ? undefined
    : new OpenAI({
      apiKey: options.apiKey,
      baseURL: CODEX_LB_BASE_URL,
      timeout: IMAGE_REQUEST_TIMEOUT_MS,
      maxRetries: IMAGE_REQUEST_MAX_RETRIES
    })
  const imagesApi: ImagesApi = options.imagesApi ?? openAI!.images
  const fileFactory = options.fileFactory ?? toFile

  return {
    async generateImage ({ prompt }): Promise<Buffer> {
      try {
        const response = await imagesApi.generate({
          model: CODEX_LB_IMAGE_MODEL,
          prompt,
          n: 1,
          output_format: 'png',
          stream: false
        })
        return decodePngResponse(response)
      } catch (error) {
        throw normalizeImageProviderError(error)
      }
    },

    async editImage ({ prompt, imageMimeType, imageData }): Promise<Buffer> {
      try {
        const image = await fileFactory(
          imageData,
          `input.${getExtension(imageMimeType)}`,
          { type: imageMimeType }
        )
        const response = await imagesApi.edit({
          model: CODEX_LB_IMAGE_MODEL,
          prompt,
          image,
          n: 1,
          output_format: 'png',
          stream: false
        })
        return decodePngResponse(response)
      } catch (error) {
        throw normalizeImageProviderError(error)
      }
    }
  }
}

const decodePngResponse = (response: ImagesResponse): Buffer => {
  const encodedImage = response.data?.[0]?.b64_json?.trim()
  if (!encodedImage) {
    throw new Error('The image provider returned no image data')
  }

  const image = Buffer.from(encodedImage, 'base64')
  if (!isPng(image)) {
    throw new Error('The image provider returned invalid PNG data')
  }
  return image
}

const isPng = (data: Buffer): boolean =>
  data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))

const getExtension = (mimeType: EditableImageMimeType): string => {
  switch (mimeType) {
    case 'image/png': return 'png'
    case 'image/jpeg': return 'jpg'
    case 'image/webp': return 'webp'
  }
}

const normalizeImageProviderError = (error: unknown): Error => {
  if (error instanceof ImageProviderError) return error
  if (error instanceof APIError) {
    return new ImageProviderError({
      status: error.status,
      code: error.code ?? undefined,
      requestId: error.requestID ?? undefined
    })
  }
  if (error instanceof Error && error.message.startsWith('The image provider returned')) return error
  return new ImageProviderError()
}
