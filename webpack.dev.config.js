const path = require('path');
const BuilderPlugin = require('./core/builder/Index');

module.exports = {
    mode: 'development',
    entry: {
        main: path.resolve(__dirname, './core/framework/App.js'),
    },
    output: {
        path: path.resolve(__dirname, './dist'),
        filename: '[name].js',
    },
    devServer: {
        static: './dist',
        port: 3080
    },
    plugins: [
        new BuilderPlugin({ mode: 'development' }),
    ],
}