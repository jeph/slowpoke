import { BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages'
import { StructuredToolInterface } from '@langchain/core/tools'
import { createAgent, toolCallLimitMiddleware } from 'langchain'
import { ChatCodexOAuth } from 'langchainjs-codex-oauth'
import { logger } from './logger'

const CODEX_MODEL = 'gpt-5.5'
const CODEX_SERVICE_TIER = 'default'
const REQUEST_TIMEOUT_MS = 5 * 60 * 1000
const MAX_TOOL_STEPS = 25

export interface OpenAIClient {
  prompt(options: PromptOptions): Promise<string>;
}

export interface PromptOptions {
  systemInstruction: string | undefined;
  prompt: string;
  tools?: StructuredToolInterface[];
}

export const createOpenAIClient = (): OpenAIClient => {
  const chatModel = new ChatCodexOAuth({
    model: CODEX_MODEL,
    reasoningEffort: 'medium',
    serviceTier: CODEX_SERVICE_TIER,
    timeout: REQUEST_TIMEOUT_MS
  })

  return {
    async prompt (options: PromptOptions): Promise<string> {
      const { prompt, systemInstruction, tools = [] } = options
      logger.info({ promptLength: prompt.length, hasSystemInstruction: !!systemInstruction, toolNames: tools.map(tool => tool.name), model: CODEX_MODEL, reasoningEffort: 'medium', serviceTier: CODEX_SERVICE_TIER, timeoutMs: REQUEST_TIMEOUT_MS }, 'Sending prompt to OpenAI')

      const text = tools.length > 0
        ? await invokeAgentWithTools(chatModel, prompt, systemInstruction, tools)
        : await chatModel.invoke(systemInstruction
          ? [new SystemMessage(systemInstruction), new HumanMessage(prompt)]
          : [new HumanMessage(prompt)]).then(response => response.text)

      if (!text) {
        logger.error('No text returned from OpenAI')
        throw new Error('No text was returned from the LLM via inference')
      }

      logger.info({ textLength: text.length }, 'Received response from OpenAI')
      return text
    }
  }
}

const invokeAgentWithTools = async (
  chatModel: ChatCodexOAuth,
  prompt: string,
  systemInstruction: string | undefined,
  tools: StructuredToolInterface[]
): Promise<string> => {
  const agent = createAgent({
    model: chatModel,
    tools,
    systemPrompt: systemInstruction,
    middleware: [toolCallLimitMiddleware({ runLimit: MAX_TOOL_STEPS, exitBehavior: 'error' })],
    version: 'v1'
  })

  const result = await agent.invoke({
    messages: [new HumanMessage(prompt)]
  })
  return getLastMessageText(result.messages)
}

const getLastMessageText = (messages: BaseMessage[]): string => {
  const lastMessage = messages[messages.length - 1]
  return lastMessage?.text ?? ''
}
