import { GoogleGenAI } from '@google/genai'

export interface GeminiClient {
  prompt(prompt: PromptOptions): Promise<string>;
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
        throw new Error('No text was returned from the LLM via inference')
      }

      return response.text
    }
  }
}
