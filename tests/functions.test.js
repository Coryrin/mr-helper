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
    {
        name: 'encrypted'
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
    expect(lookupDungeonFromShortname('SD')).toBe('Sanguine Depths');

    expect(lookupDungeonFromShortname('')).toBe('Dungeon not found');
});
