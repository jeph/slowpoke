import { GoogleGenAI, Modality } from '@google/genai'
import {logger} from "./logger";

export interface GeminiClient {
  prompt(prompt: PromptOptions): Promise<string>;
  generateImage(options: GenerateImageOptions): Promise<Buffer>;
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
  }
}
