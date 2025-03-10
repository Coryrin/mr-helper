const { DungeonScoreService } = require("../services/DungeonScoreService");
const { DungeonService } = require("../services/DungeonService");

const dungeonScoreService = new DungeonScoreService();
const dungeonService = new DungeonService();

// https://support.raider.io/kb/frequently-asked-questions/what-is-the-base-score-value-for-each-level-keystone
const levelScoreMap = new Map([
    [2, 155],
    [3, 170],
    [4, 200],
    [5, 215],
    [6, 230],
    [7, 260],
    [8, 275],
    [9, 290],
    [10, 320],
    [11, 335],
    [12, 365],
    [13, 380],
    [14, 395],
    [15, 410],
    [16, 425],
    [17, 440],
    [18, 455],
    [19, 470],
    [20, 485],
])

test('Get Dungeon Score', () => {
    for (i = 2; i <= 20; i++) {
        const expectedScore = levelScoreMap.get(i);
        const score = dungeonScoreService
            .setLevel(i)
            .setAffixes(dungeonService.getAffixesForLevel(i))
            .calculateScore();

        expect(score).toBe(expectedScore);
    }
});