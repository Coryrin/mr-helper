const { SlashCommandBuilder } = require('@discordjs/builders');
const { default: axios } = require('axios');
const {
    getDungeonScore,
    buildTableFromJson,
    sendStructuredResponseToUser,
    sendEmbeddedMessage,
    sortDungeonsBy,
} = require('../../reusables/functions');

async function getDungeonData(args) {
    const res = await requestData(args);

    if (args.getAltRuns) {
        return await getDataForAlternateRuns(res.data);
    } else if (args.getBestRuns) {
        return await getDataForBestRuns(res.data);
    }
}

function buildArgsDataObject(cmdParts, argsDataObj, message) {
    let isSimplifiedCommand = false;
    for (const part of cmdParts) {
        if (part.includes('/')) {
            const regionRealmName = part.split('/');

            if (regionRealmName.length < 3) {
                message.channel.send('Please supply a character in the format of region/realm/name.');

                argsDataObj.error = true;

                return argsDataObj;
            }

            argsDataObj.region = regionRealmName[0];
            argsDataObj.realm = regionRealmName[1];
            argsDataObj.name = regionRealmName[2];

            isSimplifiedCommand = true;
        }
    }

    if (!isSimplifiedCommand) {
        const nameIndex = cmdParts.indexOf('--name');
        if (nameIndex < 0) {
            message.channel.send('Please supply a name.');

            argsDataObj.error = true;
            return argsDataObj;
        }

        argsDataObj.name = cmdParts[nameIndex + 1];

        const realmIndex = cmdParts.indexOf('--realm');
        if (realmIndex < 0) {
            message.channel.send('Please supply a realm.');

            argsDataObj.error = true;
            return argsDataObj;
        }

        argsDataObj.realm = cmdParts[realmIndex + 1];

        const regionIndex = cmdParts.indexOf('--region');
        if (regionIndex > -1) {
            argsDataObj.region = cmdParts[regionIndex + 1];
        }
    }

    const bestRunsIndex = cmdParts.indexOf('--best-runs');
    if (bestRunsIndex > -1) {
        argsDataObj.getBestRuns = true;
        argsDataObj.getAltRuns = false;
    }

    return argsDataObj;
}

function lookupDungeonFromShortname(shortName) {
    const dungeons = {
        'SOA': 'Spires of Ascension',
        'SD': 'Sanguine Depths',
        'HOA': 'Halls of Atonement',
        'NW': 'Necrotic Wake',
        'DOS': 'De Other Side',
        'MISTS': 'Mists of Tirna Scithe',
        'TOP': 'Theater of Pain',
        'PF': 'Plaguefall',
    };

    return Object.prototype.hasOwnProperty.call(dungeons, shortName) ? dungeons[shortName] : 'Dungeon name not found!';
}

function parseMessageForArgs(message) {
    const prefix = '!';
    let dataToReturn = {
        error: false,
        name: '',
        realm: '',
        region: 'eu',
        isHelpCommand: false,
        isInfoCommand: false,
        getAltRuns: true,
        getBestRuns: false,
    };

    const args = message.trim().split(/ + /g);
    const cmd = args[0].slice(prefix.length).toLowerCase();
    const cmdParts = cmd.split(' ');

    const helpIndex = cmdParts.indexOf('--help');
    if (helpIndex > -1) {
        dataToReturn.isHelpCommand = true;

        return dataToReturn;
    }

    const infoIndex = cmdParts.indexOf('--info');
    if (infoIndex > -1) {
        dataToReturn.isInfoCommand = true;

        return dataToReturn;
    }

    dataToReturn = buildArgsDataObject(cmdParts, dataToReturn, message);
    
    return dataToReturn;
}

function buildRequestUrl(args) {
    const name = encodeURIComponent(args.name);
    return `https://raider.io/api/v1/characters/profile?region=${args.region}&realm=${args.realm}&name=${name}&fields=mythic_plus_best_runs%2Cmythic_plus_alternate_runs`;
}

function getBlankDataStructure() {
    return {
        'SD': {
            'fortified': {},
            'tyrannical': {},
        },
        'SOA': {
            'fortified': {},
            'tyrannical': {},
        },
        'MISTS': {
            'fortified': {},
            'tyrannical': {},
        },
        'PF': {
            'fortified': {},
            'tyrannical': {},
        },
        'TOP': {
            'fortified': {},
            'tyrannical': {},
        },
        'NW': {
            'fortified': {},
            'tyrannical': {},
        },
        'DOS': {
            'fortified': {},
            'tyrannical': {},
        },
        'HOA': {
            'fortified': {},
            'tyrannical': {},
        },
    };
}

