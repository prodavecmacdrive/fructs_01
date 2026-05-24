export default class Logo extends Phaser.GameObjects.Container {
    constructor({ scene, texture, text = "YOUR LOGO", px, py, lx, ly, pScaleX = 0, pScaleY = 0, lScaleX = 0, lScaleY = 0, align = "Center", container }) {
        super(scene, 0, 0);
        this.loopedAnimation = undefined;

        if (texture && window.App.resources.textures[texture]) {
            this.logo = this.scene.add.image(0, 0, texture).setDepth(8).setOrigin(0.5, 0.5);
        } else {
            this.logo = this.scene.add.text(0, 0, text, {
                fontFamily: 'LilitaOne-Regular, Arial',
                fontSize: 80,
                fontStyle: 'bold',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 8
            }).setDepth(8).setOrigin(0.5, 0.5);
        }

        this.add(this.logo);
        this.addProperties(["pos", "scale"]);
        this.px = px;
        this.py = py;
        this.lx = lx;
        this.ly = ly;
        this.pScaleX = pScaleX;
        this.pScaleY = pScaleY;
        this.lScaleX = lScaleX;
        this.lScaleY = lScaleY;

        this.setCustomPosition(0, 0).setAlign(align);
        container.add(this);
    }

    animate({ pScaleX = this.pScaleX, pScaleY = this.pScaleY, lScaleX = this.lScaleX, lScaleY = this.lScaleY,
        alpha = 1, duration = 0, yoyo = false, delay = 0,
        px = this.px, py = this.py, lx = this.lx, ly = this.ly,
        ease = "Cubic", onComplete = () => {}, repeat = 0 }) {
        const animation = this.scene.tweens.add({ targets: this, px, py, lx, ly, alpha, pScaleX, pScaleY, lScaleX, lScaleY, duration, yoyo, ease, delay, repeat, onComplete });
        if (repeat === -1) {
            if (this.loopedAnimation) this.loopedAnimation.stop();
            this.loopedAnimation = animation;
        }
    }

    changeTexture(texture) {
        if (this.logo.type === 'Image') this.logo.setTexture(texture);
    }
}