import assert from 'node:assert/strict'
import test from 'node:test'
import { File } from 'node:buffer'
import type { Uploadable } from 'openai'
import type { ImageEditParamsNonStreaming, ImageGenerateParamsNonStreaming } from 'openai/resources/images'
import { CODEX_LB_IMAGE_MODEL } from '../src/config'
import { createOpenAIImageClient, ImageProviderError } from '../src/utils/openai-image-client'

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01])

test('image generation requests one non-streaming PNG from GPT Image 2', async () => {
  let request: ImageGenerateParamsNonStreaming | undefined
  const client = createOpenAIImageClient({
    apiKey: 'unused-test-key',
    imagesApi: {
      async generate (body) {
        request = body
        return { created: 1, data: [{ b64_json: PNG.toString('base64') }] }
      },
      async edit () {
        throw new Error('not used')
      }
    }
  })

  assert.deepEqual(await client.generateImage({ prompt: 'draw a slowpoke' }), PNG)
  assert.deepEqual(request, {
    model: CODEX_LB_IMAGE_MODEL,
    prompt: 'draw a slowpoke',
    n: 1,
    output_format: 'png',
    stream: false
  })
})

test('image edits preserve validated MIME type, filename, and bytes', async () => {
  const source = Buffer.from([0xff, 0xd8, 0xff, 0x01])
  let upload: { data: Buffer; name: string; type: string } | undefined
  let request: ImageEditParamsNonStreaming | undefined
  const client = createOpenAIImageClient({
    apiKey: 'unused-test-key',
    fileFactory: async (data, name, options): Promise<Uploadable> => {
      upload = { data, name, type: options.type }
      return new File([new Uint8Array([...data])], name, options)
    },
    imagesApi: {
      async generate () {
        throw new Error('not used')
      },
      async edit (body) {
        request = body
        return { created: 1, data: [{ b64_json: PNG.toString('base64') }] }
      }
    }
  })

  assert.deepEqual(await client.editImage({
    prompt: 'add sunglasses',
    imageMimeType: 'image/jpeg',
    imageData: source
  }), PNG)
  assert.deepEqual(upload, { data: source, name: 'input.jpg', type: 'image/jpeg' })
  assert.equal(request?.model, CODEX_LB_IMAGE_MODEL)
  assert.equal(request?.prompt, 'add sunglasses')
  assert.equal(request?.n, 1)
  assert.equal(request?.output_format, 'png')
  assert.equal(request?.stream, false)
})

test('invalid image output is rejected', async () => {
  const client = createOpenAIImageClient({
    apiKey: 'unused-test-key',
    imagesApi: {
      async generate () {
        return { created: 1, data: [{ b64_json: Buffer.from('not a png').toString('base64') }] }
      },
      async edit () {
        throw new Error('not used')
      }
    }
  })

  await assert.rejects(
    client.generateImage({ prompt: 'test' }),
    /invalid PNG data/
  )
})

test('image requests are not retried by the adapter', async () => {
  let attempts = 0
  const client = createOpenAIImageClient({
    apiKey: 'unused-test-key',
    imagesApi: {
      async generate () {
        attempts++
        throw new Error('network failure')
      },
      async edit () {
        throw new Error('not used')
      }
    }
  })

  await assert.rejects(client.generateImage({ prompt: 'test' }), ImageProviderError)
  assert.equal(attempts, 1)
})
