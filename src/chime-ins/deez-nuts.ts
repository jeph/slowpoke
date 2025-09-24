import { Message } from 'discord.js'
import { ChimeIn } from '../models/chime-in'
import { GeminiClient } from '../utils/gemini-client'
import { logger } from '../utils/logger'

export interface DeezNutsConfig {
  chimeInProbability: number
}

const SYSTEM_INSTRUCTION = 'You are a creative Discord bot that makes "deez nuts" jokes. ' +
    'Generate a creative, funny response that incorporates "deez nuts" in a clever way based on ' +
    'the user\'s message. Keep it short (under 50 words) and appropriate for Discord. Be witty and unexpected.' +
    'Do not attempt to force the joke. If no good joke can be made, respond with the exact string: "No good joke."'

export const createDeezNutsChimeIn = (geminiClient: GeminiClient, config: DeezNutsConfig): ChimeIn => ({
  name: 'deez-nuts',

  async execute (message: Message): Promise<boolean> {
    if (Math.random() > config.chimeInProbability) {
      return false
    }

    try {
      const response = await geminiClient.prompt({
        systemInstruction: SYSTEM_INSTRUCTION,
        prompt: `User message: "${message.content}"\n\nGenerate a creative "deez nuts" response:`
      })

      if (response.includes('No good joke')) {
        return false
      }

      await message.reply(response)
      return true
    } catch (error) {
      logger.error(error)
      return false
    }
  }
})
