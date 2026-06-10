import ParentScene from "../core/framework/components/Scene";
import Timer from "./Timer";
import SETTINGS from "../game-timer.json";

/**
 * TimerScene
 * ----------
 * A dedicated Phaser scene that hosts the global stopwatch timer.
 * It is launched once at the start of the first Game scene and is
 * NEVER stopped, so the timer persists across Game → TransitionScene
 * → Game transitions in multi-scene builds.
 *
 * Because TimerScene is registered last in the App scene list it
 * renders on top of both the Game scene and TransitionScene.
 *
 * Usage (via window.App.timerScene):
 *   timerScene.launchTimer(onTimeout, onStarted);  // first scene: creates + starts
 *                                                   // later scenes: updates callback, flips immediately
 *   timerScene.stopTimer();
 *   timerScene.hideTimer();
 */
export default class TimerScene extends ParentScene {
    constructor() {
        super('TimerScene');
        this._timer = null;
    }

    create() {
        window.App.timerScene = this;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Public API
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * First call (scene 1): create the Timer and begin its intro animation.
     * Subsequent calls (scene 2+): just update the onTimeout callback and
     * immediately call onStarted so the new scene's cards can flip at once.
     *
     * @param {function} onTimeout  – called when the countdown reaches zero
     * @param {function} [onStarted] – called when the timer is ready/ticking
     */
    launchTimer(onTimeout, onStarted) {
        if (typeof SETTINGS.gameFinalTime !== 'number' || SETTINGS.gameFinalTime <= 0) {
            this._timer?.stop();
            if (this._timer) this._timer.setVisible(false);
            if (onStarted) onStarted();
            return;
        }

        if (this._timer) {
            // Timer already running – wire it to the new scene's callback
            this._timer._onTimeout = onTimeout;
            if (onStarted) onStarted();
            return;
        }

        this._timer = new Timer({
            scene:     this,
            container: this.mainContainer,
            onTimeout
        });
        this._timer.start(onStarted);
    }

    /** Freeze the timer (game over without resetting). */
    stopTimer() {
        this._timer?.stop();
    }

    /** Freeze and reset hands to 12-o'clock (all scenes complete). */
    stopAndResetTimer() {
        this._timer?.stopAndReset();
    }

    /** Hide the timer (used just before FinalWindow appears). */
    hideTimer() {
        if (this._timer) this._timer.setVisible(false);
    }
}
