const { SlashCommandBuilder } = require('@discordjs/builders');
const {
    sendEmbeddedMessage,
} = require('../../reusables/functions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('info')
        .setDescription('Get generation information about Mythic Rating Helper'),
    async execute(interaction) {
        const messageObject = {
            title: 'Mythic Rating Helper',
            description: 'Mythic Rating Helper is a bot designed to help WoW players improve their mythic rating by analyzing their runs, and informing them of their most optimal dungeons to run.',
            author: {
                name: 'Coryrin',
                link: 'https://www.corymeikle.com/',
                img: 'https://cdn.discordapp.com/attachments/647425968993992715/838076418570452992/20210501_163408.jpg',
            },
            fields: [
                {
                    name: 'GitHub',
                    value: '[Code](https://github.com/Coryrin/mr-helper)',
                    inline: true,
                },
                {
                    name: 'Twitter',
                    value: '[Follow me on Twitter](https://twitter.com/MRatingHelper)',
                    inline: true,
                },
                {
                    name: 'Website',
                    value: '[Check out our website!](https://www.mr-helper.xyz/)',
                    inline: true,
                },
                {
                    name: 'Discord',
                    value: '[Join the development discord!](https://discord.gg/ucgP4dvmtQ)',
                },
                {
                    name: 'Support',
                    value: '[Please consider supporting us](https://ko-fi.com/mythicratinghelper)',
                }
            ]
        };

        return sendEmbeddedMessage(interaction.channel, messageObject);
    }
}