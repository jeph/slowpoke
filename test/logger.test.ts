import assert from 'node:assert/strict'
import { Writable } from 'node:stream'
import test from 'node:test'
import pino from 'pino'
import { LOGGER_REDACT_PATHS } from '../src/utils/logger'

test('logger redaction removes API keys and authorization headers', () => {
  let output = ''
  const destination = new Writable({
    write (chunk, _encoding, callback) {
      output += chunk.toString()
      callback()
    }
  })
  const testLogger = pino({
    redact: {
      paths: LOGGER_REDACT_PATHS,
      censor: '[REDACTED]'
    }
  }, destination)

  testLogger.info({
    apiKey: 'top-level-secret',
    provider: {
      api_key: 'nested-secret',
      headers: {
        authorization: 'Bearer nested-token',
        'x-api-key': 'nested-api-key'
      }
    },
    headers: {
      authorization: 'Bearer top-level-token',
      'x-api-key': 'top-level-api-key'
    }
  })

  assert.doesNotMatch(output, /top-level-secret|nested-secret|nested-token|nested-api-key|top-level-token|top-level-api-key/)
  assert.match(output, /\[REDACTED\]/)
})
