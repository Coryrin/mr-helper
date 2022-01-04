const {
    getDungeonScore
} = require('../reusables/functions');

const AFFIXES = [
    {
        name: 'tyrannical',
    },
    {
        name: 'bursting',
    },
    {
        name: 'bolstering',
    },
    {
        name: 'tormented'
    },
];

test('getDungeonScore', () => {
    const affixesToTest = [AFFIXES[0]];

    expect(getDungeonScore(2, affixesToTest)).toBe(60);

    affixesToTest.push(AFFIXES[1]);

    expect(getDungeonScore(5, affixesToTest)).toBe(90);

    affixesToTest.push(AFFIXES[2]);

    expect(getDungeonScore(8, affixesToTest)).toBe(120);

    affixesToTest.push(AFFIXES[3]);

    expect(getDungeonScore(10, affixesToTest)).toBe(150);

    expect(getDungeonScore(15, affixesToTest)).toBe(187.5);

    expect(getDungeonScore(20, affixesToTest)).toBe(225);
});