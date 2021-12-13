const { Client, Collection, Intents } = require('discord.js');
const { token } = require('./config.json');
const { loadCommands } = require('./handler/loadCommands');

const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

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
        await command.execute(interaction);
    } catch (err) {
        console.error(err);
        await interaction.reply({content: 'There was an error whilst executing the command.'});
    }
});

client.login(token);