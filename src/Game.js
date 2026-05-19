import Card from './Card';
import DropZone from './DropZone';
import Utils from '../core/framework/Utils';
import Background from './Background';
import MovesCounter from './MovesCounter';

export default class Game extends Phaser.Scene {
    constructor() {
        super('Game');
    }

    create() {
        console.log('Game: create() started');

        try {
            // Hide loader div immediately
            const loader = document.getElementById('loader');
            if (loader) loader.style.display = 'none';

            // Framework requires this.mainContainer for automatic scaling
            this.mainContainer = this.add.container(0, 0);

            // Background
            this.bg = new Background({
                scene: this,
                pImage: 'main_bg',
                lImage: 'main_bg',
                pScaleX: 1, pScaleY: 1,
                lScaleX: 1, lScaleY: 1,
                container: this.mainContainer
            });

            // Moves Counter
            this.moves = 161;
            this.movesCounter = new MovesCounter({
                scene: this,
                x: 0, y: 0,
                moves: this.moves,
                container: this.mainContainer
            });
            this.movesCounter.addProperties(['pos', 'align', 'scale']);
            this.movesCounter.pAlign = 'Top';
            this.movesCounter.px = 0;
            this.movesCounter.py = 120;

            // Drop Zones
            this.edibleZone = new DropZone(this, 'Edible', 'edible');
            this.edibleZone.setDepth(10);
            this.edibleZone.addProperties(['pos', 'align', 'scale']);
            this.edibleZone.pAlign = 'Center';
            this.edibleZone.px = 0;
            this.edibleZone.py = -180;
            this.edibleZone.pScaleX = this.edibleZone.pScaleY = 1.0;
            this.mainContainer.add(this.edibleZone);

            this.nonEdibleZone = new DropZone(this, 'Non Edible', 'not_edible');
            this.nonEdibleZone.setDepth(10);
            this.nonEdibleZone.addProperties(['pos', 'align', 'scale']);
            this.nonEdibleZone.pAlign = 'Center';
            this.nonEdibleZone.px = 0;
            this.nonEdibleZone.py = 180;
            this.nonEdibleZone.pScaleX = this.nonEdibleZone.pScaleY = 1.0;
            this.mainContainer.add(this.nonEdibleZone);

            // Cards setup
            this.stacks = [[], [], [], []];
            const edibleIcons = ['edible_1', 'edible_2', 'edible_3', 'edible_4'];
            const nonEdibleIcons = ['not_edible_1', 'not_edible_2', 'not_edible_3', 'not_edible_4'];
            let allCardsData = [];
            edibleIcons.forEach(icon => allCardsData.push({key: icon, category: 'edible'}));
            nonEdibleIcons.forEach(icon => allCardsData.push({key: icon, category: 'not_edible'}));

            // Shuffle
            for (let i = allCardsData.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [allCardsData[i], allCardsData[j]] = [allCardsData[j], allCardsData[i]];
            }

            const stackOffsets = [
                {x: -260, y: -250}, {x: 260, y: -250},
                {x: -260, y: 250}, {x: 260, y: 250}
            ];

            allCardsData.forEach((cardData, i) => {
                const stackIndex = i % 4;
                const card = new Card(this, cardData.key, cardData.category);
                card.addProperties(['pos', 'align', 'scale']);
                card.pAlign = 'Center';

                const offset = stackOffsets[stackIndex];
                card.px = card.originalX = offset.x;
                card.py = card.originalY = offset.y;
                card.pScaleX = card.pScaleY = card.originalScale = 0.75;

                this.stacks[stackIndex].push(card);
                card.setDepth(20 + this.stacks[stackIndex].length);
                this.mainContainer.add(card);

                if (this.stacks[stackIndex].length > 1) {
                    card.setFaceUp(false);
                } else {
                    card.setFaceUp(true);
                }

                // Interaction
                this.input.setDraggable(card.front);
                this.input.setDraggable(card.back);

                const dragHandler = (pointer) => this.onDrag(pointer, card);
                card.front.on('drag', dragHandler);
                card.back.on('drag', dragHandler);
                card.front.on('dragstart', (pointer) => this.onDragStart(pointer, card));
                card.back.on('dragstart', (pointer) => this.onDragStart(pointer, card));
                card.front.on('dragend', (pointer) => this.onDragEnd(pointer, card));
                card.back.on('dragend', (pointer) => this.onDragEnd(pointer, card));
            });

            // CTA Button
            this.btnFin = this.add.image(0, 0, 'btnFin').setInteractive().setVisible(false).setDepth(2000);
            this.btnFin.addProperties(['pos', 'align', 'scale', 'visible']);
            this.btnFin.pAlign = 'Bottom';
            this.btnFin.px = 0;
            this.btnFin.py = -150;
            this.btnFin.pScaleX = this.btnFin.pScaleY = 1.2;
            this.btnFin.pVisible = false;
            this.mainContainer.add(this.btnFin);

            this.btnFin.on('pointerdown', () => {
                if (window.ExitApi) window.ExitApi.exit();
                else console.log('CTA Clicked');
            });

            console.log('Game: create() successful');
        } catch (e) {
            console.error('Game: create() crashed!', e);
        }
    }

    onDragStart(pointer, card) {
        const stack = this.stacks.find(s => s.includes(card));
        if (stack && stack[stack.length - 1] !== card) return;

        card.setDepth(1000);
        this.tweens.add({
            targets: card,
            pScaleX: card.originalScale * 1.1,
            pScaleY: card.originalScale * 1.1,
            duration: 100
        });
    }

    onDrag(pointer, card) {
        const stack = this.stacks.find(s => s.includes(card));
        if (stack && stack[stack.length - 1] !== card) return;

        const appSize = this.game.size;
        card.px = (pointer.x - appSize.x) / appSize.scale;
        card.py = (pointer.y - appSize.y) / appSize.scale;
    }

    onDragEnd(pointer, card) {
        const stack = this.stacks.find(s => s.includes(card));
        if (stack && stack[stack.length - 1] !== card) return;

        let dropped = false;
        const zones = [this.edibleZone, this.nonEdibleZone];

        this.moves--;
        this.movesCounter.updateMoves(this.moves);

        for (const zone of zones) {
            const zoneX = zone.px;
            const zoneY = zone.py;
            const zoneWidth = 250 * zone.pScaleX;
            const zoneHeight = 300 * zone.pScaleY;

            if (card.px >= zoneX - zoneWidth/2 && card.px <= zoneX + zoneWidth/2 &&
                card.py >= zoneY - zoneHeight/2 && card.py <= zoneY + zoneHeight/2) {

                if (card.category === zone.category) {
                    dropped = true;
                    if (stack) {
                        stack.pop();
                        if (stack.length > 0) {
                            stack[stack.length - 1].flip();
                        }
                    }
                    card.magnetizeTo(zone);
                    zone.increment();
                    this.checkWin();
                    break;
                } else {
                    dropped = true;
                    card.shakeAndBack();
                    zone.showError();
                    break;
                }
            }
        }

        if (!dropped) card.returnToStack();
        if (this.moves <= 0) this.showCTA();
    }

    checkWin() {
        const totalCards = 8;
        const collected = this.edibleZone.count + this.nonEdibleZone.count;
        if (collected === totalCards) this.showCTA();
    }

    showCTA() {
        this.btnFin.setVisible(true);
        this.btnFin.pVisible = true;
        this.tweens.add({
            targets: this.btnFin,
            pScaleX: 1.3,
            pScaleY: 1.3,
            duration: 800,
            yoyo: true,
            repeat: -1
        });
    }
}
