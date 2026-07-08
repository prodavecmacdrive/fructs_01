import ParentScene  from "../core/framework/components/Scene";
import Utils        from "../core/framework/Utils";
import Background   from "./Background";
import Card         from "./Card";
import DropZone     from "./DropZone";
import FinalWindow  from "./FinalWindow";
import MovesCounter from "./MovesCounter";
import BASE_SETTINGS from "../game-settings.json";
import TIMER_SETTINGS from "../game-timer.json";
import Helper       from "./Helper";
import Character    from "./Character";

export default class Game extends ParentScene {
    init(data) {
        this._sceneId = (data && data.sceneId)
            ? data.sceneId
            : (window.App.stateManager ? window.App.stateManager.getNextScene() : (window.App.flow && window.App.flow[0])) || 'scene-1';
        const sceneData = (window.App.scenesData && window.App.scenesData[this._sceneId]) || {};
        this.SETTINGS = this._deepMerge(BASE_SETTINGS, sceneData);
    }

    create() {
        this.gameOver = false;
        this._acceptedCards = [];
        const createStart = performance.now();
        this._initScene();
        const createEnd = performance.now();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Scene initialisation
    // ─────────────────────────────────────────────────────────────────────────

    _initScene() {
        const initStart = performance.now();
        // Background
        const bgCfg = this.SETTINGS.background;
        if (bgCfg.mode === 'color') {
            this.bg = new Background({
                scene: this,
                background: bgCfg,
                container: this.mainContainer
            });
        } else {
            this.bg = new Background({
                scene: this,
                background: bgCfg,
                pImage: bgCfg.pImage,
                lImage: bgCfg.lImage,
                pScaleX: bgCfg.pScaleX,
                pScaleY: bgCfg.pScaleY,
                lScaleX: bgCfg.lScaleX,
                lScaleY: bgCfg.lScaleY,
                container: this.mainContainer
            });
        }

        const L   = this.SETTINGS.layout;
        const cfg = this.SETTINGS.deckStack;
        const anim = this.SETTINGS.animations;

        // Drop zones are derived from cardTypes and layout dropZone positions.
        const zonePositions = new Map(L.dropZones.map((dz) => [dz.type, dz]));
        this._dropZones = this.SETTINGS.cardTypes.map((typeDef) => {
            const zoneLayout = zonePositions.get(typeDef.type);
            if (!zoneLayout) {
                throw new Error(`Missing layout.dropZones entry for type '${typeDef.type}'`);
            }
            const dz = new DropZone({
                scene: this,
                label: typeDef.label,
                headLabel: typeDef.headLabel,
                type: typeDef.type,
                cx: zoneLayout.cx,
                cy: zoneLayout.cy,
                target: typeDef.target,
                container: this.mainContainer,
                onComplete: () => this._onZoneComplete(dz)
            });
            dz.baseCx = zoneLayout.cx;
            dz.baseCy = zoneLayout.cy;
            dz.status = zoneLayout.status;
            if (dz.status === 'expectant') {
                dz.setVisible(false);
                dz.active = false;
            } else {
                dz.active = true;
            }
            return dz;
        });

        // Moves counter
        this.movesCounter = new MovesCounter({
            scene: this, moves: this.SETTINGS.game.startingMoves,
            cx: L.movesCounter.cx, cy: L.movesCounter.cy,
            container: this.mainContainer
        });
        this.movesCounter.baseCx = L.movesCounter.cx;
        this.movesCounter.baseCy = L.movesCounter.cy;

        // Decks – each has 2 static shadow cards + 1 interactive face-down top card
        this._decks = [];
        this._initialTopCards = [];

        for (const deckData of L.decks) {
            const { cx, cy, cards = [] } = deckData;
            const totalCards = cards.length;
            const topIndex = Math.max(0, totalCards - 1);
            const topData = cards[topIndex];

            const remainingCards = cards.slice(0, topIndex);
            const shadowImages = [];
            let topCardCx = cx;
            let topCardCy = cy;

            if (totalCards === 2) {
                topCardCx = cx + cfg.shadowMiddleOffsetCx;
                topCardCy = cy + cfg.shadowMiddleOffsetCy;
                if (remainingCards.length === 1) {
                    shadowImages.push(this._addShadowCard(
                        cx + cfg.shadowBottomOffsetCx, cy + cfg.shadowBottomOffsetCy, cfg.shadowBottomDepth
                    ));
                }
            } else if (totalCards === 1) {
                topCardCx = cx + cfg.shadowBottomOffsetCx;
                topCardCy = cy + cfg.shadowBottomOffsetCy;
            } else if (remainingCards.length >= 2) {
                shadowImages.push(this._addShadowCard(
                    cx + cfg.shadowBottomOffsetCx, cy + cfg.shadowBottomOffsetCy, cfg.shadowBottomDepth
                ));
                shadowImages.push(this._addShadowCard(
                    cx + cfg.shadowMiddleOffsetCx, cy + cfg.shadowMiddleOffsetCy, cfg.shadowMiddleDepth
                ));
            } else if (remainingCards.length === 1) {
                shadowImages.push(this._addShadowCard(
                    cx + cfg.shadowMiddleOffsetCx, cy + cfg.shadowMiddleOffsetCy, cfg.shadowMiddleDepth
                ));
            }

            if (!topData) {
                // If a deck has no cards, skip creating an active top card.
                this._decks.push({
                    name: deckData.name, cx, cy,
                    remaining: remainingCards,
                    shadowImages,
                    activeCard: null
                });
                continue;
            }

            const topCard = new Card({
                scene: this,
                type: topData.type, icon: topData.icon,
                cx: topCardCx, cy: topCardCy,
                isFaceUp: false,
                container: this.mainContainer,
                onDrop:     (dropped) => this._onCardDrop(dropped),
                onDragMove: (dragged) => this._onCardDragMove(dragged)
            });
            topCard.baseCx = topCardCx;
            topCard.baseCy = topCardCy;
            topCard.deckIndex = this._decks.length;
            topCard.setDepth(cfg.topCardDepthFaceDown);

            this._decks.push({
                name: deckData.name, cx, cy,
                remaining: remainingCards,
                shadowImages,
                activeCard: topCard
            });
            this._initialTopCards.push(topCard);
        }

        // Final window (hidden until end-state)
        this.finalWindow = new FinalWindow({
            scene:     this,
            container: this.mainContainer,
            onCta:     () => this._onCta()
        });

        // Character with speech bubble
        this.character = new Character({
            scene:          this,
            container:      this.mainContainer,
            dialogueCfg:    this.SETTINGS.dialogue,
            characterCfg:   this.SETTINGS.character,
            dialogueBoxCfg: this.SETTINGS.dialogueBox
        });

        const hasTimer = this.SETTINGS && this.SETTINGS.game && this.SETTINGS.game.gameFinalTime > 0;

        // Launch the persistent TimerScene (no-op if already active from a prior scene)
        if (hasTimer && !this.scene.isActive('TimerScene')) {
            this.scene.launch('TimerScene');
        }

        // Perform initial resize synchronously so playfield layout is exact on frame 0
        this._resize();

        // Trigger resize listener setup, then start timer / flip cards
        setTimeout(() => {
            if (!this.scene || !this.scene.key) return; // Scene already shutdown

            const resizeStart = performance.now();
            this._resize();
            const resizeEnd = performance.now();

            this.scale.on('resize', () => setTimeout(() => {
                if (this.scene && this.scene.key) this._resize();
            }, anim.resizeDebounceMs));
            
            // Launch gameplay immediately every time.
            if (!window.App.hasGameStarted) {
                window.App.hasGameStarted = true;
            }

            // Timer lives in TimerScene for the full session.
            // First scene: creates + plays intro, then flips cards.
            // Later scenes: timer is already running, cards flip immediately.
            const timerScene = hasTimer ? this.scene.get('TimerScene') : null;
            const onTimeout = () => {
                if (!this.gameOver) {
                    this.gameOver = true;
                    this.helper?.kill();
                    this.helper = null;
                    this.finalWindow.show();
                }
            };
            const onNearEnd = () => {
                if (this.helper) {
                    this.helper.hideWithFade();
                }
            };
            if (timerScene) {
                timerScene.launchTimer(onTimeout, () => this._flipAllTopCards(), onNearEnd, this.SETTINGS.game.gameFinalTime);
            } else {
                this._flipAllTopCards();
            }
        }, anim.resizeDebounceMs);

        this.events.once('shutdown', () => {
            this.helper?.kill();
            this.input.removeAllListeners();
            this.scale.removeAllListeners('resize');
        });

        const initEnd = performance.now();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Deck helpers
    // ─────────────────────────────────────────────────────────────────────────

    /** Create a static back-facing shadow image and return it. */
    _addShadowCard(cx, cy, depth) {
        const img = this.add.image(0, 0, 'card_back_bg')
            .setScale(this.SETTINGS.card.faceScale)
            .setDepth(depth);
        img.baseCx = cx;
        img.baseCy = cy;
        img.cx = cx + (this.playfieldShiftX || 0);
        img.cy = cy + (this.playfieldShiftY || 0);
        this.mainContainer.add(img);
        return img;
    }

    /** Flip each deck’s top card one after another with a random staggered delay. */
    _flipAllTopCards() {
        const anim = this.SETTINGS.animations;
        const cfg  = this.SETTINGS.deckStack;
        
        // The first-ever gameplay reveal gets the initial slow stagger; all later levels are immediate.
        const isFirstLevel = !!window.App.shouldDoInitialReveal;
        window.App.shouldDoInitialReveal = false;
        let delay = isFirstLevel ? anim.flipRevealInitialDelayMs : 0;
        const startTime = performance.now();
        let completed = 0;
        const totalCards = this._initialTopCards.length;

        for (const card of this._initialTopCards) {
            const scheduledDelay = delay;
            this.time.delayedCall(scheduledDelay, () => {
                const flipStart = performance.now();
                card.flip(() => {
                    card.setDepth(cfg.topCardDepthFaceUp);
                    card.enableDrag();
                    completed += 1;
                    const flipEnd = performance.now();
                    if (completed === totalCards) {
                        this.helper = new Helper({ scene: this, container: this.mainContainer });
                        this.helper.startGameplay(
                            () => this._decks.map(d => d.activeCard).filter(Boolean),
                            this._dropZones.filter(z => z.active)
                        );
                        // Show game-start dialogue once all cards are revealed
                        this.character?.showDialogue('start');
                    }
                });
            });

            if (isFirstLevel) {
                const range = anim.flipRevealMaxIntervalMs - anim.flipRevealMinIntervalMs + 1;
                delay += anim.flipRevealMinIntervalMs + Math.floor(Math.random() * range);
            } else {
                // Very small stagger for subsequent levels so they feel "immediate" but still distinct
                delay += 50; 
            }
        }
    }

    /**
     * After a card is correctly sorted, reveal the next card in that deck.
     * Destroys the topmost shadow image and spawns a new face-down Card at the
     * canonical deck position, which then flips face-up.
     */
    _revealNextCard(deckIndex) {
        const deck = this._decks[deckIndex];
        const cardData  = deck.remaining.pop();    // matching card definition
        if (!cardData) return; // no more cards in the deck

        const shadowImg = deck.shadowImages.pop(); // topmost shadow (middle, then bottom)
        const spawnCx = shadowImg && shadowImg.baseCx !== undefined ? shadowImg.baseCx : (shadowImg ? shadowImg.cx : deck.cx);
        const spawnCy = shadowImg && shadowImg.baseCy !== undefined ? shadowImg.baseCy : (shadowImg ? shadowImg.cy : deck.cy);

        const cfg  = this.SETTINGS.deckStack;
        const anim = this.SETTINGS.animations;

        this.time.delayedCall(anim.revealNextCardDelayMs, () => {
            const pfScale = this.playfieldScale || 1.0;
            const newCard = new Card({
                scene: this,
                type: cardData.type, icon: cardData.icon,
                cx: spawnCx * pfScale + (this.playfieldShiftX || 0), cy: spawnCy * pfScale + (this.playfieldShiftY || 0),
                isFaceUp: false,
                container: this.mainContainer,
                onDrop:     (dropped) => this._onCardDrop(dropped),
                onDragMove: (dragged) => this._onCardDragMove(dragged)
            });
            newCard.baseCx = spawnCx;
            newCard.baseCy = spawnCy;
            newCard.baseScale = pfScale;
            newCard.setScale(pfScale);
            newCard.deckIndex = deckIndex;
            newCard.setDepth(cfg.topCardDepthFaceDown);
            deck.activeCard = newCard;

            // Destroy the shadow at the exact moment the flip begins so
            // the old card-back-bg is never missing from the deck position.
            if (shadowImg) shadowImg.destroy();
            newCard.flip(() => {
                newCard.setDepth(cfg.topCardDepthFaceUp);
                newCard.enableDrag();
            });
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Drop handling
    // ─────────────────────────────────────────────────────────────────────────

    _onCardDragMove(card) {
        const bestZone = this._bestHoverZone(card);
        this._dropZones.forEach((zone) => {
            if (zone.active) zone.setHighlight(zone === bestZone);
        });
    }

    _onCardDrop(card) {
        // Clear hover highlights whenever a drag ends
        this._dropZones.forEach((zone) => {
            if (zone.active) zone.setHighlight(false);
        });

        if (this.gameOver) {
            card.shakeAndReturn();
            return;
        }

        const remaining = this.movesCounter.decrement();
        this._clickCount = (this._clickCount || 0) + 1;
        const movesForFinal = this.SETTINGS.game.movesForFinal || 0;

        if (movesForFinal > 0 && this._clickCount >= movesForFinal && !this.gameOver) {
            // Process current card drop
            const zone = this._hitZone(card);
            if (zone && zone.active && card.type === zone.type) {
                Utils.addAudio(this, 'pop', 0.8);
                card.disableDrag();
                this._acceptedCards.push(card);
                zone.acceptCard(card);
                if (card.deckIndex !== undefined) this._revealNextCard(card.deckIndex);
                this.helper?.notifyCorrectMove();
                this.character?.showDialogue('positive');
            } else {
                Utils.addAudio(this, 'fail', 0.8);
                card.shakeAndReturn();
                this.character?.showDialogue('negative');
            }

            this.gameOver = true;
            this.time.delayedCall(this.SETTINGS.animations.endScreenDelayMs, () => {
                this.helper?.kill();
                this.helper = null;
                window.App.timerScene?.stopTimer();
                window.App.timerScene?.hideTimer();
                this.finalWindow.show();
            });
            return;
        }

        const zone = this._hitZone(card);

        if (zone && zone.active) {
            if (card.type === zone.type) {
                // ── Correct sort ──
                Utils.addAudio(this, 'pop', 0.8);
                card.disableDrag();
                this._acceptedCards.push(card);
                zone.acceptCard(card);
                // Flip the next card in this deck
                if (card.deckIndex !== undefined) this._revealNextCard(card.deckIndex);
                this.helper?.notifyCorrectMove();
                this.character?.showDialogue('positive');
            } else {
                // ── Wrong zone ──
                Utils.addAudio(this, 'fail', 0.8);
                card.shakeAndReturn();
                this.character?.showDialogue('negative');
            }
        } else {
            card.shakeAndReturn();
        }

        if (remaining <= 0 && !this.gameOver) {
            this.time.delayedCall(this.SETTINGS.animations.lossDelayMs, () => this._triggerEnd());
        }
    }

    /** Returns the zone with the highest overlap score, or null. */
    _bestHoverZone(card) {
        let bestZone = null;
        let bestScore = 0;

        for (const zone of this._dropZones) {
            if (!zone.active) continue;
            const score = this._zoneOverlapScore(zone, card);
            if (score > bestScore) {
                bestScore = score;
                bestZone = zone;
            }
        }

        return bestZone;
    }

    _zoneOverlapScore(zone, card) {
        const cardW = (card.width || 0) * (card.scaleX || 1);
        const cardH = (card.height || 0) * (card.scaleY || 1);
        const cardMinX = card.x - cardW * 0.5;
        const cardMaxX = card.x + cardW * 0.5;
        const cardMinY = card.y - cardH * 0.5;
        const cardMaxY = card.y + cardH * 0.5;

        const zoneMinX = zone.x - zone.hitHalfW;
        const zoneMaxX = zone.x + zone.hitHalfW;
        const zoneMinY = zone.y - zone.hitHalfH;
        const zoneMaxY = zone.y + zone.hitHalfH;

        const overlapW = Math.max(0, Math.min(cardMaxX, zoneMaxX) - Math.max(cardMinX, zoneMinX));
        const overlapH = Math.max(0, Math.min(cardMaxY, zoneMaxY) - Math.max(cardMinY, zoneMinY));
        return overlapW * overlapH;
    }

    /** Returns the zone the card is most over, or null. */
    _hitZone(card) {
        return this._bestHoverZone(card);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Win / lose
    // ─────────────────────────────────────────────────────────────────────────

    _checkWin() {
        const activeZones = this._dropZones.filter(zone => zone.active);
        if (activeZones.every((zone) => zone.isComplete) && !this.gameOver) {
            this.gameOver = true;
            Utils.addAudio(this, 'win', 1);
            this._runBubblePopSequence(() => this._triggerEnd());
        }
    }

    _onZoneComplete(completedZone) {
        // If there's an expectant dropzone waiting
        const expectantZone = this._dropZones.find(z => z.status === 'expectant' && !z.active);

        if (expectantZone) {
            this._zoneTransitionActive = true;
            // Remove the completed dropzone: first run its bubble pop animation, then hide/disable it
            this._popSingleZoneCards(completedZone, () => {
                // Fade out the completed zone completely
                this.tweens.add({
                    targets: completedZone,
                    alpha: 0,
                    duration: 300,
                    onComplete: () => {
                        completedZone.setVisible(false);
                        completedZone.active = false;

                        // Move the expectant dropzone to the completed zone's coordinates
                        expectantZone.px = completedZone.baseCx;
                        expectantZone.py = completedZone.baseCy;
                        expectantZone.lx = completedZone.baseCx;
                        expectantZone.ly = completedZone.baseCy;
                        expectantZone.baseCx = completedZone.baseCx;
                        expectantZone.baseCy = completedZone.baseCy;

                        // Position it relative to game/layout size
                        expectantZone.setAlign('Center');
                        expectantZone.x = completedZone.x;
                        
                        // Slide out from above (starts 150px higher) and fade in
                        expectantZone.y = completedZone.y - 150;
                        expectantZone.setAlpha(0);
                        expectantZone.setVisible(true);
                        expectantZone.active = true;

                        this.tweens.add({
                            targets: expectantZone,
                            y: completedZone.y,
                            alpha: 1,
                            duration: 500,
                            ease: 'Cubic.Out',
                            onComplete: () => {
                                this._zoneTransitionActive = false;
                                // Notify helper of new active dropzones list
                                if (this.helper) {
                                    this.helper.startGameplay(
                                        () => this._decks.map(d => d.activeCard).filter(Boolean),
                                        this._dropZones.filter(z => z.active)
                                    );
                                }
                            }
                        });
                    }
                });
            });
        }

        // Always check win condition
        this._checkWin();
    }

    _popSingleZoneCards(zone, onComplete) {
        // Find cards inside this zone container
        const cardsToPop = zone.list.filter(child => child instanceof Card);

        if (cardsToPop.length === 0) {
            onComplete();
            return;
        }

        let index = 0;
        const next = () => {
            if (index >= cardsToPop.length) {
                onComplete();
                return;
            }

            const target = cardsToPop[index++];
            if (!target || !target.scene) { next(); return; }

            const sx = target.scaleX * 1.5;
            const sy = target.scaleY * 1.5;

            Utils.addAudio(this, 'pop', 1.0);
            this.tweens.killTweensOf(target);
            this.tweens.add({
                targets:  target,
                scaleX:   sx,
                scaleY:   sy,
                alpha:    0,
                duration: 280,
                ease:     'Power2.Out',
                onComplete: () => {
                    if (target.scene) target.setVisible(false);
                    const idx = this._acceptedCards.indexOf(target);
                    if (idx > -1) this._acceptedCards.splice(idx, 1);
                }
            });

            this.time.delayedCall(120, next);
        };
        next();
    }

    /**
     * Sequentially pop each accepted card with a soap-bubble burst animation
     * (scale × 1.5 + fade out), playing a 'pop' sound per card.
     * Calls onComplete after the last card disappears.
     */
    _runBubblePopSequence(onComplete) {
        // Deck cards (face-up active cards + shadow back-images) pop first,
        // then the accepted (sorted) cards inside the drop zones.
        const targets = [];
        for (const deck of this._decks) {
            if (deck.activeCard && !this._acceptedCards.includes(deck.activeCard)) {
                targets.push(deck.activeCard);
            }
            for (const shadow of deck.shadowImages) {
                targets.push(shadow);
            }
        }
        targets.push(...this._acceptedCards);

        if (targets.length === 0) { onComplete(); return; }

        let index = 0;
        const next = () => {
            if (index >= targets.length) { onComplete(); return; }

            const target = targets[index++];
            // Guard against objects destroyed between scheduling and execution
            if (!target || !target.scene) { next(); return; }

            const sx = target.scaleX * 1.5;
            const sy = target.scaleY * 1.5;

            Utils.addAudio(this, 'pop', 1.0);
            this.tweens.killTweensOf(target);
            this.tweens.add({
                targets:  target,
                scaleX:   sx,
                scaleY:   sy,
                alpha:    0,
                duration: 280,
                ease:     'Power2.Out',
                onComplete: () => { if (target.scene) target.setVisible(false); }
            });

            this.time.delayedCall(120, next);
        };
        next();
    }

    _triggerEnd() {
        this.gameOver = true;
        this.time.delayedCall(this.SETTINGS.animations.endScreenDelayMs, () => {
            this.helper?.kill();
            this.helper = null;
            window.App.stateManager.markCompleted(this._sceneId);
            if (window.App.stateManager.isFlowComplete()) {
                window.App.timerScene?.stopTimer();
                window.App.timerScene?.hideTimer();
                this.finalWindow.show();
            } else {
                this.scene.stop();
                this.scene.start('TransitionScene');
            }
        });
    }

    _onCta() {
        window.App.network.ctaClick();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Settings merge
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Deep-merge two plain objects.  Arrays in `override` replace arrays in
     * `base` wholesale so that scene-specific deck arrays are not partially
     * blended with the base deck array.
     */
    _deepMerge(base, override) {
        const result = Object.assign({}, base);
        for (const key of Object.keys(override)) {
            const ov = override[key];
            const bv = base[key];
            if (ov !== null && typeof ov === 'object' && !Array.isArray(ov) &&
                bv !== null && bv !== undefined && typeof bv === 'object' && !Array.isArray(bv)) {
                result[key] = this._deepMerge(bv, ov);
            } else {
                result[key] = ov;
            }
        }
        return result;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Resize
    // ─────────────────────────────────────────────────────────────────────────

    _resize() {
        if (!this.game) return;
        const isPortrait = this.scale.height > this.scale.width;
        this.game.size.isPortrait = isPortrait;
        this.game.size.resize();

        // Reposition character elements to match new orientation / dimensions
        if (this.character) {
            const scale   = Number(this.game.size.scale) || 1;
            const screenW = this.scale.width;
            const screenH = this.scale.height;
            this.character.onResize(isPortrait, scale, screenW, screenH);
        }

        this._repositionPlayfield();
    }

    _repositionPlayfield() {
        if (!this.game || !this.game.size) return;
        const isPortrait = this.game.size.isPortrait;
        const size = this.game.size;
        const screenW = size.right - size.left;
        const screenH = size.bottom - size.top;

        // Calculate playfield center offset from screen center in container-local coordinates
        const landPct = (this.SETTINGS.character.landscapeWidthPercent || 40) / 100;
        const portPct = (this.SETTINGS.character.portraitHeightPercent || 30) / 100;

        let pfScale = 1.0;
        if (isPortrait) {
            const maxAllowedScale = (screenH * (1 - portPct)) / 900;
            pfScale = Math.min(1.0, maxAllowedScale);
        }
        this.playfieldScale = pfScale;

        const shiftX = isPortrait ? 0 : screenW * (((1 - landPct) / 2) - 0.5);
        const shiftY = isPortrait ? screenH * (((1 - portPct) / 2) - 0.5) : 0;

        this.playfieldShiftX = shiftX;
        this.playfieldShiftY = shiftY;

        // Update DropZones
        if (this._dropZones) {
            const baseScale = this.SETTINGS.layout.dropZoneScale ?? 1;
            this._dropZones.forEach(dz => {
                if (dz.baseCx === undefined) return;
                dz.lx = dz.baseCx * pfScale + shiftX;
                dz.ly = dz.baseCy * pfScale + shiftY;
                dz.px = dz.baseCx * pfScale + shiftX;
                dz.py = dz.baseCy * pfScale + shiftY;
                dz.setScale(baseScale * pfScale);
                dz.setCustomPosition(isPortrait ? dz.px : dz.lx, isPortrait ? dz.py : dz.ly);
            });
        }

        // Update MovesCounter
        if (this.movesCounter && this.movesCounter.baseCx !== undefined) {
            const mc = this.movesCounter;
            mc.lx = mc.baseCx * pfScale + shiftX;
            mc.ly = mc.baseCy * pfScale + shiftY;
            mc.px = mc.baseCx * pfScale + shiftX;
            mc.py = mc.baseCy * pfScale + shiftY;
            mc.setScale(pfScale);
            mc.setCustomPosition(isPortrait ? mc.px : mc.lx, isPortrait ? mc.py : mc.ly);
        }

        // Update Decks (Shadow cards & Active cards)
        if (this._decks) {
            const faceScale = this.SETTINGS.card.faceScale;
            this._decks.forEach(deck => {
                if (deck.shadowImages) {
                    deck.shadowImages.forEach(img => {
                        if (img.baseCx === undefined) return;
                        img.cx = img.baseCx * pfScale + shiftX;
                        img.cy = img.baseCy * pfScale + shiftY;
                        img.setScale(faceScale * pfScale);
                        img.setCustomPosition(img.cx, img.cy);
                    });
                }
                if (deck.activeCard && deck.activeCard.baseCx !== undefined) {
                    const card = deck.activeCard;
                    card.baseScale = pfScale;
                    card.cx = card.baseCx * pfScale + shiftX;
                    card.cy = card.baseCy * pfScale + shiftY;
                    if (!card.isDragging) {
                        card.setScale(pfScale);
                        card.setCustomPosition(card.cx, card.cy);
                        card.homeX = card.x;
                        card.homeY = card.y;
                    } else {
                        card.homeX = Utils.getAlignX(card) + card.cx;
                        card.homeY = Utils.getAlignY(card) + card.cy;
                    }
                }
            });
        }

        // Update accepted cards still in mainContainer flight
        if (this._acceptedCards) {
            this._acceptedCards.forEach(card => {
                if (card && card.parentContainer === this.mainContainer && card.baseCx !== undefined) {
                    card.baseScale = pfScale;
                    card.cx = card.baseCx * pfScale + shiftX;
                    card.cy = card.baseCy * pfScale + shiftY;
                    card.setCustomPosition(card.cx, card.cy);
                }
            });
        }
    }
}
