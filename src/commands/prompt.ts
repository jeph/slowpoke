import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { GeminiClient } from '../utils/gemini-client'
import { logger } from '../utils/logger'
import { SlashCommand } from '../models/commands'

export const createPromptCommand = (geminiClient: GeminiClient): SlashCommand => {
  return {
    command: new SlashCommandBuilder()
      .setName('prompt')
      .setDescription('Ask the LLM a question')
      .addStringOption(option =>
        option
          .setName('prompt')
          .setDescription('Prompt for the LLM')
          .setRequired(true)
      ),

    async execute (interaction: ChatInputCommandInteraction) {
      try {
        // Defer the reply as LLMs take time to respond
        await interaction.deferReply()

        const promptText = interaction.options.getString('prompt')

        if (!promptText) {
          await interaction.followUp('Please provide a prompt!')
          return
        }

        const response = await geminiClient.prompt({
          prompt: promptText,
          systemInstruction: PROMPT_SYSTEM_INSTRUCTION
        })

        const promptHeader = `***${promptText}***\n\n`
        const fullResponse = `${promptHeader}${response}`

        const chunks = await textSplitter.splitText(fullResponse)

        const embeds = chunks.map((chunk, index) => {
          const embed = new EmbedBuilder()
            .setColor(0xA6E3A1)
            .setDescription(chunk)

          if (chunks.length > 1) {
            embed.setFooter({ text: `${index + 1} / ${chunks.length}` })
          }

          return embed
        })

        for (const embed of embeds) {
          await interaction.followUp({ embeds: [embed] })
        }
      } catch (error) {
        logger.error({ error }, 'Error in prompt command')
        await interaction.followUp('Sorry, there was an error processing your request.')
      }
    }
  }
}

const PROMPT_SYSTEM_INSTRUCTION = `Return your response in markdown. Give as complete of an
answer as possible. Assume whoever you're talking to will not be able to respond back so do not ask
for follow-ups. Do not hallucinate.`

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 4096,
  chunkOverlap: 0,
  separators: [
    '\n## ',     // Markdown h2 headers
    '\n### ',    // Markdown h3 headers
    '\n#### ',   // Markdown h4 headers
    '\n\n',      // Paragraph breaks
    '\n',        // Line breaks
    ' ',         // Word boundaries
    ''           // Character level (last resort)
  ]
})
