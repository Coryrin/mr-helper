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

const prefix = '!';
client.on('message', async message => {
    if (process.env.DEBUG && message.guild.id !== process.env.TESTING_GUILD_ID) {
        return;
    }

    const args = message.content.trim().split(/ + /g);
    const cmd = args[0].slice(prefix.length);
    const cmdParts = cmd.split(' ');
    const cmdName = cmdParts[0];
    const command = client.commands.get(cmdName);

    console.log(args);

    if (!command) {
        return;
    }

    command.execute(message, message);
});

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
        // console.error(err);
        await interaction.reply({content: 'There was an error whilst executing the command.'});
    }
});

client.login(process.env.TOKEN);