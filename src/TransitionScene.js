import Utils from "../core/framework/Utils";
import ParentScene from "../core/framework/components/Scene";
import SETTINGS from "../transition-screen-settings.json";
import Helper from "./Helper";

/**
 * TransitionScene
 * ---------------
 * Shown between gameplay levels. Displays a "Choose your next level"
 * header and one button per scene that is still available in this
 * build and has not yet been completed by the user.
 */

export default class TransitionScene extends ParentScene {
    constructor() {
        super('TransitionScene');
    }

    create() {
        if (this.mainContainer) {
            this._helper?.kill();
            this._helper = null;
            this._isTransitioning = false;
            this.mainContainer.removeAll(true);
        }

        this._buildUI();

        // Initial resize + listen for orientation changes
        setTimeout(() => {
            this._resize();
            this.scale.on('resize', () => setTimeout(() => this._resize(), 200));
        }, 50);

        this.events.once('shutdown', () => {
            this._helper?.kill();
            this.scale.removeAllListeners('resize');
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UI construction
    // ─────────────────────────────────────────────────────────────────────────

    _buildUI() {
        let available = window.App.stateManager.getAvailableScenes();
        if (window.App.isDev && SETTINGS.devLevelButtons && typeof SETTINGS.devLevelButtons === 'object') {
            available = Object.keys(SETTINGS.devLevelButtons).filter((sceneId) => SETTINGS.devLevelButtons[sceneId]);
        }

        // Background color behind the transition page
        const background = this.add.graphics();
        const backgroundColor = (SETTINGS.background && SETTINGS.background.color) ? SETTINGS.background.color : SETTINGS.overlay.color;
        const backgroundAlpha = (SETTINGS.background && typeof SETTINGS.background.alpha === 'number') ? SETTINGS.background.alpha : 1;
        background.fillStyle(parseInt(backgroundColor.replace('#', ''), 16), backgroundAlpha);
        background.fillRect(-3000, -3000, 6000, 6000);
        background.setCustomPosition(0, 0);
        background.setDepth((SETTINGS.overlay && typeof SETTINGS.overlay.depth === 'number') ? SETTINGS.overlay.depth - 1 : SETTINGS.uiDepth - 1);
        this.mainContainer.add(background);

        // Semi-transparent full-screen overlay
        const overlay = this.add.graphics();
        overlay.fillStyle(parseInt(SETTINGS.overlay.color.replace('#', ''), 16), SETTINGS.overlay.alpha);
        overlay.fillRect(-3000, -3000, 6000, 6000);
        overlay.setCustomPosition(0, 0);
        overlay.setDepth(SETTINGS.overlay.depth);
        this.mainContainer.add(overlay);

        // Title text
        const titleStyle = {
            fontFamily: SETTINGS.title.fontFamily,
            fontSize:   SETTINGS.title.fontSize,
            fontStyle:  SETTINGS.title.fontStyle,
            color:      SETTINGS.title.color,
            stroke:     SETTINGS.title.stroke,
            strokeThickness: SETTINGS.title.strokeThickness,
            align:      SETTINGS.title.align,
        };

        if (typeof SETTINGS.title.maxWidth === 'number') {
            titleStyle.wordWrap = { width: SETTINGS.title.maxWidth, useAdvancedWrap: true };
        }

        const title = this.add.text(0, 0, SETTINGS.title.text, titleStyle)
            .setOrigin(0.5, 0.5).setDepth(SETTINGS.uiDepth);
        title.addProperties(['pos']);
        title.px = 0; title.py = SETTINGS.title.y;
        title.lx = 0; title.ly = SETTINGS.title.y;
        this.mainContainer.add(title);

        // Level buttons — centred as a row, only for available scenes
        const count      = available.length;
        const totalWidth = (count - 1) * SETTINGS.buttons.spacing;
        const startX     = -totalWidth / 2;

        this._buttons = [];

        available.forEach((sceneId, i) => {
            const textureKey = SETTINGS.sceneButtonMap[sceneId];
            if (!textureKey) return;

            const bx = startX + i * SETTINGS.buttons.spacing;
            const targetScale = SETTINGS.buttons.scale;
            const introDelay = i * SETTINGS.buttons.introStaggerMs;

            const btn = this.add.image(0, 0, textureKey)
                .setScale(targetScale * 0.8)
                .setAlpha(0)
                .setDepth(SETTINGS.uiDepth)
                .setInteractive({ useHandCursor: true });

            const labelText = SETTINGS.sceneButtonLabels?.[sceneId];
            let label;
            if (labelText) {
                label = this.add.text(0, 0, labelText, {
                    fontFamily: SETTINGS.buttons.labelFontFamily || SETTINGS.title.fontFamily,
                    fontSize: SETTINGS.buttons.labelFontSize,
                    color: SETTINGS.buttons.labelColor,
                    stroke: SETTINGS.buttons.labelStroke,
                    strokeThickness: SETTINGS.buttons.labelStrokeThickness,
                    align: 'center'
                }).setDepth(SETTINGS.uiDepth + 20).setOrigin(0.5, 0.5)
                  .setScale(0.8)
                  .setAlpha(0);

                label.addProperties(['pos']);
                label.px = bx;
                label.py = SETTINGS.buttons.y - SETTINGS.buttons.labelOffsetY;
                label.lx = bx;
                label.ly = SETTINGS.buttons.y - SETTINGS.buttons.labelOffsetY;
                this.mainContainer.add(label);
                btn._label = label;
            }

            btn.addProperties(['pos']);
            btn.px = bx; btn.py = SETTINGS.buttons.y;
            btn.lx = bx; btn.ly = SETTINGS.buttons.y;
            this.mainContainer.add(btn);
            this._buttons.push(btn);
            if (typeof this.mainContainer.sort === 'function') {
                this.mainContainer.sort('depth');
            }

            this.tweens.add({
                targets: btn,
                alpha: 1,
                scaleX: targetScale,
                scaleY: targetScale,
                duration: SETTINGS.buttons.introDurationMs,
                ease: 'Bounce.Out',
                delay: introDelay
            });

            if (label) {
                this.tweens.add({
                    targets: label,
                    alpha: 1,
                    scaleX: 1,
                    scaleY: 1,
                    duration: SETTINGS.buttons.introDurationMs,
                    ease: 'Bounce.Out',
                    delay: introDelay
                });
            }

            btn.on('pointerover', () => {
                const hoverScaleBtn = targetScale * SETTINGS.buttons.hoverScale;
                this.tweens.add({
                    targets: btn,
                    scaleX: hoverScaleBtn,
                    scaleY: hoverScaleBtn,
                    duration: SETTINGS.buttons.tweenDurationMs,
                    ease: SETTINGS.buttons.tweenEase
                });
                if (btn._label) {
                    this.tweens.add({
                        targets: btn._label,
                        scaleX: SETTINGS.buttons.hoverScale,
                        scaleY: SETTINGS.buttons.hoverScale,
                        duration: SETTINGS.buttons.tweenDurationMs,
                        ease: SETTINGS.buttons.tweenEase
                    });
                }
            });
            btn.on('pointerout', () => {
                this.tweens.add({
                    targets: btn,
                    scaleX: targetScale,
                    scaleY: targetScale,
                    duration: SETTINGS.buttons.tweenDurationMs,
                    ease: SETTINGS.buttons.tweenEase
                });
                if (btn._label) {
                    this.tweens.add({
                        targets: btn._label,
                        scaleX: 1,
                        scaleY: 1,
                        duration: SETTINGS.buttons.tweenDurationMs,
                        ease: SETTINGS.buttons.tweenEase
                    });
                }
            });
            btn.on('pointerdown', () => {
                Utils.addAudio(this, 'click', 1.5);
                this._selectScene(sceneId, btn);
            });
        });

        this._helper = new Helper({ scene: this, container: this.mainContainer });
        this._helper.startLevelSelect(this._buttons);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Selection handler
    // ─────────────────────────────────────────────────────────────────────────

    _selectScene(sceneId, clickedButton) {
        if (this._isTransitioning) return;
        this._isTransitioning = true;
        if (!window.App._challengeStarted) {
            window.App._challengeStarted = true;
            if (typeof window.trackAxonEvent === 'function') window.trackAxonEvent('CHALLENGE_STARTED');
        }
        this._helper?.kill();
        this._helper = null;

        if (this._buttons) {
            this._buttons.forEach((btn) => btn.disableInteractive());
        }

        const targetScale = SETTINGS.buttons.scale * SETTINGS.buttons.clickScaleDown;
        this.tweens.add({
            targets: clickedButton,
            scaleX: targetScale,
            scaleY: targetScale,
            duration: SETTINGS.buttons.clickScaleDurationMs,
            yoyo: true,
            ease: 'Power1.Out'
        });
        if (clickedButton._label) {
            this.tweens.add({
                targets: clickedButton._label,
                scaleX: SETTINGS.buttons.clickScaleDown,
                scaleY: SETTINGS.buttons.clickScaleDown,
                duration: SETTINGS.buttons.clickScaleDurationMs,
                yoyo: true,
                ease: 'Power1.Out'
            });
        }
        this.time.delayedCall(SETTINGS.buttons.clickScaleDurationMs * 2, () => {
            this.tweens.add({
                targets: this.mainContainer,
                alpha: 0,
                duration: SETTINGS.buttons.fadeOutDurationMs,
                ease: 'Power1.Out',
                onComplete: () => {
                    this.scene.start('Game', { sceneId });
                }
            });
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Resize
    // ─────────────────────────────────────────────────────────────────────────

    _resize() {
        const isPortrait = this.scale.height > this.scale.width;
        this.game.size.isPortrait = isPortrait;
        this.game.size.resize();
    }
}
