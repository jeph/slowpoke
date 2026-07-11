import assert from 'node:assert/strict'
import { tool } from '@langchain/core/tools'
import dotenv from 'dotenv'
import OpenAI, { APIError } from 'openai'
import { z } from 'zod'
import {
  CODEX_LB_BASE_URL,
  CODEX_LB_IMAGE_MODEL,
  CODEX_LB_TEXT_MODEL,
  loadConfig
} from '../src/config'
import { createOpenAIImageClient, ImageProviderError } from '../src/utils/openai-image-client'
import { createOpenAIClient } from '../src/utils/openai-client'

dotenv.config({ quiet: true })

class LiveSmokePhaseError extends Error {
  constructor (readonly phase: string, readonly originalError: unknown) {
    super(`Live smoke test failed during ${phase}`)
    this.name = 'LiveSmokePhaseError'
  }
}

const runPhase = async <T>(phase: string, operation: () => T | Promise<T>): Promise<T> => {
  try {
    return await operation()
  } catch (error) {
    if (error instanceof LiveSmokePhaseError) throw error
    throw new LiveSmokePhaseError(phase, error)
  }
}

const main = async (): Promise<void> => {
  const runImageTests = process.argv.includes('--images')
  await runPhase('authorization', () => {
    if (process.env.RUN_LIVE_AI_SMOKE_TESTS !== '1') {
      throw new Error('Set RUN_LIVE_AI_SMOKE_TESTS=1 to run live provider tests')
    }
    if (runImageTests && process.env.RUN_LIVE_IMAGE_SMOKE_TESTS !== '1') {
      throw new Error('Set RUN_LIVE_IMAGE_SMOKE_TESTS=1 to authorize billed image tests')
    }
  })

  const config = await runPhase('configuration', () => loadConfig())
  const sdk = new OpenAI({
    apiKey: config.codexLbApiKey,
    baseURL: CODEX_LB_BASE_URL,
    timeout: 30_000,
    maxRetries: 0
  })
  const { modelIds, imageModelListed } = await runPhase('model discovery', async () => {
    const models = await sdk.models.list()
    const modelIds = new Set(models.data.map(model => model.id))
    assert.ok(modelIds.has(CODEX_LB_TEXT_MODEL), `${CODEX_LB_TEXT_MODEL} was not returned by /models`)
    return {
      modelIds,
      imageModelListed: modelIds.has(CODEX_LB_IMAGE_MODEL)
    }
  })

  const responsesTrace = traceResponsesRequests()
  const { directResponse, toolResponse } = await (async () => {
    try {
      const textClient = createOpenAIClient({ apiKey: config.codexLbApiKey })
      const directResponse = await runPhase('direct text response', async () => {
        const response = await textClient.prompt({
          systemInstruction: 'Follow the user instruction exactly.',
          prompt: 'Reply with the exact token SLOWPOKE_DIRECT_OK and nothing else.'
        })
        assert.ok(response.includes('SLOWPOKE_DIRECT_OK'))
        return response
      })

      const smokeEcho = tool(
        async ({ value }) => `SLOWPOKE_TOOL_OK:${value}`,
        {
          name: 'smoke_echo',
          description: 'Return a smoke-test value.',
          schema: z.object({ value: z.string() })
        }
      )
      const toolResponse = await runPhase('text tool round trip', async () => {
        const response = await textClient.prompt({
          systemInstruction: 'You must call smoke_echo exactly once, then report its exact result.',
          prompt: 'Call smoke_echo with value ping.',
          tools: [smokeEcho]
        })
        assert.ok(response.includes('SLOWPOKE_TOOL_OK:ping'))
        return response
      })

      return { directResponse, toolResponse }
    } finally {
      responsesTrace.restore()
    }
  })()

  const { toolCallResponseIndex, toolCalls } = await runPhase('tool call trace validation', () => {
    const toolCallResponseIndex = responsesTrace.responses.findIndex(response =>
      getArray(response.output).some(item => getRecord(item).type === 'function_call')
    )
    assert.notEqual(toolCallResponseIndex, -1)

    const toolCalls = responsesTrace.responses
      .flatMap(response => getArray(response.output).map(getRecord))
      .filter(item => item.type === 'function_call' && item.name === 'smoke_echo')
      .length
    assert.equal(toolCalls, 1)

    return { toolCallResponseIndex, toolCalls }
  })

  const encryptedReasoningReturned = await runPhase('encrypted reasoning response validation', () => {
    const encryptedReasoningReturned = getArray(responsesTrace.responses[toolCallResponseIndex].output)
      .some(item => typeof getRecord(item).encrypted_content === 'string')
    assert.equal(encryptedReasoningReturned, true)
    return encryptedReasoningReturned
  })

  const encryptedReasoningForwarded = await runPhase('encrypted reasoning forwarding validation', () => {
    const nextRequest = responsesTrace.requests[toolCallResponseIndex + 1]
    const nextInput = JSON.stringify(nextRequest?.input) ?? ''
    const encryptedReasoningForwarded = nextInput.includes('encrypted_content')
    assert.equal(encryptedReasoningForwarded, true)
    return encryptedReasoningForwarded
  })

  const imageResults = runImageTests
    ? await runImageSmokeTests(config.codexLbApiKey)
    : 'skipped' as const

  console.log(JSON.stringify({
    models: {
      count: modelIds.size,
      textModelAvailable: true,
      imageModelListed
    },
    text: {
      directResponseLength: directResponse.length,
      toolCalls,
      toolResponseLength: toolResponse.length,
      encryptedReasoningReturned,
      encryptedReasoningForwarded
    },
    images: imageResults
  }))
}

