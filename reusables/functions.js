const ascii = require('ascii-table');

const BASE_SCORE_PER_LEVEL = 7.5;

function getBaseScoreForKeystoneLevel(keystoneLevel) {

    return BASE_SCORE_PER_LEVEL * keystoneLevel;
}

function getBaseScoreForAffix(affix) {
    const seasonalAffix = 'tormented';

    if (affix === seasonalAffix) {
        return BASE_SCORE_PER_LEVEL * 2;
    }

    return BASE_SCORE_PER_LEVEL;
}

function buildTableFromJson(jsonData) {
    const table = new ascii();

    return table.fromJSON(jsonData);
}

async function sendStructuredResponseToUser(interaction, response) {
    await interaction.reply('```' + response + '```');
}

module.exports = {
    getBaseScoreForAffix: getBaseScoreForAffix,
    getBaseScoreForKeystoneLevel: getBaseScoreForKeystoneLevel,
    buildTableFromJson: buildTableFromJson,
    sendStructuredResponseToUser: sendStructuredResponseToUser
};
