import Utils from "../core/framework/Utils";
import SETTINGS from "../final-window-settings.json";
import Helper from "./Helper";

/**
 * FinalWindow
 * -----------
 * Full-screen end-state overlay containing:
 *   • a translucent black backdrop + blurred background
 *   • ico (final_window_ico) – dog icon appearing with bounce, then pulsing and shaking +/- 5 deg
 *   • shining (final_window_ico_shaining) – glowing halo under ico, pulsing scale/alpha and synchronous shaking
 *   • btnL & btnR (ANIMALS & WIZARDS) – appearing alternately with bubble effect below ico
 *   • arrowL & arrowR – sliding out from under ico with 45-deg rotation
 */
export default class FinalWindow {
    constructor({ scene, container, onCta }) {
        this._scene     = scene;
        this._container = container;
        this._onCta     = onCta;

        this._blurBg      = null;
        this._blurTexKey  = null;
        this._loops       = [];

        this._buildOverlay();
        this._buildArrows();
        this._buildShining();
        this._buildIco();
        this._buildButtons();

        this.setVisible(false);

        const launchDelay = SETTINGS.autoShowOnLaunchMs;
        if (typeof launchDelay === 'number' && launchDelay > 0) {
            this._scene.time.delayedCall(launchDelay, () => {
                if (!this._overlay.visible) {
                    this.show();
                }
            });
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Construction
    // ─────────────────────────────────────────────────────────────────────────

    _buildOverlay() {
        const cfg = SETTINGS.overlay;
        this._overlay = this._scene.add.graphics();
        this._overlay.fillStyle(0x000000, cfg.fillAlpha);
        this._overlay.fillRect(-3000, -3000, 6000, 6000);
        this._overlay.setCustomPosition(0, 0);
        this._overlay.setDepth(cfg.depth);
        this._overlay.setAlpha(0);
        this._overlay.setInteractive();
        this._overlay.on('pointerdown', (pointer) => {
            pointer.event.stopPropagation();
        });
        this._container.add(this._overlay);
    }

    _buildArrows() {
        const cfgL = SETTINGS.arrowL;
        const cfgR = SETTINGS.arrowR;

        this._arrowL = this._scene.add.image(0, 0, 'final_window_arrow_l');
        this._arrowL.addProperties(['pos', 'scale', 'angle']);
        this._arrowL.setAlign(cfgL.align || 'Top');
        this._arrowL.px = cfgL.startX ?? 0;
        this._arrowL.py = cfgL.startY ?? 320;
        this._arrowL.lx = cfgL.startX ?? 0;
        this._arrowL.ly = (cfgL.startY ?? 320) - 30;
        this._arrowL.pScaleX = this._arrowL.pScaleY = cfgL.pScale;
        this._arrowL.lScaleX = this._arrowL.lScaleY = cfgL.lScale;
        this._arrowL.pAngle  = this._arrowL.lAngle  = cfgL.startAngle;
        this._arrowL.setDepth(cfgL.depth);
        this._arrowL.setAlpha(0);
        this._container.add(this._arrowL);

        this._arrowR = this._scene.add.image(0, 0, 'final_window_arrow_r');
        this._arrowR.addProperties(['pos', 'scale', 'angle']);
        this._arrowR.setAlign(cfgR.align || 'Top');
        this._arrowR.px = cfgR.startX ?? 0;
        this._arrowR.py = cfgR.startY ?? 320;
        this._arrowR.lx = cfgR.startX ?? 0;
        this._arrowR.ly = (cfgR.startY ?? 320) - 30;
        this._arrowR.pScaleX = this._arrowR.pScaleY = cfgR.pScale;
        this._arrowR.lScaleX = this._arrowR.lScaleY = cfgR.lScale;
        this._arrowR.pAngle  = this._arrowR.lAngle  = cfgR.startAngle;
        this._arrowR.setDepth(cfgR.depth);
        this._arrowR.setAlpha(0);
        this._container.add(this._arrowR);
    }

    _buildShining() {
        const cfg = SETTINGS.shining;
        this._shining = this._scene.add.image(0, 0, 'final_window_ico_shaining');
        this._shining.addProperties(['pos', 'scale', 'angle']);
        this._shining.setAlign(cfg.align || 'Top');
        this._shining.px = cfg.portraitX;
        this._shining.py = cfg.portraitY;
        this._shining.lx = cfg.landscapeX;
        this._shining.ly = cfg.landscapeY;
        this._shining.pScaleX = this._shining.pScaleY = 0;
        this._shining.lScaleX = this._shining.lScaleY = 0;
        this._shining.pAngle  = this._shining.lAngle  = 0;
        this._shining.setDepth(cfg.depth);
        this._shining.setAlpha(0);
        this._container.add(this._shining);
    }

    _buildIco() {
        const cfg = SETTINGS.ico;
        this._ico = this._scene.add.image(0, 0, 'final_window_ico');
        this._ico.addProperties(['pos', 'scale', 'angle']);
        this._ico.setAlign(cfg.align || 'Top');
        this._ico.px = cfg.portraitX;
        this._ico.py = cfg.portraitY;
        this._ico.lx = cfg.landscapeX;
        this._ico.ly = cfg.landscapeY;
        this._ico.pScaleX = this._ico.pScaleY = 0;
        this._ico.lScaleX = this._ico.lScaleY = 0;
        this._ico.pAngle  = this._ico.lAngle  = 0;
        this._ico.setDepth(cfg.depth);
        this._ico.setAlpha(0);
        this._container.add(this._ico);
    }

    _buildButtons() {
        const cfgL = SETTINGS.btnL;
        const cfgR = SETTINGS.btnR;

        this._btnL = this._scene.add.image(0, 0, 'final_window_btn_l');
        this._btnL.addProperties(['pos', 'scale']);
        this._btnL.setAlign(cfgL.align || 'Bottom');
        this._btnL.px = cfgL.portraitX;
        this._btnL.py = cfgL.portraitY;
        this._btnL.lx = cfgL.landscapeX;
        this._btnL.ly = cfgL.landscapeY;
        this._btnL.pScaleX = this._btnL.pScaleY = 0;
        this._btnL.lScaleX = this._btnL.lScaleY = 0;
        this._btnL.setDepth(cfgL.depth);
        this._btnL.setAlpha(0);
        this._btnL.setInteractive();
        this._btnL.on('pointerdown', () => {
            Utils.addAudio(this._scene, 'click', 1.5);
            this._animatePress(this._btnL, () => this._handleCtaClick());
        });
        this._container.add(this._btnL);

        this._btnR = this._scene.add.image(0, 0, 'final_window_btn_r');
        this._btnR.addProperties(['pos', 'scale']);
        this._btnR.setAlign(cfgR.align || 'Bottom');
        this._btnR.px = cfgR.portraitX;
        this._btnR.py = cfgR.portraitY;
        this._btnR.lx = cfgR.landscapeX;
        this._btnR.ly = cfgR.landscapeY;
        this._btnR.pScaleX = this._btnR.pScaleY = 0;
        this._btnR.lScaleX = this._btnR.lScaleY = 0;
        this._btnR.setDepth(cfgR.depth);
        this._btnR.setAlpha(0);
        this._btnR.setInteractive();
        this._btnR.on('pointerdown', () => {
            Utils.addAudio(this._scene, 'click', 1.5);
            this._animatePress(this._btnR, () => this._handleCtaClick());
        });
        this._container.add(this._btnR);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Visibility & Accessors
    // ─────────────────────────────────────────────────────────────────────────

    setVisible(visible) {
        if (this._blurBg) this._blurBg.setVisible(visible);
        this._overlay.setVisible(visible);
        this._arrowL.setVisible(visible);
        this._arrowR.setVisible(visible);
        this._shining.setVisible(visible);
        this._ico.setVisible(visible);
        this._btnL.setVisible(visible);
        this._btnR.setVisible(visible);
    }

    get buttons() { return [this._btnL, this._btnR]; }
    get btnFin()  { return this._btnL; }

    // ─────────────────────────────────────────────────────────────────────────
    // Show sequence
    // ─────────────────────────────────────────────────────────────────────────

    show() {
        if (typeof window.trackAxonEvent === 'function') {
            window.trackAxonEvent('CHALLENGE_SOLVED');
            window.trackAxonEvent('ENDCARD_SHOWN');
        }

        // 1. Make the game field non-interactive by disabling drag on active cards
        if (this._scene._decks) {
            for (const deck of this._scene._decks) {
                if (deck.activeCard) {
                    deck.activeCard.disableDrag();
                }
            }
        }

        // 2. Interrupt and hide the previous helper
        if (this._scene.helper) {
            this._scene.helper.kill();
            this._scene.helper = null;
        }

        this._captureBlurredBackground(() => {
            const maxDepth = this._container.list.reduce((max, child) => {
                if (child === this._overlay || child === this._ico || child === this._shining ||
                    child === this._btnL    || child === this._btnR  || child === this._arrowL ||
                    child === this._arrowR  || child === this._blurBg || child.isHelperHint) return max;
                return (typeof child.depth === 'number' && child.depth > max) ? child.depth : max;
            }, -Infinity);

            const blurDepth    = Number.isFinite(maxDepth) ? maxDepth + 1 : SETTINGS.overlay.depth - 1;
            const overlayDepth = blurDepth + 1;

            if (this._blurBg) this._blurBg.setDepth(blurDepth);
            this._overlay.setDepth(overlayDepth);
            this._arrowL.setDepth(overlayDepth + 1);
            this._arrowR.setDepth(overlayDepth + 1);
            this._shining.setDepth(overlayDepth + 2);
            this._ico.setDepth(overlayDepth + 3);
            this._btnL.setDepth(overlayDepth + 4);
            this._btnR.setDepth(overlayDepth + 4);

            if (typeof this._container.sort === 'function') {
                this._container.sort('depth');
            }

            this.setVisible(true);
            this._fadeInOverlay();
            this._animateIco();
            this._animateShining();
            this._animateButtons();
            this._animateArrows();

            // 3. Assign and start the final window helper
            this._scene.helper = new Helper({ scene: this._scene, container: this._container });
            this._scene.helper.startFinalScreen(this.buttons || this.btnFin);
        });
    }

    _captureBlurredBackground(onReady) {
        const blurRadius = SETTINGS.overlay.blurRadius ?? 12;

        this._scene.game.renderer.snapshot((domImg) => {
            try {
                const W = domImg.width  || this._scene.scale.width;
                const H = domImg.height || this._scene.scale.height;

                const offscreen = document.createElement('canvas');
                offscreen.width  = W;
                offscreen.height = H;
                const ctx = offscreen.getContext('2d');
                ctx.filter = `blur(${blurRadius}px)`;
                ctx.drawImage(domImg, 0, 0);

                const key = '__fw_blur_bg';
                if (this._scene.textures.exists(key)) {
                    this._scene.textures.remove(key);
                    if (this._blurBg) { this._blurBg.destroy(); this._blurBg = null; }
                }
                this._scene.textures.addCanvas(key, offscreen);
                this._blurTexKey = key;

                const s = this._scene.game.size.scale;
                this._blurBg = this._scene.add.image(0, 0, key);
                this._blurBg.setDisplaySize(W / s, H / s);
                this._blurBg.setCustomPosition(0, 0);
                this._blurBg.setAlpha(0);
                this._container.add(this._blurBg);
            } catch (_e) {}
            onReady();
        });
    }

    _fadeInOverlay() {
        const cfg = SETTINGS.overlay;
        if (this._blurBg) {
            this._scene.tweens.add({ targets: this._blurBg, alpha: 1, duration: 400, ease: 'Power2' });
        }
        this._scene.tweens.add({ targets: this._overlay, alpha: cfg.targetAlpha, duration: 400, ease: 'Power2' });
    }

    _animateIco() {
        const cfg  = SETTINGS.ico;
        const anim = cfg.intro;

        this._scene.tweens.add({
            targets:  this._ico,
            alpha:    1,
            pScaleX:  cfg.pScale,
            pScaleY:  cfg.pScale,
            lScaleX:  cfg.lScale,
            lScaleY:  cfg.lScale,
            duration: anim.durationMs,
            delay:    anim.delayMs,
            ease:     anim.ease,
            onComplete: () => this._startIcoLoop()
        });
    }

    _animateShining() {
        const cfg  = SETTINGS.shining;
        const anim = cfg.intro;

        this._scene.tweens.add({
            targets:  this._shining,
            alpha:    1,
            pScaleX:  cfg.pScale,
            pScaleY:  cfg.pScale,
            lScaleX:  cfg.lScale,
            lScaleY:  cfg.lScale,
            duration: anim.durationMs,
            delay:    anim.delayMs,
            ease:     anim.ease,
            onComplete: () => this._startShiningLoop()
        });
    }

    _animateButtons() {
        const cfgL = SETTINGS.btnL;
        const cfgR = SETTINGS.btnR;

        this._scene.tweens.add({
            targets:  this._btnL,
            alpha:    1,
            pScaleX:  cfgL.pScale,
            pScaleY:  cfgL.pScale,
            lScaleX:  cfgL.lScale,
            lScaleY:  cfgL.lScale,
            duration: cfgL.intro.durationMs,
            delay:    cfgL.intro.delayMs,
            ease:     cfgL.intro.ease
        });

        this._scene.tweens.add({
            targets:  this._btnR,
            alpha:    1,
            pScaleX:  cfgR.pScale,
            pScaleY:  cfgR.pScale,
            lScaleX:  cfgR.lScale,
            lScaleY:  cfgR.lScale,
            duration: cfgR.intro.durationMs,
            delay:    cfgR.intro.delayMs,
            ease:     cfgR.intro.ease
        });
    }

    _animateArrows() {
        const cfgL = SETTINGS.arrowL;
        const cfgR = SETTINGS.arrowR;

        this._scene.tweens.add({
            targets:  this._arrowL,
            alpha:    1,
            px:       cfgL.portraitX,
            py:       cfgL.portraitY,
            lx:       cfgL.landscapeX,
            ly:       cfgL.landscapeY,
            pAngle:   cfgL.targetAngle,
            lAngle:   cfgL.targetAngle,
            duration: cfgL.intro.durationMs,
            delay:    cfgL.intro.delayMs,
            ease:     cfgL.intro.ease
        });

        this._scene.tweens.add({
            targets:  this._arrowR,
            alpha:    1,
            px:       cfgR.portraitX,
            py:       cfgR.portraitY,
            lx:       cfgR.landscapeX,
            ly:       cfgR.landscapeY,
            pAngle:   cfgR.targetAngle,
            lAngle:   cfgR.targetAngle,
            duration: cfgR.intro.durationMs,
            delay:    cfgR.intro.delayMs,
            ease:     cfgR.intro.ease
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Continuous loops
    // ─────────────────────────────────────────────────────────────────────────

    _startIcoLoop() {
        const cfg   = SETTINGS.ico;
        const pulse = cfg.pulse;
        const pPeak = cfg.pScale + pulse.scaleAdd;
        const lPeak = cfg.lScale + pulse.scaleAdd;

        // Smooth scale pulsing
        const scaleTw = this._scene.tweens.add({
            targets:  this._ico,
            pScaleX:  pPeak,
            pScaleY:  pPeak,
            lScaleX:  lPeak,
            lScaleY:  lPeak,
            duration: pulse.durationMs,
            ease:     pulse.ease,
            yoyo:     true,
            repeat:   -1
        });
        this._loops.push(scaleTw);

        // Turn first one way (+5 deg), then alternate +/- 5 deg
        const startTurnTw = this._scene.tweens.add({
            targets:  this._ico,
            pAngle:   pulse.angleAdd,
            lAngle:   pulse.angleAdd,
            duration: pulse.durationMs * 0.45,
            ease:     'Sine.InOut',
            onComplete: () => {
                const turnTw = this._scene.tweens.add({
                    targets:  this._ico,
                    pAngle:   -pulse.angleAdd,
                    lAngle:   -pulse.angleAdd,
                    duration: pulse.durationMs * 0.9,
                    ease:     'Sine.InOut',
                    yoyo:     true,
                    repeat:   -1
                });
                this._loops.push(turnTw);
            }
        });
        this._loops.push(startTurnTw);
    }

    _startShiningLoop() {
        const cfg   = SETTINGS.shining;
        const pulse = cfg.pulse;
        const pPeak = cfg.pScale + pulse.scaleAdd;
        const lPeak = cfg.lScale + pulse.scaleAdd;

        // Scale pulse
        const scaleTw = this._scene.tweens.add({
            targets:  this._shining,
            pScaleX:  pPeak,
            pScaleY:  pPeak,
            lScaleX:  lPeak,
            lScaleY:  lPeak,
            duration: pulse.durationMs,
            ease:     pulse.ease,
            yoyo:     true,
            repeat:   -1
        });
        this._loops.push(scaleTw);

        // Alpha shift from 100% transparency
        const alphaTw = this._scene.tweens.add({
            targets:  this._shining,
            alpha:    pulse.alphaMin,
            duration: pulse.durationMs * 0.8,
            ease:     'Sine.InOut',
            yoyo:     true,
            repeat:   -1
        });
        this._loops.push(alphaTw);

        // Synchronous turn with ico (+/- 5 deg)
        const startTurnTw = this._scene.tweens.add({
            targets:  this._shining,
            pAngle:   pulse.angleAdd,
            lAngle:   pulse.angleAdd,
            duration: pulse.durationMs * 0.45,
            ease:     'Sine.InOut',
            onComplete: () => {
                const turnTw = this._scene.tweens.add({
                    targets:  this._shining,
                    pAngle:   -pulse.angleAdd,
                    lAngle:   -pulse.angleAdd,
                    duration: pulse.durationMs * 0.9,
                    ease:     'Sine.InOut',
                    yoyo:     true,
                    repeat:   -1
                });
                this._loops.push(turnTw);
            }
        });
        this._loops.push(startTurnTw);
    }

    _animatePress(btn, onDone) {
        const normalP = btn._pScaleX || 0.85;
        const normalL = btn._lScaleX || 0.85;

        this._scene.tweens.add({
            targets:  btn,
            pScaleX:  normalP * 0.88,
            pScaleY:  normalP * 0.88,
            lScaleX:  normalL * 0.88,
            lScaleY:  normalL * 0.88,
            duration: 130,
            ease:     'Power2.In',
            yoyo:     true,
            onComplete: () => { if (onDone) onDone(); }
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CTA
    // ─────────────────────────────────────────────────────────────────────────

    _handleCtaClick() {
        const now = performance.now();
        if (this._lastCtaTime && now - this._lastCtaTime < 500) return;
        this._lastCtaTime = now;

        if (this._onCta) this._onCta();
    }
}

