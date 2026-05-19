import Utils from "../core/framework/Utils";

export default class MovesCounter extends Phaser.GameObjects.Container {
    constructor({ scene, x, y, moves, container }) {
        super(scene, x, y);
        this.scene = scene;
        this.moves = moves;

        this.init();
        if (container) container.add(this);
    }

    init() {
        this.bg = this.scene.add.sprite(0, 0, 'moves_bg');
        this.add(this.bg);

        this.label = this.scene.add.text(0, 0, `Moves : ${this.moves}`, {
            fontFamily: 'Arial',
            fontSize: '40px',
            color: '#000000',
            fontWeight: 'bold'
        }).setOrigin(0.5);
        this.add(this.label);

        Utils.addDefaultProperties(this);
        this.addProperties(['pos', 'scale', 'alpha', 'align']);
    }

    updateMoves(moves) {
        this.moves = moves;
        this.label.setText(`Moves : ${this.moves}`);
    }
}
