import { AIMessage, BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages'
import { StructuredToolInterface } from '@langchain/core/tools'
import { ChatOpenAI } from '@langchain/openai'
import { createAgent, toolCallLimitMiddleware } from 'langchain'
import { CODEX_LB_BASE_URL, CODEX_LB_TEXT_MODEL } from '../config'
import { logger } from './logger'

const REQUEST_TIMEOUT_MS = 5 * 60 * 1000
const MAX_RETRIES = 2
const MAX_TOOL_STEPS = 25
const RESPONSE_INCLUDE = ['reasoning.encrypted_content'] as const

export interface OpenAIClient {
  prompt(options: PromptOptions): Promise<string>;
}

export interface PromptOptions {
  systemInstruction: string | undefined;
  prompt: string;
  tools?: StructuredToolInterface[];
}

export interface OpenAIClientOptions {
  apiKey: string;
}

export const createOpenAIClient = (options: OpenAIClientOptions): OpenAIClient => {
  const chatModel = new ChatOpenAI({
    model: CODEX_LB_TEXT_MODEL,
    apiKey: options.apiKey,
    configuration: {
      baseURL: CODEX_LB_BASE_URL
    },
    useResponsesApi: true,
    reasoning: { effort: 'medium' },
    timeout: REQUEST_TIMEOUT_MS,
    maxRetries: MAX_RETRIES,
    zdrEnabled: true,
    streaming: false
  }).withConfig({
    include: [...RESPONSE_INCLUDE]
  })

  return {
    async prompt (options: PromptOptions): Promise<string> {
      const { prompt, systemInstruction, tools = [] } = options
      logger.info({
        promptLength: prompt.length,
        hasSystemInstruction: !!systemInstruction,
        toolNames: tools.map(tool => tool.name),
        model: CODEX_LB_TEXT_MODEL,
        reasoningEffort: 'medium',
        timeoutMs: REQUEST_TIMEOUT_MS,
        maxRetries: MAX_RETRIES
      }, 'Sending prompt to codex-lb')

      const text = tools.length > 0
        ? await invokeAgentWithTools(chatModel, prompt, systemInstruction, tools)
        : await chatModel.invoke(systemInstruction
          ? [new SystemMessage(systemInstruction), new HumanMessage(prompt)]
          : [new HumanMessage(prompt)]).then(response => response.text)

      if (!text) {
        logger.error('No text returned from codex-lb')
        throw new Error('No text was returned from the LLM via inference')
      }

      logger.info({ textLength: text.length }, 'Received response from codex-lb')
      return text
    }
  }
}

const invokeAgentWithTools = async (
  chatModel: ReturnType<ChatOpenAI['withConfig']>,
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
  const lastAIMessage = [...messages].reverse().find(AIMessage.isInstance)
  return lastAIMessage?.text ?? ''
}
