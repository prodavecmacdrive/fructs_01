import Utils from '../core/framework/Utils';

export default class Card extends Phaser.GameObjects.Container {
    constructor(scene, itemKey, category) {
        super(scene, 0, 0);
        this.scene = scene;
        this.category = category;

        this.frontBg = scene.add.image(0, 0, 'card-front-bg');
        this.icon = scene.add.image(0, 0, itemKey);
        this.backBg = scene.add.image(0, 0, 'card-back-bg');

        this.add([this.frontBg, this.icon, this.backBg]);
        this.setSize(this.frontBg.width, this.frontBg.height);

        // Framework compatibility
        Utils.addDefaultProperties(this);
        this.addProperties(['pos', 'scale', 'align']);

        this.setFaceUp(true);
        this.backBg.setInteractive();
        this.frontBg.setInteractive();

        scene.add.existing(this);
    }

    setFaceUp(value) {
        this.backBg.setVisible(!value);
        this.frontBg.setVisible(value);
        this.icon.setVisible(value);
        if (this.backBg.input) this.backBg.input.enabled = !value;
        if (this.frontBg.input) this.frontBg.input.enabled = value;
    }

    flip() {
        this.scene.tweens.add({
            targets: this,
            pScaleX: 0,
            duration: 150,
            onComplete: () => {
                this.setFaceUp(true);
                this.scene.tweens.add({
                    targets: this,
                    pScaleX: this.originalScale || 0.75,
                    duration: 150
                });
            }
        });
    }

    magnetizeTo(zone) {
        this.scene.tweens.add({
            targets: this,
            px: zone.px,
            py: zone.py,
            pScaleX: 0.6,
            pScaleY: 0.6,
            duration: 300,
            ease: 'Power2'
        });
        this.backBg.disableInteractive();
        this.frontBg.disableInteractive();
    }

    shakeAndBack() {
        const ox = this.px;
        this.scene.tweens.add({
            targets: this,
            px: ox + 15,
            duration: 50,
            yoyo: true,
            repeat: 3,
            onComplete: () => {
                this.returnToStack();
            }
        });
    }

    returnToStack() {
        this.scene.tweens.add({
            targets: this,
            px: this.originalX,
            py: this.originalY,
            pScaleX: this.originalScale || 0.75,
            pScaleY: this.originalScale || 0.75,
            duration: 300,
            ease: 'Back.easeOut'
        });
        this.setDepth(20);
    }
}
