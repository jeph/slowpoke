import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { ChatCodexOAuth } from 'langchainjs-codex-oauth'
import { logger } from './logger'
import { PromptOptions, TextGenerationClient } from './text-generation-client'

const CODEX_MODEL = 'gpt-5.5'

export const createCodexTextClient = (): TextGenerationClient => {
  const chatModel = new ChatCodexOAuth({
    model: CODEX_MODEL,
    serviceTier: 'priority'
  })

  return {
    async prompt (options: PromptOptions): Promise<string> {
      const { prompt, systemInstruction } = options
      logger.info({ prompt, systemInstruction, model: CODEX_MODEL, serviceTier: 'priority' }, 'Sending prompt to Codex')

      const messages = systemInstruction
        ? [new SystemMessage(systemInstruction), new HumanMessage(prompt)]
        : [new HumanMessage(prompt)]

      const response = await chatModel.invoke(messages)
      const text = response.text

      if (!text) {
        logger.error({ response }, 'No text returned from Codex')
        throw new Error('No text was returned from the LLM via inference')
      }

      logger.info({ text }, 'Received response from Codex')
      return text
    }
  }
}
