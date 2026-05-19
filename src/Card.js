export default class Card extends Phaser.GameObjects.Container {
    constructor(scene, itemKey, category) {
        super(scene, 0, 0);
        this.scene = scene;
        this.itemKey = itemKey;
        this.category = category;

        // Front
        this.front = scene.add.image(0, 0, 'card-front-bg');
        this.icon = scene.add.image(0, 0, itemKey);

        // Back
        this.back = scene.add.image(0, 0, 'card-back-bg');

        this.add([this.front, this.icon, this.back]);

        this.isFaceUp = true;
        this.setFaceUp(true);

        // Required for interaction inside container
        const width = this.front.width;
        const height = this.front.height;
        this.setSize(width, height);

        this.back.setInteractive();
        this.front.setInteractive();

        scene.add.existing(this);
    }

    setFaceUp(value) {
        this.isFaceUp = value;
        this.back.setVisible(!value);
        this.front.setVisible(value);
        this.icon.setVisible(value);

        if (this.back.input) this.back.input.enabled = !value;
        if (this.front.input) this.front.input.enabled = value;
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
            pScaleX: zone.pScaleX * 0.8,
            pScaleY: zone.pScaleY * 0.8,
            duration: 300,
            ease: 'Power2'
        });
        this.back.disableInteractive();
        this.front.disableInteractive();
    }

    shakeAndBack() {
        this.scene.tweens.add({
            targets: this,
            px: this.px + 15,
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
            pScaleX: this.originalScale,
            pScaleY: this.originalScale,
            duration: 300,
            ease: 'Back.easeOut'
        });
        this.setDepth(20);
    }
}
