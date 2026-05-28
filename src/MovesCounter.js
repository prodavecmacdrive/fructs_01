export default class MovesCounter extends Phaser.GameObjects.Container {
    /**
     * Top-panel moves counter.  Visual: "Moves : N" text only.
     * @param {object} opts
     * @param {Phaser.Scene} opts.scene
     * @param {number}  opts.moves    – starting move count
     * @param {number}  opts.cx       – design-space x offset from screen centre
     * @param {number}  opts.cy       – design-space y offset from screen centre
     * @param {Phaser.GameObjects.Container} opts.container
     */
    constructor({ scene, moves, cx, cy, container }) {
        super(scene, 0, 0);

        this.remaining = moves;

        const mc = this.scene.SETTINGS.movesCounter;

        this.label = scene.add.text(mc.textOffsetX, mc.textOffsetY, this._buildText(), {
            fontFamily: mc.textFontFamily,
            fontSize:   mc.fontSize,
            fontStyle:  mc.textFontStyle,
            color:      mc.textColor,
            stroke:     mc.textStroke,
            strokeThickness: mc.textStrokeThickness
        }).setOrigin(0.5, 0.5).setDepth(1);
        this.add(this.label);

        // Wire into the responsive system
        this.addProperties(['pos', 'scale']);
        this.px = cx; this.py = cy;
        this.lx = cx; this.ly = cy;
        this.pScaleX = 1; this.pScaleY = 1;
        this.lScaleX = 1; this.lScaleY = 1;
        this.setCustomPosition(0, 0).setAlign('Center');

        container.add(this);
        this.setDepth(6);
    }

    /** Decrease count by 1 and refresh the label.  Returns remaining moves. */
    decrement() {
        if (this.remaining > 0) this.remaining--;
        this.label.setText(this._buildText());
        const mc = this.scene.SETTINGS.movesCounter;
        this.scene.tweens.add({
            targets: this,
            scaleX: mc.shakeFeedbackScale, scaleY: mc.shakeFeedbackScale,
            duration: mc.shakeDurationMs, yoyo: true, ease: 'Power1'
        });

        return this.remaining;
    }

    _buildText() {
        return `Moves : ${this.remaining}`;
    }
}
