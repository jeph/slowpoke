import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js'
import { logger } from '../utils/logger'
import { SlashCommand } from '../models/commands'

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

const COLORS = [
  0xF5C2E7, // (245, 194, 231)
  0xCBA6F7, // (203, 166, 247)
  0xF38BA8, // (243, 139, 168)
  0xEBA0AC, // (235, 160, 172)
  0xFAB387, // (250, 179, 135)
  0xF9E2AF, // (249, 226, 175)
  0xA6E3A1, // (166, 227, 161)
  0x94E2D5, // (148, 226, 213)
  0x89DCEB, // (137, 220, 235)
  0x74C7EC, // (116, 199, 236)
  0x89B4FA, // (137, 180, 250)
  0xB4BEFE, // (180, 190, 254)
]

function getRandomChoice<T> (array: T[]): T {
  const randomIndex = Math.floor(Math.random() * array.length)
  return array[randomIndex]
}

export const createEightBallCommand = (): SlashCommand => ({
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

    const question = interaction.options.get('question')?.value as string | undefined
    const eightBallResponse = getRandomChoice(EIGHT_BALL_RESPONSES)
    const color = getRandomChoice(COLORS)

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
