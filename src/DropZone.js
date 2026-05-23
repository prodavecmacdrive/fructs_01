import SETTINGS from "../game-settings.json";

export default class DropZone extends Phaser.GameObjects.Container {
    /**
     * A sorting drop zone.  Visual: merge_bg + merge_head + counter + label.
     * @param {object} opts
     * @param {Phaser.Scene} opts.scene
     * @param {string}  opts.label     – display label, e.g. 'Edible'
     * @param {string}  opts.type      – 'edible' | 'not_edible'
     * @param {number}  opts.cx        – design-space x offset from screen centre
     * @param {number}  opts.cy        – design-space y offset from screen centre
     * @param {number}  opts.target    – cards required to complete (default 4)
     * @param {Phaser.GameObjects.Container} opts.container
     * @param {function} opts.onComplete – called when all cards accepted
     */
    constructor({ scene, label, type, cx, cy, target = 4, container, onComplete }) {
        super(scene, 0, 0);

        this.label      = label;
        this.type       = type;
        this.target     = target;
        this.count      = 0;
        this.isComplete = false;
        this.onCompleteCb = onComplete;
        this._highlighted  = false;
        this._headRevealed = false;

        const dz = SETTINGS.dropZone;

        this.hitHalfW = dz.hitHalfWidth;
        this.hitHalfH = dz.hitHalfHeight;

        const S = dz.scale;

        // Head group – added BEFORE bg so it starts hidden behind bg.
        // It slides upward on first card drop, emerging from beneath the bg.
        this.head = scene.add.image(0, dz.bgOffsetY, 'merge_head').setScale(S);
        this.add(this.head);

        this.headLabel = scene.add.text(0, dz.bgOffsetY, label, {
            fontFamily: dz.headTextFontFamily,
            fontSize:   dz.headTextFontSize,
            fontStyle:  dz.headTextFontStyle,
            color:      dz.headTextColor,
            align:      'center'
        }).setOrigin(0.5, 0.5);
        this.add(this.headLabel);

        // bg added AFTER head → renders in front, covering head until it slides out
        this.bg = scene.add.image(0, dz.bgOffsetY, 'merge_bg').setScale(S);
        this.add(this.bg);

        this.counterText = scene.add.text(dz.counterOffsetX ?? 0, dz.counterOffsetY, `0/${target}`, {
            fontFamily: dz.counterTextFontFamily,
            fontSize:   dz.counterFontSize,
            fontStyle:  dz.counterTextFontStyle,
            color:      dz.counterTextColor,
            stroke:     dz.counterTextStroke,
            strokeThickness: dz.counterTextStrokeThickness
        }).setOrigin(0.5, 0.5).setDepth(1);
        this.add(this.counterText);

        const displayLabel = label.replace(' ', '\n');
        this.labelText = scene.add.text(0, dz.labelOffsetY, displayLabel, {
            fontFamily: dz.labelTextFontFamily,
            fontSize:   dz.labelFontSize,
            fontStyle:  dz.labelTextFontStyle,
            color:      dz.labelTextColor,
            align:      'center'
        }).setOrigin(0.5, 0.5).setDepth(1);
        this.add(this.labelText);

        // Wire into the responsive system
        this.addProperties(['pos', 'scale']);
        this.px = cx; this.py = cy;
        this.lx = cx; this.ly = cy;
        this.pScaleX = 1; this.pScaleY = 1;
        this.lScaleX = 1; this.lScaleY = 1;
        this.setCustomPosition(0, 0).setAlign('Center');

        container.add(this);
        this.setDepth(3);
    }

    /** Returns true if the given mainContainer-local point is within the zone's hit area. */
    isOver(cardX, cardY) {
        return (
            Math.abs(cardX - this.x) < this.hitHalfW &&
            Math.abs(cardY - this.y) < this.hitHalfH
        );
    }

    /**
     * Accept a card: fly it to zone centre, update counter, possibly complete.
     * @param {Card} card
     */
    acceptCard(card) {
        this.count++;
        const dz = SETTINGS.dropZone;
        card.flyTo(this.x, this.y + dz.acceptedCardOffsetY, dz.acceptedCardScale, () => {
            this._attachAcceptedCard(card);
            this._updateCounter();
            if (this.count === 1) this._revealHead();
            if (this.count >= this.target) {
                this.isComplete = true;
                this._playComplete();
                if (this.onCompleteCb) this.onCompleteCb();
            }
        });
    }

    _attachAcceptedCard(card) {
        if (card.parentContainer === this) return;

        const localX = (card.x - this.x) / this.scaleX;
        const localY = (card.y - this.y) / this.scaleY;
        card.x = localX;
        card.y = localY;
        card.setDepth(0);
        this.add(card);
        this.counterText.setDepth(2);
        if (typeof this.bringToTop === 'function') {
            this.bringToTop(this.counterText);
        }
    }

    _updateCounter() {
        this.counterText.setText(`${this.count}/${this.target}`);
    }

    _revealHead() {
        if (this._headRevealed) return;
        this._headRevealed = true;
        const dz = SETTINGS.dropZone;

        // Body label fades out
        this.scene.tweens.add({
            targets: this.labelText,
            alpha: 0,
            duration: dz.bodyLabelFadeDurationMs,
            ease: 'Power2'
        });

        // Head + headLabel slide up from behind the bg to their final position
        this.scene.tweens.add({
            targets: this.head,
            y: dz.headOffsetY,
            duration: dz.headRevealDurationMs,
            ease:     dz.headRevealEase
        });
        this.scene.tweens.add({
            targets: this.headLabel,
            y: dz.headTextFOffsetY ?? dz.headOffsetY,
            duration: dz.headRevealDurationMs,
            ease:     dz.headRevealEase
        });
    }

    _playComplete() {
        const dz = SETTINGS.dropZone;
        this.scene.tweens.add({
            targets: this,
            scaleX: dz.completeBounceScale, scaleY: dz.completeBounceScale,
            duration: dz.completeBounceMs, yoyo: true, ease: 'Power2'
        });
    }

    /**
     * Highlight this zone when a card is being dragged over it.
     * Shows a white glow overlay and scales the zone up slightly.
     */
    setHighlight(active) {
        if (this._highlighted === active) return;
        this._highlighted = active;

        if (!this._glowOverlay) {
            const dz = SETTINGS.dropZone;
            this._glowOverlay = this.scene.add.graphics();
            this._glowOverlay.fillStyle(0xffffff, dz.highlightGlowAlpha);
            this._glowOverlay.fillRoundedRect(
                -this.hitHalfW, -this.hitHalfH,
                this.hitHalfW * 2, this.hitHalfH * 2, 20
            );
            this._glowOverlay.setDepth(2);
            this.add(this._glowOverlay);
        }

        const dz = SETTINGS.dropZone;
        this._glowOverlay.setVisible(active);
        this.scene.tweens.killTweensOf(this);
        this.scene.tweens.add({
            targets: this,
            scaleX: active ? dz.highlightScaleUp : 1.0,
            scaleY: active ? dz.highlightScaleUp : 1.0,
            duration: dz.highlightDurationMs,
            ease:     dz.highlightEase
        });
    }
}
