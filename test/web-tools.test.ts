import assert from 'node:assert/strict'
import test from 'node:test'
import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import { createWebTools, normalizeWebToolContent } from '../src/utils/web-tools'

const makeTool = (name: string): DynamicStructuredTool => new DynamicStructuredTool({
  name,
  description: `${name} test tool`,
  schema: z.object({}),
  func: async () => name
})

test('loads only the expected Parallel Search MCP tools', async () => {
  let closed = false
  const webTools = await createWebTools({
    client: {
      async getTools () {
        return [makeTool('web_search'), makeTool('unexpected'), makeTool('web_fetch')]
      },
      async close () { closed = true }
    }
  })

  assert.deepEqual(webTools.tools.map(tool => tool.name), ['web_search', 'web_fetch'])
  assert.equal(closed, false)
  await webTools.close()
  assert.equal(closed, true)
})

test('starts without web tools if discovery fails', async () => {
  let closed = false
  const webTools = await createWebTools({
    client: {
      async getTools () { throw new Error('server unavailable') },
      async close () { closed = true }
    }
  })

  assert.deepEqual(webTools.tools, [])
  assert.equal(closed, true)
})

test('disables web access if either expected tool is missing', async () => {
  let closed = false
  const webTools = await createWebTools({
    client: {
      async getTools () { return [makeTool('web_search')] },
      async close () { closed = true }
    }
  })

  assert.deepEqual(webTools.tools, [])
  assert.equal(closed, true)
})

test('times out discovery and starts without web tools', async () => {
  let closed = false
  const webTools = await createWebTools({
    discoveryTimeoutMs: 5,
    client: {
      async getTools () { return new Promise(() => {}) },
      async close () { closed = true }
    }
  })

  assert.deepEqual(webTools.tools, [])
  assert.equal(closed, true)
})

test('normalizes MCP text blocks without duplicating structured content and caps output', () => {
  assert.equal(normalizeWebToolContent([{
    type: 'text',
    text: 'focused excerpts',
    structuredContent: { results: ['duplicated excerpts'] }
  }]), 'focused excerpts')

  const normalized = normalizeWebToolContent('x'.repeat(40_000))
  assert.equal(normalized.length, 30_000)
  assert.match(normalized, /\[web tool output truncated\]$/)
})
