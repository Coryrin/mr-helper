const { SlashCommandBuilder } = require('@discordjs/builders');
const { default: axios } = require('axios');
const { 
    getBaseScoreForKeystoneLevel, 
    getBaseScoreForAffix, 
    buildTableFromJson,
    sendStructuredResponseToUser,
    sendEmbeddedMessage,
} = require('../../reusables/functions');

const BASE_SCORE_FOR_COMPLETION = 37.5;

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
    const dataToReturn = {
        error: false,
        name: '',
        realm: '',
        region: 'eu',
        isHelpCommand: false,
        isInfoCommand: false,
    };

    const args = message.content.trim().split(/ + /g);
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
    
    const nameIndex = cmdParts.indexOf('--name');
    if (nameIndex < 0) {
        message.channel.send('Please supply a name.');

        dataToReturn.error = true;
        return dataToReturn;
    }

    dataToReturn.name = cmdParts[nameIndex + 1];

    const realmIndex = cmdParts.indexOf('--realm');
    if (realmIndex < 0) {
        message.channel.send('Please supply a realm.');

        dataToReturn.error = true;
        return dataToReturn;
    }

    dataToReturn.realm = cmdParts[realmIndex + 1];
    
    return dataToReturn;
}

function buildRequestUrl(args) {
    return `https://raider.io/api/v1/characters/profile?region=${args.region}&realm=${args.realm}&name=${args.name}&fields=mythic_plus_best_runs%2Cmythic_plus_alternate_runs`;
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
        target = 'fortified';
    } else {
        target = 'tyrannical';
    }

    if (!dungeon.fortified.score && !dungeon.tyrannical.score) {
        const score = BASE_SCORE_FOR_COMPLETION + getBaseScoreForKeystoneLevel(2) + getBaseScoreForAffix('tyrannical');
        return {
            potentialScore: score + (score / 2),
            dungeonLongName: dungeonName,
            affix: 'fortified',
            totalScore: 0,
            keystoneLevel: 2,
        };
    }

    const bestRunScore = dungeon[target].score * 1.5;
    let altRunScore = 0;
    const otherDungeonAffix = target === 'fortified' ? 'tyrannical' : 'fortified';

    if (dungeon[otherDungeonAffix].score) {
        altRunScore = dungeon[otherDungeonAffix].score / 2;
    }

    const maxAltRun = (bestRunScore / 3) - altRunScore;

    return {
        potentialScore: maxAltRun,
        dungeonLongName: dungeonName,
        affix: target,
        totalScore: bestRunScore + altRunScore,
        keystoneLevel: dungeon[target].mythic_level,
    };
}

async function requestAndFormatData(args) {
    const url = buildRequestUrl(args);
    const res = await axios({
        method: 'get',
        url: url,
    });

    const allDungeons = getBlankDataStructure();

    // best runs
    for (const dungeon of res.data.mythic_plus_best_runs) {
        dungeon.isBestRun = true;
        const isFortified = dungeon.affixes[0].id === 10;
        const allDungeonsTarget = isFortified ? 'fortified' : 'tyrannical';

        allDungeons[dungeon.short_name][allDungeonsTarget] = dungeon;
    }

    // alternate runs
    for (const dungeon of res.data.mythic_plus_alternate_runs) {
        dungeon.isBestRun = false;
        const isFortified = dungeon.affixes[0].id === 10;
        const allDungeonsTarget = isFortified ? 'fortified' : 'tyrannical';

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
    console.log(`Current score for ${res.data.name}: ${totalScore}`);
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

    const sortedDungeons = dungeons.sort((a, b) => {
        if (a.potentialScore < b.potentialScore) {
            return 1;
        }

        return -1;
    });

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
            ['--name', 'The player\'s name', '✔️'],
            ['--realm', 'The player\'s realm', '✔️'],
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
                heading: 'Example',
                rows: [
                    ['!mr-helper --name ellorett --realm argent-dawn']
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
                    }
                ]
            };

            return sendEmbeddedMessage(message, messageObject);
        }

        if (args.error) {
            return;
        }

        try {
            const allData = await requestAndFormatData(args);
        
            const dataToSend = dataToAsciiTable(allData.dungeons, allData.totalScore, allData.potentialMinScore);
            
            return sendStructuredResponseToUser(interaction, dataToSend);
        } catch (err) {
            console.log(err);
            return sendStructuredResponseToUser(interaction, 'There was an error getting data from the server. Please try again.');
        }
    },
};