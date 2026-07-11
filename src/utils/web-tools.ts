import { MultiServerMCPClient } from '@langchain/mcp-adapters'
import { StructuredToolInterface } from '@langchain/core/tools'
import { PARALLEL_SEARCH_MCP_URL } from '../config'
import { logger } from './logger'

const PARALLEL_SERVER_NAME = 'parallel-search'
const EXPECTED_TOOL_NAMES = new Set(['web_search', 'web_fetch'])
const WEB_TOOL_TIMEOUT_MS = 30_000
const WEB_TOOL_DISCOVERY_TIMEOUT_MS = 15_000
const WEB_TOOL_OUTPUT_MAX_CHARS = 30_000
const TRUNCATION_NOTICE = '\n\n[web tool output truncated]'

interface WebToolsClient {
  getTools(): Promise<StructuredToolInterface[]>;
  close(): Promise<void>;
}

export interface WebTools {
  tools: StructuredToolInterface[];
  close(): Promise<void>;
}

export interface CreateWebToolsOptions {
  client?: WebToolsClient;
  discoveryTimeoutMs?: number;
}

export const createWebTools = async (options: CreateWebToolsOptions = {}): Promise<WebTools> => {
  const client = options.client ?? new MultiServerMCPClient({
    throwOnLoadError: true,
    prefixToolNameWithServerName: false,
    additionalToolNamePrefix: '',
    useStandardContentBlocks: false,
    onConnectionError: 'throw',
    afterToolCall: ({ result }) => ({
      result: normalizeWebToolContent(result[0])
    }),
    mcpServers: {
      [PARALLEL_SERVER_NAME]: {
        transport: 'http',
        url: PARALLEL_SEARCH_MCP_URL,
        automaticSSEFallback: false,
        defaultToolTimeout: WEB_TOOL_TIMEOUT_MS
      }
    }
  })

  try {
    const discoveredTools = await withDiscoveryTimeout(
      client.getTools(),
      options.discoveryTimeoutMs ?? WEB_TOOL_DISCOVERY_TIMEOUT_MS
    )
    const tools = discoveredTools.filter(tool => EXPECTED_TOOL_NAMES.has(tool.name))
    const toolNames = new Set(tools.map(tool => tool.name))
    const missingToolNames = [...EXPECTED_TOOL_NAMES].filter(name => !toolNames.has(name))

    if (missingToolNames.length > 0) {
      logger.warn({ missingToolNames }, 'Parallel Search MCP did not expose all expected tools; starting without web tools')
      await closeClient(client)
      return createDisabledWebTools()
    }

    logger.info({ toolNames: tools.map(tool => tool.name) }, 'Loaded anonymous Parallel Search MCP tools')
    return {
      tools,
      close: async () => closeClient(client)
    }
  } catch (error) {
    logger.warn({ error }, 'Unable to load Parallel Search MCP; starting without web tools')
    await closeClient(client)
    return createDisabledWebTools()
  }
}

const closeClient = async (client: WebToolsClient): Promise<void> => {
  try {
    await client.close()
  } catch (error) {
    logger.warn({ error }, 'Unable to close Parallel Search MCP client cleanly')
  }
}

const createDisabledWebTools = (): WebTools => ({
  tools: [],
  close: async () => {}
})

// The adapter supports tool-call timeouts, but not a timeout for its initial getTools() discovery.
const withDiscoveryTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  let timeout: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => {
        timeout = setTimeout(
          () => reject(new Error('Parallel Search MCP discovery timed out')),
          timeoutMs
        )
      })
    ])
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}

export const normalizeWebToolContent = (content: unknown): string => {
  const text = typeof content === 'string'
    ? content
    : Array.isArray(content)
      ? content.map(toText).filter(Boolean).join('\n')
      : toText(content)

  if (text.length <= WEB_TOOL_OUTPUT_MAX_CHARS) return text
  return text.slice(0, WEB_TOOL_OUTPUT_MAX_CHARS - TRUNCATION_NOTICE.length) + TRUNCATION_NOTICE
}

const toText = (value: unknown): string => {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object' && 'text' in value && typeof value.text === 'string') {
    return value.text
  }
  try {
    return JSON.stringify(value) ?? String(value)
  } catch {
    return String(value)
  }
}
