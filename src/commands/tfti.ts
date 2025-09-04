import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js'
import { logger } from '../utils/logger'
import { SlashCommand } from '../models/commands'

export const createTftiCommand = (): SlashCommand => ({
  command: new SlashCommandBuilder()
    .setName('tfti')
    .setDescription('Thanks for the invite, asshole'),

  async execute (interaction: ChatInputCommandInteraction) {
    try {
      const messages = await interaction.channel?.messages.fetch({ limit: 10 })
      const embed = new EmbedBuilder()
        .setURL('https://youtube.com/shorts/pFmq2xu8Hvw?si=ysapcGMaM6YqEcOI')

      if (!messages) {
        embed
          .setTitle('😤 Tfti')
          .setDescription('Thanks for the invite, asshole')
          .setColor(0xF38BA8) // RGB(243, 139, 168)
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
            .setColor(0xF38BA8) // RGB(243, 139, 168)
          break
        case 1:
          embed
            .setTitle('😤 Tfti x2')
            .setDescription('Thanks for the invite, asshole\nOh wait, that was just said')
            .setColor(0xFAB387) // RGB(250, 179, 135)
          break
        case 2:
          embed
            .setTitle('😤 Tfti x3')
            .setDescription('Thanks for the invite, asshole\nFeels like I\'m on repeat here')
            .setColor(0xA6E3A1) // RGB(166, 227, 161)
          break
        case 3:
          embed
            .setTitle('😤 Tfti x4')
            .setDescription('Thanks for the invite, asshole\nGuess we\'ll just keep saying it')
            .setColor(0x89DCEB) // RGB(137, 220, 235)
          break
        case 4:
          embed
            .setTitle('😤 Tfti x5')
            .setDescription('Thanks for the invite, asshole\nI could stop, but why bother?')
            .setColor(0xB4BEFE) // RGB(180, 190, 254)
          break
        case 5:
          embed
            .setTitle('😤 Tfti x6')
            .setDescription('Thanks for the invite, asshole\nJust keep pretending I don\'t exist, as usual')
            .setColor(0xCBA6F7) // RGB(203, 166, 247)
          break
        case 6:
          embed
            .setTitle('😤 Tfti x7')
            .setDescription('Thanks for the invite, asshole\nStill feels worth repeating')
            .setColor(0xF5C2E7) // RGB(245, 194, 231)
          break
        case 7:
          embed
            .setTitle('😤 Tfti x8')
            .setDescription('Thanks for the invite, asshole\nI guess this is just what I do now')
            .setColor(0x94E2D5) // RGB(148, 226, 213)
          break
        case 8:
          embed
            .setTitle('😤 Tfti x9')
            .setDescription('Thanks for the invite, asshole\nForever and always, from the bottom of my heart')
            .setColor(0xF5E0DC) // RGB(245, 224, 220)
          break
        default:
          embed
            .setTitle('😤 Tfti ♾️')
            .setDescription('Thanks for the invite, asshole\nTo infinity and beyond')
            .setColor(0x74C7EC) // RGB(116, 199, 236)
          break
      }

      await interaction.reply({ embeds: [embed] })
    } catch (error) {
      logger.error({ error }, 'Error in tfti command. Returning default tfti message.')
      const embed = new EmbedBuilder()
        .setURL('https://youtube.com/shorts/pFmq2xu8Hvw?si=ysapcGMaM6YqEcOI')
        .setTitle('😤 Tfti')
        .setDescription('Thanks for the invite, asshole')
        .setColor(0xF38BA8) // RGB(243, 139, 168)
      await interaction.reply({ embeds: [embed] })
    }
  }
})
