import Card from './Card';
import DropZone from './DropZone';
import Utils from '../core/framework/Utils';

export default class Game extends Phaser.Scene {
    constructor() {
        super('Game');
    }

    create() {
        console.log('Game: create() started');

        // Essential for boilerplate scaling
        this.mainContainer = this.add.container(0, 0);

        // 1. Background
        this.bg = this.add.image(0, 0, 'main_bg');
        Utils.addDefaultProperties(this.bg);
        this.bg.addProperties(['pos', 'align', 'scale']);
        this.bg.setAlign('Center');
        this.bg.px = 0; this.bg.py = 0;
        this.bg.pScaleX = this.bg.pScaleY = 2.0; // Ensure coverage
        this.mainContainer.add(this.bg);

        // 2. Moves Counter
        this.movesBg = this.add.image(0, 0, 'moves_bg');
        Utils.addDefaultProperties(this.movesBg);
        this.movesBg.addProperties(['pos', 'align']);
        this.movesBg.pAlign = 'Top';
        this.movesBg.py = 100;
        this.mainContainer.add(this.movesBg);

        this.moves = 161;
        this.movesText = this.add.text(0, 0, `Moves : ${this.moves}`, {
            fontFamily: 'Arial', fontSize: '40px', color: '#ffffff', fontWeight: 'bold'
        }).setOrigin(0.5);
        Utils.addDefaultProperties(this.movesText);
        this.movesText.addProperties(['pos', 'align']);
        this.movesText.pAlign = 'Top';
        this.movesText.py = 100;
        this.mainContainer.add(this.movesText);

        // 3. Drop Zones
        this.edibleZone = new DropZone(this, 'Edible', 'edible');
        this.edibleZone.setAlign('Center');
        this.edibleZone.px = 0;
        this.edibleZone.py = -180;
        this.mainContainer.add(this.edibleZone);

        this.nonEdibleZone = new DropZone(this, 'Non Edible', 'not_edible');
        this.nonEdibleZone.setAlign('Center');
        this.nonEdibleZone.px = 0;
        this.nonEdibleZone.py = 180;
        this.mainContainer.add(this.nonEdibleZone);

        // 4. Cards and Stacks
        this.stacks = [[], [], [], []];
        const items = [
            {k:'edible_1', c:'edible'}, {k:'edible_2', c:'edible'}, {k:'edible_3', c:'edible'}, {k:'edible_4', c:'edible'},
            {k:'not_edible_1', c:'not_edible'}, {k:'not_edible_2', c:'not_edible'}, {k:'not_edible_3', c:'not_edible'}, {k:'not_edible_4', c:'not_edible'}
        ].sort(() => Math.random() - 0.5);

        const offsets = [{x:-260, y:-250}, {x:260, y:-250}, {x:-260, y:250}, {x:260, y:250}];

        items.forEach((item, i) => {
            const stackIdx = i % 4;
            const card = new Card(this, item.k, item.c);
            card.setAlign('Center');
            card.px = card.originalX = offsets[stackIdx].x;
            card.py = card.originalY = offsets[stackIdx].y;
            card.pScaleX = card.pScaleY = card.originalScale = 0.75;

            this.stacks[stackIdx].push(card);
            card.setDepth(20 + this.stacks[stackIdx].length);
            this.mainContainer.add(card);

            if (this.stacks[stackIdx].length > 1) card.setFaceUp(false);
            else card.setFaceUp(true);

            // Drag using proxies
            this.input.setDraggable(card.backBg);
            this.input.setDraggable(card.frontBg);

            card.frontBg.on('drag', (p) => this.onDrag(p, card));
            card.backBg.on('drag', (p) => this.onDrag(p, card));

            const onEnd = (p) => {
                const s = this.stacks.find(st => st.includes(card));
                if (!s || s[s.length-1] !== card) return;

                this.moves--;
                this.movesText.setText(`Moves : ${this.moves}`);

                let hit = false;
                [this.edibleZone, this.nonEdibleZone].forEach(z => {
                    if (Math.abs(card.px - z.px) < 125 && Math.abs(card.py - z.py) < 150) {
                        hit = true;
                        if (card.category === z.category) {
                            s.pop();
                            if (s.length) s[s.length-1].flip();
                            card.magnetizeTo(z);
                            z.increment();
                            if (this.edibleZone.count + this.nonEdibleZone.count === 8) this.showCTA();
                        } else {
                            card.shakeAndBack();
                            z.showError();
                        }
                    }
                });
                if (!hit) card.returnToStack();
                if (this.moves <= 0) this.showCTA();
            };

            card.frontBg.on('dragend', onEnd);
            card.backBg.on('dragend', onEnd);
        });

        // 5. CTA
        this.btnFin = this.add.image(0, 0, 'btnFin').setInteractive().setVisible(false).setDepth(2000);
        Utils.addDefaultProperties(this.btnFin);
        this.btnFin.addProperties(['pos', 'align', 'scale', 'visible']);
        this.btnFin.pAlign = 'Bottom';
        this.btnFin.py = -150;
        this.btnFin.pVisible = false;
        this.mainContainer.add(this.btnFin);
        this.btnFin.on('pointerdown', () => { if (window.ExitApi) window.ExitApi.exit(); });

        // Trigger resize
        this.game.size.resize();
        console.log('Game: create() successful');
    }

    onDrag(pointer, card) {
        const s = this.stacks.find(st => st.includes(card));
        if (s && s[s.length-1] === card) {
            const pos = Utils.getInputPoint(card, pointer.x, pointer.y);
            card.px = pos.x;
            card.py = pos.y;
        }
    }

    showCTA() {
        this.btnFin.setVisible(true);
        this.btnFin.pVisible = true;
        this.tweens.add({ targets: this.btnFin, pScaleX: 1.3, pScaleY: 1.3, duration: 800, yoyo: true, repeat: -1 });
    }
}
