import SETTINGS from "../final-window-settings.json";

/**
 * FinalWindow
 * -----------
 * Full-screen end-state overlay containing:
 *   • a translucent black backdrop
 *   • imgFin  – win image near the top, bounces in then pulses continuously
 *   • btnFin  – CTA button near the bottom, zooms in then twitches periodically
 *
 * Usage:
 *   const fw = new FinalWindow({ scene, container, onCta: () => ctaClick() });
 *   fw.setVisible(false);          // hidden at game start
 *   fw.show();                     // call when the game ends
 */
export default class FinalWindow {
    constructor({ scene, container, onCta }) {
        this._scene     = scene;
        this._container = container;
        this._onCta     = onCta;

        this._twitchTimer = null;

        this._buildOverlay();
        this._buildImgFin();
        this._buildBtnFin();

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

        this._container.add(this._overlay);
    }

    _buildImgFin() {
        const cfg = SETTINGS.imgFin;

        this._imgFin = this._scene.add.image(0, 0, 'imgFin');
        this._imgFin.addProperties(['pos', 'scale']);
        this._imgFin.setAlign('Top');
        this._imgFin.px = cfg.portraitX;
        this._imgFin.py = cfg.portraitY;
        this._imgFin.lx = cfg.landscapeX;
        this._imgFin.ly = cfg.landscapeY;
        this._imgFin.pScaleX = 0;
        this._imgFin.pScaleY = 0;
        this._imgFin.lScaleX = 0;
        this._imgFin.lScaleY = 0;
        this._imgFin.setDepth(cfg.depth);
        this._imgFin.setAlpha(0);

        this._container.add(this._imgFin);
    }

    _buildBtnFin() {
        const cfg = SETTINGS.btnFin;

        this._btnFin = this._scene.add.image(0, 0, 'btnFin');
        this._btnFin.addProperties(['pos', 'scale']);
        this._btnFin.setAlign('Bottom');
        this._btnFin.px = cfg.portraitX;
        this._btnFin.py = cfg.portraitY;
        this._btnFin.lx = cfg.landscapeX;
        this._btnFin.ly = cfg.landscapeY;
        this._btnFin.pScaleX = 0;
        this._btnFin.pScaleY = 0;
        this._btnFin.lScaleX = 0;
        this._btnFin.lScaleY = 0;
        this._btnFin.setDepth(cfg.depth);
        this._btnFin.setAlpha(0);
        this._btnFin.setInteractive();
        this._btnFin.on('pointerdown', () => this._handleCtaClick());

        this._container.add(this._btnFin);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Visibility
    // ─────────────────────────────────────────────────────────────────────────

    setVisible(visible) {
        this._overlay.setVisible(visible);
        this._imgFin.setVisible(visible);
        this._btnFin.setVisible(visible);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Show sequence
    // ─────────────────────────────────────────────────────────────────────────

    show() {
        this.setVisible(true);
        this._fadeInOverlay();
        this._animateImgFin();
        this._animateBtnFin();
    }

    _fadeInOverlay() {
        const cfg = SETTINGS.overlay;
        this._scene.tweens.add({
            targets:  this._overlay,
            alpha:    cfg.targetAlpha,
            duration: 400,
            ease:     'Power2'
        });
    }

    _animateImgFin() {
        const cfg  = SETTINGS.imgFin;
        const anim = cfg.intro;

        this._scene.tweens.add({
            targets:  this._imgFin,
            alpha:    1,
            pScaleX:  cfg.pScale,
            pScaleY:  cfg.pScale,
            lScaleX:  cfg.lScale,
            lScaleY:  cfg.lScale,
            duration: anim.durationMs,
            delay:    anim.delayMs,
            ease:     anim.ease,
            onComplete: () => this._startImgFinPulse()
        });
    }

    _animateBtnFin() {
        const cfg  = SETTINGS.btnFin;
        const anim = cfg.intro;

        this._scene.tweens.add({
            targets:  this._btnFin,
            alpha:    1,
            pScaleX:  cfg.pScale,
            pScaleY:  cfg.pScale,
            lScaleX:  cfg.lScale,
            lScaleY:  cfg.lScale,
            duration: anim.durationMs,
            delay:    anim.delayMs,
            ease:     anim.ease,
            onComplete: () => this._startBtnTwitch()
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Loops
    // ─────────────────────────────────────────────────────────────────────────

    /** imgFin: smooth, continuous grow-and-shrink sine pulse. */
    _startImgFinPulse() {
        const cfg   = SETTINGS.imgFin;
        const pulse = cfg.pulse;
        const base  = cfg.pScale;
        const peak  = base + pulse.scaleAdd;

        this._imgFinLoop = this._scene.tweens.add({
            targets:  this._imgFin,
            pScaleX:  peak,
            pScaleY:  peak,
            lScaleX:  peak,
            lScaleY:  peak,
            duration: pulse.durationMs,
            ease:     pulse.ease,
            yoyo:     true,
            repeat:   -1
        });
    }

    /**
     * btnFin: periodic twitch — quickly grows (Power2.In) then smoothly
     * shrinks back (Sine.Out), pauses, then repeats indefinitely.
     */
    _startBtnTwitch() {
        const cfg    = SETTINGS.btnFin;
        const twitch = cfg.twitch;
        const normal = cfg.pScale;
        const large  = normal * twitch.scaleMultiplier;
        const lNormal = cfg.lScale;
        const lLarge  = lNormal * twitch.scaleMultiplier;

        const doTwitch = () => {
            this._scene.tweens.add({
                targets:  this._btnFin,
                pScaleX:  large,
                pScaleY:  large,
                lScaleX:  lLarge,
                lScaleY:  lLarge,
                duration: twitch.upMs,
                ease:     'Power2.In',
                onComplete: () => {
                    this._scene.tweens.add({
                        targets:  this._btnFin,
                        pScaleX:  normal,
                        pScaleY:  normal,
                        lScaleX:  lNormal,
                        lScaleY:  lNormal,
                        duration: twitch.downMs,
                        ease:     'Sine.Out',
                        onComplete: () => {
                            this._twitchTimer = this._scene.time.delayedCall(twitch.pauseMs, doTwitch);
                        }
                    });
                }
            });
        };

        this._twitchTimer = this._scene.time.delayedCall(twitch.pauseMs, doTwitch);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CTA
    // ─────────────────────────────────────────────────────────────────────────

    _handleCtaClick() {
        if (this._twitchTimer) this._twitchTimer.remove();
        if (this._imgFinLoop)  this._imgFinLoop.stop();
        this._btnFin.off('pointerdown');

        if (this._onCta) this._onCta();
    }
}
