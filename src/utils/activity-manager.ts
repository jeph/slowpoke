import { Client, ActivityType } from 'discord.js'
import { logger } from './logger'

export const startActivityRotation = (client: Client) => {
  logger.info('Starting activity rotation...')
  const rotateActivity = () => {
    const activity = getRandomActivity()
    logger.info({ activity }, 'Setting activity data')
    client.user?.setActivity(activity.name, { type: activity.type })
  }

  rotateActivity()
  setInterval(rotateActivity, 60 * 60 * 1000)
  logger.info('Activity rotation started!')
}

interface ActivityData {
  type: ActivityType;
  name: string;
}

const ACTIVITIES: ActivityData[] = [
  { type: ActivityType.Playing, name: 'Pokémon' },
  { type: ActivityType.Playing, name: 'Gooning Aim Trainer' },
  { type: ActivityType.Playing, name: 'Battletoads' },
  { type: ActivityType.Playing, name: 'Counter-Strike 2' },
  { type: ActivityType.Playing, name: 'Hello Kitty Island Adventure' },
  { type: ActivityType.Playing, name: 'Badminton' },
  { type: ActivityType.Watching, name: 'JasonTheWeen' },
  { type: ActivityType.Watching, name: 'xQc' },
  { type: ActivityType.Watching, name: 'Pokimane' },
  { type: ActivityType.Watching, name: 'Dantes' },
  { type: ActivityType.Listening, name: 'ZWE1HVNDXR' },
  { type: ActivityType.Listening, name: 'Illenium' },
  { type: ActivityType.Listening, name: 'The Chainsmokers' },
  { type: ActivityType.Listening, name: 'KSI' },
  { type: ActivityType.Custom, name: 'Going to Plan B' },
  { type: ActivityType.Custom, name: 'Clubbing at Mission' },
  { type: ActivityType.Custom, name: 'Waiting in line at Den Social' },
]

const getRandomActivity = (): ActivityData => {
  const randomIndex = Math.floor(Math.random() * ACTIVITIES.length)
  return ACTIVITIES[randomIndex]
}
