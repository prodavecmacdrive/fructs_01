export default class GameStartedText extends Phaser.GameObjects.Container {
    constructor({ scene, container }) {
        super(scene, 0, 0);

        this.label = this.scene.add.text(0, 0, "Game Started", {
            fontFamily: 'LilitaOne-Regular, Arial',
            fontSize: 72,
            fontStyle: 'bold',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 6
        }).setDepth(10).setOrigin(0.5, 0.5);

        this.add(this.label);
        this.addProperties(["pos", "scale"]);
        this.px = 0;
        this.py = 0;
        this.lx = 0;
        this.ly = 0;
        this.pScaleX = 1;
        this.pScaleY = 1;
        this.lScaleX = 1;
        this.lScaleY = 1;

        this.setCustomPosition(0, 0).setAlign("Center");
        this.setAlpha(0);
        container.add(this);
    }

    show(duration = 300) {
        this.scene.tweens.add({ targets: this, alpha: 1, duration });
    }

    hide(duration = 300) {
        this.scene.tweens.add({ targets: this, alpha: 0, duration });
    }
}
