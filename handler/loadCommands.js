const fs = require('fs');
const ascii = require('ascii-table');

function loadCommands(client) {
    const table = new ascii().setHeading('Commands', 'Load Status');

    const commandFolders = fs.readdirSync('./commands');
    for (const folder of commandFolders) {

        const commandFiles = fs
            .readdirSync(`./commands/${folder}`)
            .filter((file) => file.endsWith('.js'));

        for (const file of commandFiles) {
            const command = require(`../commands/${folder}/${file}`);
            
            if (command.data.name) {
                client.commands.set(command.data.name, command);
                table.addRow(file, '✔️');
            } else {
                table.addRow(
                    file,
                    '❌ => Command has no name'
                );

                continue;
            }
        }
        console.log(table.toString());
    }
}

module.exports = {
    loadCommands,
};