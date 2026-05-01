import { BraveSearch } from '@langchain/community/tools/brave_search'

export const createWebTools = (braveSearchApiKey: string) => [
  new BraveSearch({ apiKey: braveSearchApiKey })
]
