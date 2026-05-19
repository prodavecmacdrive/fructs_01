export default class Preloader extends Phaser.Scene {
    constructor() {
        super('Preloader');
    }

    create() {
        console.log('Preloader: Starting Base64 texture loading...');
        const textures = window.App.resources.textures;
        const keys = Object.keys(textures);

        if (keys.length === 0) {
            this.scene.start('Game');
            return;
        }

        let loadedCount = 0;
        const total = keys.length;

        keys.forEach(key => {
            const data = textures[key];
            if (typeof data === 'string' && data.startsWith('data:image')) {
                // Use addBase64 which is designed for this
                this.textures.addBase64(key, data);
            }
        });

        // Simple poll to ensure textures are ready before starting
        const checkInterval = setInterval(() => {
            let allReady = true;
            for (const key of keys) {
                if (!this.textures.exists(key)) {
                    allReady = false;
                    break;
                }

                // Check if the texture is actually loaded (has a source)
                const texture = this.textures.get(key);
                if (!texture || !texture.source || texture.source.length === 0) {
                    allReady = false;
                    break;
                }
            }

            if (allReady) {
                clearInterval(checkInterval);
                console.log('Preloader: All textures loaded successfully.');
                this.scene.start('Game');
            }
        }, 50);

        // Safety timeout
        this.time.delayedCall(5000, () => {
            if (checkInterval) {
                clearInterval(checkInterval);
                console.log('Preloader: Safety timeout reached, starting Game anyway.');
                this.scene.start('Game');
            }
        });
    }
}
