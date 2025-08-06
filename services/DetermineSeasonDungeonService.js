const path = require('path');
require('dotenv').config();

class DetermineSeasonDungeonService {
    constructor() {
        const baseDir = path.join(__dirname, '..');
        this.parentDir = path.join(baseDir, 'data/' + process.env.EXPANSION);
    }

    execute() {
        const season = process.env.SEASON;

        const seasonDir = path.join(this.parentDir, season);
        const dungeons = require(path.join(seasonDir, 'dungeons.json'));

        return dungeons;
    }
}

module.exports = {
    DetermineSeasonDungeonService,
}
