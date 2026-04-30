import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { ChatCodexOAuth } from 'langchainjs-codex-oauth'
import { logger } from './logger'

const CODEX_MODEL = 'gpt-5.5'
const REQUEST_TIMEOUT_MS = 5 * 60 * 1000

export interface OpenAIClient {
  prompt(options: PromptOptions): Promise<string>;
}

export interface PromptOptions {
  systemInstruction: string | undefined;
  prompt: string;
}

export const createOpenAIClient = (): OpenAIClient => {
  const chatModel = new ChatCodexOAuth({
    model: CODEX_MODEL,
    reasoningEffort: 'medium',
    serviceTier: 'priority',
    timeout: REQUEST_TIMEOUT_MS
  })

  return {
    async prompt (options: PromptOptions): Promise<string> {
      const { prompt, systemInstruction } = options
      logger.info({ prompt, systemInstruction, model: CODEX_MODEL, reasoningEffort: 'medium', serviceTier: 'priority', timeoutMs: REQUEST_TIMEOUT_MS }, 'Sending prompt to OpenAI')

      const messages = systemInstruction
        ? [new SystemMessage(systemInstruction), new HumanMessage(prompt)]
        : [new HumanMessage(prompt)]

      const response = await chatModel.invoke(messages)
      const text = response.text

      if (!text) {
        logger.error({ response }, 'No text returned from OpenAI')
        throw new Error('No text was returned from the LLM via inference')
      }

      logger.info({ text }, 'Received response from OpenAI')
      return text
    }
  }
}
