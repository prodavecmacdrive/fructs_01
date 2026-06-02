/**
 * Helper
 * ------
 * Animated finger hint that guides the player through three states:
 *
 *  • 'gameplay'    – After 1 s, loops a drag-to-dropzone animation.
 *                    Stops on the player's first card interaction.
 *                    Resumes after 5 s with no correct move (AFK).
 *
 *  • 'levelSelect' – After 2 s, cycles a tap animation across every
 *                    available level button, looping endlessly.
 *
 *  • 'finalScreen' – After 2 s, taps the CTA button, hides for 2 s,
 *                    and repeats endlessly.
 *
 * Usage:
 *   const helper = new Helper({ scene, container });
 *   helper.startGameplay(() => activeCards, dropZones);
 *   // or
 *   helper.startLevelSelect(buttons);
 *   // or
 *   helper.startFinalScreen(btnFin);
 *
 *   // From Card._startDrag:
 *   helper.notifyDragStart();
 *
 *   // From Game._onCardDrop (correct sort):
 *   helper.notifyCorrectMove();
 *
 *   // On scene change / game end:
 *   helper.kill();
 */
export default class Helper {
    /**
     * @param {object}                          opts
     * @param {Phaser.Scene}                    opts.scene
    * @param {Phaser.GameObjects.Container}    opts.container – render container for hint visuals
     */
    constructor({ scene, container }) {
        this._scene     = scene;
        this._container = container;

        this._tweens        = [];
        this._timers        = [];
        this._ghost         = null;
        this._running       = false;
        this._hasInteracted = false;
        this._afkTimer      = null;
        this._lastHintIndex = 0;
        this._currentPair   = null;   // persists until the hinted card is used
        this._mode          = null;
        this._holdCells     = [];

        // Finger sprite – sits above everything, starts hidden.
        // Origin (0, 0) anchors the reference point at the upper-left corner.
        this._finger = scene.add.image(0, 0, 'finger');
        this._finger.setOrigin(0, 0);
        this._finger.isHelperHint = true;
        this._finger.setDepth(10000);
        this._finger.setAlpha(0);
        this._finger.setScale(0.8);
        container.add(this._finger);
        container.bringToTop(this._finger);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Public API
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Activate gameplay-hint mode.
     * @param {function(): import('./Card').default[]} getActiveCards
     *   Live callback – returns the currently active (top) card of each deck.
     * @param {import('./DropZone').default[]} dropZones
     * @param {import('./HoldCell').default[]} [holdCells]
     *   Optional hold-cell targets used when no active card matches a normal drop zone.
     */
    startGameplay(getActiveCards, dropZones, holdCells = []) {
        this._mode           = 'gameplay';
        this._getActiveCards = getActiveCards;
        this._dropZones      = dropZones;
        this._holdCells      = Array.isArray(holdCells) ? holdCells : [];

        const t = this._scene.time.delayedCall(1000, () => {
            if (this._hasInteracted) return;
            this._running = true;
            this._runGameplayHint();
        });
        this._timers.push(t);
    }

    /**
     * Activate level-selection hint mode.
     * @param {Phaser.GameObjects.Image[]} buttons
     */
    startLevelSelect(buttons) {
        this._mode    = 'levelSelect';
        this._buttons = buttons;

        const t = this._scene.time.delayedCall(2000, () => {
            if (!buttons || buttons.length === 0) return;
            this._running = true;
            this._tapButton(0);
        });
        this._timers.push(t);
    }

    /**
     * Activate final-screen hint mode.
     * @param {Phaser.GameObjects.Image} btnFin
     */
    startFinalScreen(btnFin) {
        this._mode   = 'finalScreen';
        this._btnFin = btnFin;

        const t = this._scene.time.delayedCall(2000, () => {
            this._running = true;
            this._runFinalScreenHint();
        });
        this._timers.push(t);
    }

    /**
     * Call when the player begins dragging any card.
     * Stops the active hint animation and (re-)starts the 5 s AFK countdown.
     */
    notifyDragStart() {
        const firstTime = !this._hasInteracted;
        this._hasInteracted = true;
        this._stopHintLoop();
        if (this._mode === 'gameplay') {
            this._resetAfkTimer();
        }
    }

    /**
     * Call when the player places a card in the correct drop zone.
     * Resets the AFK countdown to 5 s from now.
     */
    notifyCorrectMove() {
        if (this._mode === 'gameplay') {
            this._resetAfkTimer();
        }
    }

    /**
     * Destroy all active timers, tweens, and visual elements.
     * Call on scene transitions or game-end.
     */
    kill() {
        this._running = false;
        for (const t of this._timers) {
            if (t) t.remove(false);
        }
        this._timers   = [];
        this._afkTimer = null;
        this._cleanupVisuals();
        if (this._finger) {
            this._scene.tweens.killTweensOf(this._finger);
            this._finger.destroy();
            this._finger = null;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Gameplay hint
    // ─────────────────────────────────────────────────────────────────────────

    _runGameplayHint() {
        if (!this._running) return;

        const pair = this._getOrPickPair();
        if (!pair) {
            // No playable card/zone found yet – retry shortly.
            const t = this._scene.time.delayedCall(500, () => {
                if (this._running) this._runGameplayHint();
            });
            this._timers.push(t);
            return;
        }

        const { card, zone } = pair;
        const S = this._scene.SETTINGS.card.faceScale;
        const I = card.iconScale ?? this._scene.SETTINGS.card.iconScale;
        const Y = this._scene.SETTINGS.card.iconOffsetY;

        // ── Ghost card: mirrors the real card face, ignores input (not interactive) ──
        this._ghost = this._scene.add.container(card.x, card.y);
        const ghostBg   = this._scene.add.image(0, 0, 'card_front_bg').setScale(S);
        const ghostIcon = this._scene.add.image(0, Y, card.iconKey).setScale(I);
        this._ghost.add([ghostBg, ghostIcon]);
        this._ghost.setAlpha(0);
        this._ghost.setDepth(9999);
        this._container.add(this._ghost);
        this._container.bringToTop(this._ghost);
        this._container.bringToTop(this._finger);

        // Position finger at card, hidden
        this._finger.setPosition(card.x, card.y);
        this._finger.setAlpha(0);
        this._finger.setScale(0.8);
        this._finger.setDepth(101);

        // ── Animation sequence ──

        // 1. Finger fades in
        this._tw({
            targets:  this._finger,
            alpha:    1,
            duration: 250,
            ease:     'Power2',
            onComplete: () => {
                // 2. Finger "presses" down
                this._tw({
                    targets:  this._finger,
                    scaleX:   0.65,
                    scaleY:   0.65,
                    duration: 150,
                    ease:     'Power2.In',
                    onComplete: () => {
                        // 3. Ghost fades in beneath finger
                        this._tw({
                            targets:  this._ghost,
                            alpha:    0.55,
                            duration: 163,
                            ease:     'Power2',
                            onComplete: () => {
                                // 4. Drag finger + ghost to drop zone simultaneously
                                this._tw({
                                    targets:  this._finger,
                                    x:        zone.x,
                                    y:        zone.y,
                                    duration: 688,
                                    ease:     'Cubic.InOut'
                                });
                                this._tw({
                                    targets:  this._ghost,
                                    x:        zone.x,
                                    y:        zone.y,
                                    duration: 688,
                                    ease:     'Cubic.InOut',
                                    onComplete: () => {
                                        // 5. Release: finger scales back up, ghost fades out
                                        this._tw({
                                            targets:  this._finger,
                                            scaleX:   0.8,
                                            scaleY:   0.8,
                                            duration: 150,
                                            ease:     'Power2.Out'
                                        });
                                        this._tw({
                                            targets:  this._ghost,
                                            alpha:    0,
                                            duration: 275,
                                            ease:     'Power2',
                                            onComplete: () => {
                                                // 6. Finger fades out
                                                this._tw({
                                                    targets:  this._finger,
                                                    alpha:    0,
                                                    duration: 250,
                                                    ease:     'Power2',
                                                    onComplete: () => {
                                                        this._destroyGhost();
                                                        // 7. Brief pause then loop
                                                        const t = this._scene.time.delayedCall(688, () => {
                                                            if (this._running) this._runGameplayHint();
                                                        });
                                                        this._timers.push(t);
                                                    }
                                                });
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });
    }

    /**
     * Returns the current { card, zone } pair if still playable, otherwise
     * picks the next valid one and caches it. This ensures the hint shows
     * the same card repeatedly until the player sorts it.
     */
    _getOrPickPair() {
        // Re-use the cached pair while the card is still playable
        if (this._currentPair) {
            const { card, zone } = this._currentPair;
            const keepPair = card && card.isFaceUp && !card.isLocked && card.dragEnabled &&
                !card.isDragging && (zone.type === 'hold' ? !zone.isOccupied : !zone.isComplete);
            if (keepPair) {
                return this._currentPair;
            }
            this._currentPair = null;
        }

        const cards = this._getActiveCards();
        const len   = cards.length;
        if (len === 0) return null;

        // First choose a proper matching drop zone, if available.
        for (let i = 0; i < len; i++) {
            const idx  = (this._lastHintIndex + i) % len;
            const card = cards[idx];
            if (!card || !card.isFaceUp || card.isLocked || card.isDragging || !card.dragEnabled) continue;
            const zone = this._dropZones.find(z => z.type === card.type && !z.isComplete);
            if (zone) {
                this._lastHintIndex = (idx + 1) % len;
                this._currentPair   = { card, zone };
                return this._currentPair;
            }
        }

        // Fallback: when no card matches a normal zone, show moving a mismatched card to an empty hold cell.
        const availableHold = (this._holdCells || []).find(cell => !cell.isOccupied);
        if (availableHold) {
            for (let i = 0; i < len; i++) {
                const idx  = (this._lastHintIndex + i) % len;
                const card = cards[idx];
                if (!card || !card.isFaceUp || card.isLocked || card.isDragging || !card.dragEnabled) continue;
                if (card.parentContainer && card.parentContainer.type === 'hold') continue;
                const matchingZone = this._dropZones.some(z => z.type === card.type && !z.isComplete);
                if (!matchingZone) {
                    this._lastHintIndex = (idx + 1) % len;
                    this._currentPair   = { card, zone: availableHold };
                    return this._currentPair;
                }
            }
        }

        return null;
    }

    /** Arm/reset the 5-second AFK timer. */
    _resetAfkTimer() {
        if (this._afkTimer) {
            this._afkTimer.remove(false);
            this._timers = this._timers.filter(t => t !== this._afkTimer);
            this._afkTimer = null;
        }
        this._afkTimer = this._scene.time.delayedCall(5000, () => {
            this._afkTimer = null;
            this._running  = true;
            this._runGameplayHint();
        });
        this._timers.push(this._afkTimer);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Level-selection hint
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Recursively tap each button in sequence and loop.
     * @param {number} index – current button index
     */
    _tapButton(index) {
        if (!this._running) return;
        const buttons = this._buttons;
        if (!buttons || buttons.length === 0) return;

        const btn = buttons[index % buttons.length];
        if (!btn || !btn.scene) return;

        const targetX = btn.x;
        const targetY = btn.y;
        const isFirst = this._finger.alpha < 0.1;

        if (isFirst) {
            // First appearance: snap to position, then fade in
            this._finger.setPosition(targetX, targetY);
        }

        this._tw({
            targets:  this._finger,
            x:        targetX,
            y:        targetY,
            alpha:    1,
            duration: isFirst ? 313 : 475,
            ease:     isFirst ? 'Power2' : 'Cubic.InOut',
            onComplete: () => {
                // Tap press (quick scale-down then back)
                this._tw({
                    targets:  this._finger,
                    scaleX:   0.65,
                    scaleY:   0.65,
                    duration: 125,
                    ease:     'Power2.In',
                    yoyo:     true,
                    onComplete: () => {
                        const next = (index + 1) % buttons.length;
                        if (next === 0 && buttons.length > 1) {
                            // End of cycle: fade out before starting over
                            this._tw({
                                targets:  this._finger,
                                alpha:    0,
                                duration: 275,
                                ease:     'Power2',
                                onComplete: () => {
                                    const t = this._scene.time.delayedCall(625, () => {
                                        if (this._running) this._tapButton(0);
                                    });
                                    this._timers.push(t);
                                }
                            });
                        } else {
                            const t = this._scene.time.delayedCall(375, () => {
                                if (this._running) this._tapButton(next);
                            });
                            this._timers.push(t);
                        }
                    }
                });
            }
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Final-screen hint
    // ─────────────────────────────────────────────────────────────────────────

    _runFinalScreenHint() {
        if (!this._running || !this._btnFin) return;

        const btn     = this._btnFin;
        const isFirst = this._finger.alpha < 0.1;

        if (isFirst) {
            this._finger.setPosition(btn.x, btn.y);
        }

        // Move to / appear at button
        this._tw({
            targets:  this._finger,
            x:        btn.x,
            y:        btn.y,
            alpha:    1,
            duration: isFirst ? 313 : 438,
            ease:     'Cubic.InOut',
            onComplete: () => {
                // Tap press
                this._tw({
                    targets:  this._finger,
                    scaleX:   0.65,
                    scaleY:   0.65,
                    duration: 163,
                    ease:     'Power2.In',
                    yoyo:     true,
                    onComplete: () => {
                        // Hide for 2 seconds, then repeat
                        this._tw({
                            targets:  this._finger,
                            alpha:    0,
                            duration: 250,
                            ease:     'Power2',
                            onComplete: () => {
                                const t = this._scene.time.delayedCall(2000, () => {
                                    if (this._running) this._runFinalScreenHint();
                                });
                                this._timers.push(t);
                            }
                        });
                    }
                });
            }
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Internal helpers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Add a tween, track it, and guard its onComplete against a stopped loop.
     */
    _tw(config) {
        if (config.onComplete) {
            const orig = config.onComplete;
            config.onComplete = () => { if (this._running) orig(); };
        }
        const tw = this._scene.tweens.add(config);
        this._tweens.push(tw);
        return tw;
    }

    /**
     * Halt the visible hint animation and pending hint timers.
     * The AFK timer is deliberately preserved so it can resume later.
     */
    _stopHintLoop() {
        this._running = false;
        this._cleanupVisuals();
        // Remove hint-sequence timers but keep the AFK timer alive
        this._timers = this._timers.filter(t => {
            if (t === this._afkTimer) return true;
            t.remove(false);
            return false;
        });
    }

    /** Kill running tweens and destroy the ghost image. */
    _cleanupVisuals() {
        if (this._ghost)  this._scene.tweens.killTweensOf(this._ghost);
        if (this._finger) this._scene.tweens.killTweensOf(this._finger);
        this._tweens = [];
        this._destroyGhost();
        if (this._finger) {
            this._finger.setAlpha(0);
            this._finger.setScale(0.8);
        }
    }

    _destroyGhost() {
        if (this._ghost) {
            this._ghost.destroy();
            this._ghost = null;
        }
    }
}
