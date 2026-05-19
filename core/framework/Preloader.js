export default class Preloader extends Phaser.Scene {
    constructor() {
        super('Preloader');
    }

    create() {
        console.log('Preloader: Starting Base64 texture loading...');
        const textures = window.App.resources.textures;
        const keys = Object.keys(textures || {});

        if (keys.length === 0) {
            this.finish();
            return;
        }

        let loaded = 0;
        keys.forEach(key => {
            const data = textures[key];
            if (typeof data === 'string' && data.startsWith('data:image')) {
                const img = new Image();
                img.onload = () => {
                    this.textures.addImage(key, img);
                    loaded++;
                    if (loaded === keys.length) this.finish();
                };
                img.onerror = () => {
                    console.error('Failed to load texture:', key);
                    loaded++;
                    if (loaded === keys.length) this.finish();
                };
                img.src = data;
            } else {
                loaded++;
                if (loaded === keys.length) this.finish();
            }
        });

        // Fail-safe
        this.time.delayedCall(5000, () => {
            if (loaded < keys.length) {
                console.warn('Preloader: Timeout reached, starting anyway.');
                this.finish();
            }
        });
    }

    finish() {
        const loader = document.getElementById('loader');
        if (loader) loader.style.display = 'none';
        console.log('Preloader: Finished, starting Game.');
        this.scene.start('Game');
    }
}
