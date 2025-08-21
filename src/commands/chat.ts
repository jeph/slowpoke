import { SlashCommandBuilder, ChatInputCommandInteraction, DiscordAPIError } from 'discord.js'
import { GeminiClient } from '../utils/gemini-client'
import { logger } from '../utils/logger'
import { SlashCommand } from '../models/commands'

const CHAT_SYSTEM_INSTRUCTION = `You are a Discord bot named slowpoke. You are named after
the Pokémon Slowpoke. Respond to the Discord messages in the channel. You will be able to see up to
the last 100 messages in the channel. The messages will be in chronological order. Each message will
be given in the following format:

\`\`\`
[name: {author name}][time: {timestamp of when message was sent}][isBot: false]: {message_content}
\`\`\`

The following is a real world example of two messages:

\`\`\`
[name: Soonay][time: 2025-05-30T19:15Z][isBot: false]: Hello, how are you?
[name: Money Money][time: 2025-05-30T19:16Z][isBot: false]: I'm good how are you?
\`\`\`

The name and time blocks show the name the person who sent the message and the timestamp in UTC
that the message was sent. Sometimes, channels will include messages from bots. The isBot block
shows if the message was sent by a bot or not. You can also use this to determine if a message in
the channel was sent by you. For example, a message sent by you would look like this since your
name is slowpoke and you are a discord bot:

\`\`\`
[name: slowpoke][time: 2024-03-14T08:11Z][isBot: true]: Hi! I'm slowpoke, a Discord bot!
\`\`\`

Generate a response to participate in the conversation. The output of your response should just be
the text of the message. For example, if the message says:

\`\`\`
[name: jeph][time: 2025-01-20T16:32Z][isBot: false]: Hi slowpoke! How are you doing?
\`\`\`

Your response should be in the following format without the code block:

\`\`\`
I'm good jeph! How are you doing?
\`\`\`

You may see up to the last 100 messages in the channel, but you should only respond to the most
recent messages that are relevant to the conversation. For example:

\`\`\`
[name: Soonay][time: 2024-01-20T19:15Z][isBot: false]: I like ice cream, do you like ice cream?
[name: Money Money][time: 2025-05-30T19:16Z][isBot: false]: How are you doing today?
\`\`\`

You would respond to Money Money and ignore Soonay because their question was over a year ago and
no longer relevant to the conversation. You would say something like the following and ignore the
question about ice cream:

\`\`\`
I'm doing great! Thanks for asking.
\`\`\`

Aside from the examples responses above (which are meant to be used as a guide and not taken
literally), here are some general guidelines on how to respond:
- Respond in a way that you think would be appropriate for the conversation.
- Try to be helpful. If people are arguing, try to diffuse the situation or resolve the conflict.
- If people are asking questions, try to answer them.
- Be a bit edgy. Not every message needs to be positive, friendly, or politically correct.
- Find opprotunities to roast and troll people.
- Use emojis, but don't overuse them. Not every message needs an emoji.

`

export const createChatCommand = (geminiClient: GeminiClient): SlashCommand => ({
  command: new SlashCommandBuilder()
    .setName('chat')
    .setDescription('Chat with slowpoke'),

  async execute (interaction: ChatInputCommandInteraction) {
    // Defer the reply as LLMs take time to respond
    await interaction.deferReply()

    try {
      // Fetch recent messages from the channel
      const messages = await interaction.channel?.messages.fetch({ limit: 100 })

      if (!messages || messages.size === 0) {
        return await interaction.editReply('No messages found in this channel.')
      }

      // Convert messages to chronological order
      const messageArray = Array.from(messages.values()).reverse()

      // Get display names for guild members
      const displayNames = new Map<string, string>()
      if (interaction.guild) {
        const authorIds = new Set(messageArray.map(msg => msg.author.id))

        for (const authorId of authorIds) {
          try {
            const member = await interaction.guild.members.fetch(authorId)
            displayNames.set(authorId, member.displayName)
          } catch (error) {
            // Member not found, will use global name or username instead
          }
        }
      }

      // Format messages for the AI
      const formattedMessages = messageArray.map(message => {
        const name = displayNames.get(message.author.id) ||
                    message.author.globalName ||
                    message.author.username
        const time = message.createdAt.toISOString().slice(0, 16) + 'Z'
        return `[name: ${name}][time: ${time}][isBot: ${message.author.bot}]: ${message.content}`
      }).join('\n')

      const response = await geminiClient.prompt({
        prompt: formattedMessages,
        systemInstruction: CHAT_SYSTEM_INSTRUCTION
      })

      await interaction.editReply(response)
    } catch (error) {
      if (error instanceof DiscordAPIError && error.code === 50001) {
        return await interaction.editReply("Ah! I'm not able to see the messages in this chat. You might need to add me to the chat or channel before I can chat with you.")
      }
      logger.error({ error }, 'Error in chat command')
      await interaction.editReply('Sorry, there was an error processing the chat request.')
    }
  }
})
