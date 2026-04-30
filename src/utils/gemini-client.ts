import { GoogleGenAI, Modality, GenerateContentResponse } from '@google/genai'

export interface GeminiClient {
  generateImage(options: GenerateImageOptions): Promise<Buffer>;
  editImage(options: EditImageOptions): Promise<Buffer>;
}

export interface GeminiClientOptions {
  googleGenAI: GoogleGenAI;
  imageGenerationModel: string;
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
  const { googleGenAI, imageGenerationModel } = options
  return {
    async generateImage (options: GenerateImageOptions): Promise<Buffer> {
      const { prompt } = options
      const response = await googleGenAI.models.generateContent(
        {
          model: imageGenerationModel,
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
        model: imageGenerationModel,
        contents,
        config: {
          responseModalities: [Modality.TEXT, Modality.IMAGE]
        }
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
