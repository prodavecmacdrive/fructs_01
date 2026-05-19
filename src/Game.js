import ParentScene from "../core/framework/components/Scene";
import Background from "./Background";
import Card from "./Card";
import DropZone from "./DropZone";
import MovesCounter from "./MovesCounter";
import Button from "./Button";
import Utils from "../core/framework/Utils";

export default class Game extends ParentScene {
    create() {
        this.moves = 161;
        this.edibleCollected = 0;
        this.nonEdibleCollected = 0;
        this.totalToCollect = 4; // Based on 0/4 in description, but we have 16 cards?
        // Wait, "0/4" might mean 4 per zone. 16 cards total = 8 edible, 8 non-edible.
        // If 0/4 is the requirement, maybe only 8 cards total?
        // Let's stick to 4 per zone as per "0/4" text, so 8 cards total.
        // But the screenshot shows 8 stacks. If each stack has 2 cards, that's 16.
        // If the counter says 0/4, maybe it's just an example or we need to collect 4 of each to win?
        // Let's re-read: "Top zone — for edible items (text "Edible" and counter "0/4")".
        // Let's use 8 cards total (4 edible, 4 non-edible) distributed in 8 stacks (1 card per stack).
        // OR 16 cards total, and the counter goes to 8?
        // Actually, "0/4" is specifically mentioned. Let's assume we need to collect 4 of each.
        // I will put 8 cards in total, 1 per stack, to match the 8 stacks in the screenshot.

        this.targetPerZone = 4;
        this.cardsInGame = [];
        this.stacks = [];

        this.initScene();
    }

    initScene() {
        this.bg = new Background({
            scene: this,
            pImage: "main_bg", lImage: "main_bg",
            pScaleX: 1.05, pScaleY: 1.05,
            lScaleX: 2.1,  lScaleY: 2.1,
            container: this.mainContainer
        });

        this.movesCounter = new MovesCounter({
            scene: this,
            x: 0, y: 100,
            moves: this.moves,
            container: this.mainContainer
        });
        this.movesCounter.align = "Top";

        this.edibleZone = new DropZone({
            scene: this,
            x: 0, y: -60,
            type: 'edible',
            targetCount: this.targetPerZone,
            container: this.mainContainer
        });

        this.nonEdibleZone = new DropZone({
            scene: this,
            x: 0, y: 160,
            type: 'not_edible',
            targetCount: this.targetPerZone,
            container: this.mainContainer
        });

        this.createCards();

        this.ctaButton = new Button({
            scene: this,
            texture: "btnFin",
            px: 0, py: -80,
            lx: 0, ly: -60,
            pScaleX: 0.6, pScaleY: 0.6,
            lScaleX: 0.6, lScaleY: 0.6,
            align: "Bottom",
            container: this.mainContainer,
            callback: () => this.onCta()
        });
        this.ctaButton.setVisible(false);
        this.ctaButton.setAlpha(0);

        this.input.on('dragstart', this.onDragStart, this);
        this.input.on('drag', this.onDrag, this);
        this.input.on('dragend', this.onDragEnd, this);

        setTimeout(() => {
            this.resizeSquare(this.scale.height / this.scale.width);
            this.scale.on("resize", () => {
                setTimeout(() => {
                    this.resizeSquare(this.scale.height / this.scale.width);
                }, 11);
            });
        }, 11);
    }

