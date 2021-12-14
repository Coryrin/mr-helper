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

exports.getBaseScoreForAffix = getBaseScoreForAffix;
exports.getBaseScoreForKeystoneLevel = getBaseScoreForKeystoneLevel;