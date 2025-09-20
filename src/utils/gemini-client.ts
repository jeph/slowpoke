import { GoogleGenAI, Modality, GenerateContentResponse } from '@google/genai'
import { logger } from './logger'

export interface GeminiClient {
  prompt(prompt: PromptOptions): Promise<string>;
  generateImage(options: GenerateImageOptions): Promise<Buffer>;
  editImage(options: EditImageOptions): Promise<Buffer>;
}

export interface GeminiClientOptions {
  googleGenAI: GoogleGenAI;
  textGenerationModel: string;
}

export interface PromptOptions {
  systemInstruction: string | undefined;
  prompt: string;
}

export interface GenerateImageOptions {
  prompt: string;
}

export interface EditImageOptions {
  prompt: string;
  imageMimeType: string;
  imageData: Buffer;
}

export const createGeminiClient = (options: GeminiClientOptions): GeminiClient => {
  const { googleGenAI, textGenerationModel } = options
  return {
    async prompt (options: PromptOptions): Promise<string> {
      const { prompt, systemInstruction } = options
      logger.info({ prompt, systemInstruction }, 'Sending prompt to Gemini')
      const response = await googleGenAI.models.generateContent(
        {
          model: textGenerationModel,
          contents: prompt,
          config: {
            systemInstruction
          }
        }
      )

      if (!response.text) {
        logger.error({ response }, 'No text returned from Gemini')
        throw new Error('No text was returned from the LLM via inference')
      }

      logger.info({ text: response.text }, 'Received response from Gemini')
      return response.text
    },

    async generateImage (options: GenerateImageOptions): Promise<Buffer> {
      const { prompt } = options
      const response = await googleGenAI.models.generateContent(
        {
          model: 'gemini-2.0-flash-preview-image-generation',
          contents: prompt,
          config: {
            responseModalities: [Modality.TEXT, Modality.IMAGE]
          }
        }
      )

      return parseImageResponse(response)
    },

    async editImage (options: EditImageOptions): Promise<Buffer> {
      const { prompt, imageMimeType, imageData } = options
      const base64Image = imageData.toString('base64')

      const contents = [
        { text: prompt },
        {
          inlineData: {
            mimeType: imageMimeType,
            data: base64Image
          }
        }
      ]

      const response = await googleGenAI.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents
      })

      return parseImageResponse(response)
    }
  }
}

const parseImageResponse = (response: GenerateContentResponse): Buffer => {
  const imageParts = response.candidates?.[0]?.content?.parts?.filter(part => part.inlineData)
  if (!imageParts || imageParts.length === 0) {
    throw new Error('No image data returned from Gemini')
  }

  const imageData = imageParts.map(part => {
    if (!part.inlineData || !part.inlineData.data) {
      throw new Error('Missing inline data')
    }
    return Buffer.from(part.inlineData.data, 'base64')
  })
  return imageData[0]
}
