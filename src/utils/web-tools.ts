import { BraveSearch } from '@langchain/community/tools/brave_search'
import { RequestsGetTool } from '@langchain/classic/tools'

const MAX_WEBPAGE_CHARS = 12_000

export const createWebTools = (braveSearchApiKey: string) => [
  new BraveSearch({ apiKey: braveSearchApiKey }),
  new RequestsGetTool({
    Accept: 'text/html,text/plain,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.1',
    'User-Agent': 'slowpoke-discord-bot/0.1'
  }, {
    maxOutputLength: MAX_WEBPAGE_CHARS
  })
]
