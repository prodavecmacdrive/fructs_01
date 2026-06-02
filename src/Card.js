import Utils     from "../core/framework/Utils";

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
    * @param {Phaser.GameObjects.Container} opts.container – gameplay container
     * @param {function} opts.onDrop     – callback(card) when pointer is released
     * @param {function} [opts.onDragMove] – callback(card) on every drag-move tick
     */
    constructor({ scene, type, icon, cx, cy, isFaceUp, iconScale, container, onDrop, onDragMove }) {
        super(scene, 0, 0);

        this.type          = type;
        this.iconKey       = icon;
        this.iconScale     = iconScale;
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

        // Position in gameplay-container local-space.
        this.align = 'Local';
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
        const S = this.scene.SETTINGS.card.faceScale;
        const I = this.iconScale ?? this.scene.SETTINGS.card.iconScale;
        const Y = this.scene.SETTINGS.card.iconOffsetY;
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

        const S = this.scene.SETTINGS.card.faceScale;
        const w = this.frontBg.width  * S;
        const h = this.frontBg.height * S;
        this.setSize(w, h).setInteractive();

        this.on('pointerdown', (pointer, lx, ly, ev) => {
            ev.stopPropagation();
            if (this.isLocked || !this.dragEnabled) return;
            Utils.addAudio(this.scene, 'click', 1.5);
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

    /** Convert screen-space pointer coords to the parent container's local coords. */
    _toLocal(px, py) {
        if (this.parentContainer && typeof this.parentContainer.getLocalPoint === 'function') {
            return this.parentContainer.getLocalPoint(px, py);
        }

        const gip = Utils.getInputPoint(this, px, py);
        return {
            x: gip.x + this.scene.game.size.x,
            y: gip.y + this.scene.game.size.y
        };
    }

    _startDrag(pointer) {
        this.scene.helper?.notifyDragStart();
        this.isDragging = true;
        const local = this._toLocal(pointer.x, pointer.y);
        this.grabOX = local.x - this.x;
        this.grabOY = local.y - this.y;
        this.dragTargetX = this.x;
        this.dragTargetY = this.y;
        this.dragVx = 0;

        if (this.parentContainer && this.parentContainer !== this.scene.boardContainer) {
            if (this.parentContainer.type === 'hold') {
                this.parentContainer.isOccupied = false;
            }
            const worldPoint = this.getWorldTransformMatrix().transformPoint(0, 0);
            const localPoint = this.scene.boardContainer.getLocalPoint(worldPoint.x, worldPoint.y);
            this.parentContainer.remove(this);
            this.scene.boardContainer.add(this);
            this.x = localPoint.x;
            this.y = localPoint.y;
            this.homeX = localPoint.x;
            this.homeY = localPoint.y;
            this._cx = this.x - Utils.getAlignX(this);
            this._cy = this.y - Utils.getAlignY(this);
        }

        this._onMove = (ptr) => { if (this.isDragging) this._moveDrag(ptr); };
        this._onUp   = ()    => { if (this.isDragging) this._endDrag();     };
        this.scene.input.on('pointermove', this._onMove);
        this.scene.input.on('pointerup', this._onUp);
        this.scene.input.on('pointerupoutside', this._onUp);

        this.scene.tweens.killTweensOf(this);
        const anim = this.scene.SETTINGS.animations;
        this.scene.tweens.add({
            targets: this,
            scaleX: anim.dragPickupScale, scaleY: anim.dragPickupScale,
            duration: anim.dragPickupDurationMs,
            ease: anim.dragPickupEase
        });
        this._bringToFront();
    }

    _bringToFront() {
        const container = this.parentContainer || this.scene.mainContainer;
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

        // Synchronize custom properties cx/cy with raw x/y to prevent 
        // the global resize listener from snapping the card back.
        this._cx = this.x - Utils.getAlignX(this);
        this._cy = this.y - Utils.getAlignY(this);

        const velX = this.x - prevX;
        this.dragVx = this.dragVx * 0.65 + velX * 0.35;

        const S = this.scene.SETTINGS.card.faceScale;
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
        // Sync design-space offsets so the resize system doesn't snap this card
        // back to a stale position before shakeAndReturn runs.
        this._cx = this.x - Utils.getAlignX(this);
        this._cy = this.y - Utils.getAlignY(this);
        this.angle = 0;
        this.setDepth(this.scene.SETTINGS.deckStack.topCardDepthFaceUp);
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
            duration: this.scene.SETTINGS.animations.flyToDurationMs,
            ease:     this.scene.SETTINGS.animations.flyToEase,
            onComplete
        });
    }

    /** Show red cross, shake, fly back to home position. */
    shakeAndReturn(onComplete) {
        this.isLocked = true;
        this.scene.tweens.killTweensOf(this);

        const cross  = this._makeCross();
        const anim   = this.scene.SETTINGS.animations;
        this.add(cross);

        const origX = this.x;
        this.scene.tweens.add({
            targets: this,
            x: origX + anim.shakeOffsetPx,
            duration: anim.shakeDurationMs, yoyo: true, repeat: anim.shakeRepeat, ease: 'Power1',
            onUpdate: () => {
                this._cx = this.x - Utils.getAlignX(this);
            },
            onComplete: () => {
                cross.destroy();
                this.scene.tweens.add({
                    targets: this,
                    x: this.homeX, y: this.homeY,
                    scaleX: 1, scaleY: 1, angle: 0,
                    duration: anim.returnHomeDurationMs,
                    ease:     anim.returnHomeEase,
                    onUpdate: () => {
                        // Synchronize custom properties during the tween
                        this._cx = this.x - Utils.getAlignX(this);
                        this._cy = this.y - Utils.getAlignY(this);
                    },
                    onComplete: () => {
                        // Final snap to ensure alignment
                        this._cx = this.homeX - Utils.getAlignX(this);
                        this._cy = this.homeY - Utils.getAlignY(this);
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

        const anim = this.scene.SETTINGS.animations;
        const cardSX = this.scene.SETTINGS.card.faceScale;
        const cardSY = this.scene.SETTINGS.card.faceScale;
        const iconSX = this.iconScale ?? this.scene.SETTINGS.card.iconScale;
        const iconSY = this.iconScale ?? this.scene.SETTINGS.card.iconScale;
        const flipStart = performance.now();
        const originalY = this.y;
        const liftDistance = 22;
        const liftScale = 1.06;
        const liftDuration = 130;
        const fallDuration = 180;

        this.scene.tweens.killTweensOf([this.backImg, this.frontBg, this.frontIcon, this]);

        Utils.addAudio(this.scene, 'pop', 0.8);

        this.backImg.setVisible(true).setScale(cardSX, cardSY);
        this.frontBg.setVisible(false).setScale(cardSX, cardSY);
        this.frontIcon.setVisible(false).setScale(iconSX, iconSY);
        this.isFaceUp = false;

        this.scene.tweens.add({
            targets: this,
            y: originalY - liftDistance,
            scaleX: liftScale,
            scaleY: liftScale,
            duration: liftDuration,
            ease: 'Power2.Out',
            onUpdate: () => {
                this._cx = this.x - Utils.getAlignX(this);
                this._cy = this.y - Utils.getAlignY(this);
            },
            onComplete: () => {
                this.scene.tweens.add({
                    targets: this.backImg,
                    scaleX: 0,
                    duration: anim.cardFlipHalfDurationMs,
                    ease: anim.cardFlipEase,
                    onComplete: () => {
                        const midTime = performance.now();

                        this.backImg.setVisible(false);
                        this.frontBg.setVisible(true).setScale(0, cardSY);
                        this.frontIcon.setVisible(true).setScale(0, iconSY);

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
                                this.scene.tweens.add({
                                    targets: this,
                                    y: originalY,
                                    scaleX: 1,
                                    scaleY: 1,
                                    duration: fallDuration,
                                    ease: 'Back.Out',
                                    onUpdate: () => {
                                        this._cx = this.x - Utils.getAlignX(this);
                                        this._cy = this.y - Utils.getAlignY(this);
                                    },
                                    onComplete: () => {
                                        this.isFaceUp = true;
                                        this.isFlipping = false;
                                        if (onComplete) onComplete();
                                    }
                                });
                            }
                        });
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
