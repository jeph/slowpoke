import { GoogleGenAI } from '@google/genai'
import { logger } from './logger'

export interface GeminiImagenPrompt {
  prompt: string;
}

export interface GeminiImagenPromptWithImage {
  prompt: string;
  imageMimeType: string;
  imageData: Buffer;
}

export interface GeminiImagenResponse {
  imageData: Buffer;
}

export class GeminiImagenClient {
  private client: GoogleGenAI

  constructor (apiKey: string) {
    this.client = new GoogleGenAI({ apiKey })
  }

  async prompt (prompt: GeminiImagenPrompt): Promise<GeminiImagenResponse> {
    logger.debug({ prompt: prompt.prompt }, 'Prompting for image')

    try {
      const response = await this.client.models.generateImages({
        model: 'imagen-3.0-generate-001',
        prompt: prompt.prompt
      }) as any

      if (!response.candidates || response.candidates.length === 0) {
        throw new Error('No images returned from the API')
      }

      // Get the first generated image
      const image = response.candidates[0]

      // Convert base64 to Buffer
      const imageData = Buffer.from(image.image, 'base64')

      return { imageData }
    } catch (error) {
      logger.error({ error }, 'Error calling Gemini Imagen API')
      throw error
    }
  }

  async promptWithImage (prompt: GeminiImagenPromptWithImage): Promise<GeminiImagenResponse> {
    logger.debug({ prompt: prompt.prompt, mimeType: prompt.imageMimeType }, 'Prompting for image with image input')

    try {
      const base64Data = prompt.imageData.toString('base64')

      const response = await this.client.models.editImage({
        model: 'imagen-3.0-generate-001',
        prompt: prompt.prompt,
        referenceImages: [{
          referenceImage: {
            image: base64Data
          }
        }]
      } as any) as any

      if (!response.candidates || response.candidates.length === 0) {
        throw new Error('No images returned from the API')
      }

      // Get the first generated image
      const image = response.candidates[0]

      // Convert base64 to Buffer
      const imageData = Buffer.from(image.image, 'base64')

      return { imageData }
    } catch (error) {
      logger.error({ error }, 'Error calling Gemini Imagen API with image')
      throw error
    }
  }
}