function calculateScores(isFortifiedBest, dungeon, dungeonShortName) {
    const dungeonName = lookupDungeonFromShortname(dungeonShortName);
    let target;

    if (isFortifiedBest) {
        target = 'tyrannical';
    } else {
        target = 'fortified';
    }

    if (!dungeon.fortified.score && !dungeon.tyrannical.score) {
        const score = getDungeonScore(2, [{name: 'tyrannical'}]);
        return {
            potentialScore: score + (score / 2),
            dungeonLongName: dungeonName,
            affix: 'fortified',
            totalScore: 0,
            keystoneLevel: 2,
        };
    }

    let altRunScore = 0;
    const otherDungeonAffix = target === 'fortified' ? 'tyrannical' : 'fortified';
    const bestRunScore = dungeon[otherDungeonAffix].score * 1.5;

    if (dungeon[target].score) {
        altRunScore = dungeon[target].score / 2;
    }

    const maxAltRun = (bestRunScore / 3) - altRunScore;

    return {
        potentialScore: maxAltRun,
        dungeonLongName: dungeonName,
        affix: target,
        totalScore: bestRunScore + altRunScore,
        keystoneLevel: dungeon[target].mythic_level || dungeon[otherDungeonAffix].mythic_level,
    };
}

function getTyrannicalOrFortifiedForDungeon(dungeon) {
    for (const affix of dungeon.affixes) {
        if (affix.name.toLowerCase() === 'tyrannical') {
            return 'tyrannical';
        }

        if (affix.name.toLowerCase() === 'fortified') {
            return 'fortified';
        }
    }
}

async function requestData(args) {
    const url = buildRequestUrl(args);
    return await axios({
        method: 'get',
        url: url,
    });
}

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
function getKeystoneLevelToRun(highestRun, currentDungeon) {
    const diffBetweenLevels = highestRun.mythic_level - currentDungeon.mythic_level;
    let targetKeystoneLevel = highestRun.mythic_level;

    if (
        (currentDungeon.mythic_level === highestRun.mythic_level
        || highestRun.mythic_level - currentDungeon.mythic_level === 1)
        && highestRun.num_keystone_upgrades === 0
        && currentDungeon.num_keystone_upgrades > 0
    ) {
        targetKeystoneLevel += currentDungeon.num_keystone_upgrades - diffBetweenLevels;
    } else if (
        highestRun.num_keystone_upgrades === 0
        && highestRun !== currentDungeon
    ) {
        targetKeystoneLevel -= 1;
    } else {
        targetKeystoneLevel += highestRun.num_keystone_upgrades;
    }

    return targetKeystoneLevel;
}

async function getDataForBestRuns(data) {
    const sortedDungeons = sortDungeonsBy(data.mythic_plus_best_runs, 'mythic_level');
    const highestRun = sortedDungeons[0];
    let currentScore = 0;
    let potentialMinimumScore = 0;

    for (const dungeon of sortedDungeons) {
        const currentDungeonScore = dungeon.score * 1.5;
        currentScore += currentDungeonScore;

        dungeon.affix = getTyrannicalOrFortifiedForDungeon(dungeon);
        dungeon.dungeonLongName = dungeon.dungeon;

        dungeon.keystoneLevel = getKeystoneLevelToRun(highestRun, dungeon);
        const targetKeystoneDungeonScore = getDungeonScore(dungeon.keystoneLevel, highestRun.affixes);
        dungeon.potentialScore = targetKeystoneDungeonScore - currentDungeonScore;

        potentialMinimumScore += dungeon.potentialScore;
        console.log(`Running ${dungeon.dungeon} on ${dungeon.keystoneLevel}+ could get you a minimum of ${Math.ceil(dungeon.potentialScore)} rating.`);
    }

    for (const dungeon of data.mythic_plus_alternate_runs) {
        currentScore += dungeon.score / 2;
    }

    return {
        dungeons: sortedDungeons,
        totalScore: currentScore,
        potentialMinScore: potentialMinimumScore,
    };
}

