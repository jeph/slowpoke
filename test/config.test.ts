import assert from 'node:assert/strict'
import test from 'node:test'
import {
  CODEX_LB_BASE_URL,
  CODEX_LB_IMAGE_MODEL,
  CODEX_LB_TEXT_MODEL,
  loadConfig,
  PARALLEL_SEARCH_MCP_URL
} from '../src/config'

test('loadConfig accepts only the required runtime secrets and identifiers', () => {
  assert.deepEqual(loadConfig({
    DISCORD_TOKEN: 'discord-token',
    DISCORD_APPLICATION_ID: 'application-id',
    CODEX_LB_API_KEY: 'codex-key'
  }), {
    discordToken: 'discord-token',
    discordApplicationId: 'application-id',
    codexLbApiKey: 'codex-key'
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
  assert.equal(CODEX_LB_BASE_URL, 'https://codex.jeph.io/v1')
  assert.equal(CODEX_LB_TEXT_MODEL, 'gpt-5.6-terra')
  assert.equal(CODEX_LB_IMAGE_MODEL, 'gpt-image-2')
  assert.equal(PARALLEL_SEARCH_MCP_URL, 'https://search.parallel.ai/mcp')
})
