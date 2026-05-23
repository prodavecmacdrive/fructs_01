export default class StartScreen {
    /**
     * Full-screen semi-transparent overlay with a centred start button.
     * @param {object}           opts
     * @param {Phaser.Scene}     opts.scene
     * @param {Phaser.GameObjects.Container} opts.container  – mainContainer
     * @param {function}         opts.onStart  – fired after the dismiss tween completes
     */
    constructor({ scene, container, onStart }) {
        this._scene     = scene;
        this._container = container;

        // Oversized rectangle covers any aspect ratio in container local-space
        this._overlay = scene.add.graphics();
        this._overlay.fillStyle(0x000000, 0.55);
        this._overlay.fillRect(-3000, -3000, 6000, 6000);
        this._overlay.setCustomPosition(0, 0);
        this._overlay.setDepth(40);
        container.add(this._overlay);

        // Start button — centred at (0, 0) in design-space
        this._btn = scene.add.image(0, 0, 'start_btn')
            .setScale(0.6)
            .setDepth(41)
            .setInteractive();
        this._btn.setCustomPosition(0, 0);
        this._btn.once('pointerdown', () => this._dismiss(onStart));
        container.add(this._btn);
    }

    _dismiss(onStart) {
        this._scene.tweens.add({
            targets:  [this._overlay, this._btn],
            alpha:    0,
            duration: 220,
            ease:     'Power2',
            onComplete: () => {
                this._overlay.destroy();
                this._btn.destroy();
                if (onStart) onStart();
            }
        });
    }
}
