const { arrayDiff } = require("../reusables/functions");

class DungeonService {
    constructor(dungeons) {
        this.DUNGEONS = dungeons;
    }

    buildMissingDungeons(currentDungeons) {
        const completedDungeonShortnames = currentDungeons.map(dungeon => dungeon.short_name);
        const allDungeonShortNames = Object.keys(this.DUNGEONS);

        const dungeonsToAdd = arrayDiff(allDungeonShortNames, completedDungeonShortnames);

        for (const dungeonToAdd of dungeonsToAdd) {
            const dungeon = {
                short_name: dungeonToAdd,
                dungeon: this.DUNGEONS[dungeonToAdd],
                mythic_level: 0,
                score: 0,
            }

            currentDungeons.push(dungeon);
        }

        return currentDungeons;
    }

    getAffixesForLevel(level) {
        if (level >= 12) {
            return [
                {
                    "id": 9,
                    "name": "Tyrannical",
                  },
                  {
                    "id": 10,
                    "name": "Fortified",
                  },
                  {
                    "id": 147,
                    "name": "Xal'atath's Guile",
                  }
            ];
        }

        if (level >= 10) {
            return [
                {
                    "id": 148,
                    "name": "Xal'atath's Bargain: Ascendant",
                  },
                  {
                    "id": 9,
                    "name": "Tyrannical",
                  },
                  {
                    "id": 10,
                    "name": "Fortified",
                  }
            ];
        }
    
        if (level >= 7) {
            return [
                {
                    "id": 9,
                    "name": "Tyrannical",
                  },
                  {
                    "id": 10,
                    "name": "Fortified",
                  },
            ]
        }
    
        if (level >= 4) {
            return [
                {
                    "id": 9,
                    "name": "Tyrannical",
                },
            ];
        }
    
        return [];
    }
}

module.exports = {
    DungeonService,
}