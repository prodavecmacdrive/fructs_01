import Utils from "../core/framework/Utils";

export default class HoldCell extends Phaser.GameObjects.Container {
    constructor({ scene, cx, cy, container }) {
        super(scene, 0, 0);

        this.type = 'hold';
        this.isOccupied = false;
        this._highlighted = false;
        this._glowOverlay = null;

        const dz = scene.SETTINGS.dropZone;
        const scale = dz.scale ?? 1;

        this.holdImage = scene.add.image(0, 0, 'hold')
            .setScale(scale)
            .setDepth(0);
        this.add(this.holdImage);

        this.hitHalfW = (this.holdImage.width * scale) * 0.5;
        this.hitHalfH = (this.holdImage.height * scale) * 0.5;

        this.align = 'Local';
        this.addProperties(['pos', 'scale']);
        this.px = cx; this.py = cy;
        this.lx = cx; this.ly = cy;
        this.pScaleX = 1; this.pScaleY = 1;
        this.lScaleX = 1; this.lScaleY = 1;
        this.setCustomPosition(cx, cy);

        container.add(this);
        this.setDepth(3);
    }

    isOver(cardX, cardY) {
        return (
            Math.abs(cardX - this.x) < this.hitHalfW &&
            Math.abs(cardY - this.y) < this.hitHalfH
        );
    }

    acceptCard(card) {
        if (this.isOccupied) {
            return false;
        }

        const dz = this.scene.SETTINGS.dropZone;
        card.flyTo(this.x, this.y, card.scaleX, () => {
            this._attachCard(card);
            card.homeX = card.x;
            card.homeY = card.y;
            card._cx = card.x - Utils.getAlignX(card);
            card._cy = card.y - Utils.getAlignY(card);
            card.isLocked = false;
            this.isOccupied = true;
        });
        return true;
    }

    _attachCard(card) {
        if (card.parentContainer === this) return;

        const localX = (card.x - this.x) / this.scaleX;
        const localY = (card.y - this.y) / this.scaleY;
        card.x = localX;
        card.y = localY;
        card.setDepth(1);
        this.add(card);
    }

    setHighlight(active) {
        if (this._highlighted === active) return;
        this._highlighted = active;

        if (!this._glowOverlay) {
            const dz = this.scene.SETTINGS.dropZone;
            this._glowOverlay = this.scene.add.graphics();
            this._glowOverlay.fillStyle(0xffffff, 0.15);
            this._glowOverlay.fillRoundedRect(
                -this.hitHalfW, -this.hitHalfH,
                this.hitHalfW * 2, this.hitHalfH * 2, 20
            );
            this._glowOverlay.setDepth(2);
            this.add(this._glowOverlay);
        }

        this._glowOverlay.setVisible(active);

        const dz = this.scene.SETTINGS.dropZone;
        const targetScale = active ? dz.highlightScaleUp : 1.0;
        this._pScaleX = this._pScaleY = targetScale;
        this._lScaleX = this._lScaleY = targetScale;

        this.scene.tweens.killTweensOf(this);
        this.scene.tweens.add({
            targets: this,
            scaleX: targetScale,
            scaleY: targetScale,
            duration: dz.highlightDurationMs,
            ease: dz.highlightEase
        });
    }
}