async function getDataForAlternateRuns(data) {
    const allDungeons = getBlankDataStructure();

    for (const dungeon of data.mythic_plus_best_runs) {
        dungeon.isBestRun = true;
        const isFortified = dungeon.affixes[0].id === 10;
        let allDungeonsTarget = isFortified ? 'fortified' : 'tyrannical';

        allDungeons[dungeon.short_name][allDungeonsTarget] = dungeon;
    }

    for (const dungeon of data.mythic_plus_alternate_runs) {
        dungeon.isBestRun = false;
        const isFortified = dungeon.affixes[0].id === 10;
        let allDungeonsTarget = isFortified ? 'fortified' : 'tyrannical';

        allDungeons[dungeon.short_name][allDungeonsTarget] = dungeon;
    }

    let totalScore = 0;
    let pointsFromAltRuns = 0;
    const dungeons = [];

    for (const dungeonName of Object.keys(allDungeons)) {
        const dungeon = allDungeons[dungeonName];
        const isFortifiedBest = dungeon.fortified.isBestRun;
        const scores = calculateScores(isFortifiedBest, dungeon, dungeonName);

        totalScore += scores.totalScore;
        pointsFromAltRuns += Math.ceil(scores.potentialScore);
        dungeons.push(scores);
    }

    console.log('---------------------------------------------------------------------------------------------');
    console.log(`Current score for ${data.name}: ${totalScore}`);
    console.log(`The minimum points you can earn from improving your alt runs are: ${pointsFromAltRuns}`);
    console.log('---------------------------------------------------------------------------------------------');

    return {
        dungeons: dungeons,
        totalScore: totalScore,
        potentialMinScore: pointsFromAltRuns
    };
}

function dataToAsciiTable(dungeons, currentScore, potentialMinScore) {
    const dungeonData = {
        title: '',
        heading: ['Dungeon', 'Affix', 'More info'],
        rows: []
    };

    const sortedDungeons = sortDungeonsBy(dungeons, 'potentialScore');

    for (const dungeon of sortedDungeons) {
        const affix = dungeon.affix.charAt(0).toUpperCase() + dungeon.affix.slice(1);

        dungeonData.rows.push([
            `${dungeon.dungeonLongName} ${dungeon.keystoneLevel}+`,
            affix,
            `You can earn a minimum of ${Math.ceil(dungeon.potentialScore)} points by running this dungeon.`
        ]); 
    }

    dungeonData.rows.push([]);
    dungeonData.rows.push([`Current score: ${Math.ceil(currentScore)}`]);
    dungeonData.rows.push([`Potential minimum score: ${Math.ceil(potentialMinScore)}`]);

    return buildTableFromJson(dungeonData);
}

function getHelpJson() {
    return {
        title: '',
        heading: ['Argument', 'Description', 'Required'],
        rows: [
            ['--name', 'The player\'s name. Not required if you pass the player\'s name through in region/realm/character format.', '✔️'],
            ['--realm', 'The player\'s realm. Not required if you pass the player\'s realm through in region/realm/character format.', '✔️'],
            ['--best-runs', 'The player\'s best runs', '❌'],
            ['--region', 'The player\'s region. Defaults to eu', '❌'],
        ]
    };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mr-helper')
        .setDescription('Get dungeons to run to improve overall mythic rating'),
    async execute(interaction, message) {
        const args = parseMessageForArgs(message);

        if (args.isHelpCommand) {
            const tableString = buildTableFromJson(getHelpJson());
            const exampleString = buildTableFromJson({
                title: '',
                heading: 'Examples',
                rows: [
                    ['!mr-helper --name ellorett --realm argent-dawn'],
                    ['!mr-helper --name ellorett --realm argent-dawn --best-runs'],
                    ['!mr-helper eu/argent-dawn/ellorett'],
                    ['!mr-helper eu/argent-dawn/ellorett --best-runs'],
                ]
            });
            const output = `\n${tableString}\n\n ${exampleString}`;

            return sendStructuredResponseToUser(interaction, output);
        }

        if (args.isInfoCommand) {
            const messageObject = {
                title: 'Mythic Rating Helper',
                description: 'Mythic Rating Helper is a bot designed to help WoW players improve their mythic rating by informing them of their most optimal dungeons to run.',
                author: {
                    name: 'Coryrin',
                    link: 'https://www.corymeikle.com/',
                    img: '',
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
                ]
            };

            return sendEmbeddedMessage(message, messageObject);
        }

        if (args.error) {
            return;
        }

        try {
            const allData = await getDungeonData(args);
        
            const dataToSend = dataToAsciiTable(allData.dungeons, allData.totalScore, allData.potentialMinScore);
            
            return sendStructuredResponseToUser(interaction, dataToSend);
        } catch (err) {
            let errorMessageToSend = 'There was an error getting data from the server. Please try again.';
            if (err.response.data) {
                errorMessageToSend = `Error: ${err.response.data.message}`;
            }

            return sendStructuredResponseToUser(interaction, errorMessageToSend);
        }
    },
};