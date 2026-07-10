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
import { createCodexLbImageClient, ImageProviderError } from '../src/utils/codex-lb-image-client'
import { createOpenAIClient } from '../src/utils/openai-client'

dotenv.config({ quiet: true })

let currentPhase = 'startup'

const main = async (): Promise<void> => {
  if (process.env.RUN_LIVE_AI_SMOKE_TESTS !== '1') {
    throw new Error('Set RUN_LIVE_AI_SMOKE_TESTS=1 to run live provider tests')
  }

  const runImageTests = process.argv.includes('--images')
  if (runImageTests && process.env.RUN_LIVE_IMAGE_SMOKE_TESTS !== '1') {
    throw new Error('Set RUN_LIVE_IMAGE_SMOKE_TESTS=1 to authorize billed image tests')
  }

  const config = loadConfig()
  const sdk = new OpenAI({
    apiKey: config.codexLbApiKey,
    baseURL: CODEX_LB_BASE_URL,
    timeout: 30_000,
    maxRetries: 0
  })
  currentPhase = 'models'
  const models = await sdk.models.list()
  const modelIds = new Set(models.data.map(model => model.id))
  const imageModelListed = modelIds.has(CODEX_LB_IMAGE_MODEL)
  currentPhase = 'models: text model'
  assert.ok(modelIds.has(CODEX_LB_TEXT_MODEL), `${CODEX_LB_TEXT_MODEL} was not returned by /models`)

  const responsesTrace = traceResponsesRequests()
  let directResponse: string
  let toolResponse: string
  let toolCalls = 0
  try {
    const textClient = createOpenAIClient({ apiKey: config.codexLbApiKey })
    currentPhase = 'direct text response'
    directResponse = await textClient.prompt({
      systemInstruction: 'Follow the user instruction exactly.',
      prompt: 'Reply with the exact token SLOWPOKE_DIRECT_OK and nothing else.'
    })
    assert.ok(directResponse.includes('SLOWPOKE_DIRECT_OK'))

    const smokeEcho = tool(
      async ({ value }) => {
        toolCalls++
        return `SLOWPOKE_TOOL_OK:${value}`
      },
      {
        name: 'smoke_echo',
        description: 'Return a smoke-test value.',
        schema: z.object({ value: z.string() })
      }
    )
    currentPhase = 'text tool round trip'
    toolResponse = await textClient.prompt({
      systemInstruction: 'You must call smoke_echo exactly once, then report its exact result.',
      prompt: 'Call smoke_echo with value ping.',
      tools: [smokeEcho]
    })
    assert.equal(toolCalls, 1)
    assert.ok(toolResponse.includes('SLOWPOKE_TOOL_OK:ping'))
  } finally {
    responsesTrace.restore()
  }

  currentPhase = 'encrypted reasoning continuity'
  const toolCallResponseIndex = responsesTrace.responses.findIndex(response =>
    getArray(response.output).some(item => getRecord(item).type === 'function_call')
  )
  assert.notEqual(toolCallResponseIndex, -1)
  const encryptedReasoningReturned = getArray(responsesTrace.responses[toolCallResponseIndex].output)
    .some(item => typeof getRecord(item).encrypted_content === 'string')
  assert.equal(encryptedReasoningReturned, true)
  const nextRequest = responsesTrace.requests[toolCallResponseIndex + 1]
  const nextInput = JSON.stringify(nextRequest?.input)
  const encryptedReasoningForwarded = nextInput.includes('encrypted_content')
  assert.equal(encryptedReasoningForwarded, true)

  let imageResults: { generatedBytes: number; editedBytes: number } | 'skipped' = 'skipped'
  if (runImageTests) {
    const imageClient = createCodexLbImageClient({ apiKey: config.codexLbApiKey })
    currentPhase = 'image generation'
    const generated = await imageClient.generateImage({
      prompt: 'A simple flat pink circle centered on a plain white background.'
    })
    currentPhase = 'image edit'
    const edited = await imageClient.editImage({
      prompt: 'Add one small blue dot in the center of the pink circle.',
      imageMimeType: 'image/png',
      imageData: generated
    })
    imageResults = {
      generatedBytes: generated.length,
      editedBytes: edited.length
    }
  }

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

void main().catch(error => {
  const details = error instanceof APIError
    ? { name: error.name, status: error.status, code: error.code, requestId: error.requestID }
    : error instanceof ImageProviderError
      ? { name: error.name, status: error.status, code: error.code, requestId: error.requestId }
      : { name: error instanceof Error ? error.name : 'UnknownError' }
  console.error(JSON.stringify({ liveSmokeTest: 'failed', phase: currentPhase, error: details }))
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
