import Utils from "../core/framework/Utils";

export default class Card extends Phaser.GameObjects.Container {
    constructor({ scene, x, y, type, id, isFaceUp, container }) {
        super(scene, x, y);
        this.scene = scene;
        this.cardType = type; // 'edible' or 'not_edible'
        this.cardId = id; // e.g., 1, 2, 3, 4
        this.isFaceUp = isFaceUp;
        this.isDragging = false;

        this.init();
        if (container) container.add(this);
    }

    init() {
        this.bg = this.scene.add.sprite(0, 0, this.isFaceUp ? 'card-front-bg' : 'card-back-bg');
        this.add(this.bg);

        this.icon = this.scene.add.sprite(0, 0, `${this.cardType}_${this.cardId}`);
        this.add(this.icon);
        this.icon.setVisible(this.isFaceUp);

        this.setSize(this.bg.width, this.bg.height);

        // Add responsive properties if needed, but since it's in a stack, maybe not direct
        // Actually, we might need them for the initial positions if we don't manage them in Game.js
        Utils.addDefaultProperties(this);
        this.addProperties(['pos', 'scale', 'angle', 'alpha']);
    }

    flip(callback) {
        if (this.isFaceUp) return;

        this.scene.tweens.add({
            targets: this,
            scaleX: 0,
            duration: 150,
            onComplete: () => {
                this.isFaceUp = true;
                this.bg.setTexture('card-front-bg');
                this.icon.setVisible(true);
                this.scene.tweens.add({
                    targets: this,
                    scaleX: 1,
                    duration: 150,
                    onComplete: () => {
                        if (callback) callback();
                    }
                });
            }
        });
    }

    shake() {
        const originalX = this.x;
        this.scene.tweens.add({
            targets: this,
            x: originalX - 10,
            duration: 50,
            yoyo: true,
            repeat: 3
        });
    }

    flyBack(originalPos, callback) {
        this.scene.tweens.add({
            targets: this,
            x: originalPos.x,
            y: originalPos.y,
            scaleX: 1,
            scaleY: 1,
            duration: 300,
            ease: 'Power2',
            onComplete: () => {
                this.isDragging = false;
                if (callback) callback();
            }
        });
    }

    magnetize(targetPos, targetScale, callback) {
        this.scene.tweens.add({
            targets: this,
            x: targetPos.x,
            y: targetPos.y,
            scaleX: targetScale,
            scaleY: targetScale,
            duration: 300,
            ease: 'Back.easeOut',
            onComplete: () => {
                if (callback) callback();
            }
        });
    }
}