const runImageSmokeTests = async (apiKey: string): Promise<{
  generatedBytes: number;
  editedBytes: number;
}> => {
  const imageClient = createOpenAIImageClient({ apiKey })
  const generated = await runPhase('image generation', () => imageClient.generateImage({
    prompt: 'A simple flat pink circle centered on a plain white background.'
  }))
  const edited = await runPhase('image edit', () => imageClient.editImage({
    prompt: 'Add one small blue dot in the center of the pink circle.',
    imageMimeType: 'image/png',
    imageData: generated
  }))
  return {
    generatedBytes: generated.length,
    editedBytes: edited.length
  }
}

void main().catch(caughtError => {
  const phaseError = caughtError instanceof LiveSmokePhaseError
    ? caughtError
    : new LiveSmokePhaseError('startup', caughtError)
  const error = phaseError.originalError
  const details = error instanceof APIError
    ? { name: error.name, status: error.status, code: error.code, requestId: error.requestID }
    : error instanceof ImageProviderError
      ? { name: error.name, status: error.status, code: error.code, requestId: error.requestId }
      : { name: error instanceof Error ? error.name : 'UnknownError' }
  console.error(JSON.stringify({ liveSmokeTest: 'failed', phase: phaseError.phase, error: details }))
  process.exitCode = 1
})

const traceResponsesRequests = (): {
  requests: Array<Record<string, unknown>>;
  responses: Array<Record<string, unknown>>;
  restore(): void;
} => {
  const requests: Array<Record<string, unknown>> = []
  const responses: Array<Record<string, unknown>> = []
  const originalFetch = globalThis.fetch

  globalThis.fetch = (async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
    const request = input instanceof Request ? input : new Request(input, init)
    const isResponsesRequest = new URL(request.url).pathname.endsWith('/responses')
    if (isResponsesRequest) {
      requests.push(JSON.parse(await request.clone().text()) as Record<string, unknown>)
    }

    const response = await originalFetch(input, init)
    if (isResponsesRequest && response.headers.get('content-type')?.includes('application/json')) {
      responses.push(await response.clone().json() as Record<string, unknown>)
    }
    return response
  }) as typeof fetch

  return {
    requests,
    responses,
    restore: () => { globalThis.fetch = originalFetch }
  }
}

const getRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? value as Record<string, unknown> : {}

const getArray = (value: unknown): unknown[] => Array.isArray(value) ? value : []
