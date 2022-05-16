const { SlashCommandBuilder } = require('@discordjs/builders');
const {
    sendStructuredResponseToUserViaSlashCommand,
    buildTableFromJson,
    getHelpJson
} = require('../../reusables/functions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Get help for using Mythic Rating Helper'),
    async execute(interaction) {
        await interaction.reply('Working on it...');

        const tableString = buildTableFromJson(getHelpJson());
        const exampleString = buildTableFromJson({
            title: '',
            heading: 'Examples',
            rows: [
                ['/mr-helper eu/argent-dawn/ellorett'],
                ['/mr-helper eu/argent-dawn/ellorett --best-runs'],
                ['/mr-helper eu/argent-dawn/ellorett --simulate 15'],
            ]
        });
        const output = `\n${tableString}\n\n ${exampleString}`;

        return sendStructuredResponseToUserViaSlashCommand(interaction, output);
    }
}