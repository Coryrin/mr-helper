const ascii = require('ascii-table');
const { MessageEmbed } = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');

require('dotenv').config();

const BASE_SCORE_PER_LEVEL = 7;
const BASE_SCORE_PER_AFFIX = 10;
const BASE_SCORE_FOR_COMPLETION = 70;

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
            ['--simulate', 'Simulate a player\'s rating for running every dungeon on an input keystone level', '❌'],
        ]
    };
};

const sendEmbeddedMessage = (messageChannel, messageObj) => {
    const embedMessage = new MessageEmbed()
        .setColor(messageObj.color)
        .setTitle(messageObj.title)
        .setAuthor(messageObj.author.name, messageObj.author.img, messageObj.author.link)
        .setDescription(messageObj.description)
        .addFields(messageObj.fields)
        .setFooter(messageObj.footer ?? '')
        .setTimestamp();

    try {
        messageChannel.reply({
            content: '\u200b',
            embeds: [embedMessage]
        });
    } catch (err) {
        console.log('Error sending embedded message: ', err);
    }
};

const getDungeonScore = (keystoneLevel, keystoneAffixes, addAdditionalScore=true) => {
    const numberOfAffixes = getNumberOfAffixesForKeyLevel(keystoneLevel);

    return BASE_SCORE_FOR_COMPLETION + (BASE_SCORE_PER_LEVEL * keystoneLevel) + (BASE_SCORE_PER_AFFIX * numberOfAffixes);
};

const getNumberOfAffixesForKeyLevel = (keyLevel) => {
    if (keyLevel >= 2 && keyLevel <= 4) {
        return 1;
    }

    if (keyLevel >= 5 && keyLevel <= 9) {
        return 2;
    }

    return 3;
}

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


async function generateMythicImage(data) {
    const width = 900;
    const height = 600;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    const bg = await loadImage('public/bg.png');
    ctx.drawImage(bg, 0, 0, width, height);

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#a78bfa';
    ctx.font = 'bold 42px Sans';
    ctx.fillText('Mythic Rating Helper', 40, 60);

    ctx.font = '24px Sans';
    ctx.fillStyle = '#e5e7eb';

    ctx.fillText(`Current Score: ${Math.ceil(data.score)}`, 40, 110);
    ctx.fillText(`Minimum Total Score Increase: +${data.totalScoreIncrease}`, 40, 145);
    ctx.fillText(`Score after all runs: ${Math.ceil(data.score) + data.totalScoreIncrease}`, 40, 180);

    ctx.strokeStyle = '#374151';
    ctx.beginPath();
    ctx.moveTo(40, 200);
    ctx.lineTo(width - 40, 200);
    ctx.stroke();

    let y = 230;

    ctx.font = '20px Sans';

    ctx.fillStyle = '#86efac';
    ctx.fillText('Dungeon Name', 40, y);
    ctx.fillText('Current Level', 360, y);
    ctx.fillText('Target Level', 520, y);
    ctx.fillText('Score Increase', 680, y);

    y = 270;

    for (const dungeon of data.dungeons) {
        ctx.fillText(dungeon.dungeon, 40, y);

        ctx.fillText(dungeon.mythic_level, 360, y);
        ctx.fillText(dungeon.target_level, 520, y);
        ctx.fillText(`+${Math.ceil(dungeon.potentialMinimumScore)} points`, 680, y);

        // ctx.fillText(
        //     `${dungeon.mythic_level} → ${dungeon.target_level} (+${Math.ceil(dungeon.potentialMinimumScore)})`,
        //     520,
        //     y
        // );

        y += 36;
    }

    ctx.strokeStyle = '#374151';
    ctx.beginPath();
    ctx.moveTo(40, y);
    ctx.lineTo(width - 40, y);
    ctx.stroke();

    ctx.font = '16px Sans';
    ctx.fillStyle = '#e5e7eb';
    if (data.message) {
        ctx.fillText(data.message, 40, y + 20);
    }

    return canvas.toBuffer('image/png');
}


const lookupDungeonFromShortname = (shortName) => {
    const dungeons = {
        'AA': 'Algethar Academy',
        'ULD': 'Uldaman: Legacy of Tyr',
        'HOI': 'Halls of Infusion',
        'BH': 'Brackenhide Hollow',
        'NELT': 'Neltharus',
        'RLP': 'Ruby Life Pools',
        'AV': 'The Azure Vault',
        'NO': 'The Nokhud Offensive',
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
    getHelpJson,
    generateMythicImage
};
