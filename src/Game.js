import ParentScene   from "../core/framework/components/Scene";
import Utils         from "../core/framework/Utils";
import Background    from "./Background";
import Card          from "./Card";
import DropZone      from "./DropZone";
import HoldCell      from "./HoldCell";
import FinalWindow   from "./FinalWindow";
import StressScale   from "./StressScale";
import Helper        from "./Helper";
import BASE_SETTINGS from "../game-settings.json";
import TIMER_SETTINGS from "../game-timer.json";

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
        const boardCfg = L.boardContainer || {};

        this.boardContainer = this.add.container(0, 0);
        this.boardContainer.addProperties(['pos', 'scale', 'align']);
        this.boardContainer.px = boardCfg.px ?? 0;
        this.boardContainer.py = boardCfg.py ?? 0;
        this.boardContainer.lx = boardCfg.lx ?? 0;
        this.boardContainer.ly = boardCfg.ly ?? 0;
        this.boardContainer.pOffsetX = boardCfg.pOffsetX ?? 0;
        this.boardContainer.pOffsetY = boardCfg.pOffsetY ?? 0;
        this.boardContainer.lOffsetX = boardCfg.lOffsetX ?? 0;
        this.boardContainer.lOffsetY = boardCfg.lOffsetY ?? 0;
        this.boardContainer.pScaleX = boardCfg.pScaleX ?? 1;
        this.boardContainer.pScaleY = boardCfg.pScaleY ?? 1;
        this.boardContainer.lScaleX = boardCfg.lScaleX ?? 1;
        this.boardContainer.lScaleY = boardCfg.lScaleY ?? 1;
        this.boardContainer.pAlign = boardCfg.pAlign ?? 'Center';
        this.boardContainer.lAlign = boardCfg.lAlign ?? 'Center';

        const originalSetAlign = this.boardContainer.setAlign.bind(this.boardContainer);
        const measureBoardLocalBounds = () => {
            const bounds = this.boardContainer.getBounds();
            if (bounds.width <= 0 || bounds.height <= 0) {
                return null;
            }

            const topLeft = this.boardContainer.getLocalPoint(bounds.x, bounds.y);
            const bottomRight = this.boardContainer.getLocalPoint(bounds.x + bounds.width, bounds.y + bounds.height);

            return {
                left: topLeft.x,
                top: topLeft.y,
                right: bottomRight.x,
                bottom: bottomRight.y,
                width: bottomRight.x - topLeft.x,
                height: bottomRight.y - topLeft.y
            };
        };

        const getBoardLayoutBounds = () => {
            return this.boardContainer._layoutBounds || measureBoardLocalBounds();
        };

        const getBoardFractionalOffset = () => {
            const isPortrait = this.game.size.isPortrait;
            const offsetX = isPortrait ? (boardCfg.pOffsetX ?? 0) : (boardCfg.lOffsetX ?? 0);
            const offsetY = isPortrait ? (boardCfg.pOffsetY ?? 0) : (boardCfg.lOffsetY ?? 0);
            const layoutBounds = getBoardLayoutBounds();

            if (!layoutBounds) {
                return { x: 0, y: 0 };
            }

            const parentScaleX = Number(this.boardContainer.parentContainer?.scaleX) || 1;
            const parentScaleY = Number(this.boardContainer.parentContainer?.scaleY) || 1;
            const leftExtent = layoutBounds.left * this.boardContainer.scaleX * parentScaleX;
            const rightExtent = layoutBounds.right * this.boardContainer.scaleX * parentScaleX;
            const topExtent = layoutBounds.top * this.boardContainer.scaleY * parentScaleY;
            const bottomExtent = layoutBounds.bottom * this.boardContainer.scaleY * parentScaleY;

            const deltaWorldX = offsetX >= 0
                ? -rightExtent * offsetX
                : leftExtent * offsetX;
            const deltaWorldY = offsetY >= 0
                ? -bottomExtent * offsetY
                : topExtent * offsetY;

            return {
                x: deltaWorldX / parentScaleX,
                y: deltaWorldY / parentScaleY
            };
        };

        const clampBoardContainerToViewport = () => {
            const isPortrait = this.game.size.isPortrait;
            const layoutBounds = getBoardLayoutBounds();
            if (!layoutBounds) {
                return;
            }

            const parentScaleX = Number(this.boardContainer.parentContainer?.scaleX) || 1;
            const parentScaleY = Number(this.boardContainer.parentContainer?.scaleY) || 1;
            const currentWidth = layoutBounds.width * this.boardContainer.scaleX * parentScaleX;
            const currentHeight = layoutBounds.height * this.boardContainer.scaleY * parentScaleY;

            if (isPortrait && typeof boardCfg.maxHeightP === 'number' && boardCfg.maxHeightP > 0) {
                const maxHeight = this.game.scale.height * boardCfg.maxHeightP;
                if (currentHeight > maxHeight) {
                    const clamp = maxHeight / currentHeight;
                    this.boardContainer.setScale(this.boardContainer.scaleX * clamp, this.boardContainer.scaleY * clamp);
                }
            }

            if (!isPortrait && typeof boardCfg.maxWidthL === 'number' && boardCfg.maxWidthL > 0) {
                const maxWidth = this.game.scale.width * boardCfg.maxWidthL;
                if (currentWidth > maxWidth) {
                    const clamp = maxWidth / currentWidth;
                    this.boardContainer.setScale(this.boardContainer.scaleX * clamp, this.boardContainer.scaleY * clamp);
                }
            }
        };

        const applyBoardContainerAlign = (align) => {
            const isPortrait = this.game.size.isPortrait;
            this.boardContainer.px = boardCfg.px ?? 0;
            this.boardContainer.py = boardCfg.py ?? 0;
            this.boardContainer.lx = boardCfg.lx ?? 0;
            this.boardContainer.ly = boardCfg.ly ?? 0;

            const baseScaleX = isPortrait ? this.boardContainer.pScaleX : this.boardContainer.lScaleX;
            const baseScaleY = isPortrait ? this.boardContainer.pScaleY : this.boardContainer.lScaleY;
            this.boardContainer.setScale(baseScaleX, baseScaleY);

            originalSetAlign(align);
            clampBoardContainerToViewport();

            const offset = getBoardFractionalOffset();
            this.boardContainer.x += offset.x;
            this.boardContainer.y += offset.y;

            return this.boardContainer;
        };

        this.boardContainer.setAlign = (align) => applyBoardContainerAlign(align);

        this.boardContainer.setDepth(4);
        this.mainContainer.add(this.boardContainer);
        if (typeof this.mainContainer.sort === 'function') {
            this.mainContainer.sort('depth');
        }

        // Drop zones are derived from cardTypes and layout dropZone positions.
        const zonePositions = new Map(L.dropZones.map((dz) => [dz.type, dz]));
        this._dropZones = this.SETTINGS.cardTypes.map((typeDef) => {
            const zoneLayout = zonePositions.get(typeDef.type);
            if (!zoneLayout) {
                throw new Error(`Missing layout.dropZones entry for type '${typeDef.type}'`);
            }
            return new DropZone({
                scene: this,
                label: typeDef.label,
                headText: typeDef.headText,
                bodyText: typeDef.bodyText,
                type: typeDef.type,
                cx: zoneLayout.cx,
                cy: zoneLayout.cy,
                target: typeDef.target,
                container: this.boardContainer,
                onComplete: () => this._checkWin()
            });
        });

        this._holdCells = (L.decks || [])
            .filter((deckData) => deckData.type === 'hold')
            .map((deckData) => new HoldCell({
                scene: this,
                cx: deckData.cx,
                cy: deckData.cy,
                container: this.boardContainer
            }));

        // Stress scale (performance indicator)
        this.stressScale = new StressScale({
            scene: this,
            container: this.mainContainer
        });

        // Decks – each has 2 static shadow cards + 1 interactive face-down top card
        this._decks = [];
        this._initialTopCards = [];

        for (const deckData of L.decks) {
            if (deckData.type === 'hold') {
                continue;
            }

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
                iconScale: deckData.iconScale,
                isFaceUp: false,
                container: this.boardContainer,
                onDrop:     (dropped) => this._onCardDrop(dropped),
                onDragMove: (dragged) => this._onCardDragMove(dragged)
            });
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

        this.boardContainer._layoutBounds = measureBoardLocalBounds();

        applyBoardContainerAlign(this.game.size.isPortrait ? this.boardContainer.pAlign : this.boardContainer.lAlign);

        // Final window (hidden until end-state)
        this.finalWindow = new FinalWindow({
            scene:     this,
            container: this.mainContainer,
            onCta:     () => this._onCta()
        });

        const useTimer = typeof TIMER_SETTINGS.gameFinalTime === 'number' && TIMER_SETTINGS.gameFinalTime > 0;

        // Launch the persistent TimerScene only when a countdown timer is configured.
        if (useTimer && !this.scene.isActive('TimerScene')) {
            this.scene.launch('TimerScene');
        }

        // Trigger resize, set up listener, then start timer / flip cards
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
            const timerScene = this.scene.get('TimerScene');
            const onTimeout = () => {
                if (!this.gameOver) {
                    this.gameOver = true;
                    this.helper?.kill();
                    this.helper = null;
                    this.finalWindow.show();
                }
            };
            if (useTimer && timerScene) {
                timerScene.launchTimer(onTimeout, () => this._flipAllTopCards());
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
        img.align = 'Local';
        img.cx = cx;
        img.cy = cy;
        this.boardContainer.add(img);
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
                        this.helper = new Helper({ scene: this, container: this.boardContainer });
                        this.helper.startGameplay(
                            () => this._decks.map(d => d.activeCard).filter(Boolean),
                            this._dropZones,
                            this._holdCells
                        );
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
        const spawnCx = shadowImg ? shadowImg.cx : deck.cx;
        const spawnCy = shadowImg ? shadowImg.cy : deck.cy;

        const cfg  = this.SETTINGS.deckStack;
        const anim = this.SETTINGS.animations;

        this.time.delayedCall(anim.revealNextCardDelayMs, () => {
            const newCard = new Card({
                scene: this,
                type: cardData.type, icon: cardData.icon,
                cx: spawnCx, cy: spawnCy,
                iconScale: deck.iconScale,
                isFaceUp: false,
                container: this.boardContainer,
                onDrop:     (dropped) => this._onCardDrop(dropped),
                onDragMove: (dragged) => this._onCardDragMove(dragged)
            });
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
        this._dropZones.forEach((zone) => zone.setHighlight(zone === bestZone));
        (this._holdCells || []).forEach((cell) => cell.setHighlight(cell === bestZone));
    }

    _onCardDrop(card) {
        // Clear hover highlights whenever a drag ends
        this._dropZones.forEach((zone) => zone.setHighlight(false));
        (this._holdCells || []).forEach((cell) => cell.setHighlight(false));

        if (this.gameOver) {
            card.shakeAndReturn();
            return;
        }

        const target = this._hitZone(card);

        if (target) {
            if (target.type === 'hold') {
                Utils.addAudio(this, 'pop', 0.8);
                target.acceptCard(card);
                if (card.deckIndex !== undefined) this._revealNextCard(card.deckIndex);
                return;
            }

            if (card.type === target.type) {
                // ── Correct sort ──
                Utils.addAudio(this, 'pop', 0.8);
                card.disableDrag();
                this._acceptedCards.push(card);
                target.acceptCard(card);
                // Flip the next card in this deck
                if (card.deckIndex !== undefined) this._revealNextCard(card.deckIndex);
                this.helper?.notifyCorrectMove();
                this.stressScale?.notifyCorrect();
            } else {
                // ── Wrong zone ──
                Utils.addAudio(this, 'fail', 0.8);
                card.shakeAndReturn();
                this.stressScale?.notifyIncorrect();
            }
        } else {
            card.shakeAndReturn();
        }

    }

    /** Returns the zone with the highest overlap score, or null. */
    _bestHoverZone(card) {
        let bestZone = null;
        let bestScore = 0;
        const targets = [
            ...this._dropZones,
            ...(this._holdCells || [])
        ];

        for (const zone of targets) {
            if (zone.isComplete) {
                continue;
            }
            if (zone.type === 'hold' && zone.isOccupied) {
                continue;
            }
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
        if (this._dropZones.every((zone) => zone.isComplete) && !this.gameOver) {
            this.gameOver = true;
            Utils.addAudio(this, 'win', 1);
            this._runBubblePopSequence(() => this._triggerEnd());
        }
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
                if (!(deck.activeCard.parentContainer && deck.activeCard.parentContainer.type === 'hold')) {
                    targets.push(deck.activeCard);
                }
            }
            for (const shadow of deck.shadowImages) {
                targets.push(shadow);
            }
        }
        targets.push(...this._acceptedCards);
        for (const holdCell of this._holdCells || []) {
            if (holdCell && holdCell.isOccupied) {
                targets.push(holdCell);
            }
        }

        const uniqueTargets = [];
        const seen = new Set();
        for (const target of targets) {
            if (!target || !target.scene) continue;
            if (seen.has(target)) continue;
            seen.add(target);
            uniqueTargets.push(target);
        }

        if (uniqueTargets.length === 0) { onComplete(); return; }

        let index = 0;
        const next = () => {
            if (index >= uniqueTargets.length) { onComplete(); return; }

            const target = uniqueTargets[index++];
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
                this.helper = new Helper({ scene: this, container: this.mainContainer });
                this.helper.startFinalScreen(this.finalWindow.btnFin);
            } else {
                // Timer keeps running in TimerScene through the transition
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
    }
}
