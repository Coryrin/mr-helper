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

    try {
        await interaction.reply('```' + response + '```');
    } catch (err) {
        console.log(err);
    }
};

const sendEmbeddedMessage = (messageChannel, messageObj) => {
    const embedMessage = new MessageEmbed()
        .setColor('#0099ff')
        .setTitle(messageObj.title)
        .setAuthor(messageObj.author.name, messageObj.author.img, messageObj.author.link)
        .setDescription(messageObj.description)
        .addFields(messageObj.fields)
        .setTimestamp();

    try {
        messageChannel.send({
            embeds: [embedMessage]
        });
    } catch (err) {
        console.log('Error sending embedded message: ', err);
    }
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

const prepareMessage = (message) => {
    let formattedMessage = message.content;

    try {
        const channelPrefixes = message.channel.topic;
        let allPrefixes = [];

        if (channelPrefixes !== undefined && channelPrefixes !== '') {
            allPrefixes = channelPrefixes.split(' ');
        }

        if (!formattedMessage.includes('--realm')) {
            const realmIndex = allPrefixes.indexOf('--realm');
            if (realmIndex > -1) {
                formattedMessage = `${formattedMessage} --realm ${allPrefixes[realmIndex + 1]}`;
            }
        }

        if (!formattedMessage.includes('--region')) {
            const regionIndex = allPrefixes.indexOf('--region');
            if (regionIndex > -1) {
                formattedMessage = `${formattedMessage} --region ${allPrefixes[regionIndex + 1]}`;
            }
        }
    } catch (err) {
        console.error(err);
        console.error('ERROR: ', formattedMessage, message);
    }

    return formattedMessage;
};

/**
 * Calculate the keystone level to run for the current dungeon iteration.
 * If our highest run was timed, we should aim to increase our dungeons to that + num the key was upgraded by.
 * If our highest run wasn't timed, but our current iteration is either equal to, or 1 mythic level below the highest run, we should check if we timed our current run, and if so, we'll increase the current dungeon's mythic_level by the num we increased.
 * If neither of the above are true, we should set our targetted mythic level to be 1 below the highest run.
 *
 * @param {Object} highestRun
 * @param {Object} currentDungeon
 * @returns number
 */
 const getKeystoneLevelToRun = (highestRun, currentDungeon) => {
    const diffBetweenLevels = highestRun.mythic_level - currentDungeon.mythic_level;
    let targetKeystoneLevel = highestRun.mythic_level;

    if (
        (currentDungeon.mythic_level === highestRun.mythic_level
        || diffBetweenLevels <= 3)
        && highestRun.num_keystone_upgrades === 0
        && currentDungeon.num_keystone_upgrades >= 0
    ) {
        targetKeystoneLevel += currentDungeon.num_keystone_upgrades - diffBetweenLevels;
    } else if (currentDungeon.num_keystone_upgrades === 0) {
        //
    } else if (
        (highestRun.num_keystone_upgrades === 0)
        && highestRun !== currentDungeon
    ) {
        targetKeystoneLevel -= 1;
    } else {
        targetKeystoneLevel += highestRun.num_keystone_upgrades - diffBetweenLevels;
    }

    return targetKeystoneLevel;
};

module.exports = {
    buildTableFromJson: buildTableFromJson,
    sendStructuredResponseToUser: sendStructuredResponseToUser,
    sendEmbeddedMessage: sendEmbeddedMessage,
    getDungeonScore: getDungeonScore,
    sortDungeonsBy: sortDungeonsBy,
    prepareMessage: prepareMessage,
    getKeystoneLevelToRun: getKeystoneLevelToRun,
};
