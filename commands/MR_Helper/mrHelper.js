const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mr-helper')
        .setDescription('Get dungeons to run to improve overall mythic rating'),
    async execute(interaction) {

        await interaction.reply('test 1234');
    },
}