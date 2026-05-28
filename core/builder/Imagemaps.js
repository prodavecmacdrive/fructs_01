const fs = require('fs');
const path = require('path');
const base64Img = require('base64-img');
const jsonminify = require('jsonminify');

module.exports.load = function() {
    fs.readdir('assets/imagemap', (err, names) => {
        if (err || !names || !names.length) {
            this.imagemapsLoaded = true;
            this.loadChunck();
            return;
        }

        const mapFiles = {};

        for (const title of names) {
            const ext = path.extname(title).toLowerCase();
            const rawBase = path.basename(title, ext);
            const base = rawBase.replace(/\s+/g, '');

            if (!mapFiles[base]) {
                mapFiles[base] = { png: null, json: null };
            }

            if (ext === '.png' || ext === '.jpg') {
                mapFiles[base].png = title;
            } else if (ext === '.json') {
                mapFiles[base].json = title;
            } else {
                // Remove unexpected files
                try { fs.unlinkSync(path.join('assets', 'imagemap', title)); } catch (e) {}
            }
        }

        const maps = Object.keys(mapFiles).filter(base => mapFiles[base].png && mapFiles[base].json);

        if (maps.length === 0) {
            this.imagemapsLoaded = true;
            this.loadChunck();
            return;
        }

        let count = { current: 0, total: maps.length };
        for (const mapName of maps) {
            const mapInfo = mapFiles[mapName];
            const jsonPath = path.join('assets', 'imagemap', mapInfo.json);
            const pngPath = path.join('assets', 'imagemap', mapInfo.png);

            let json;
            try {
                json = jsonminify(fs.readFileSync(jsonPath, 'utf8'));
            } catch (e) {
                count.current++;
                if (count.current === count.total) {
                    this.imagemapsLoaded = true;
                    this.loadChunck();
                }
                continue;
            }

            base64Img.base64(pngPath, (err, data) => {
                if (data) {
                    this.resources += 'window.App.resources.imagemaps.' + mapName + ' = { png: ' + "'" + data + "'" + ', json: ' + json + ' };';
                }

                count.current++;
                if (count.current === count.total) {
                    this.imagemapsLoaded = true;
                    this.loadChunck();
                }
            });
        }
    });
};
