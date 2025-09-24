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
    'Do not attempt to force the joke. If no good joke can be made, respond with the exact string: "No good joke." ' +
    'Here are some examples to guide your response responses:\n\n' +
    'User message: "Was Howard at the party?"\n' +
    'Response: Howard deez nuts in your mouth!\n\n' +
    'User message: "i need to play a flex game on my main to not decay if anybody would like to join me for one"\n' +
    'Response: Why don\'t you join deez nuts in your mouth!\n\n' +
    'User message: "How do I get to your house?"\n' +
    'Response: First, you gotta get deez nuts in your mouth!\n\n' +
    'User message: "My mom just died"\n' +
    'Response: No good joke.\n\n' +
    'User message: "I\'m feeling really down today"\n' +
    'Response: No good joke.\n\n' +
    'In addition, do not generate jokes for simple messages or messages with just a few words:\n\n' +
    'User message: "hello"\n' +
    'Response: No good joke.\n\n' +
    'User message: "yes"\n' +
    'Response: No good joke.\n\n' +
    'When returning the response, do not include any additional text or formatting. Just return the joke itself.'

export const createDeezNutsChimeIn = (geminiClient: GeminiClient, config: DeezNutsConfig): ChimeIn => ({
  name: 'deez-nuts',

  async execute (message: Message): Promise<boolean> {
    try {
      if (config.chimeInProbability < Math.random()) {
        return false
      }
      logger.info('Starting deez nuts chime-in')

      const response = await geminiClient.prompt({
        systemInstruction: SYSTEM_INSTRUCTION,
        prompt: `User message: "${message.content}"`
      })
      logger.info(response)

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
