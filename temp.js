const fs = require('fs');
let data = fs.readFileSync('game-settings.json', 'utf8');
data = data.replace(/pink-cat/g, 'pink_cat');
data = data.replace(/"faceScale": 0.5/g, '"faceScale": 0.6');
data = data.replace(/"iconScale": 0.6/g, '"iconScale": 0.7');
data = data.replace(/"alpha": 1/g, '"alpha": 0');
fs.writeFileSync('game-settings.json', data);
