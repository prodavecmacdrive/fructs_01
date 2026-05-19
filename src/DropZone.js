import Utils from "../core/framework/Utils";

export default class DropZone extends Phaser.GameObjects.Container {
    constructor({ scene, x, y, type, targetCount, container }) {
        super(scene, x, y);
        this.scene = scene;
        this.zoneType = type; // 'edible' or 'not_edible'
        this.targetCount = targetCount;
        this.currentCount = 0;

        this.init();
        if (container) container.add(this);
    }

    init() {
        this.bg = this.scene.add.sprite(0, 0, 'merge_bg');
        this.add(this.bg);

        this.head = this.scene.add.sprite(0, -this.bg.height / 2, 'merge_head');
        this.head.setOrigin(0.5, 0.5);
        this.add(this.head);

        const titleText = this.zoneType === 'edible' ? 'Edible' : 'Non Edible';
        this.titleLabel = this.scene.add.text(0, 20, titleText, {
            fontFamily: 'Arial',
            fontSize: '32px',
            color: '#000000',
            fontWeight: 'bold'
        }).setOrigin(0.5);
        this.add(this.titleLabel);

        this.counterLabel = this.scene.add.text(0, -30, `0/${this.targetCount}`, {
            fontFamily: 'Arial',
            fontSize: '24px',
            color: '#000000',
            fontWeight: 'bold'
        }).setOrigin(0.5);
        this.add(this.counterLabel);

        this.errorCross = this.scene.add.text(0, 0, '❌', { fontSize: '64px' }).setOrigin(0.5).setAlpha(0);
        this.add(this.errorCross);

        this.setSize(this.bg.width, this.bg.height);
        Utils.addDefaultProperties(this);
        this.addProperties(['pos', 'scale', 'alpha']);
    }

    updateCounter() {
        this.currentCount++;
        this.counterLabel.setText(`${this.currentCount}/${this.targetCount}`);
    }

    showError() {
        this.scene.tweens.add({
            targets: this.errorCross,
            alpha: 1,
            duration: 100,
            yoyo: true,
            hold: 300,
            onComplete: () => {
                this.errorCross.setAlpha(0);
            }
        });
    }

    getBounds() {
        return super.getBounds();
    }
}
