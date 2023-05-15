const {
    getDungeonScore,
    getKeystoneLevelToRun,
    lookupDungeonFromShortname,
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
];

test('getDungeonScore', () => {
    const affixesToTest = [AFFIXES[0]];

    expect(getDungeonScore(2, affixesToTest)).toBe(60);

    affixesToTest.push(AFFIXES[1]);

    expect(getDungeonScore(7, affixesToTest)).toBe(112.5);

    affixesToTest.push(AFFIXES[2]);

    expect(getDungeonScore(14, affixesToTest)).toBe(192);
});

test('getKeystoneLevelToRun', () => {
    const bestRun = {
        mythic_level: 20,
        num_keystone_upgrades: 0
    };

    const dungeons = [
        {
            mythic_level: 20,
            num_keystone_upgrades: 1,
            expected: 21,
        },
        {
            mythic_level: 19,
            num_keystone_upgrades: 2,
            expected: 21,
        },
        {
            mythic_level: 19,
            num_keystone_upgrades: 0,
            expected: 19,
        },
        {
            mythic_level: 20,
            num_keystone_upgrades: 0,
            expected: 20,
        },
        {
            mythic_level: 20,
            num_keystone_upgrades: 2,
            expected: 22,
        },
        {
            mythic_level: 17,
            num_keystone_upgrades: 3,
            expected: 20,
        },
        {
            mythic_level: 18,
            num_keystone_upgrades: 2,
            expected: 20,
        }
    ];

    for (const dungeon of dungeons) {
        expect(getKeystoneLevelToRun(bestRun, dungeon)).toBe(dungeon.expected);
    }
});

test('getDungeonFromShortname', () => {
    expect(lookupDungeonFromShortname('VP')).toBe('The Vortex Pinnacle');

    expect(lookupDungeonFromShortname('')).toBe('Dungeon not found');
});
