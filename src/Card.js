import Utils from "../core/framework/Utils";

export default class Card extends Phaser.GameObjects.Container {
    /**
     * @param {object} opts
     * @param {Phaser.Scene} opts.scene
     * @param {string}  opts.type
     * @param {string}  opts.icon
     * @param {number}  opts.cx
     * @param {number}  opts.cy
     * @param {boolean} opts.isFaceUp
     * @param {Phaser.GameObjects.Container} opts.container
     */
    constructor({ scene, type, icon, cx, cy, isFaceUp, container }) {
        super(scene, 0, 0);

        Utils.addDefaultProperties(this);

        this.type          = type;
        this.iconKey       = icon;
        this.isFaceUp      = isFaceUp;
        this.isLocked    = false;
        this.isFlipping  = false;
        this.columnIndex = -1;

        this._buildVisuals();
        container.add(this);

        this.addProperties(['pos', 'scale']);
        this.px = cx; this.py = cy;
        this.lx = cx; this.ly = cy;
        this.pScaleX = 1; this.pScaleY = 1;
        this.lScaleX = 1; this.lScaleY = 1;
        this.setCustomPosition(cx, cy).setAlign('Center');

        const S = this.scene.SETTINGS.card.faceScale;
        const w = (this.frontBg.width || 130) * S;
        const h = (this.frontBg.height || 170) * S;
        this.setSize(w, h);
        this.setInteractive();

        this.on('pointerdown', (pointer, localX, localY, event) => {
            if (!window.App.userInteracted) {
                window.App.userInteracted = true;
                if (this.scene?.sound) this.scene.sound.mute = false;
            }
            if (this.scene.gameOver || this.scene.isAnimating || !this.scene.isTutorialReady) return;
            if (this.isLocked) return;
            if (this.scene.activeCard === this) return;
            this.scene.helper?.notifyDragStart();
            if (event && event.stopPropagation) event.stopPropagation();
            if (this.columnIndex >= 0) {
                this.scene._onColumnTapped(this.columnIndex);
            }
        });

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
        const I = this.scene.SETTINGS.card.iconScale;
        const Y = this.scene.SETTINGS.card.iconOffsetY;
        const flameKey = this.scene.textures.exists('card_flame_bg') ? 'card_flame_bg' : (this.scene.textures.exists('card-flame-bg') ? 'card-flame-bg' : 'card_front_bg');
        this.backImg   = this.scene.add.image(0, 0, 'card_back_bg').setScale(S);
        this.flameBg   = this.scene.add.image(0, 0, flameKey).setScale(S);
        this.frontBg   = this.scene.add.image(0, 0, 'card_front_bg').setScale(S);
        if (this.iconKey === 'gradient') {
            this.frontIcon = this.scene.add.image(0, Y, 'gradient').setScale(S);
        } else {
            this.frontIcon = this.scene.add.image(0, Y, this.iconKey).setScale(I);
        }
        this.flameBg.setVisible(false).setAlpha(0);
        this.add([this.backImg, this.flameBg, this.frontBg, this.frontIcon]);
    }

