const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageAttachment } = require('discord.js');
const { default: axios } = require('axios');
const {
    buildTableFromJson,
    sendStructuredResponseToUser,
    sendEmbeddedMessage,
    sortDungeonsBy,
    sendStructuredResponseToUserViaSlashCommand,
    getHelpJson,
    generateMythicImage
} = require('../../reusables/functions');
const { DungeonService } = require('../../services/DungeonService');
const { DungeonScoreService } = require('../../services/DungeonScoreService');
const { DetermineSeasonDungeonService } = require('../../services/DetermineSeasonDungeonService');

async function getDungeonData(args) {
    const res = await requestData(args);

    const dungeons = new DetermineSeasonDungeonService().execute();

    if (args.isSimulateCommand) {
        return calculateSimulatedLevel(res.data, args.simulateLevel, dungeons);
    }

    return calculateMinimumImprovements(res.data, dungeons);
}

function calculateSimulatedLevel(data, levelToSimulate, seasonDungeons) {
    const dungeonService = new DungeonService(seasonDungeons);
    const dungeonScoreService = new DungeonScoreService();
    const dungeons = dungeonService.buildMissingDungeons(data.mythic_plus_best_runs);
    let currentScore = 0;

    for (const dungeon of dungeons) {
        currentScore += dungeon.score;
        if (dungeon.mythic_level >= levelToSimulate) {
            dungeon.potentialMinimumScore = 0;
            dungeon.target_level = dungeon.mythic_level;
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

function calculateMinimumImprovements(data, seasonDungeons) {
    const dungeonService = new DungeonService(seasonDungeons);
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
            argsDataObj.realm = argsDataObj.realm.replace("'", '');

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

const handleError = async (error, interaction) => {
    if (error.code === 50001 || error.code === 50013) {
        const owner = await interaction.channel.guild.fetchOwner();
        if (!owner) {
            return;
        }

        owner.send(
            "Hey! It looks like I don't have the necessary permissions to function properly in your server.\n"+
            "Please reinvite me using the link on our website: https://www.mr-helper.xyz/\n"+
            "This is an automated message. If you have any queries, please reach out to coryrin on discord, or use the development discord group."
        );

        sendStructuredResponseToUserViaSlashCommand(interaction, 'There was an error with the permissions. We\'ve notified the server admin.');
    }
}

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
                    ['/mr-helper eu/argent-dawn/ellorett --simulate 10'],
                ]
            });

            const output = `\n${tableString}\n\n ${exampleString}`;

            try {
                return method(interaction, output);
            } catch (error) {
                handleError(error, interaction);
                return;
            }
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

            try {
                return sendEmbeddedMessage(interaction, messageObject);
            } catch (error) {
                return handleError(error, interaction);
            }
        }

        if (args.error) {
            return;
        }

        try {
            const allData = await getDungeonData(args, interaction, method);
            const sortedDungeons = sortDungeonsBy(allData.dungeons, 'potentialMinimumScore');
            let totalPoints = 0;
            for (let i = 0; i < sortedDungeons.length; i++) {
                totalPoints += Math.ceil(sortedDungeons[i].potentialMinimumScore);
            }

            console.log(`Score Generated for: ${args.region}/${args.realm}/${args.name} Type: ${args.isSimulateCommand ? 'simulate' : 'normal'}`);

            const image = await generateMythicImage({
                score: Math.ceil(allData.currentScore),
                totalScoreIncrease: totalPoints,
                dungeons: sortedDungeons,
            });

            const attachment = new MessageAttachment(image, 'result.png');

            return interaction.editReply({
                files: [attachment],
                content: 'Finding Mythic Rating Helper helpful? [Please consider supporting me](<https://ko-fi.com/mythicratinghelper>)\n'+
                    'Found an issue? [Report it on GitHub](<https://github.com/Coryrin/mr-helper>)\n'
            });
        } catch (err) {
            console.error(err);
            let errorMessageToSend = 'There was an error getting data from the server. Please try again.';
            if (err.response) {
                errorMessageToSend = `Error: ${err.response.data.message}`;
            }

            handleError(err, interaction);

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