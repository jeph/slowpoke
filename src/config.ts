import { z } from 'zod'

export const OPENAI_COMPATIBLE_BASE_URL = 'https://codex.jeph.io/v1'
export const OPENAI_TEXT_MODEL = 'gpt-5.6-terra'
export const OPENAI_IMAGE_MODEL = 'gpt-image-2'
export const PARALLEL_SEARCH_MCP_URL = 'https://search.parallel.ai/mcp'

const environmentSchema = z.object({
  DISCORD_TOKEN: z.string().trim().min(1),
  DISCORD_APPLICATION_ID: z.string().trim().min(1),
  // Retained as the external deployment contract while provider-facing code stays generic.
  CODEX_LB_API_KEY: z.string().trim().min(1)
})

export interface AppConfig {
  discordToken: string;
  discordApplicationId: string;
  openAIApiKey: string;
}

export const loadConfig = (environment: NodeJS.ProcessEnv = process.env): AppConfig => {
  const result = environmentSchema.safeParse(environment)
  if (!result.success) {
    const missingVariables = result.error.issues
      .map(issue => issue.path.join('.'))
      .filter(Boolean)
      .join(', ')
    throw new Error(`Invalid environment configuration: ${missingVariables}`)
  }

  return {
    discordToken: result.data.DISCORD_TOKEN,
    discordApplicationId: result.data.DISCORD_APPLICATION_ID,
    openAIApiKey: result.data.CODEX_LB_API_KEY
  }
}
