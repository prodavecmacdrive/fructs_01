const path = require('path');
const BuilderPlugin = require('./core/builder/Index');

module.exports = {
    mode: 'production',
    entry: {
        main: path.resolve(__dirname, './core/framework/App.js'),
    },
    output: {
        path: path.resolve(__dirname, './dist'),
        filename: '[name].js',
    },
    plugins: [
        new BuilderPlugin({mode: 'production'})
    ],
}