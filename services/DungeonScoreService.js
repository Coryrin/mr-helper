class DungeonScoreService
{
    constructor() {
        this.BASE_SCORE = 125;
        this.BASE_SCORE_PER_LEVEL = 15;
        this.BASE_SCORE_PER_AFFIX = 15;
        this.SEASONAL_AFFIX_ID = 147;
    }

    setLevel(level) {
        this.level = level;
        return this;
    }

    setAffixes(affixes) {
        this.affixes = affixes;
        return this;
    }

    calculateScore() {
        let affixScore = 0;
        for (const affix of this.affixes) {
            if (affix.id === this.SEASONAL_AFFIX_ID) {
                affixScore += this.BASE_SCORE_PER_AFFIX * 2;
                continue;
            }

            affixScore += this.BASE_SCORE_PER_AFFIX;
        }

        return affixScore + this.BASE_SCORE + (this.BASE_SCORE_PER_LEVEL * this.level)
    }
}

module.exports = {
    DungeonScoreService,
}