const ascii = require('ascii-table');
const { MessageEmbed } = require('discord.js');

const BASE_SCORE_PER_LEVEL = 7.5;

const getBaseScoreForKeystoneLevel = (keystoneLevel) => {

    return BASE_SCORE_PER_LEVEL * keystoneLevel;
};

const getBaseScoreForAffix = (affix) => {
    const seasonalAffix = 'tormented';

    if (affix === seasonalAffix) {
        return BASE_SCORE_PER_LEVEL * 2;
    }

    return BASE_SCORE_PER_LEVEL;
};

const buildTableFromJson = (jsonData) => {
    const table = new ascii();

    return table.fromJSON(jsonData);
};

const sendStructuredResponseToUser = async (interaction, response) => {
    await interaction.reply('```' + response + '```');
};

const sendEmbeddedMessage = (discordMessage, messageObj) => {
    const embedMessage = new MessageEmbed()
        .setColor('#0099ff')
        .setTitle(messageObj.title)
        .setAuthor(messageObj.author.name, messageObj.author.img, messageObj.author.link)
        .setDescription(messageObj.description)
        .addFields(messageObj.fields)
        .setTimestamp();

    discordMessage.channel.send({
        embeds: [embedMessage]
    });
};

module.exports = {
    getBaseScoreForAffix: getBaseScoreForAffix,
    getBaseScoreForKeystoneLevel: getBaseScoreForKeystoneLevel,
    buildTableFromJson: buildTableFromJson,
    sendStructuredResponseToUser: sendStructuredResponseToUser,
    sendEmbeddedMessage: sendEmbeddedMessage,
};
