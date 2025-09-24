import { Message } from 'discord.js'

export interface ChimeIn {
  name: string;
  execute: (message: Message) => Promise<boolean>
}
