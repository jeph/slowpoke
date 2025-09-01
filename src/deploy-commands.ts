import dotenv from 'dotenv';

dotenv.config();

import { REST, Routes } from 'discord.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;
const token = process.env.DISCORD_TOKEN;

// and deploy your commands!
(async () => {
	try {
		const commands = [];
		// Grab all the command files from the commands directory
		const commandsPath = path.join(__dirname, 'commands');
		const commandFiles = fs.readdirSync(commandsPath).filter((file: string) => file.endsWith('.ts') && file !== 'index.ts');

		// Load each command
		for (const file of commandFiles) {
			const filePath = path.join(commandsPath, file);
			const module = await import(filePath);
			
			// Look for the factory function export (e.g., createPingCommand)
			const factoryName = Object.keys(module).find(key => key.startsWith('create') && key.endsWith('Command'));
			
			if (factoryName && typeof module[factoryName] === 'function') {
				const commandObj = module[factoryName]();
				if (commandObj.command && commandObj.execute) {
					commands.push(commandObj.command.toJSON());
				} else {
					console.log(`[WARNING] The command at ${filePath} is missing a required "command" or "execute" property.`);
				}
			} else {
				console.log(`[WARNING] The command at ${filePath} doesn't export a factory function.`);
			}
		}

		// Construct and prepare an instance of the REST module
		if (!token) {
			throw new Error('DISCORD_TOKEN is not defined in the environment variables.');
		}
		if (!clientId || !guildId) {
			throw new Error('CLIENT_ID or GUILD_ID is not defined in the environment variables.');
		}
		const rest = new REST().setToken(token);

		console.log(`Started refreshing ${commands.length} application (/) commands.`);

		// The put method is used to fully refresh all commands in the guild with the current set
		const data = await rest.put(
			Routes.applicationGuildCommands(clientId, guildId),
			{ body: commands },
		) as { length: number };

		console.log(`Successfully reloaded ${data.length} application (/) commands.`);
	} catch (error) {
		// And of course, make sure you catch and log any errors!
		console.error(error);
	}
})();