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
            scaleX: 0,
            duration: 150,
            onComplete: () => {
                this.setFaceUp(true);
                this.scene.tweens.add({
                    targets: this,
                    scaleX: this.originalScale || 0.75,
                    duration: 150
                });
            }
        });
    }

    magnetizeTo(zone) {
        this.scene.tweens.add({
            targets: this,
            x: zone.x,
            y: zone.y,
            scale: zone.scaleX * 0.8,
            duration: 300,
            ease: 'Power2'
        });
        this.back.disableInteractive();
        this.front.disableInteractive();
    }

    shakeAndBack() {
        this.scene.tweens.add({
            targets: this,
            x: this.x + 15,
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
            x: this.originalX,
            y: this.originalY,
            scale: this.originalScale,
            duration: 300,
            ease: 'Back.easeOut'
        });
        this.setDepth(20);
    }
}
