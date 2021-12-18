const ascii = require('ascii-table');
const { MessageEmbed } = require('discord.js');
require('dotenv').config();

const BASE_SCORE_PER_LEVEL = 7.5;
const SEASONAL_AFFIX = 'tormented';
const BASE_SCORE_FOR_COMPLETION = 37.5;

const getBaseScoreForKeystoneLevel = (keystoneLevel) => {
    return BASE_SCORE_PER_LEVEL * keystoneLevel;
};

const getBaseScoreForAffixes = (affixes) => {
    let baseScore = 0;

    for (const affix of affixes) {
        if (affix.name.toLowerCase() === SEASONAL_AFFIX) {
            baseScore += BASE_SCORE_PER_LEVEL * 2;
        } else {
            baseScore += BASE_SCORE_PER_LEVEL;
        }
    }

    return baseScore;
};

const buildTableFromJson = (jsonData) => {
    const table = new ascii();

    return table.fromJSON(jsonData);
};

const sendStructuredResponseToUser = async (interaction, response) => {
    if (process.env.DEBUG) {
        response += '\n DEBUG';
    }

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

const getDungeonScore = (keystoneLevel, keystoneAffixes) => {
    return BASE_SCORE_FOR_COMPLETION + getBaseScoreForKeystoneLevel(keystoneLevel) + getBaseScoreForAffixes(keystoneAffixes);
};

const sortDungeonsBy = (dungeons, sortBy) => {
    return dungeons.sort((a, b) => {
        if (a[sortBy] < b[sortBy]) {
            return 1;
        }

        return -1;
    });
};

module.exports = {
    buildTableFromJson: buildTableFromJson,
    sendStructuredResponseToUser: sendStructuredResponseToUser,
    sendEmbeddedMessage: sendEmbeddedMessage,
    getDungeonScore: getDungeonScore,
    sortDungeonsBy: sortDungeonsBy,
};