    showGlow(staggerDelay = 0) {
        if (this.isGlowing) return;
        this.isGlowing = true;

        const S = this.scene.SETTINGS.card.faceScale;

        if (this.flameBg) {
            this.flameBg.setVisible(true).setAlpha(0).setScale(S);

            this.scene.tweens.add({
                targets: this.flameBg,
                alpha: 0.9,
                duration: 350,
                ease: 'Power2.Out',
                onComplete: () => {
                    // Continuous subtle pulse animation for card-flame-bg.png
                    this.scene.tweens.add({
                        targets: this.flameBg,
                        alpha: { value: 0.45, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }
                    });
                    this.scene.tweens.add({
                        targets: this.flameBg,
                        scaleX: { value: S * 1.08, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' },
                        scaleY: { value: S * 1.08, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }
                    });
                }
            });
        }

        // Floating effect on the card
        const startY = this.y;
        this.scene.tweens.add({
            targets: this,
            y: startY - 6,
            duration: 1400,
            delay: staggerDelay,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
            onUpdate: () => {
                const curAlignY = Utils.getAlignY(this);
                const offsetY = this.y - curAlignY;
                this.py = offsetY;
                this.ly = offsetY;
                this._cy = offsetY;
            }
        });
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

    // ─── Movement ─────────────────────────────────────────────────────────────

    moveTo(newCx, newCy, duration, ease, onComplete) {
        const alignX = Utils.getAlignX(this);
        const alignY = Utils.getAlignY(this);
        const targetX = alignX + newCx;
        const targetY = alignY + newCy;

        this.scene.tweens.killTweensOf(this);
        this.scene.tweens.add({
            targets: this,
            x: targetX,
            y: targetY,
            duration: duration || this.scene.SETTINGS.animations.shiftDurationMs || 250,
            ease: ease || this.scene.SETTINGS.animations.shiftEase || 'Power2.Out',
            onUpdate: () => {
                const curAlignX = Utils.getAlignX(this);
                const curAlignY = Utils.getAlignY(this);
                const offsetX = this.x - curAlignX;
                const offsetY = this.y - curAlignY;
                this.px = offsetX; this.py = offsetY;
                this.lx = offsetX; this.ly = offsetY;
                this._cx = offsetX; this._cy = offsetY;
            },
            onComplete: () => {
                this.px = newCx; this.py = newCy;
                this.lx = newCx; this.ly = newCy;
                this.setCustomPosition(newCx, newCy);
                if (onComplete) onComplete();
            }
        });
    }

    syncCustomProps() {
        const curAlignX = Utils.getAlignX(this);
        const curAlignY = Utils.getAlignY(this);
        this.px = this.x - curAlignX;
        this.py = this.y - curAlignY;
        this.lx = this.px; this.ly = this.py;
        this._cx = this.px; this._cy = this.py;
    }

    finalizePosition(newCx, newCy) {
        this.scene.tweens.killTweensOf(this);
        this.angle = 0;
        this.px = newCx; this.py = newCy;
        this.lx = newCx; this.ly = newCy;
        this.setCustomPosition(newCx, newCy);
    }

    advancedMoveTo(config) {
        const { newCx, newCy, duration, ease, delay, angle, liftDistance, liftDuration, onComplete } = config;
        this.scene.tweens.killTweensOf(this);
        
        const targetX = Utils.getAlignX(this) + newCx;
        const targetY = Utils.getAlignY(this) + newCy;
        
        if (liftDistance) {
            // Dragged card logic (timeline)
            const timeline = this.scene.tweens.createTimeline();
            const startX = this.x;
            const moveX = targetX - startX;
            let tiltAngle = 0;
            if (angle) {
                // Tilt based on direction (reversed)
                tiltAngle = moveX > 10 ? -angle : (moveX < -10 ? angle : 0);
            }

            // Phase 1: Move to target X, and lift slightly above target Y
            timeline.add({
                targets: this,
                x: targetX,
                y: targetY - liftDistance,
                angle: tiltAngle,
                duration: liftDuration || 200,
                ease: 'Power2.InOut',
                onUpdate: () => this.syncCustomProps()
            });

            // Phase 2: Drop vertically and settle tilt
            timeline.add({
                targets: this,
                y: targetY,
                angle: 0,
                duration: duration || 300,
                ease: ease || 'Bounce.easeOut',
                onUpdate: () => this.syncCustomProps(),
                onComplete: () => {
                    this.finalizePosition(newCx, newCy);
                    if (onComplete) onComplete();
                }
            });
            timeline.play();
        } else {
            // Standard or inertial move
            this.scene.tweens.add({
                targets: this,
                x: targetX,
                y: targetY,
                angle: angle || 0,
                duration: duration || 250,
                delay: delay || 0,
                ease: ease || 'Power2.Out',
                onUpdate: () => this.syncCustomProps(),
                onComplete: () => {
                    this.finalizePosition(newCx, newCy);
                    if (onComplete) onComplete();
                }
            });
        }
    }

    // ─── Animations ───────────────────────────────────────────────────────────

    flip(onComplete) {
        if (this.isFlipping) return;
        this.isFlipping = true;

        const anim = this.scene.SETTINGS.animations;
        const cardSX = this.scene.SETTINGS.card.faceScale;
        const cardSY = this.scene.SETTINGS.card.faceScale;
        const iconSX = (this.iconKey === 'gradient') ? cardSX : this.scene.SETTINGS.card.iconScale;
        const iconSY = (this.iconKey === 'gradient') ? cardSY : this.scene.SETTINGS.card.iconScale;
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
                const curAlignX = Utils.getAlignX(this);
                const curAlignY = Utils.getAlignY(this);
                this.px = this.x - curAlignX;
                this.py = this.y - curAlignY;
                this.lx = this.px; this.ly = this.py;
                this._cx = this.px; this._cy = this.py;
            },
            onComplete: () => {
                this.scene.tweens.add({
                    targets: this.backImg,
                    scaleX: 0,
                    duration: anim.cardFlipHalfDurationMs,
                    ease: anim.cardFlipEase,
                    onComplete: () => {
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
                                        const curAlignX = Utils.getAlignX(this);
                                        const curAlignY = Utils.getAlignY(this);
                                        this.px = this.x - curAlignX;
                                        this.py = this.y - curAlignY;
                                        this.lx = this.px; this.ly = this.py;
                                        this._cx = this.px; this._cy = this.py;
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

    destroy(fromScene) {
        super.destroy(fromScene);
    }
}
