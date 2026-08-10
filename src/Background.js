export default class Background extends Phaser.GameObjects.Container {
    constructor({scene, background = {}, pImage, lImage, pScaleX = 1, pScaleY = 1, lScaleX = 1, lScaleY = 1, container}) {
        super(scene, 0, 0);
        this.background = background;
        this.init(background, pImage, lImage, pScaleX, pScaleY, lScaleX, lScaleY);
        container.add(this);
    }

    init(background, pImage, lImage, pScaleX, pScaleY, lScaleX, lScaleY) {
        this.setCustomPosition(0, 0);

        const imgKey = pImage || background.pImage;
        this.isSkyBg = (imgKey === 'sky_bg');

        if (!this.isSkyBg) {
            this.addProperties(["scale"]);
            this.pScaleX = pScaleX || 1;
            this.pScaleY = pScaleY || 1;
            this.lScaleX = lScaleX || 1;
            this.lScaleY = lScaleY || 1;
        }

        // Always render color fill if present
        if (background.color || background.mode === 'color') {
            this.color = background.color || '#000000';
            this._colorFill = this.scene.add.graphics();
            this.add(this._colorFill);
        }

        if (background.mode !== 'color' || imgKey) {
            this.addProperties(["image"]);
            this.imageSprite = this.scene.add.image(0, 0, imgKey);
            this.add(this.imageSprite);
            this.pImage = imgKey;
            this.lImage = lImage || background.lImage;
        }

        if (this._colorFill || this.isSkyBg) {
            this._updateColorFill();

            // Keep a named reference so we can remove it when the scene shuts down.
            this._resizeHandler = () => this._updateColorFill();
            const sceneScale = this.scene.scale;
            sceneScale.on('resize', this._resizeHandler);
            this.scene.events.once('shutdown', () => {
                sceneScale.off('resize', this._resizeHandler);
            });
        }
    }

    _updateColorFill() {
        if (!this.scene) return;
        // The background lives inside the scaled main container, so convert the
        // screen size back into container-local space before drawing the fill.
        const containerScale = Number(this.scene.game?.size?.scale) || 1;
        const width = (this.scene.scale?.width ?? 0) / containerScale;
        const height = (this.scene.scale?.height ?? 0) / containerScale;
        
        if (this._colorFill) {
            this._colorFill.clear();
            const hex = this.color.replace('#', '');
            const colorInt = parseInt(hex.length === 6 ? hex : hex.split('').map((c) => c + c).join(''), 16);
            this._colorFill.fillStyle(colorInt, 1);
            this._colorFill.fillRect(-width / 2, -height / 2, width, height);
        }

        if (this.imageSprite && this.isSkyBg) {
            const imgW = this.imageSprite.width;
            const imgH = this.imageSprite.height;
            const isPortrait = height > width;
            let scaleX = 1;
            let scaleY = 1;
            
            if (isPortrait) {
                scaleY = height / imgH;
                scaleX = scaleY; // keep aspect ratio
            } else {
                scaleX = width / imgW;
                scaleY = scaleX; // keep aspect ratio
            }
            
            this.imageSprite.setScale(scaleX, scaleY);
            this.imageSprite.x = 0;
            this.imageSprite.y = (height / 2) - (imgH * scaleY) / 2;
        }
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
