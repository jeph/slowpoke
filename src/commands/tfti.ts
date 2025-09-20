import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js'
import { logger } from '../utils/logger'
import { SlashCommand } from '../models/commands'
import { ColorProvider } from '../utils/color-provider'

export const createTftiCommand = (colorProvider: ColorProvider): SlashCommand => ({
  command: new SlashCommandBuilder()
    .setName('tfti')
    .setDescription('Thanks for the invite, asshole'),

  async execute (interaction: ChatInputCommandInteraction) {
    try {
      const messages = await interaction.channel?.messages.fetch({ limit: 10 })
      const embed = new EmbedBuilder()
        .setURL('https://youtube.com/shorts/pFmq2xu8Hvw?si=ysapcGMaM6YqEcOI')
        .setColor(colorProvider.getRandomColor())

      if (!messages) {
        embed
          .setTitle('😤 Tfti')
          .setDescription('Thanks for the invite, asshole')
        await interaction.reply({ embeds: [embed] })
        return
      }

      const tftiMultiplier = [...messages.values()].map(message => {
        const isBotMessage = message.author.id === interaction.client.user?.id
        const isTfti = message.embeds.some(embed =>
          embed.title?.startsWith('😤 Tfti')
        )
        return isBotMessage && isTfti
      }).findIndex(bool => bool === false)

      switch (tftiMultiplier) {
        case 0:
          embed
            .setTitle('😤 Tfti')
            .setDescription('Thanks for the invite, asshole')
          break
        case 1:
          embed
            .setTitle('😤 Tfti x2')
            .setDescription('Thanks for the invite, asshole\nOh wait, that was just said')
          break
        case 2:
          embed
            .setTitle('😤 Tfti x3')
            .setDescription('Thanks for the invite, asshole\nFeels like I\'m on repeat here')
          break
        case 3:
          embed
            .setTitle('😤 Tfti x4')
            .setDescription('Thanks for the invite, asshole\nGuess we\'ll just keep saying it')
          break
        case 4:
          embed
            .setTitle('😤 Tfti x5')
            .setDescription('Thanks for the invite, asshole\nI could stop, but why bother?')
          break
        case 5:
          embed
            .setTitle('😤 Tfti x6')
            .setDescription('Thanks for the invite, asshole\nJust keep pretending I don\'t exist, as usual')
          break
        case 6:
          embed
            .setTitle('😤 Tfti x7')
            .setDescription('Thanks for the invite, asshole\nStill feels worth repeating')
          break
        case 7:
          embed
            .setTitle('😤 Tfti x8')
            .setDescription('Thanks for the invite, asshole\nI guess this is just what I do now')
          break
        case 8:
          embed
            .setTitle('😤 Tfti x9')
            .setDescription('Thanks for the invite, asshole\nForever and always, from the bottom of my heart')
          break
        default:
          embed
            .setTitle('😤 Tfti ♾️')
            .setDescription('Thanks for the invite, asshole\nTo infinity and beyond')
          break
      }

      await interaction.reply({ embeds: [embed] })
    } catch (error) {
      logger.error({ error }, 'Error in tfti command. Returning default tfti message.')
      const embed = new EmbedBuilder()
        .setURL('https://youtube.com/shorts/pFmq2xu8Hvw?si=ysapcGMaM6YqEcOI')
        .setTitle('😤 Tfti')
        .setDescription('Thanks for the invite, asshole')
        .setColor(colorProvider.getRandomColor())
      await interaction.reply({ embeds: [embed] })
    }
  }
})
