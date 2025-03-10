const { SlashCommandBuilder } = require('@discordjs/builders');
const { default: axios } = require('axios');
const {
    buildTableFromJson,
    sendStructuredResponseToUser,
    sendEmbeddedMessage,
    sortDungeonsBy,
    sendStructuredResponseToUserViaSlashCommand,
    getHelpJson
} = require('../../reusables/functions');
const { DungeonService } = require('../../services/DungeonService');
const { DungeonScoreService } = require('../../services/DungeonScoreService');

async function getDungeonData(args) {
    const res = await requestData(args);

    if (args.isSimulateCommand) {
        return calculateSimulatedLevel(res.data, args.simulateLevel);
    }

    return calculateMinimumImprovements(res.data);
}

function calculateSimulatedLevel(data, levelToSimulate) {
    const dungeonService = new DungeonService();
    const dungeonScoreService = new DungeonScoreService();
    const dungeons = dungeonService.buildMissingDungeons(data.mythic_plus_best_runs);
    let currentScore = 0;

    for (const dungeon of dungeons) {
        currentScore += dungeon.score;
        if (dungeon.mythic_level >= levelToSimulate) {
            continue;
        }

        const simulatedScore = dungeonScoreService
            .setLevel(levelToSimulate)
            .setAffixes(dungeonService.getAffixesForLevel(levelToSimulate))
            .calculateScore();

        dungeon.potentialMinimumScore = simulatedScore - dungeon.score;
        dungeon.target_level = levelToSimulate;
    }

    return {
        dungeons,
        currentScore
    };
}

function calculateMinimumImprovements(data) {
    const dungeonService = new DungeonService();
    const dungeons = dungeonService.buildMissingDungeons(data.mythic_plus_best_runs);
    const dungeonScoreService = new DungeonScoreService();
    let currentScore = 0;

    for (const dungeon of dungeons) {
        const startLevelToCheck = dungeon.mythic_level === 0 ? 2 : dungeon.mythic_level;

        const currentScoreAtLevel = dungeonScoreService
            .setLevel(startLevelToCheck)
            .setAffixes(dungeonService.getAffixesForLevel(dungeon.mythic_level))
            .calculateScore();
        currentScore += dungeon.score;

        if (currentScoreAtLevel > dungeon.score + 10) {
            dungeon.potentialMinimumScore = currentScoreAtLevel - dungeon.score;
            dungeon.target_level = startLevelToCheck;
            continue;
        }

        const nextLevel = dungeon.mythic_level + dungeon.num_keystone_upgrades;
        const score = dungeonScoreService
            .setLevel(nextLevel)
            .setAffixes(dungeonService.getAffixesForLevel(nextLevel))
            .calculateScore();

        dungeon.potentialMinimumScore = score - dungeon.score;
        dungeon.target_level = nextLevel;
    }

    return {
        dungeons,
        currentScore,
    };
}

