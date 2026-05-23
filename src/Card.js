import Utils     from "../core/framework/Utils";
import SETTINGS  from "../game-settings.json";

export default class Card extends Phaser.GameObjects.Container {
    /**
     * A draggable card that shows either a face-up (icon) or face-down (back) side.
     * @param {object} opts
     * @param {Phaser.Scene} opts.scene
     * @param {string}  opts.type      – 'edible' | 'not_edible'
     * @param {string}  opts.icon      – texture key for the item icon
     * @param {number}  opts.cx        – design-space x offset from screen centre
     * @param {number}  opts.cy        – design-space y offset from screen centre
     * @param {boolean} opts.isFaceUp
     * @param {Phaser.GameObjects.Container} opts.container – mainContainer
     * @param {function} opts.onDrop     – callback(card) when pointer is released
     * @param {function} [opts.onDragMove] – callback(card) on every drag-move tick
     */
    constructor({ scene, type, icon, cx, cy, isFaceUp, container, onDrop, onDragMove }) {
        super(scene, 0, 0);

        this.type          = type;
        this.iconKey       = icon;
        this.isFaceUp      = isFaceUp;
        this.onDropCb      = onDrop;
        this.onDragMoveCb  = onDragMove || null;
        this.isDragging  = false;
        this.isLocked    = false;
        this.dragEnabled = false;
        this.dragTargetX = 0;
        this.dragTargetY = 0;
        this.dragVx      = 0;
        this.isFlipping  = false;

        // Position in mainContainer local-space (same coordinate system as cx/cy setters)
        this.cx = cx;
        this.cy = cy;
        this.homeX = this.x;
        this.homeY = this.y;

        this._buildVisuals();
        container.add(this);

        if (isFaceUp) {
            this._showFront();
            this.setDepth(5);
        } else {
            this._showBack();
            this.setDepth(2);
        }
    }

    // ─── Visuals ──────────────────────────────────────────────────────────────

    _buildVisuals() {
        const S = SETTINGS.card.faceScale;
        const I = SETTINGS.card.iconScale;
        const Y = SETTINGS.card.iconOffsetY;
        this.backImg   = this.scene.add.image(0, 0, 'card_back_bg').setScale(S);
        this.frontBg   = this.scene.add.image(0, 0, 'card_front_bg').setScale(S);
        this.frontIcon = this.scene.add.image(0, Y, this.iconKey).setScale(I);
        this.add([this.backImg, this.frontBg, this.frontIcon]);
    }

    _showFront() {
        this.isFaceUp = true;
        this.backImg.setVisible(false);
        this.frontBg.setVisible(true);
        this.frontIcon.setVisible(true);
    }

    _showBack() {
        this.isFaceUp = false;
        this.backImg.setVisible(true);
        this.frontBg.setVisible(false);
        this.frontIcon.setVisible(false);
    }

    // ─── Drag ─────────────────────────────────────────────────────────────────

    enableDrag() {
        if (this.dragEnabled) return;
        this.dragEnabled = true;

        const S = SETTINGS.card.faceScale;
        const w = this.frontBg.width  * S;
        const h = this.frontBg.height * S;
        this.setSize(w, h).setInteractive();

        this.on('pointerdown', (pointer, lx, ly, ev) => {
            ev.stopPropagation();
            if (this.isLocked || !this.dragEnabled) return;
            this._startDrag(pointer);
        });
    }

    disableDrag() {
        if (!this.dragEnabled) return;
        this.dragEnabled = false;
        this.disableInteractive();
        this.off('pointerdown');
        if (this._onMove) {
            this.scene.input.off('pointermove', this._onMove);
            this._onMove = null;
        }
        if (this._onUp) {
            this.scene.input.off('pointerup', this._onUp);
            this.scene.input.off('pointerupoutside', this._onUp);
            this._onUp = null;
        }
    }

    /** Convert screen-space pointer coords to mainContainer local coords. */
    _toLocal(px, py) {
        const gip = Utils.getInputPoint(this, px, py);
        return {
            x: gip.x + this.scene.game.size.x,
            y: gip.y + this.scene.game.size.y
        };
    }

    _startDrag(pointer) {
        this.isDragging = true;
        const local = this._toLocal(pointer.x, pointer.y);
        this.grabOX = local.x - this.x;
        this.grabOY = local.y - this.y;
        this.dragTargetX = this.x;
        this.dragTargetY = this.y;
        this.dragVx = 0;

        this._onMove = (ptr) => { if (this.isDragging) this._moveDrag(ptr); };
        this._onUp   = ()    => { if (this.isDragging) this._endDrag();     };
        this.scene.input.on('pointermove', this._onMove);
        this.scene.input.on('pointerup', this._onUp);
        this.scene.input.on('pointerupoutside', this._onUp);

        this.scene.tweens.killTweensOf(this);
        const anim = SETTINGS.animations;
        this.scene.tweens.add({
            targets: this,
            scaleX: anim.dragPickupScale, scaleY: anim.dragPickupScale,
            duration: anim.dragPickupDurationMs,
            ease: anim.dragPickupEase
        });
        this._bringToFront();
    }

    _bringToFront() {
        const container = this.scene.mainContainer;
        if (!container || !container.list) {
            this.scene.children.bringToTop(this);
            return;
        }

        let maxDepth = 0;
        for (const child of container.list) {
            if (child === this) continue;
            if (typeof child.depth === 'number' && child.depth > maxDepth) {
                maxDepth = child.depth;
            }
        }
        this.setDepth(maxDepth + 1);
        if (typeof container.sort === 'function') {
            container.sort('depth');
        }
    }

