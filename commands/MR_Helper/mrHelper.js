const { SlashCommandBuilder } = require('@discordjs/builders');
const { default: axios } = require('axios');
const ascii = require('ascii-table');

function parseMessageForArgs(message) {
    const prefix = '!';
    const dataToReturn = {
        error: false,
        name: '',
        realm: '',
        region: 'eu',
    }

    const args = message.content.trim().split(/ + /g);
    const cmd = args[0].slice(prefix.length).toLowerCase();
    const cmdParts = cmd.split(' ');
    
    const nameIndex = cmdParts.indexOf('--name');
    if (nameIndex < 0) {
        message.channel.send("Please supply a name.");

        dataToReturn.error = true;
        return dataToReturn;
    }

    dataToReturn.name = cmdParts[nameIndex + 1];

    const realmIndex = cmdParts.indexOf('--realm');
    if (realmIndex < 0) {
        message.channel.send("Please supply a realm.");

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

function calculateScores(isFortifiedBest, dungeon) {
    let target;
    if (isFortifiedBest) {
        target = 'fortified';
    } else {
        target = 'tyrannical';
    }

    const bestRunScore = dungeon[target].score * 1.5;
    let altRunScore = 0;
    const otherDungeonAffix = target === 'fortified' ? 'tyrannical' : 'fortified';

    if (dungeon[otherDungeonAffix].score) {
        altRunScore = dungeon[otherDungeonAffix].score / 2;
    }

    maxAltRun = (bestRunScore / 3) - altRunScore;

    return {
        potentialScore: maxAltRun,
        dungeonLongName: dungeon[target].dungeon,
        affix: target,
        totalScore: bestRunScore + altRunScore,
        keystoneLevel: dungeon[target].mythic_level,
    }
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
        const scores = calculateScores(isFortifiedBest, dungeon);

        totalScore += scores.totalScore;
        pointsFromAltRuns += Math.ceil(scores.potentialScore);
        dungeons.push(scores);
    }

    console.log('---------------------------------------------------------------------------------------------');
    console.log(`Current score for ${res.data.name}: ${totalScore}`);
    console.log(`The max points you can earn from improving your alt runs are: ${pointsFromAltRuns}`);
    console.log('---------------------------------------------------------------------------------------------');

    return {
        dungeons: dungeons,
        totalScore: totalScore,
        potentialMinScore: pointsFromAltRuns
    }
}

function dataToAsciiTable(dungeons, currentScore, potentialMinScore) {
    const table = new ascii().setHeading("Dungeon", "Affix", "More info");

    const sortedDungeons = dungeons.sort((a, b) => {
        if (a.potentialScore < b.potentialScore) {
            return 1;
        }

        return -1;
    });

    for (const dungeon of sortedDungeons) {
        const affix = dungeon.affix.charAt(0).toUpperCase() + dungeon.affix.slice(1);
        table.addRow(
            `${dungeon.dungeonLongName} ${dungeon.keystoneLevel}+`,
            affix,
            `You can earn a minimum of ${Math.ceil(dungeon.potentialScore)} points by running this dungeon.`
        );
    }

    table.addRow();
    table.addRow(`Current score: ${Math.ceil(currentScore)}`);
    table.addRow(`Potential minimum score: ${Math.ceil(potentialMinScore)}`);

    return table.toString();
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mr-helper')
        .setDescription('Get dungeons to run to improve overall mythic rating'),
    async execute(interaction, message) {
        const args = parseMessageForArgs(message);

        if (args.error) {
            return;
        }

        const allData = await requestAndFormatData(args);
        
        const dataToSend = dataToAsciiTable(allData.dungeons, allData.totalScore, allData.potentialMinScore);

        await interaction.reply("```" + dataToSend + "```");
    },
}