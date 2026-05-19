export default class Preloader extends Phaser.Scene {
    constructor() {
        super('Preloader');
    }

    preload() {
        console.log('Preloader: Starting asset load...');
        const assets = window.App.resources.textures;

        if (!assets) {
            console.error('Preloader: No assets found in window.App.resources.textures');
            return;
        }

        for (const [key, value] of Object.entries(assets)) {
            if (typeof value === 'string' && value.startsWith('data:image')) {
                this.load.image(key, value);
            }
        }
    }

    create() {
        console.log('Preloader: Assets loaded, starting Game scene.');
        this.scene.start('Game');
    }
}