    _moveDrag(pointer) {
        const local = this._toLocal(pointer.x, pointer.y);
        const nextX = local.x - this.grabOX;
        const nextY = local.y - this.grabOY;

        this.dragTargetX = nextX;
        this.dragTargetY = nextY;

        const prevX = this.x;
        this.x += (this.dragTargetX - this.x) * 0.48;
        this.y += (this.dragTargetY - this.y) * 0.48;

        const velX = this.x - prevX;
        this.dragVx = this.dragVx * 0.65 + velX * 0.35;

        const S = SETTINGS.card.faceScale;
        const bias = -(this.grabOY / (this.frontBg.height * S * 0.5));
        const rawAngle = this.dragVx * 17 + bias * 5;
        const targetAngle = Math.max(-20, Math.min(20, rawAngle));
        this.angle += (targetAngle - this.angle) * 0.35;

        if (this.onDragMoveCb) this.onDragMoveCb(this);
    }

    _endDrag() {
        this.isDragging = false;
        if (this._onMove) {
            this.scene.input.off('pointermove', this._onMove);
            this._onMove = null;
        }
        if (this._onUp) {
            this.scene.input.off('pointerup', this._onUp);
            this.scene.input.off('pointerupoutside', this._onUp);
            this._onUp = null;
        }
        this.x = this.dragTargetX;
        this.y = this.dragTargetY;
        this.angle = 0;
        this.setDepth(SETTINGS.deckStack.topCardDepthFaceUp);
        if (this.onDropCb) this.onDropCb(this);
    }

    // ─── Animations ───────────────────────────────────────────────────────────

    /** Magnetise to zone centre and shrink to fit. */
    flyTo(targetX, targetY, targetScale, onComplete) {
        this.isLocked = true;
        this.scene.tweens.killTweensOf(this);
        this.scene.tweens.add({
            targets: this,
            x: targetX, y: targetY,
            scaleX: targetScale, scaleY: targetScale,
            angle: 0,
            duration: SETTINGS.animations.flyToDurationMs,
            ease:     SETTINGS.animations.flyToEase,
            onComplete
        });
    }

    /** Show red cross, shake, fly back to home position. */
    shakeAndReturn(onComplete) {
        this.isLocked = true;
        this.scene.tweens.killTweensOf(this);

        const cross  = this._makeCross();
        const anim   = SETTINGS.animations;
        this.add(cross);

        const origX = this.x;
        this.scene.tweens.add({
            targets: this,
            x: origX + anim.shakeOffsetPx,
            duration: anim.shakeDurationMs, yoyo: true, repeat: anim.shakeRepeat, ease: 'Power1',
            onComplete: () => {
                cross.destroy();
                this.scene.tweens.add({
                    targets: this,
                    x: this.homeX, y: this.homeY,
                    scaleX: 1, scaleY: 1, angle: 0,
                    duration: anim.returnHomeDurationMs,
                    ease:     anim.returnHomeEase,
                    onComplete: () => {
                        this.isLocked = false;
                        if (onComplete) onComplete();
                    }
                });
            }
        });
    }

    /** Y-axis card flip: hides back, reveals front. */
    flip(onComplete) {
        if (this.isFlipping) return;
        this.isFlipping = true;

        const anim = SETTINGS.animations;
        const cardSX = SETTINGS.card.faceScale;
        const cardSY = SETTINGS.card.faceScale;
        const iconSX = SETTINGS.card.iconScale;
        const iconSY = SETTINGS.card.iconScale;

        this.scene.tweens.killTweensOf([this.backImg, this.frontBg, this.frontIcon]);

        // First half: only the back is visible and rotates towards edge-on.
        this.backImg.setVisible(true).setScale(cardSX, cardSY);
        this.frontBg.setVisible(false).setScale(cardSX, cardSY);
        this.frontIcon.setVisible(false).setScale(iconSX, iconSY);
        this.isFaceUp = false;

        this.scene.tweens.add({
            targets: this.backImg,
            scaleX: 0,
            duration: anim.cardFlipHalfDurationMs,
            ease: anim.cardFlipEase,
            onComplete: () => {
                // Midpoint swap: hide back instantly, show front at edge-on.
                this.backImg.setVisible(false);
                this.frontBg.setVisible(true).setScale(0, cardSY);
                this.frontIcon.setVisible(true).setScale(0, iconSY);

                // Second half: front expands from edge-on to full width.
                this.scene.tweens.add({
                    targets: this.frontIcon,
                    scaleX: iconSX,
                    duration: anim.cardFlipHalfDurationMs,
                    ease: anim.cardFlipEase
                });
                this.scene.tweens.add({
                    targets: this.frontBg,
                    scaleX: cardSX,
                    duration: anim.cardFlipHalfDurationMs,
                    ease: anim.cardFlipEase,
                    onComplete: () => {
                        this.isFaceUp = true;
                        this.isFlipping = false;
                        if (onComplete) onComplete();
                    }
                });
            }
        });
    }

    /** Draw a red ✕ using Graphics. */
    _makeCross() {
        const g = this.scene.add.graphics();
        g.lineStyle(7, 0xff2222, 1);
        const s = 28;
        g.lineBetween(-s, -s, s, s);
        g.lineBetween( s, -s,-s, s);
        return g;
    }

    destroy(fromScene) {
        this.disableDrag();
        super.destroy(fromScene);
    }
}
