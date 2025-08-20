import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js'
import { GeminiClient } from '../utils/gemini-client'
import { logger } from '../utils/logger'

const PROMPT_SYSTEM_INSTRUCTION = `Return your response in markdown. Give as complete of an
answer as possible. Assume whoever you're talking to will not be able to respond back so do not ask
for follow-ups. Do not hallucinate.`

// Simple text splitter for Discord's character limit
function splitText (text: string, maxLength: number = 4096): string[] {
  if (text.length <= maxLength) {
    return [text]
  }

  const chunks: string[] = []
  let currentChunk = ''
  const lines = text.split('\n')

  for (const line of lines) {
    if (currentChunk.length + line.length + 1 > maxLength) {
      if (currentChunk) {
        chunks.push(currentChunk.trim())
        currentChunk = ''
      }

      // If a single line is too long, split it further
      if (line.length > maxLength) {
        let remainingLine = line
        while (remainingLine.length > maxLength) {
          chunks.push(remainingLine.substring(0, maxLength).trim())
          remainingLine = remainingLine.substring(maxLength)
        }
        if (remainingLine) {
          currentChunk = remainingLine
        }
      } else {
        currentChunk = line
      }
    } else {
      currentChunk += (currentChunk ? '\n' : '') + line
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim())
  }

  return chunks
}

export const promptCommand = {
  data: new SlashCommandBuilder()
    .setName('prompt')
    .setDescription('Ask the LLM a question')
    .addStringOption(option =>
      option
        .setName('prompt')
        .setDescription('Prompt for the LLM')
        .setRequired(true)
    ),

  async execute (interaction: ChatInputCommandInteraction, geminiClient: GeminiClient) {
    // Defer the reply as LLMs take time to respond
    await interaction.deferReply()

    const promptText = interaction.options.get('prompt')?.value as string

    try {
      const response = await geminiClient.prompt({
        prompt: promptText,
        systemInstruction: PROMPT_SYSTEM_INSTRUCTION
      })

      const promptHeader = `***${promptText}***\n\n`
      const fullResponse = promptHeader + response

      const chunks = splitText(fullResponse)

      for (let i = 0; i < chunks.length; i++) {
        const embed = new EmbedBuilder()
          .setColor(0xA6E3A1) // RGB(166, 227, 161)
          .setDescription(chunks[i])

        if (chunks.length > 1) {
          embed.setFooter({ text: `${i + 1} / ${chunks.length}` })
        }

        if (i === 0) {
          await interaction.editReply({ embeds: [embed] })
        } else {
          await interaction.followUp({ embeds: [embed] })
        }
      }
    } catch (error) {
      logger.error({ error }, 'Error in prompt command')
      await interaction.editReply('Sorry, there was an error processing your request.')
    }
  }
}
