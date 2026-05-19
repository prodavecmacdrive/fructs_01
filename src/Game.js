
import Card from './Card';
import DropZone from './DropZone';
import Utils from '../core/framework/Utils';

export default class Game extends Phaser.Scene {
    constructor() {
        super('Game');
    }

    create() {
        const { width, height } = this.sys.game.config;

        // Background
        this.add.image(width / 2, height / 2, 'main_bg')
            .setOrigin(0.5)
            .setDisplaySize(width, height);

        // Moves Counter
        this.moves = 161;
        this.movesPanel = this.add.image(0, 0, 'moves_bg').setDepth(100);
        this.movesPanel.addProperties(['pos', 'align', 'scale']);
        this.movesPanel.pAlign = 'Top';
        this.movesPanel.px = 0;
        this.movesPanel.py = 100;
        this.movesPanel.pScaleX = this.movesPanel.pScaleY = 1.0;

        this.movesText = this.add.text(0, 0, `Moves : ${this.moves}`, {
            fontFamily: 'Arial',
            fontSize: '40px',
            color: '#ffffff',
            fontWeight: 'bold'
        }).setOrigin(0.5).setDepth(101);
        this.movesText.addProperties(['pos', 'align']);
        this.movesText.pAlign = 'Top';
        this.movesText.px = 0;
        this.movesText.py = 100;

        // Drop Zones
        this.edibleZone = new DropZone(this, 'Edible', 'edible');
        this.edibleZone.setDepth(10);
        this.edibleZone.addProperties(['pos', 'align', 'scale']);
        this.edibleZone.pAlign = 'Center';
        this.edibleZone.px = 0;
        this.edibleZone.py = -180;
        this.edibleZone.pScaleX = this.edibleZone.pScaleY = 1.0;

        this.nonEdibleZone = new DropZone(this, 'Non Edible', 'not_edible');
        this.nonEdibleZone.setDepth(10);
        this.nonEdibleZone.addProperties(['pos', 'align', 'scale']);
        this.nonEdibleZone.pAlign = 'Center';
        this.nonEdibleZone.px = 0;
        this.nonEdibleZone.py = 180;
        this.nonEdibleZone.pScaleX = this.nonEdibleZone.pScaleY = 1.0;

        // Cards and Stacks
        this.stacks = [[], [], [], []];

        const edibleIcons = ['edible_1', 'edible_2', 'edible_3', 'edible_4'];
        const nonEdibleIcons = ['not_edible_1', 'not_edible_2', 'not_edible_3', 'not_edible_4'];

        let allCardsData = [];
        edibleIcons.forEach(icon => allCardsData.push({key: icon, category: 'edible'}));
        nonEdibleIcons.forEach(icon => allCardsData.push({key: icon, category: 'not_edible'}));

        // Shuffle cards
        for (let i = allCardsData.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allCardsData[i], allCardsData[j]] = [allCardsData[j], allCardsData[i]];
        }

        // Stacks on the sides
        const stackOffsets = [
            {x: -260, y: -250}, // Left Top
            {x: 260, y: -250},  // Right Top
            {x: -260, y: 250},  // Left Bottom
            {x: 260, y: 250}   // Right Bottom
        ];

        allCardsData.forEach((cardData, i) => {
            const stackIndex = i % 4;
            const card = new Card(this, cardData.key, cardData.category);
            card.addProperties(['pos', 'align', 'scale']);
            card.pAlign = 'Center';

            const offset = stackOffsets[stackIndex];
            card.px = offset.x;
            card.py = offset.y;
            card.pScaleX = card.pScaleY = 0.75;

            this.stacks[stackIndex].push(card);
            card.setDepth(20 + this.stacks[stackIndex].length);

            // Hide cards underneath
            if (this.stacks[stackIndex].length > 1) {
                const bottomCard = this.stacks[stackIndex][this.stacks[stackIndex].length - 2];
                bottomCard.setFaceUp(false);
            } else {
                card.setFaceUp(true);
            }

            // We make the children draggable, but we move the container
            this.input.setDraggable(card.front);
            this.input.setDraggable(card.back);

            card.front.on('drag', (pointer, dragX, dragY) => this.onDrag(pointer, card));
            card.back.on('drag', (pointer, dragX, dragY) => this.onDrag(pointer, card));

            card.front.on('dragstart', (pointer) => this.onDragStart(pointer, card));
            card.back.on('dragstart', (pointer) => this.onDragStart(pointer, card));

            card.front.on('dragend', (pointer) => this.onDragEnd(pointer, card));
            card.back.on('dragend', (pointer) => this.onDragEnd(pointer, card));
        });

        // CTA Button
        this.btnFin = this.add.image(0, 0, 'btnFin').setInteractive().setVisible(false).setDepth(2000);
        this.btnFin.addProperties(['pos', 'align', 'scale']);
        this.btnFin.pAlign = 'Bottom';
        this.btnFin.px = 0;
        this.btnFin.py = -150;
        this.btnFin.pScaleX = this.btnFin.pScaleY = 1.2;

        this.btnFin.on('pointerdown', () => {
            if (window.ExitApi) window.ExitApi.exit();
            else console.log('CTA Clicked');
        });
    }

    onDragStart(pointer, card) {
        const stack = this.stacks.find(s => s.includes(card));
        if (stack && stack[stack.length - 1] !== card) return;

        card.originalX = card.x;
        card.originalY = card.y;
        card.originalScale = card.scaleX;
        card.setDepth(1000);

        this.tweens.add({
            targets: card,
            scale: card.originalScale * 1.1,
            duration: 100
        });
    }

    onDrag(pointer, card) {
        const stack = this.stacks.find(s => s.includes(card));
        if (stack && stack[stack.length - 1] !== card) return;

        card.x = pointer.x;
        card.y = pointer.y;
    }

    onDragEnd(pointer, card) {
        const stack = this.stacks.find(s => s.includes(card));
        if (stack && stack[stack.length - 1] !== card) return;

        let dropped = false;
        const zones = [this.edibleZone, this.nonEdibleZone];

        this.moves--;
        this.movesText.setText(`Moves : ${this.moves}`);

        for (const zone of zones) {
            const zoneX = zone.x;
            const zoneY = zone.y;
            const zoneWidth = 250 * zone.scaleX;
            const zoneHeight = 300 * zone.scaleY;

            if (pointer.x >= zoneX - zoneWidth/2 && pointer.x <= zoneX + zoneWidth/2 &&
                pointer.y >= zoneY - zoneHeight/2 && pointer.y <= zoneY + zoneHeight/2) {

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

        if (!dropped) {
            card.returnToStack();
        }

        if (this.moves <= 0) {
            this.showCTA();
        }
    }

    checkWin() {
        const totalCards = 8;
        const collected = this.edibleZone.count + this.nonEdibleZone.count;
        if (collected === totalCards) {
            this.showCTA();
        }
    }

    showCTA() {
        this.btnFin.setVisible(true);
        this.tweens.add({
            targets: this.btnFin,
            scale: 1.3,
            duration: 800,
            yoyo: true,
            repeat: -1
        });
    }
}
