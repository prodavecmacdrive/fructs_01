import ParentScene  from "../core/framework/components/Scene";
import Utils        from "../core/framework/Utils";
import Background   from "./Background";
import Button       from "./Button";
import Card         from "./Card";
import DropZone     from "./DropZone";
import MovesCounter from "./MovesCounter";
import StartScreen  from "./StartScreen";
import SETTINGS     from "../game-settings.json";

export default class Game extends ParentScene {
    create() {
        this.gameOver = false;
        this._initScene();
        this._playBackgroundMusic();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Scene initialisation
    // ─────────────────────────────────────────────────────────────────────────

    _initScene() {
        // Background
        const bgCfg = SETTINGS.background;
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

        const L   = SETTINGS.layout;
        const cfg = SETTINGS.deckStack;
        const anim = SETTINGS.animations;

        // Drop zones are derived from cardTypes and layout dropZone positions.
        const zonePositions = new Map(L.dropZones.map((dz) => [dz.type, dz]));
        this._dropZones = SETTINGS.cardTypes.map((typeDef) => {
            const zoneLayout = zonePositions.get(typeDef.type);
            if (!zoneLayout) {
                throw new Error(`Missing layout.dropZones entry for type '${typeDef.type}'`);
            }
            return new DropZone({
                scene: this,
                label: typeDef.label,
                type: typeDef.type,
                cx: zoneLayout.cx,
                cy: zoneLayout.cy,
                target: typeDef.target,
                container: this.mainContainer,
                onComplete: () => this._checkWin()
            });
        });

        // Moves counter
        this.movesCounter = new MovesCounter({
            scene: this, moves: SETTINGS.game.startingMoves,
            cx: L.movesCounter.cx, cy: L.movesCounter.cy,
            container: this.mainContainer
        });

        // Decks – each has 2 static shadow cards + 1 interactive face-down top card
        this._decks = [];
        this._initialTopCards = [];

        for (const deckData of L.decks) {
            const { cx, cy, cards } = deckData;

            // Static shadow images (bottom first, then middle)
            const bottomImg = this._addShadowCard(
                cx + cfg.shadowBottomOffsetCx, cy + cfg.shadowBottomOffsetCy, cfg.shadowBottomDepth
            );
            const middleImg = this._addShadowCard(
                cx + cfg.shadowMiddleOffsetCx, cy + cfg.shadowMiddleOffsetCy, cfg.shadowMiddleDepth
            );

            // Top card (cards[2]) – face-down until the reveal sequence fires
            const topData = cards[2];
            const topCard = new Card({
                scene: this,
                type: topData.type, icon: topData.icon,
                cx, cy,
                isFaceUp: false,
                container: this.mainContainer,
                onDrop:     (dropped) => this._onCardDrop(dropped),
                onDragMove: (dragged) => this._onCardDragMove(dragged)
            });
            topCard.deckIndex = this._decks.length;
            topCard.setDepth(cfg.topCardDepthFaceDown);

            this._decks.push({
                name: deckData.name, cx, cy,
                remaining:    [cards[0], cards[1]], // [bottom, middle]; middle popped first
                shadowImages: [bottomImg, middleImg],
                activeCard:   topCard
            });
            this._initialTopCards.push(topCard);
        }

        // CTA button (hidden until end-state)
        const cta = L.ctaButton;
        this.ctaButton = new Button({
            scene: this,
            texture: 'btnFin',
            px: cta.portraitX,  py: cta.portraitY,
            lx: cta.landscapeX, ly: cta.landscapeY,
            pScaleX: cta.scale, pScaleY: cta.scale,
            lScaleX: cta.scale, lScaleY: cta.scale,
            align: 'Bottom',
            container: this.mainContainer,
            callback: () => this._onCta()
        });
        this.ctaButton.setAlpha(0);

        // Trigger resize, set up listener, then show start screen
        setTimeout(() => {
            this._resize();
            this.scale.on('resize', () => setTimeout(() => this._resize(), anim.resizeDebounceMs));
            this._showStartScreen();
        }, anim.resizeDebounceMs);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Deck helpers
    // ─────────────────────────────────────────────────────────────────────────

    /** Create a static back-facing shadow image and return it. */
    _addShadowCard(cx, cy, depth) {
        const img = this.add.image(0, 0, 'card_back_bg')
            .setScale(SETTINGS.card.faceScale)
            .setDepth(depth);
        img.cx = cx;
        img.cy = cy;
        this.mainContainer.add(img);
        return img;
    }
    _showStartScreen() {
        new StartScreen({
            scene:     this,
            container: this.mainContainer,
            onStart:   () => this._flipAllTopCards()
        });
    }
    /** Flip each deck’s top card one after another with a random staggered delay. */
    _flipAllTopCards() {
        const anim = SETTINGS.animations;
        const cfg  = SETTINGS.deckStack;
        let delay  = anim.flipRevealInitialDelayMs;
        for (const card of this._initialTopCards) {
            this.time.delayedCall(delay, () => {
                card.flip(() => {
                    card.setDepth(cfg.topCardDepthFaceUp);
                    card.enableDrag();
                });
            });
            const range = anim.flipRevealMaxIntervalMs - anim.flipRevealMinIntervalMs + 1;
            delay += anim.flipRevealMinIntervalMs + Math.floor(Math.random() * range);
        }
    }

    /**
     * After a card is correctly sorted, reveal the next card in that deck.
     * Destroys the topmost shadow image and spawns a new face-down Card at the
     * canonical deck position, which then flips face-up.
     */
    _revealNextCard(deckIndex) {
        const deck = this._decks[deckIndex];
        if (deck.shadowImages.length === 0) return; // deck exhausted

        const shadowImg = deck.shadowImages.pop(); // topmost shadow (middle, then bottom)
        const cardData  = deck.remaining.pop();    // matching card definition

        const cfg  = SETTINGS.deckStack;
        const anim = SETTINGS.animations;

        this.time.delayedCall(anim.revealNextCardDelayMs, () => {
            const newCard = new Card({
                scene: this,
                type: cardData.type, icon: cardData.icon,
                cx: shadowImg.cx, cy: shadowImg.cy,
                isFaceUp: false,
                container: this.mainContainer,
                onDrop:     (dropped) => this._onCardDrop(dropped),
                onDragMove: (dragged) => this._onCardDragMove(dragged)
            });
            newCard.deckIndex = deckIndex;
            newCard.setDepth(cfg.topCardDepthFaceDown);
            deck.activeCard = newCard;

            // Destroy the shadow at the exact moment the flip begins so
            // the old card-back-bg is never missing from the deck position.
            shadowImg.destroy();
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
        this._dropZones.forEach((zone) => zone.setHighlight(zone.isOver(card.x, card.y)));
    }

    _onCardDrop(card) {
        // Clear hover highlights whenever a drag ends
        this._dropZones.forEach((zone) => zone.setHighlight(false));

        if (this.gameOver) {
            card.shakeAndReturn();
            return;
        }

        const remaining = this.movesCounter.decrement();
        const zone      = this._hitZone(card.x, card.y);

        if (zone) {
            if (card.type === zone.type) {
                // ── Correct sort ──
                Utils.addAudio(this, 'pop', 0.8);
                card.disableDrag();
                zone.acceptCard(card);
                // Flip the next card in this deck
                if (card.deckIndex !== undefined) this._revealNextCard(card.deckIndex);
            } else {
                // ── Wrong zone ──
                Utils.addAudio(this, 'fail', 0.8);
                card.shakeAndReturn();
            }
        } else {
            card.shakeAndReturn();
        }

        if (remaining <= 0 && !this.gameOver) {
            this.time.delayedCall(SETTINGS.animations.lossDelayMs, () => this._triggerEnd());
        }
    }

    /** Returns the zone the card centre is over, or null. */
    _hitZone(cardX, cardY) {
        for (const zone of this._dropZones) {
            if (zone.isOver(cardX, cardY)) return zone;
        }
        return null;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Win / lose
    // ─────────────────────────────────────────────────────────────────────────

    _checkWin() {
        if (this._dropZones.every((zone) => zone.isComplete) && !this.gameOver) {
            this.gameOver = true;
            Utils.addAudio(this, 'win', 1);
            this._triggerEnd();
        }
    }

    _triggerEnd() {
        this.gameOver = true;
        this.time.delayedCall(SETTINGS.animations.endScreenDelayMs, () => {
            this.tweens.add({
                targets: this.ctaButton, alpha: 1,
                duration: SETTINGS.animations.endScreenFadeDurationMs
            });
        });
    }

    _onCta() {
        window.App.network.ctaClick();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Resize
    // ─────────────────────────────────────────────────────────────────────────

    _resize() {
        const isPortrait = this.scale.height > this.scale.width;
        this.game.size.isPortrait = isPortrait;
        this.game.size.resize();
    }

    _playBackgroundMusic() {
        Utils.addAudio(this, 'music', 0.35, true);
    }
}
