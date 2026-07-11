import assert from 'node:assert/strict'
import test from 'node:test'
import { tool } from '@langchain/core/tools'
import { z } from 'zod'
import { OPENAI_COMPATIBLE_BASE_URL, OPENAI_TEXT_MODEL } from '../src/config'
import { createOpenAIClient } from '../src/utils/openai-client'

interface CapturedRequest {
  url: string;
  headers: Headers;
  body: Record<string, unknown>;
}

test('direct prompts use the OpenAI-compatible Responses API with stateless encrypted reasoning', async () => {
  const captured: CapturedRequest[] = []
  const restoreFetch = replaceFetch(async request => {
    captured.push(await captureRequest(request))
    return jsonResponse(textResponse('direct answer'))
  })

  try {
    const client = createOpenAIClient({ apiKey: 'test-api-key' })
    const result = await client.prompt({
      systemInstruction: 'system instruction',
      prompt: 'hello'
    })

    assert.equal(result, 'direct answer')
    assert.equal(captured.length, 1)
    const request = captured[0]
    assert.equal(request.url, `${OPENAI_COMPATIBLE_BASE_URL}/responses`)
    assert.equal(request.headers.get('authorization'), 'Bearer test-api-key')
    assert.equal(request.body.model, OPENAI_TEXT_MODEL)
    assert.equal(request.body.store, false)
    assert.equal(request.body.stream, false)
    assert.deepEqual(request.body.reasoning, { effort: 'medium' })
    assert.deepEqual(request.body.include, ['reasoning.encrypted_content'])
  } finally {
    restoreFetch()
  }
})

test('agent tool rounds preserve encrypted reasoning and request options', async () => {
  const captured: CapturedRequest[] = []
  let requestNumber = 0
  const restoreFetch = replaceFetch(async request => {
    captured.push(await captureRequest(request))
    requestNumber++
    return jsonResponse(requestNumber === 1
      ? toolCallResponse()
      : textResponse('tool-assisted answer'))
  })

  const lookup = tool(
    async ({ value }) => `result for ${value}`,
    {
      name: 'lookup',
      description: 'Look up a value',
      schema: z.object({ value: z.string() })
    }
  )

  try {
    const client = createOpenAIClient({ apiKey: 'test-api-key' })
    const result = await client.prompt({
      systemInstruction: 'use the lookup tool',
      prompt: 'look this up',
      tools: [lookup]
    })

    assert.equal(captured.length, 2)
    assert.equal(result, 'tool-assisted answer')
    for (const request of captured) {
      assert.deepEqual(request.body.include, ['reasoning.encrypted_content'])
      assert.equal(request.body.store, false)
      assert.equal(request.body.model, OPENAI_TEXT_MODEL)
    }

    const secondInput = JSON.stringify(captured[1].body.input)
    assert.match(secondInput, /encrypted-reasoning/)
    assert.match(secondInput, /function_call_output/)
    assert.match(secondInput, /result for requested-value/)
  } finally {
    restoreFetch()
  }
})

const replaceFetch = (implementation: (request: Request) => Promise<Response>): (() => void) => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
    const request = input instanceof Request ? input : new Request(input, init)
    return implementation(request)
  }) as typeof fetch
  return () => { globalThis.fetch = originalFetch }
}

const captureRequest = async (request: Request): Promise<CapturedRequest> => ({
  url: request.url,
  headers: request.headers,
  body: JSON.parse(await request.text()) as Record<string, unknown>
})

const jsonResponse = (body: Record<string, unknown>): Response => new Response(JSON.stringify(body), {
  status: 200,
  headers: {
    'content-type': 'application/json',
    'x-request-id': 'request-test'
  }
})

const baseResponse = (output: Array<Record<string, unknown>>): Record<string, unknown> => ({
  id: 'resp_test',
  object: 'response',
  created_at: 1,
  status: 'completed',
  error: null,
  incomplete_details: null,
  instructions: null,
  metadata: {},
  model: OPENAI_TEXT_MODEL,
  output,
  parallel_tool_calls: true,
  previous_response_id: null,
  service_tier: 'default',
  store: false,
  temperature: null,
  tool_choice: 'auto',
  tools: [],
  top_p: null,
  truncation: 'disabled',
  usage: {
    input_tokens: 1,
    input_tokens_details: { cached_tokens: 0 },
    output_tokens: 1,
    output_tokens_details: { reasoning_tokens: 0 },
    total_tokens: 2
  },
  user: null
})

const textResponse = (text: string): Record<string, unknown> => baseResponse([{
  id: 'msg_test',
  type: 'message',
  status: 'completed',
  role: 'assistant',
  phase: null,
  content: [{
    type: 'output_text',
    text,
    annotations: [],
    logprobs: []
  }]
}])

const toolCallResponse = (): Record<string, unknown> => baseResponse([
  {
    id: 'reasoning_test',
    type: 'reasoning',
    summary: [],
    encrypted_content: 'encrypted-reasoning'
  },
  {
    id: 'function_test',
    type: 'function_call',
    call_id: 'call_test',
    name: 'lookup',
    arguments: JSON.stringify({ value: 'requested-value' }),
    status: 'completed'
  }
])