function buildArgsDataObject(cmdParts, argsDataObj, messageChannel) {
    let isSimplifiedCommand = false;
    for (const part of cmdParts) {
        if (part.includes('/')) {
            const regionRealmName = part.split('/');

            if (regionRealmName.length < 3) {
                messageChannel.send('Please supply a character in the format of region/realm/name.');

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
            messageChannel.send('Please supply a name.');

            argsDataObj.error = true;
            return argsDataObj;
        }

        argsDataObj.name = cmdParts[nameIndex + 1];

        const realmIndex = cmdParts.indexOf('--realm');
        if (realmIndex < 0) {
            messageChannel.send('Please supply a realm.');

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

    const simulateIndex = cmdParts.indexOf('--simulate');
    if (simulateIndex > -1) {
        argsDataObj.isSimulateCommand = true;
        argsDataObj.getAltRuns = false;
        argsDataObj.simulateLevel = cmdParts[simulateIndex + 1];
    }

    return argsDataObj;
}

function parseMessageForArgs(message, messageChannel) {
    let dataToReturn = {
        error: false,
        name: '',
        realm: '',
        region: 'eu',
        isHelpCommand: false,
        isInfoCommand: false,
        getAltRuns: true,
        getBestRuns: false,
        isSimulateCommand: false,
        simulateLevel: null,
    };

    const args = message.trim().split(/ + /g);
    const cmd = args[0].slice();
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

    dataToReturn = buildArgsDataObject(cmdParts, dataToReturn, messageChannel);
    
    return dataToReturn;
}

function buildRequestUrl(args) {
    const name = encodeURIComponent(args.name);

    return `https://raider.io/api/v1/characters/profile?region=${args.region}&realm=${args.realm}&name=${name}&fields=mythic_plus_best_runs%2Cmythic_plus_alternate_runs`;
}

<<<<<<< HEAD
=======
function getBlankDataStructure() {
    return {
        'AA': {
            'fortified': {},
            'tyrannical': {},
        },
        'BH': {
            'fortified': {},
            'tyrannical': {},
        },
        'RLP': {
            'fortified': {},
            'tyrannical': {},
        },
        'HOI': {
            'fortified': {},
            'tyrannical': {},
        },
        'AV': {
            'fortified': {},
            'tyrannical': {},
        },
        'NO': {
            'fortified': {},
            'tyrannical': {},
        },
        'NELT': {
            'fortified': {},
            'tyrannical': {},
        },
        'ULD': {
            'fortified': {},
            'tyrannical': {},
        }
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
        const score = getDungeonScore(2);

        return {
            potentialScore: score,
            dungeonLongName: dungeonName,
            affix: 'fortified',
            totalScore: 0,
            keystoneLevel: 2,
        };
    }

    let altRunScore = 0;
    const otherDungeonAffix = target === 'fortified' ? 'tyrannical' : 'fortified';
    const bestRunScore = dungeon[otherDungeonAffix].score * 1.5;
    const targettedKeystoneLevel = dungeon[otherDungeonAffix].num_keystone_upgrades > 0
        ? dungeon[otherDungeonAffix].mythic_level
        : dungeon[otherDungeonAffix].mythic_level - 1;

    if (dungeon[target].score) {
        altRunScore = dungeon[target].score / 2;
    }

    const maxAltRun = (bestRunScore / 3) - altRunScore;

    return {
        potentialScore: maxAltRun,
        dungeonLongName: dungeonName,
        affix: target,
        totalScore: bestRunScore + altRunScore,
        keystoneLevel: targettedKeystoneLevel,
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

>>>>>>> origin/master
async function requestData(args) {
    const url = buildRequestUrl(args);
    try {
        return await axios({
            method: 'get',
            url: url,
        });
    } catch (error) {
        console.log('error', error);
    }
    
}

<<<<<<< HEAD
=======
function checkRunsForIncompleteData(data, levelToSimulate) {
    const allDungeonsShortNames = ['BH', 'AA', 'HOI', 'NO', 'NELT', 'RLP', 'AV', 'ULD'];
    const numDungeonsToRun = allDungeonsShortNames.length;
    const numBestRuns = numDungeonsToRun - data.mythic_plus_best_runs.length;
    const numAltRuns = numDungeonsToRun - data.mythic_plus_alternate_runs.length;
    const bestRunsDone = [];
    const altRunsDone = [];

    for (const dungeon of data.mythic_plus_best_runs) {
        bestRunsDone.push(dungeon.short_name);
    }

    for (const dungeon of data.mythic_plus_alternate_runs) {
        altRunsDone.push(dungeon.short_name);
    }

    const bestRunsToAdd = arrayDiff(allDungeonsShortNames, bestRunsDone);
    const altRunsToAdd = arrayDiff(allDungeonsShortNames, altRunsDone);

    for (let i = 0; i < numBestRuns; i++) {
        const dungeonToAdd = {
            mythic_level: levelToSimulate,
            score: 0,
            affix: 'fortified',
            dungeon: 'Missing temp name',
            affixes: [
                {
                    name: 'fortified'
                }
            ],
        };

        for (let j = 0; j < bestRunsToAdd.length; j++) {
            dungeonToAdd.dungeon = lookupDungeonFromShortname(bestRunsToAdd[j]);
            bestRunsToAdd.splice(j, 1);
            break;
        }

        data.mythic_plus_best_runs.push(dungeonToAdd);
    }

    for (let i = 0; i < numAltRuns; i++) {
        const dungeonToAdd = {
            mythic_level: levelToSimulate,
            score: 0,
            affix: 'tyrannical',
            dungeon: 'Dungeon name missing.',
            affixes: [
                {
                    name: 'tyrannical'
                }
            ],
        };


        for (let j = 0; j < altRunsToAdd.length; j++) {
            dungeonToAdd.dungeon = lookupDungeonFromShortname(altRunsToAdd[j]);

            for (const dungeon of data.mythic_plus_best_runs) {
                if (dungeonToAdd.dungeon === dungeon.dungeon) {
                    const affix = dungeon.affixes[0].name.toLowerCase() === 'tyrannical' ? 'fortified' : 'tyrannical';
                    dungeonToAdd.affix = affix;
                    dungeonToAdd.affixes[0].name = affix;
                }
            }

            altRunsToAdd.splice(j, 1);
            break;
        }

        data.mythic_plus_alternate_runs.push(dungeonToAdd);
    }

    return data;
}

function simulateLevel(data, levelToSimulate, interaction, interactionMethod) {
    let totalScore = 0;
    data = checkRunsForIncompleteData(data, levelToSimulate);

    const fortifiedDungeons = [];
    const tyrannicalDungeons = [];

    for (const dungeon of data.mythic_plus_best_runs) {
        dungeon.affix = dungeon.affixes[0].name;
        dungeon.dungeonLongName = dungeon.dungeon;

        const affixes = getNumAffixesForLevel(levelToSimulate);

        const score = getDungeonScore(levelToSimulate);
        const currentScore = dungeon.score * 1.5;

        if (currentScore > score) {
            dungeon.potentialScore = 0;
            dungeon.score = currentScore;
        } else {
            dungeon.potentialScore = score - currentScore;
            dungeon.score = score;
            dungeon.mythic_level = levelToSimulate;
        }

        dungeon.keystoneLevel = dungeon.mythic_level;

        if (dungeon.affix.toLowerCase() === 'fortified') {
            fortifiedDungeons.push(dungeon);
        } else {
            tyrannicalDungeons.push(dungeon);
        }

        totalScore += dungeon.score;
    }

    for (const dungeon of data.mythic_plus_alternate_runs) {
        dungeon.affix = dungeon.affixes[0].name;
        dungeon.dungeonLongName = dungeon.dungeon;

        const affixes = getNumAffixesForLevel(levelToSimulate);

        // Get base scores
        const score = (getDungeonScore(levelToSimulate) / 3);
        const currentScore = ((dungeon.score * 1.5) / 3);

        if (currentScore > score) {
            dungeon.score = currentScore;
            dungeon.potentialScore = 0;
        } else {
            dungeon.potentialScore = score - currentScore;
            dungeon.score = score;
            dungeon.mythic_level = levelToSimulate;
        }

        dungeon.keystoneLevel = dungeon.mythic_level;

        if (dungeon.affix.toLowerCase() === 'fortified') {
            fortifiedDungeons.push(dungeon);
        } else {
            tyrannicalDungeons.push(dungeon);
        }

        totalScore += dungeon.score;
    }

    const tyrannicalData = dataToAsciiTable(tyrannicalDungeons, totalScore, 0, true);

    interactionMethod(interaction, tyrannicalData, false);

    return {
        dungeons: fortifiedDungeons,
        totalScore: totalScore,
        potentialMinScore: 0,
    };
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
        const targetKeystoneDungeonScore = getDungeonScore(dungeon.keystoneLevel);
        dungeon.potentialScore = (targetKeystoneDungeonScore - currentDungeonScore);

        potentialMinimumScore += dungeon.potentialScore;
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
    console.log(`Current score for ${data.name}: ${Math.round(totalScore)}`);
    console.log(`The minimum points you can earn from improving your alt runs are: ${pointsFromAltRuns}`);
    console.log('---------------------------------------------------------------------------------------------');

    return {
        dungeons: dungeons,
        totalScore: totalScore,
        potentialMinScore: pointsFromAltRuns
    };
}

function dataToAsciiTable(dungeons, currentScore, potentialMinScore, isSimulated=false) {
    const dungeonData = {
        title: '',
        heading: ['Dungeon', 'Affix', 'Minimum point increase'],
        rows: []
    };

    const sortedDungeons = sortDungeonsBy(dungeons, 'potentialScore');

    for (const dungeon of sortedDungeons) {
        const affix = dungeon.affix.charAt(0).toUpperCase() + dungeon.affix.slice(1);

        dungeonData.rows.push([
            `${dungeon.dungeonLongName} ${dungeon.keystoneLevel}+`,
            affix,
            `${Math.ceil(dungeon.potentialScore)} points`
        ]); 
    }

    const scoreOutput = isSimulated ? 'Simulated score' : 'Current score';
    dungeonData.rows.push([]);
    dungeonData.rows.push([`${scoreOutput}: ${Math.ceil(currentScore)}`]);

    if (!isSimulated) {
        dungeonData.rows.push([`Potential minimum score increase: ${Math.ceil(potentialMinScore)}`]);
    }

    return buildTableFromJson(dungeonData);
}

>>>>>>> origin/master
module.exports = {
    data: new SlashCommandBuilder()
        .setName('mr-helper')
        .setDescription('Get dungeons to run to improve overall mythic rating')
        .addStringOption(option =>
            option.setName('command')
                .setDescription('The command to run. e.g. eu/argent-dawn/ellorett --simulate 15, eu/argent-dawn/ellorett --best-runs')
                .setRequired(true)
        ),
    async execute(interaction, message, isSlashCommand) {
        if (isSlashCommand) {
            await interaction.reply('Working on it...');
        } else {
            await interaction.reply('Warning - the \'!\' prefix has been deprecated to keep up to date with Discord\'s bot standards. Please use the slash commands.');
        }

        const method = isSlashCommand ? sendStructuredResponseToUserViaSlashCommand : sendStructuredResponseToUser;

        const args = parseMessageForArgs(message, interaction.channel);

        if (args.isHelpCommand) {
            const tableString = buildTableFromJson(getHelpJson());
            const exampleString = buildTableFromJson({
                title: '',
                heading: 'Examples',
                rows: [
                    ['/mr-helper eu/argent-dawn/ellorett'],
                    ['/mr-helper eu/argent-dawn/ellorett --simulate 15'],
                ]
            });

            const output = `\n${tableString}\n\n ${exampleString}`;

            return method(interaction, output);
        }

        if (args.isInfoCommand) {
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

            return sendEmbeddedMessage(interaction, messageObject);
        }

        if (args.error) {
            return;
        }

        try {
            const allData = await getDungeonData(args, interaction, method);

            return method(interaction, formatData(allData));
        } catch (err) {
            let errorMessageToSend = 'There was an error getting data from the server. Please try again.';
            console.log(err);
            if (err.response) {
                errorMessageToSend = `Error: ${err.response.data.message}`;
            }

            return method(interaction, errorMessageToSend);
        }
    },
};

const formatData = (data) => {
    const dungeonData = {
        title: '',
        heading: ['Dungeon', 'Current Timed Level', 'Target Level', 'Minimum point increase'],
        rows: []
    };

    const sortedDungeons = sortDungeonsBy(data.dungeons, 'potentialMinimumScore');

    let totalPoints = 0;
    for (const dungeon of sortedDungeons) {
        const pointsForDungeon = Math.ceil(dungeon.potentialMinimumScore);
        dungeonData.rows.push([
            dungeon.dungeon,
            dungeon.mythic_level,
            dungeon.target_level,
            `${pointsForDungeon} points`
        ]);

        totalPoints += pointsForDungeon;
    }

    dungeonData.rows.push([]);
    dungeonData.rows.push([`Current Score: ${Math.floor(data.currentScore)}`])
    dungeonData.rows.push([`Score Increase: ${totalPoints}`]);

    return buildTableFromJson(dungeonData);
}