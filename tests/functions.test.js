const {
    getDungeonScore,
    getKeystoneLevelToRun,
    lookupDungeonFromShortname,
} = require('../reusables/functions');

test('getDungeonScore', () => {
    expect(getDungeonScore(2)).toBe(94);

    expect(getDungeonScore(5)).toBe(125);
    expect(getDungeonScore(10)).toBe(170);
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
    expect(lookupDungeonFromShortname('BH')).toBe('Brackenhide Hollow');

    expect(lookupDungeonFromShortname('')).toBe('Dungeon not found');
});