    createCards() {
        const stackPositions = [
            { x: -200, y: -250 }, { x: 200, y: -250 },
            { x: -300, y: 0 },    { x: 300, y: 0 },
            { x: -300, y: 250 },  { x: 300, y: 250 },
            { x: -150, y: 450 },  { x: 150, y: 450 }
        ];

        let fullCardData = [];
        for (let i = 1; i <= 4; i++) {
            fullCardData.push({ type: 'edible', id: i });
            fullCardData.push({ type: 'edible', id: i });
            fullCardData.push({ type: 'not_edible', id: i });
            fullCardData.push({ type: 'not_edible', id: i });
        }
        this.shuffle(fullCardData);

        this.targetPerZone = 8;
        this.edibleZone.targetCount = 8;
        this.edibleZone.counterLabel.setText(`0/8`);
        this.nonEdibleZone.targetCount = 8;
        this.nonEdibleZone.counterLabel.setText(`0/8`);

        stackPositions.forEach((pos, index) => {
            const stack = [];

            // Bottom card (face down)
            const cardBack = new Card({
                scene: this,
                x: pos.x, y: pos.y,
                type: fullCardData[index * 2].type,
                id: fullCardData[index * 2].id,
                isFaceUp: false,
                container: this.mainContainer
            });
            cardBack.px = pos.x; cardBack.py = pos.y;
            stack.push(cardBack);

            // Top card (face up)
            const cardFront = new Card({
                scene: this,
                x: pos.x, y: pos.y,
                type: fullCardData[index * 2 + 1].type,
                id: fullCardData[index * 2 + 1].id,
                isFaceUp: true,
                container: this.mainContainer
            });
            cardFront.px = pos.x; cardFront.py = pos.y;
            cardFront.setInteractive();
            this.input.setDraggable(cardFront);
            stack.push(cardFront);

            this.stacks.push(stack);
        });
    }

    onDragStart(pointer, gameObject) {
        if (!(gameObject instanceof Card)) return;
        gameObject.isDragging = true;
        this.mainContainer.bringToTop(gameObject);
        this.tweens.add({
            targets: gameObject,
            scale: 1.1,
            duration: 100
        });
        gameObject.originalPos = { x: gameObject.x, y: gameObject.y };
        Utils.addAudio(this, 'сlick', 1);
    }

    onDrag(pointer, gameObject, dragX, dragY) {
        if (!gameObject.isDragging) return;
        gameObject.x = dragX;
        gameObject.y = dragY;
    }

    onDragEnd(pointer, gameObject) {
        if (!gameObject.isDragging) return;

        let dropped = false;
        const zones = [this.edibleZone, this.nonEdibleZone];

        for (const zone of zones) {
            const bounds = zone.getBounds();
            if (Phaser.Geom.Rectangle.Contains(bounds, pointer.x, pointer.y)) {
                this.moves--;
                this.movesCounter.updateMoves(this.moves);

                if (gameObject.cardType === zone.zoneType) {
                    this.handleCorrectDrop(gameObject, zone);
                } else {
                    this.handleIncorrectDrop(gameObject, zone);
                }
                dropped = true;
                break;
            }
        }

        if (!dropped) {
            gameObject.flyBack(gameObject.originalPos);
        }

        if (this.moves <= 0 && !this.checkWin()) {
            this.onLose();
        }
    }

    handleCorrectDrop(card, zone) {
        card.disableInteractive();
        Utils.addAudio(this, 'pop', 1);

        const targetPos = { x: zone.x, y: zone.y };
        card.magnetize(targetPos, 0.5, () => {
            zone.updateCounter();
            card.setVisible(false);
            this.checkWin();
            this.revealNextCard(card);
        });
    }

    handleIncorrectDrop(card, zone) {
        Utils.addAudio(this, 'fail', 1);
        zone.showError();
        card.shake();
        card.flyBack(card.originalPos);
    }

    revealNextCard(movedCard) {
        for (const stack of this.stacks) {
            const index = stack.indexOf(movedCard);
            if (index !== -1) {
                stack.splice(index, 1);
                if (stack.length > 0) {
                    const nextCard = stack[stack.length - 1];
                    if (!nextCard.isFaceUp) {
                        nextCard.flip(() => {
                            nextCard.setInteractive();
                            this.input.setDraggable(nextCard);
                        });
                    }
                }
                break;
            }
        }
    }

    checkWin() {
        if (this.edibleZone.currentCount === this.targetPerZone && this.nonEdibleZone.currentCount === this.targetPerZone) {
            this.onWin();
            return true;
        }
        return false;
    }

    onWin() {
        Utils.addAudio(this, 'win', 1);
        this.showCTA();
    }

    onLose() {
        this.showCTA();
    }

    showCTA() {
        this.ctaButton.setVisible(true);
        this.tweens.add({
            targets: this.ctaButton,
            alpha: 1,
            duration: 500
        });
    }

    onCta() {
        window.App.network.ctaClick();
    }

    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    resizeSquare(ratio) {
        const isPortrait = this.scale.height > this.scale.width;
        this.game.size.isPortrait = isPortrait;
        this.game.size.resize();
    }
}
