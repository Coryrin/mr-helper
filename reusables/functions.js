const ascii = require('ascii-table');
const { MessageEmbed } = require('discord.js');
require('dotenv').config();

const BASE_SCORE_PER_LEVEL = 7.5;
const BASE_SCORE_FOR_COMPLETION = 37.5 + 82.5;

// Temp unused - might be better to move to this down the line?
const scoresPerLevel = new Map([
    [2, 40],
    [3, 45],
    [4, 55],
    [5, 60],
    [6, 65],
    [7, 75],
    [8, 80],
    [9, 85],
    [10, 100],
    [11, 107],
    [12, 114],
    [13, 121],
    [14, 128],
    [15, 135],
    [16, 142],
    [17, 149],
    [18, 156],
    [19, 163],
    [20, 170],
]);

const getNumAffixesForLevel = (keystoneLevel) => {
    const keystoneLevelInt = parseInt(keystoneLevel);

    const affixes = [
        {
            name: 'tyrannical',
        },
        {
            name: 'bolstering',
        },
        {
            name: 'raging',
        }
    ];

    if (keystoneLevelInt >= 10) {
        return affixes;
    }

    if (keystoneLevelInt >= 5) {
        affixes.splice(2, 1);
        return affixes;
    }

    if (keystoneLevelInt >= 2) {
        affixes.splice(1, 3);
        return affixes;
    }
};

const getBaseScoreForKeystoneLevel = (keystoneLevel) => {
    return BASE_SCORE_PER_LEVEL * keystoneLevel;
};

const getBaseScoreForAffixes = (affixes) => {
    let baseScore = 0;

    for (const affix of affixes) {
        // if (affix.name === 'tyrannical' || affix.name === 'fortified') {
        //     baseScore += BASE_SCORE_PER_LEVEL;
        //     continue;
        // }
        
        baseScore += BASE_SCORE_PER_LEVEL * 2;
    }

    return baseScore;
};

const buildTableFromJson = (jsonData) => {
    const table = new ascii();

    return table.fromJSON(jsonData).toString();
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

const sendStructuredResponseToUserViaSlashCommand = async (interaction, response, shouldEdit=true) => {
    if (process.env.DEBUG) {
        response += '\n DEBUG';
    }

    try {
        if (shouldEdit) {
            await interaction.editReply('```' + response + '```');
        } else {
            await interaction.followUp('```' + response + '```');
        }
    } catch (err) {
        console.log(err);
    }
};

const getHelpJson = () => {
    return {
        title: '',
        heading: ['Argument', 'Description', 'Required'],
        rows: [
            ['--best-runs', 'The player\'s best runs', '❌'],
            ['--simulate', 'Simulate a player\'s rating for running every dungeon on an input keystone level', '❌'],
        ]
    };
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
        messageChannel.reply({
            embeds: [embedMessage]
        });
    } catch (err) {
        console.log('Error sending embedded message: ', err);
    }
};

const getDungeonScore = (keystoneLevel, keystoneAffixes, addAdditionalScore=true) => {
    const additionalScore = addAdditionalScore ? ((keystoneLevel - 10) * 2) + (keystoneLevel - 10) : 0;

    const baseScoreForLevel = getBaseScoreForKeystoneLevel(keystoneLevel);
    const baseScoreForAffixes = getBaseScoreForAffixes(keystoneAffixes);

    console.log('level', baseScoreForLevel);
    console.log('affix', baseScoreForAffixes);

    return BASE_SCORE_FOR_COMPLETION + getBaseScoreForKeystoneLevel(keystoneLevel) + getBaseScoreForAffixes(keystoneAffixes) + (additionalScore > 0 ? additionalScore : 0);
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
    let formattedMessage = message.content.substring(1);

    try {
        const channelPrefixes = message.channel.topic;
        let allPrefixes = [];

        if (channelPrefixes !== null && channelPrefixes !== '') {
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

const lookupDungeonFromShortname = (shortName) => {
    const dungeons = {
        'BH': 'Brackenhide Hollow',
        'AA': 'Algeth\'ar Academy',
        'HOI': 'Halls of Infusion',
        'RLP': 'Ruby Life Pools',
        'NELT': 'Neltharus',
        'NO': 'The Nokhud Offensive',
        'AV': 'The Azure Vault',
        'ULD': 'Uldaman: Legacy of Tyr',
    };

    return dungeons[shortName] || 'Dungeon not found';
};

const arrayDiff = (firstArray, ...arrays) => {
    const allArrays = [].concat.apply([], arrays);

    return firstArray.filter(item => !allArrays.includes(item));
};

module.exports = {
    lookupDungeonFromShortname,
    buildTableFromJson,
    sendStructuredResponseToUser,
    sendEmbeddedMessage,
    getDungeonScore,
    sortDungeonsBy,
    prepareMessage,
    getKeystoneLevelToRun,
    getNumAffixesForLevel,
    arrayDiff,
    sendStructuredResponseToUserViaSlashCommand,
    getHelpJson
};
