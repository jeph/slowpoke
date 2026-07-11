import assert from 'node:assert/strict'
import test from 'node:test'
import {
  loadConfig,
  OPENAI_COMPATIBLE_BASE_URL,
  OPENAI_IMAGE_MODEL,
  OPENAI_TEXT_MODEL,
  PARALLEL_SEARCH_MCP_URL
} from '../src/config'

test('loadConfig accepts only the required runtime secrets and identifiers', () => {
  assert.deepEqual(loadConfig({
    DISCORD_TOKEN: 'discord-token',
    DISCORD_APPLICATION_ID: 'application-id',
    CODEX_LB_API_KEY: 'api-key'
  }), {
    discordToken: 'discord-token',
    discordApplicationId: 'application-id',
    openAIApiKey: 'api-key'
  })
})

test('loadConfig reports variable names without leaking values', () => {
  const secret = 'do-not-print-this-secret'
  assert.throws(
    () => loadConfig({ DISCORD_TOKEN: secret }),
    error => {
      assert.ok(error instanceof Error)
      assert.match(error.message, /DISCORD_APPLICATION_ID/)
      assert.match(error.message, /CODEX_LB_API_KEY/)
      assert.doesNotMatch(error.message, new RegExp(secret))
      return true
    }
  )
})

test('provider endpoints and models are fixed application constants', () => {
  assert.equal(OPENAI_COMPATIBLE_BASE_URL, 'https://codex.jeph.io/v1')
  assert.equal(OPENAI_TEXT_MODEL, 'gpt-5.6-terra')
  assert.equal(OPENAI_IMAGE_MODEL, 'gpt-image-2')
  assert.equal(PARALLEL_SEARCH_MCP_URL, 'https://search.parallel.ai/mcp')
})
