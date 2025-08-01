const fs = require('fs');
const path = require('path');

class DetermineSeasonDungeonService {
    CURRENT_EXPANSION = 'tww';

    constructor() {
        const baseDir = path.join(__dirname, '..');
        this.parentDir = path.join(baseDir, 'data/' + this.CURRENT_EXPANSION);
    }

    execute(region) {
        const seasons = fs.readdirSync(this.parentDir).filter(name => {
            const fullPath = path.join(this.parentDir, name);
            return fs.statSync(fullPath).isDirectory();
        });

        for (const season of seasons) {
            const subdirPath = path.join(this.parentDir, season);
            const files = fs.readdirSync(subdirPath);
            const times = require(path.join(subdirPath, 'times.json'));

            const startTime = new Date(times['starts'][region]);
            const endTime = new Date(times['ends'][region]);

            const now = new Date();

            if (now >= startTime && now <= endTime) {
                const dungeons = require(path.join(subdirPath, 'dungeons.json'));

                return dungeons;
            }
        }
    }
}

module.exports = {
    DetermineSeasonDungeonService,
}
