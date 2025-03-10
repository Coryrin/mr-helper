const { Client, Collection, Intents } = require('discord.js');
const { loadCommands } = require('./handler/loadCommands');
require('dotenv').config();

const client = new Client({ 
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
    ] 
});

client.once('ready', () => {
	console.log('Ready!');
});

client.commands = new Collection();

loadCommands(client);

client.on('interactionCreate', async interaction => {
	if (!interaction.isCommand()) {
        return;
    }

	const command = client.commands.get(interaction.commandName);
    
    if (!command) {
        return;
    }

    try {
        const options = [];

        for (const option of interaction.options._hoistedOptions) {
            options.push(option.value);
        }

        let message = options.join(' ');

        await command.execute(interaction, message, true);
    } catch (err) {
        console.error(err);
        await interaction.reply({content: 'There was an error whilst executing the command.'});
    }
});

client.login(process.env.TOKEN);
