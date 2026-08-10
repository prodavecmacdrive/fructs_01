import ParentScene  from "../core/framework/components/Scene";
import Utils        from "../core/framework/Utils";
import Background   from "./Background";
import Card         from "./Card";
import FinalWindow  from "./FinalWindow";
import MovesCounter from "./MovesCounter";
import BASE_SETTINGS from "../game-settings.json";
import Helper       from "./Helper";

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
        this.isTutorialReady = false;
        window.App.gameScene = this;
        this.columns = []; // Array of arrays of Cards
        this.activeCard = null; // The card in the bottom cell
        this.isAnimating = false; // Prevent interactions during animation
        this._initScene();
    }

    _initScene() {
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

        const L = this.SETTINGS.layout;
        const grid = this.SETTINGS.grid;
        const anim = this.SETTINGS.animations;

        // Ensure card glow texture exists
        if (!this.textures.exists('card_glow_tex')) {
            const glowW = 200;
            const glowH = 240;
            const glowTex = this.textures.createCanvas('card_glow_tex', glowW, glowH);
            const gCtx = glowTex.context;
            const padX = 35;
            const padY = 35;
            const rectW = glowW - padX * 2;
            const rectH = glowH - padY * 2;
            const rad = 22;

            gCtx.shadowColor = '#ffea55';
            gCtx.shadowBlur = 25;
            gCtx.lineWidth = 6;
            gCtx.strokeStyle = '#ffffff';
            gCtx.fillStyle = 'rgba(255, 234, 85, 0.35)';

            gCtx.beginPath();
            gCtx.moveTo(padX + rad, padY);
            gCtx.lineTo(padX + rectW - rad, padY);
            gCtx.quadraticCurveTo(padX + rectW, padY, padX + rectW, padY + rad);
            gCtx.lineTo(padX + rectW, padY + rectH - rad);
            gCtx.quadraticCurveTo(padX + rectW, padY + rectH, padX + rectW - rad, padY + rectH);
            gCtx.lineTo(padX + rad, padY + rectH);
            gCtx.quadraticCurveTo(padX, padY + rectH, padX, padY + rectH - rad);
            gCtx.lineTo(padX, padY + rad);
            gCtx.quadraticCurveTo(padX, padY, padX + rad, padY);
            gCtx.closePath();

            gCtx.fill();
            gCtx.stroke();
            glowTex.refresh();
        }

        // Moves counter
        if (L.movesCounter) {
            this.movesCounter = new MovesCounter({
                scene: this, moves: this.SETTINGS.game.startingMoves,
                cx: L.movesCounter.cx, cy: L.movesCounter.cy,
                alpha: L.movesCounter.alpha,
                container: this.mainContainer
            });
        }

        const startX = L.startX !== undefined ? L.startX : -225;
        const spacingX = L.spacingX !== undefined ? L.spacingX : 150;
        const targetCards = this.SETTINGS.game.cardsPerColumn || 5;

        // Draw Game Board with Rounded Corners and Fading Gradient
        const frame = this.SETTINGS.boardFrame || {};
        const sidePadding = frame.sidePadding !== undefined ? frame.sidePadding : 25;
        const topPadding = frame.topPadding !== undefined ? frame.topPadding : 25;
        const radius = frame.borderRadius !== undefined ? frame.borderRadius : 28;
        const strokeWidth = frame.borderWidth !== undefined ? frame.borderWidth : 6;

        const fillGradCfg = frame.fillGradient || {};
        const fillTopColor = fillGradCfg.topColor || 'rgba(86, 170, 255, 0.95)';
        const fillMidColor = fillGradCfg.midColor || 'rgba(86, 170, 255, 0.6)';
        const fillMidStop = fillGradCfg.midStop !== undefined ? fillGradCfg.midStop : 0.65;
        const fillBottomColor = fillGradCfg.bottomColor || 'rgba(86, 170, 255, 0)';

        const borderGradCfg = frame.borderGradient || {};
        const borderTopColor = borderGradCfg.topColor || 'rgba(255, 255, 255, 1)';
        const borderMidColor = borderGradCfg.midColor || 'rgba(255, 255, 255, 0.5)';
        const borderMidStop = borderGradCfg.midStop !== undefined ? borderGradCfg.midStop : 0.7;
        const borderBottomColor = borderGradCfg.bottomColor || 'rgba(255, 255, 255, 0)';

        const boardWidth = spacingX * L.columns.length + 20 + (sidePadding * 2);
        const boardHeight = L.spacingY * (targetCards - 1) + 240 + topPadding;
        const boardX = startX - spacingX / 2 - 10 - sidePadding + boardWidth / 2;
        const boardY = L.startY - 100 - topPadding + boardHeight / 2;

        if (this.textures.exists('board_bg_tex')) {
            this.textures.remove('board_bg_tex');
        }
        const canvasTex = this.textures.createCanvas('board_bg_tex', boardWidth, boardHeight);
        const ctx = canvasTex.context;

        // Path for rounded rectangle
        const x = strokeWidth / 2;
        const y = strokeWidth / 2;
        const w = boardWidth - strokeWidth;
        const h = boardHeight - strokeWidth;

        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + w - radius, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
        ctx.lineTo(x + w, y + h - radius);
        ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
        ctx.lineTo(x + radius, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();

        // Linear gradient: blue top -> transparent bottom
        const grad = ctx.createLinearGradient(0, 0, 0, boardHeight);
        grad.addColorStop(0, fillTopColor);
        grad.addColorStop(fillMidStop, fillMidColor);
        grad.addColorStop(1, fillBottomColor);

        ctx.fillStyle = grad;
        ctx.fill();

        // Fading rounded border
        const borderGrad = ctx.createLinearGradient(0, 0, 0, boardHeight);
        borderGrad.addColorStop(0, borderTopColor);
        borderGrad.addColorStop(borderMidStop, borderMidColor);
        borderGrad.addColorStop(1, borderBottomColor);

        ctx.lineWidth = strokeWidth;
        ctx.strokeStyle = borderGrad;
        ctx.stroke();

        canvasTex.refresh();

        const boardBg = this.add.image(0, 0, 'board_bg_tex');
        boardBg.setDepth(1);
        boardBg.addProperties(['pos', 'scale']);
        boardBg.px = boardX; boardBg.py = boardY;
        boardBg.lx = boardX; boardBg.ly = boardY;
        boardBg.setCustomPosition(boardX, boardY).setAlign('Center');
        this.boardBg = boardBg;
        this.mainContainer.add(boardBg);

        // Initialize Columns
        this.columnHeaders = [];
        for (let c = 0; c < L.columns.length; c++) {
            const colData = L.columns[c];
            const colArray = [];
            this.columns.push(colArray);

            const colCx = colData.cx !== undefined ? colData.cx : (startX + c * spacingX);

            // Column Header
            let header = null;
            if (this.SETTINGS.cardTypes && this.SETTINGS.cardTypes[c]) {
                const labelStr = this.SETTINGS.cardTypes[c].label;
                const headerY = L.startY + (grid.categoryLabelOffsetY !== undefined ? grid.categoryLabelOffsetY : -80);
                const textStyle = {
                    fontFamily: grid.categoryLabelFontFamily,
                    fontSize: grid.categoryLabelFontSize,
                    fontStyle: grid.categoryLabelFontStyle,
                    color: grid.categoryLabelTextColor,
                    stroke: grid.categoryLabelStroke,
                    strokeThickness: grid.categoryLabelStrokeThickness
                };
                if (grid.categoryLabelLetterSpacing && grid.categoryLabelLetterSpacing > 0) {
                    header = this.add.container(0, 0);
                    let chars = labelStr.split('');
                    let totalWidth = 0;
                    let textObjs = [];
                    for (let i = 0; i < chars.length; i++) {
                        let t = this.add.text(0, 0, chars[i], textStyle).setOrigin(0, 0.5);
                        textObjs.push(t);
                        header.add(t);
                        t.x = totalWidth;
                        totalWidth += t.width + grid.categoryLabelLetterSpacing;
                    }
                    totalWidth -= grid.categoryLabelLetterSpacing;
                    for (let i = 0; i < textObjs.length; i++) {
                        textObjs[i].x -= totalWidth / 2;
                    }
                    header.setDepth(2);
                    header.setAlign = function() { return this; };
                    header.setOrigin = function() { return this; };
                } else {
                    header = this.add.text(0, 0, labelStr, textStyle).setOrigin(0.5).setDepth(2);
                }
                header.addProperties(['pos', 'scale']);
                header.px = colCx; header.py = headerY;
                header.lx = colCx; header.ly = headerY;
                header.setCustomPosition(colCx, headerY).setAlign('Center');
                this.mainContainer.add(header);
            }
            this.columnHeaders.push(header);

            // Down Arrow Animation
            const arrowSettings = this.SETTINGS.arrowAnimation || {};
            const arrowCount = arrowSettings.count !== undefined ? arrowSettings.count : 3;
            const arrowScale = arrowSettings.scale !== undefined ? arrowSettings.scale : 1;
            const arrowOffsetX = arrowSettings.offsetX || 0;
            const arrowOffsetY = arrowSettings.offsetY !== undefined ? arrowSettings.offsetY : -45;
            const arrowDistance = arrowSettings.distance !== undefined ? arrowSettings.distance : 90;
            const arrowDuration = arrowSettings.durationMs !== undefined ? arrowSettings.durationMs : 1800;
            const arrowDepth = arrowSettings.depth !== undefined ? arrowSettings.depth : 0;

            const baseArrowX = colCx + arrowOffsetX;
            const baseArrowY = (L.startY - 100) + boardHeight + arrowOffsetY;
            const staggerDelay = arrowCount > 0 ? arrowDuration / arrowCount : 0;

            for (let i = 0; i < arrowCount; i++) {
                this.time.delayedCall(i * staggerDelay, () => {
                    if (!this.mainContainer) return;
                    const arrow = this.add.sprite(0, 0, 'down_arrow').setDepth(arrowDepth);
                    arrow.addProperties(['pos', 'scale']);
                    arrow.pScaleX = arrow.pScaleY = arrow.lScaleX = arrow.lScaleY = arrowScale;
                    arrow.setScale(arrowScale);
                    arrow.px = baseArrowX; arrow.py = baseArrowY;
                    arrow.lx = baseArrowX; arrow.ly = baseArrowY;
                    arrow.alpha = 0; // Start fully transparent
                    arrow.setCustomPosition(baseArrowX, baseArrowY).setAlign('Center');
                    
                    const bgIdx = this.boardBg ? this.mainContainer.getIndex(this.boardBg) : 0;
                    this.mainContainer.addAt(arrow, Math.max(0, bgIdx + 1));
                    this.tweens.add({
                        targets: arrow,
                        py: baseArrowY + arrowDistance,
                        ly: baseArrowY + arrowDistance,
                        alpha: { value: 1, duration: arrowDuration / 2, yoyo: true },
                        duration: arrowDuration,
                        repeat: -1
                    });
                });
            }

            // Create visual highlight area for the column
            const cardScale = this.SETTINGS.card?.faceScale || 0.38;
            const cardW = 130 * cardScale;
            const cardH = 170 * cardScale;
            const autoWidth = (grid.hitAreaWidth !== undefined && grid.hitAreaWidth > 0) ? grid.hitAreaWidth : cardW;
            const autoHeight = (grid.hitAreaHeight !== undefined && grid.hitAreaHeight > 0) ? grid.hitAreaHeight : (((targetCards - 1) * L.spacingY) + cardH);
            const hitCy = L.startY + (((targetCards - 1) / 2) * L.spacingY) + (grid.hitAreaOffsetY || 0);

            const hitArea = this.add.image(0, 0, 'card_front_bg');
            hitArea.addProperties(['pos', 'scale', 'alpha']);
            hitArea.px = colCx; hitArea.py = hitCy;
            hitArea.lx = colCx; hitArea.ly = hitCy;
            hitArea.setCustomPosition(colCx, hitCy).setAlign('Center');
            hitArea.setDisplaySize(autoWidth, autoHeight);
            
            const targetAlpha = (grid.hitAreaAlpha !== undefined && grid.hitAreaAlpha > 0) ? grid.hitAreaAlpha : 0.0001;
            hitArea.pAlpha = targetAlpha;
            hitArea.lAlpha = targetAlpha;
            hitArea.setAlpha(targetAlpha);

            if (grid.hitAreaColor) {
                const colorInt = parseInt(grid.hitAreaColor.replace('#', '0x'), 16);
                hitArea.setTint(colorInt);
            }
            hitArea.setDepth(1);
            this.mainContainer.add(hitArea);

            // Populate initial cards
            if (colData.cards) {
                for (let r = 0; r < colData.cards.length; r++) {
                    const cardData = colData.cards[r];
                    const cy = L.startY + r * L.spacingY;
                    const card = new Card({
                        scene: this,
                        type: cardData.type,
                        icon: cardData.icon,
                        cx: colCx,
                        cy: cy,
                        isFaceUp: false,
                        container: this.mainContainer
                    });
                    card.columnIndex = c;
                    card.setDepth(grid.gridCardDepth + r);
                    colArray.push(card);
                }
            }
        }

        // Initialize Active Card (Gradient Card at bottom)
        const initActive = L.initialActiveCard || { type: "gradient", icon: "gradient" };
        this.activeCard = new Card({
            scene: this,
            type: initActive.type,
            icon: initActive.icon,
            cx: L.bottomCell.cx,
            cy: L.bottomCell.cy,
            isFaceUp: false,
            container: this.mainContainer
        });
        this.activeCard.columnIndex = -1;
        this.activeCard.setDepth(grid.activeCardDepth);

        // Final window (hidden until end-state)
        this.finalWindow = new FinalWindow({
            scene:     this,
            container: this.mainContainer,
            onCta:     () => this._onCta()
        });

        // Launch the persistent TimerScene (no-op if already active from a prior scene)
        if (!this.scene.isActive('TimerScene')) {
            this.scene.launch('TimerScene');
        }

        // Trigger resize, set up listener, then show start screen
        setTimeout(() => {
            if (!this.scene || !this.scene.key) return; // Scene already shutdown
            this._resize();
            this.scale.on('resize', () => setTimeout(() => {
                if (this.scene && this.scene.key) this._resize();
            }, anim.resizeDebounceMs));
            
            if (!window.App.hasGameStarted) {
                window.App.hasGameStarted = true;
            }

            const timerScene = this.scene.get('TimerScene');
            const onTimeout = () => {
                if (!this.gameOver) {
                    this.gameOver = true;
                    this.helper?.kill();
                    this.helper = null;
                    this._triggerEnd();
                }
            };
            if (timerScene) {
                timerScene.launchTimer(onTimeout, () => this._flipAllCards());
            } else {
                this._flipAllCards();
            }
        }, anim.resizeDebounceMs);

        this.events.once('shutdown', () => {
            this.helper?.kill();
            this.input.removeAllListeners();
            this.scale.removeAllListeners('resize');
        });
    }

    _flipAllCards() {
        let delay = 0;
        let completed = 0;
        
        let allCards = [this.activeCard];
        for (const col of this.columns) {
            allCards = allCards.concat(col);
        }
        
        for (const card of allCards) {
            this.time.delayedCall(delay, () => {
                card.flip(() => {
                    completed += 1;
                    if (completed === allCards.length) {
                        this._checkCompletedColumns();
                        this.helper = new Helper({ scene: this, container: this.mainContainer });
                        this.helper.startCustomOnboarding(this.columnHeaders, this.columns);
                    }
                });
            });
            delay += 30; // Quick stagger
        }
    }

    _onColumnTapped(colIndex) {
        if (this.gameOver || this.isAnimating || !this.isTutorialReady) return;
        
        const col = this.columns[colIndex];
        if (!col || col.length === 0 || col.isCompleted) return;

        this.isAnimating = true;
        Utils.addAudio(this, 'swoosh', 1.0);

        if (this.movesCounter) {
            this.movesCounter.decrement();
        }

        const L = this.SETTINGS.layout;
        const grid = this.SETTINGS.grid;
        
        // Remove bottom card from column (last item in array = row 3)
        const poppedCard = col.pop();
        poppedCard.columnIndex = -1;
        
        // Add active card to top of column (first item in array = row 0)
        const insertingCard = this.activeCard;
        insertingCard.columnIndex = colIndex;
        col.unshift(insertingCard);

        // Update column index for all cards in this column
        for (let r = 0; r < col.length; r++) {
            col[r].columnIndex = colIndex;
        }
        
        // Update new active card
        this.activeCard = poppedCard;

        let completedAnims = 0;
        const totalAnims = col.length + 1; // 4 cards in column + 1 popped active card

        const onAnimComplete = () => {
            completedAnims++;
            if (completedAnims === totalAnims) {
                this.isAnimating = false;
                this._checkCompletedColumns();
                if (!this._checkWin()) {
                    this._checkLose();
                }
                this.helper?.notifySwapComplete(this.activeCard, this.columnHeaders, this.columns);
            }
        };

        const targetCx = col.cx !== undefined ? col.cx : (L.startX !== undefined ? L.startX + colIndex * (L.spacingX || 150) : L.columns[colIndex].cx);

        const swapAnim = this.SETTINGS.swapAnimation || {
            liftDurationMs: 200, dropDurationMs: 250, shiftDurationMs: 350, returnDurationMs: 450, liftDistancePx: 40, maxTiltAngle: 8
        };

        // Bring poppedCard and insertingCard to the top of mainContainer (poppedCard below insertingCard)
        this.mainContainer.bringToTop(poppedCard);
        this.mainContainer.bringToTop(insertingCard);
        this.helper?._ensureFingerTop();

        poppedCard.setDepth(grid.activeCardDepth + 4);
        insertingCard.setDepth(grid.activeCardDepth + 5);

        // Animate insertingCard to row 0 (lift, tilt, drop)
        insertingCard.advancedMoveTo({
            newCx: targetCx,
            newCy: L.startY,
            liftDistance: swapAnim.liftDistancePx,
            liftDuration: swapAnim.liftDurationMs,
            duration: swapAnim.dropDurationMs,
            ease: 'Cubic.easeOut',
            angle: swapAnim.maxTiltAngle,
            onComplete: () => {
                insertingCard.setDepth(grid.gridCardDepth); // Reset depth after drop
                onAnimComplete();
            }
        });

        const shiftDelay = swapAnim.shiftDelayMs !== undefined ? swapAnim.shiftDelayMs : swapAnim.liftDurationMs;
        const returnDelay = swapAnim.returnDelayMs !== undefined ? swapAnim.returnDelayMs : swapAnim.liftDurationMs;

        // Animate remaining cards in column to shift down simultaneously
        for (let r = 1; r < col.length; r++) {
            const card = col[r];
            card.setDepth(grid.gridCardDepth + r);
            card.advancedMoveTo({
                newCx: targetCx,
                newCy: L.startY + r * L.spacingY,
                duration: swapAnim.shiftDurationMs,
                delay: shiftDelay,
                ease: 'Cubic.easeOut',
                onComplete: onAnimComplete
            });
        }

        // Animate poppedCard to bottom cell (inertia move back)
        poppedCard.advancedMoveTo({
            newCx: L.bottomCell.cx,
            newCy: L.bottomCell.cy,
            duration: swapAnim.returnDurationMs,
            delay: returnDelay,
            ease: 'Power3.easeOut', // Smooth inertia
            onComplete: onAnimComplete
        });
    }

    _checkCompletedColumns() {
        if (this.gameOver) return;

        const targetCards = this.SETTINGS.game.cardsPerColumn || 5;

        for (let c = 0; c < this.columns.length; c++) {
            const col = this.columns[c];
            if (col.isCompleted) continue;
            if (col.length !== targetCards) continue;

            const firstType = col[0].type;
            if (!firstType || firstType === 'gradient') continue;

            const allMatch = col.every(card => card.type === firstType && card.type !== 'gradient');
            if (allMatch) {
                this._assembleColumn(col, c);
            }
        }
    }

    _assembleColumn(col, colIndex) {
        col.isCompleted = true;
        for (const card of col) {
            card.isLocked = true;
        }

        Utils.addAudio(this, 'column_win', 1.0);

        // Apply wave pulse animation sequentially across cards from top to bottom
        for (let i = 0; i < col.length; i++) {
            const card = col[i];
            const delay = i * 140;

            this.time.delayedCall(delay, () => {
                this.tweens.add({
                    targets: card,
                    scaleX: 1.15,
                    scaleY: 1.15,
                    duration: 160,
                    yoyo: true,
                    ease: 'Cubic.easeOut',
                    onComplete: () => {
                        // After wave pulse completes, start card-flame-bg glow & floating effect
                        card.showGlow(i * 120);
                    }
                });
            });
        }
    }

    _checkWin() {
        if (this.gameOver) return false;

        const targetCards = this.SETTINGS.game.cardsPerColumn || 4;
        let isWon = true;
        for (const col of this.columns) {
            if (col.length !== targetCards) {
                isWon = false;
                break;
            }
            const firstType = col[0].type;
            if (firstType === 'gradient') {
                isWon = false;
                break;
            }
            for (const card of col) {
                if (card.type !== firstType || card.type === 'gradient') {
                    isWon = false;
                    break;
                }
            }
        }

        if (isWon) {
            this.gameOver = true;
            this._triggerEnd();
        }
        
        return isWon;
    }

    _checkLose() {
        if (this.gameOver) return;
        if (this.movesCounter && this.movesCounter.remaining <= 0) {
            this.gameOver = true;
            Utils.addAudio(this, 'lose', 1);
            this.time.delayedCall(this.SETTINGS.animations.lossDelayMs || 600, () => {
                this._triggerEnd();
            });
        }
    }

    _triggerEnd() {
        this.time.delayedCall(this.SETTINGS.animations.endScreenDelayMs || 400, () => {
            this.helper?.kill();
            this.helper = null;
            if (window.App.stateManager && window.App.stateManager.isFlowComplete) {
                window.App.stateManager.markCompleted(this._sceneId);
                if (window.App.stateManager.isFlowComplete()) {
                    window.App.timerScene?.stopTimer();
                    window.App.timerScene?.hideTimer();
                    this.finalWindow.show();
                    this.helper = new Helper({ scene: this, container: this.mainContainer });
                    this.helper.startFinalScreen(this.finalWindow.btnFin);
                } else {
                    this.scene.stop();
                    this.scene.start('TransitionScene');
                }
            } else {
                window.App.timerScene?.stopTimer();
                window.App.timerScene?.hideTimer();
                this.finalWindow.show();
            }
        });
    }

    _onCta() {
        window.App.network.ctaClick();
    }

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

    _resize() {
        if (!this.game) return;
        const isPortrait = this.scale.height > this.scale.width;
        this.game.size.isPortrait = isPortrait;
        this.game.size.resize();
    }
}
