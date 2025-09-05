import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js'
import { logger } from '../utils/logger'
import { SlashCommand } from '../models/commands'
import { ColorProvider } from '../utils/color-provider'

const EIGHT_BALL_RESPONSES = [
  'It is certain',
  'Outlook good',
  'Most likely',
  'Signs point to yes',
  'Yes',
  'It is decidedly so',
  'As I see it, yes',
  'You may rely on it',
  'Yes definitely',
  'Without a doubt',
  'The odds are in your favor',
  'All signs say yes',
  'Absolutely!',
  'Without hesitation, yes',
  'The universe says yes',
  'You can bet on it',
  'Yes, without question',
  'The answer is a resounding yes',
  "It's a green light",
  "Yes, and it's looking great",
  "Don't count on it",
  'My reply is no',
  'My sources say no',
  'Outlook not so good',
  'Very doubtful',
  'Not a chance',
  'Outlook is grim',
  'Absolutely not',
  'The stars say no',
  'The answer is no',
  "I wouldn't count on it",
  'Highly unlikely',
  'The universe says no',
  'No way',
  'The answer is a firm no',
  'Negative vibes only',
  "The signs aren't good",
  "It's a red light",
  "No, and don't ask again",
  'Signs point to no',
]

export const createEightBallCommand = (colorProvider: ColorProvider): SlashCommand => ({
  command: new SlashCommandBuilder()
    .setName('8ball')
    .setDescription('Ask the 8 ball a question')
    .addStringOption(option =>
      option
        .setName('question')
        .setDescription('Question for the 8 ball')
        .setRequired(false)
    ),

  async execute (interaction: ChatInputCommandInteraction) {
    logger.info('Start processing 8 ball command')

    const question = interaction.options.getString('question')
    const eightBallResponse = EIGHT_BALL_RESPONSES[Math.floor(Math.random() * EIGHT_BALL_RESPONSES.length)]
    const color = colorProvider.getRandomColor()

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle('8 Ball Has Spoken')

    if (!question) {
      logger.info('Received no question. Returning without a question in the embed.')
      embed.setDescription(`🎱 ${eightBallResponse}`)
      await interaction.reply({ embeds: [embed] })
      return
    }

    if (question.length > 254) {
      logger.info('Received question that is too long. Returning too long error message.')
      embed.setDescription('🎱 Your question is too long! Try a shorter question.')
      await interaction.reply({ embeds: [embed] })
      return
    }

    logger.info(`Received question: ${question}`)
    logger.info('Returning response...')
    embed.addFields({
      name: `❓ ${question}`,
      value: `🎱 ${eightBallResponse}`,
      inline: false
    })
    await interaction.reply({ embeds: [embed] })
  }
})
