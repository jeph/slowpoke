import assert from 'node:assert/strict'
import test from 'node:test'
import {
  detectImageMimeType,
  downloadDiscordImage,
  ImageDownloadError,
  isAllowedDiscordImageUrl
} from '../src/utils/image-downloader'
import { parseRemixPrompt } from '../src/commands/remix'

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01])

test('downloads and identifies a Discord-hosted image from bytes', async () => {
  const result = await downloadDiscordImage(
    'https://cdn.discordapp.com/attachments/test/image.bin',
    {
      fetchImplementation: async () => new Response(PNG, {
        headers: { 'content-type': 'application/octet-stream' }
      })
    }
  )

  assert.equal(result.mimeType, 'image/png')
  assert.deepEqual(result.buffer, PNG)
})

test('rejects arbitrary origins before making a request', async () => {
  let called = false
  await assert.rejects(
    downloadDiscordImage('https://example.com/image.png', {
      fetchImplementation: async () => {
        called = true
        return new Response(PNG)
      }
    }),
    (error: unknown) => error instanceof ImageDownloadError && error.code === 'disallowed_url'
  )
  assert.equal(called, false)
})

test('validates each redirect before following it', async () => {
  let calls = 0
  await assert.rejects(
    downloadDiscordImage('https://media.discordapp.net/image.png', {
      fetchImplementation: async () => {
        calls++
        return new Response(null, {
          status: 302,
          headers: { location: 'https://example.com/private' }
        })
      }
    }),
    (error: unknown) => error instanceof ImageDownloadError && error.code === 'disallowed_url'
  )
  assert.equal(calls, 1)
})

test('enforces declared and streamed byte limits', async () => {
  await assert.rejects(
    downloadDiscordImage('https://cdn.discordapp.com/image.png', {
      maxBytes: PNG.length - 1,
      fetchImplementation: async () => new Response(PNG, {
        headers: { 'content-length': String(PNG.length) }
      })
    }),
    (error: unknown) => error instanceof ImageDownloadError && error.code === 'too_large'
  )

  await assert.rejects(
    downloadDiscordImage('https://cdn.discordapp.com/image.png', {
      maxBytes: PNG.length - 1,
      fetchImplementation: async () => new Response(PNG)
    }),
    (error: unknown) => error instanceof ImageDownloadError && error.code === 'too_large'
  )
})

test('recognizes only PNG, JPEG, and WebP magic bytes', () => {
  assert.equal(detectImageMimeType(PNG), 'image/png')
  assert.equal(detectImageMimeType(Buffer.from([0xff, 0xd8, 0xff, 0x00])), 'image/jpeg')
  assert.equal(detectImageMimeType(Buffer.from('RIFF0000WEBP', 'ascii')), 'image/webp')
  assert.equal(detectImageMimeType(Buffer.from('GIF89a', 'ascii')), undefined)
  assert.equal(isAllowedDiscordImageUrl('https://images-ext-1.discordapp.net/image.png'), true)
  assert.equal(isAllowedDiscordImageUrl('http://cdn.discordapp.com/image.png'), false)
})

test('remix prompt parsing is case insensitive and anchored', () => {
  assert.equal(parseRemixPrompt('!REMIX add sunglasses'), 'add sunglasses')
  assert.equal(parseRemixPrompt('!remix\nmake it pink'), 'make it pink')
  assert.equal(parseRemixPrompt('please !remix this'), 'please !remix this')
})
