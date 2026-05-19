import Utils from '../core/framework/Utils';

export default class DropZone extends Phaser.GameObjects.Container {
    constructor(scene, title, category) {
        super(scene, 0, 0);
        this.scene = scene;
        this.category = category;
        this.count = 0;

        this.bg = scene.add.image(0, 0, 'merge_bg');
        this.head = scene.add.image(0, -110, 'merge_head');

        this.titleText = scene.add.text(0, -110, title, {
            fontFamily: 'Arial', fontSize: '24px', color: '#ffffff', fontWeight: 'bold'
        }).setOrigin(0.5);

        this.counterText = scene.add.text(0, 40, '0/4', {
            fontFamily: 'Arial', fontSize: '48px', color: '#333333', fontWeight: 'bold'
        }).setOrigin(0.5);

        this.add([this.bg, this.head, this.titleText, this.counterText]);

        Utils.addDefaultProperties(this);
        this.addProperties(['pos', 'scale', 'align']);

        this.errorCross = scene.add.graphics();
        this.errorCross.lineStyle(10, 0xff0000);
        this.errorCross.moveTo(-50, -50).lineTo(50, 50).moveTo(50, -50).lineTo(-50, 50);
        this.errorCross.setVisible(false);
        this.add(this.errorCross);

        scene.add.existing(this);
    }

    increment() {
        this.count++;
        this.counterText.setText(this.count + '/4');
    }

    showError() {
        this.errorCross.setVisible(true);
        this.scene.time.delayedCall(500, () => {
            this.errorCross.setVisible(false);
        });
    }
}
