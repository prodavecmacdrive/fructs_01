export default class Background extends Phaser.GameObjects.Container {
    constructor({scene, background = {}, pImage, lImage, pScaleX = 1, pScaleY = 1, lScaleX = 1, lScaleY = 1, container}) {
        super(scene, 0, 0);
        this.background = background;
        this.init(background, pImage, lImage, pScaleX, pScaleY, lScaleX, lScaleY);
        container.add(this);
    }

    init(background, pImage, lImage, pScaleX, pScaleY, lScaleX, lScaleY) {
        this.setCustomPosition(0, 0);
        this.addProperties(["scale"]);
        this.pScaleX = pScaleX;
        this.pScaleY = pScaleY;
        this.lScaleX = lScaleX;
        this.lScaleY = lScaleY;

        if (background.mode === 'color') {
            this.color = background.color || '#000000';
            this._colorFill = this.scene.add.graphics();
            this.add(this._colorFill);
            this._updateColorFill();

            // Keep a named reference so we can remove it when the scene shuts
            // down. Without this, the handler fires on the destroyed object the
            // next time App.resize() is called from the incoming scene, causing
            // "Cannot read properties of undefined (reading 'game')".
            this._resizeHandler = () => this._updateColorFill();
            const sceneScale = this.scene.scale;
            sceneScale.on('resize', this._resizeHandler);
            this.scene.events.once('shutdown', () => {
                sceneScale.off('resize', this._resizeHandler);
            });
        } else {
            this.addProperties(["image"]);
            this.imageSprite = this.scene.add.image(0, 0, pImage);
            this.add(this.imageSprite);
            this.pImage = pImage;
            this.lImage = lImage;
            this.pScaleX = pScaleX;
            this.pScaleY = pScaleY;
            this.lScaleX = lScaleX;
            this.lScaleY = lScaleY;
        }
    }

    _updateColorFill() {
        if (!this.scene || !this._colorFill) return;
        const width = (this.scene.game?.size?.x ?? 0) * 2;
        const height = (this.scene.game?.size?.y ?? 0) * 2;
        this._colorFill.clear();
        const hex = this.color.replace('#', '');
        const colorInt = parseInt(hex.length === 6 ? hex : hex.split('').map((c) => c + c).join(''), 16);
        this._colorFill.fillStyle(colorInt, 1);
        this._colorFill.fillRect(-width / 2, -height / 2, width, height);
    }

    setTexture(key) {
        if (this.imageSprite) {
            this.imageSprite.setTexture(key);
        }
        return this;
    }

    changeImage(pImage, lImage) {
        if (this.imageSprite) {
            this.pImage = pImage;
            this.lImage = lImage;
            this.imageSprite.setTexture(pImage);
        }
    }
}
