import Utils from '../core/framework/Utils';

/**
 * Character
 * ---------
 * Renders a customer character with a speech bubble in the character zone of
 * the screen.  The zone occupies:
 *   - Landscape: the right `landscapeWidthPercent`% of the screen width.
 *   - Portrait : the bottom `portraitHeightPercent`% of the screen height.
 *
 * The speech bubble image switches between `bubble_l` (landscape) and
 * `bubble_p` (portrait).  Dialogue text is drawn from the `positive` /
 * `negative` arrays defined in game-settings.dialogue, cycling through every
 * entry in a random (non-repeating) order before reshuffling.
 *
 * Audio is keyed as `positive_N` / `negative_N` where N is the 1-based index
 * of the phrase in its source array.  Missing audio keys are silently ignored.
 *
 * Public API
 * ----------
 *   character.showDialogue('start' | 'positive' | 'negative')
 *   character.onResize(isPortrait, scale, screenW, screenH)
 *   character.destroy()
 */
export default class Character {
    constructor({ scene, container, dialogueCfg, characterCfg, dialogueBoxCfg }) {
        this._scene = scene;
        this._container = container;
        this._dlgCfg = dialogueCfg;
        this._charCfg = characterCfg;
        this._dlgBoxCfg = dialogueBoxCfg;

        // Non-repeating random pools. Each entry: { phrase, originalIndex }
        this._posPool = this._makePool(dialogueCfg.positive);
        this._negPool = this._makePool(dialogueCfg.negative);

        // Root sub-container so we can move all character elements as one unit
        this._root = scene.add.container(0, 0);
        this._root.setDepth(50);
        container.add(this._root);

        // Speech bubble background
        this._bubble = scene.add.image(0, 0, dialogueBoxCfg.landscapeTexture || 'bubble_l');
        this._bubble.setOrigin(0.5, 0.5);
        this._bubble.setAlpha(0).setScale(0);
        this._root.add(this._bubble);

        // Dialogue text
        this._text = scene.add.text(0, 0, '', {
            fontFamily: dialogueBoxCfg.fontFamily || 'LilitaOne-Regular, Arial',
            fontStyle: dialogueBoxCfg.fontStyle || 'normal',
            color: dialogueBoxCfg.textColor || '#ffffff',
            align: dialogueBoxCfg.align || 'center',
            wordWrap: { width: 260, useAdvancedWrap: true }
        });
        this._text.setOrigin(0.5, 0.5);
        this._text.setDepth(1);
        this._text.setAlpha(0).setScale(0);
        this._root.add(this._text);

        // Customer spine object (cat_animation) wrapped in SpineContainer
        if (window.SpinePlugin && scene.spine) {
            console.log('[Character] Initializing cat_animation Spine container and object...');
            const spineContainer = new window.SpinePlugin.SpineContainer(scene, scene.spine, 0, 0);
            const spineObj = new window.SpinePlugin.SpineGameObject(
                scene,
                scene.spine,
                0,
                0,
                'cat_animation',
                'Idle',
                true
            );
            spineContainer.add(spineObj);
            if (scene.sys.updateList) {
                scene.sys.updateList.add(spineObj);
            }
            spineObj.setSkinByName('default');
            spineObj.skeleton.setSlotsToSetupPose();
            try {
                if (typeof spineObj.setAnimation === 'function') {
                    spineObj.setAnimation(0, 'Idle', true);
                } else if (spineObj.animationState) {
                    spineObj.animationState.setAnimation(0, 'Idle', true);
                }
                console.log('[Character] Successfully started Idle animation on cat_animation.');
            } catch (e) {
                console.warn("[Character] Animation 'Idle' not found for cat_animation:", e);
            }
            this._customer = spineContainer;
            this._customer.spineObj = spineObj;
        } else {
            console.warn('[Character] SpinePlugin or scene.spine missing, falling back to customer image.');
            this._customer = scene.add.image(0, 0, 'customer');
            this._customer.setOrigin(0.5, 1);
        }
        this._root.add(this._customer);


        this._textTween = null;
        this._isPortrait = null;
        this._customerAppeared = false;
    }

    // -------------------------------------------------------------------------
    // Public API
    // -------------------------------------------------------------------------

    showDialogue(type) {
        let text = '';
        let audioKey = null;

        if (type === 'start') {
            text = this._dlgCfg.game_start || '';
            audioKey = 'game_start';
        } else if (type === 'positive') {
            const entry = this._draw(this._posPool, this._dlgCfg.positive);
            text = entry.phrase;
            audioKey = `positive_${entry.originalIndex + 1}`;
        } else if (type === 'negative') {
            const entry = this._draw(this._negPool, this._dlgCfg.negative);
            text = entry.phrase;
            audioKey = `negative_${entry.originalIndex + 1}`;
        }

        if (!text) return;
        this._animateText(text);
        this._playAudio(audioKey);
        this._playSpineReaction('Talk');
    }


    onResize(isPortrait, scale, screenW, screenH) {
        this._isPortrait = isPortrait;

        const size = this._scene.game.size;

        const cfg = this._dlgBoxCfg;

        // Reset any active transitions for text/bubble
        this._scene.tweens.killTweensOf([this._text, this._bubble]);
        if (this._text.text !== '') {
            this._bubble.setAlpha(1);
            this._text.setAlpha(1).setScale(1);
        }

        if (isPortrait) {
            // ── Portrait: character zone = bottom strip ───────────────────
            const pct = this._charCfg.portraitHeightPercent / 100;
            const pCfg = cfg.portrait;

            // Zone metrics in container-local coords (exact screen bounds)
            const zoneH = (size.bottom - size.top) * pct;
            const zoneW = size.right - size.left;
            const zoneMidY = size.bottom - zoneH * 0.5;

            this._bubble.setTexture(cfg.portraitTexture || 'bubble_p');
            const bScaleH = (zoneH * (pCfg.bubbleHeightScale ?? 0.88)) / this._bubble.height;
            const bScaleW = (zoneW * (pCfg.bubbleWidthScale ?? 0.50)) / this._bubble.width;
            const bScale = Math.min(bScaleH, bScaleW, 1.0);
            if (this._text.text !== '') {
                this._bubble.setScale(bScale);
            }
            const bubW = this._bubble.width * bScale;
            const bubH = this._bubble.height * bScale;

            // Bubble: left 50% of screen width, centred vertically in strip + optional config offsets
            const bubX = size.left + zoneW * 0.25 + zoneW * (cfg.bubbleOffsetProtretXFactor ?? 0);
            const bubY = zoneMidY + zoneH * (cfg.bubbleOffsetProtretYFactor ?? 0);

            // Customer: right side of strip, bottom-anchored to screen bottom
            const cMaxH = zoneH * 1.1;
            const cMaxW = zoneW * 0.40;
            const cScale = Math.min(cMaxH / this._getCustH(), cMaxW / this._getCustW());

            const custX = size.left + zoneW * 0.75;
            const custY = size.bottom;

            this._bubBaseX = bubX;
            this._bubBaseY = bubY;
            this._textBaseX = bubX + bubW * (pCfg.textOffsetXFactor ?? 0);
            this._textBaseY = bubY + bubH * (pCfg.textOffsetYFactor ?? 0.0);
            this._bubBaseScale = bScale;

            this._custBaseX = custX;
            this._custBaseY = custY;
            this._custBaseScale = cScale;

            this._root.setPosition(0, 0);
            this._bubble.setPosition(bubX, bubY);
            this._text.setPosition(this._textBaseX, this._textBaseY);
            this._text.setStyle({
                fontSize: `${Math.max(pCfg.minFontSize ?? 14, Math.round(bubH * (pCfg.fontSizeFactor ?? 0.23)))}px`,
                wordWrap: { width: bubW * (pCfg.wordWrapFactor ?? 0.68), useAdvancedWrap: true }
            });

            if (this._customerAppeared) {
                this._customer.setPosition(custX, custY);
                this._customer.setScale(cScale);
                this._customer.setVisible(true);
            } else {
                this._scene.tweens.killTweensOf(this._customer);
                this._customer.setPosition(custX, custY + this._getCustH() * cScale + 100);
                this._customer.setScale(cScale * 0.8, cScale * 1.3);
                this._customer.setVisible(false);
            }

        } else {
            // ── Landscape: character zone = right column ──────────────────
            const pct = this._charCfg.landscapeWidthPercent / 100;
            const lCfg = cfg.landscape;

            // Zone metrics in container-local coords (exact screen bounds)
            const zoneW = (size.right - size.left) * pct;
            const zoneH = size.bottom - size.top;
            const zoneMidX = size.right - zoneW * 0.5;

            this._bubble.setTexture(cfg.landscapeTexture || 'bubble_l');
            const bScaleH = (zoneH * (lCfg.bubbleHeightScale ?? 0.45)) / this._bubble.height;
            const bScaleW = (zoneW * (lCfg.bubbleWidthScale ?? 0.90)) / this._bubble.width;
            const bScale = Math.min(bScaleH, bScaleW, 1.0);
            if (this._text.text !== '') {
                this._bubble.setScale(bScale);
            }
            const bubW = this._bubble.width * bScale;
            const bubH = this._bubble.height * bScale;

            // Bubble: upper 30% of screen height area, zone-centred horizontally + optional config offsets
            const bubX = zoneMidX + zoneW * (cfg.bubbleOffsetlandscapeXFactor ?? 0);
            const bubY = size.top + zoneH * 0.30 + zoneH * (cfg.bubbleOffsetlandscapeYFactor ?? 0);

            // Customer: lower portion, bottom-anchored to screen bottom
            const cMaxH = zoneH - bubH - (zoneH * 0.05);
            const cMaxW = zoneW * 0.50;
            const cScale = Math.min(cMaxH / this._getCustH(), cMaxW / this._getCustW());

            const custX = zoneMidX;
            const custY = size.bottom;

            this._bubBaseX = bubX;
            this._bubBaseY = bubY;
            this._textBaseX = bubX + bubW * (lCfg.textOffsetXFactor ?? 0);
            this._textBaseY = bubY + bubH * (lCfg.textOffsetYFactor ?? -0.05);
            this._bubBaseScale = bScale;

            this._custBaseX = custX;
            this._custBaseY = custY;
            this._custBaseScale = cScale;

            this._root.setPosition(0, 0);
            this._bubble.setPosition(bubX, bubY);
            this._text.setPosition(this._textBaseX, this._textBaseY);
            this._text.setStyle({
                fontSize: `${Math.max(lCfg.minFontSize ?? 16, Math.round(bubH * (lCfg.fontSizeFactor ?? 0.15)))}px`,
                wordWrap: { width: bubW * (lCfg.wordWrapFactor ?? 0.70), useAdvancedWrap: true }
            });

            if (this._customerAppeared) {
                this._customer.setPosition(custX, custY);
                this._customer.setScale(cScale);
                this._customer.setVisible(true);
            } else {
                this._scene.tweens.killTweensOf(this._customer);
                this._customer.setPosition(custX, custY + this._getCustH() * cScale + 100);
                this._customer.setScale(cScale * 0.8, cScale * 1.3);
                this._customer.setVisible(false);
            }
        }
    }

    hideBubble() {
        this._scene.tweens.killTweensOf([this._text, this._bubble]);
        this._bubble.setAlpha(0).setScale(0);
        this._text.setAlpha(0).setScale(0).setText('');
    }

    destroy() {
        this._scene.tweens.killTweensOf([this._text, this._bubble, this._customer]);
        if (this._root) {
            this._root.destroy(true);
            this._root = null;
        }
    }

    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------

    _makePool(arr) {
        return this._shuffle(arr.map((phrase, i) => ({ phrase, originalIndex: i })));
    }

    _shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    _draw(pool, sourceArr) {
        if (pool.length === 0) {
            sourceArr.forEach((phrase, i) => pool.push({ phrase, originalIndex: i }));
            this._shuffle(pool);
        }
        return pool.pop();
    }

    _animateCustomerEntrance(onComplete) {
        if (!this._customer || !this._customer.scene) {
            if (onComplete) onComplete();
            return;
        }

        this._scene.tweens.killTweensOf(this._customer);

        const targetY = this._custBaseY ?? this._customer.y;
        const targetScale = this._custBaseScale ?? (this._customer.scaleX || 1);

        // Position customer completely below screen and squash/stretch for cartoon appearance
        this._customer.setY(targetY + this._getCustH() * targetScale + 100);
        this._customer.setScale(targetScale * 0.8, targetScale * 1.3);
        this._customer.setVisible(true);

        this._scene.tweens.add({
            targets: this._customer,
            y: targetY,
            duration: 550,
            ease: 'Power2.Out',
            onComplete: () => {
                if (onComplete) onComplete();
            }
        });

        this._scene.tweens.add({
            targets: this._customer,
            scaleX: targetScale,
            scaleY: targetScale,
            duration: 650,
            ease: 'Back.Out'
        });
    }

    _animateText(newText) {
        if (!this._text || !this._text.scene) return;

        // Trigger customer entrance first time dialogue is shown
        if (!this._customerAppeared) {
            this._customerAppeared = true;
            this._animateCustomerEntrance(() => {
                this._animateTextContent(newText);
            });
        } else {
            this._animateTextContent(newText);
        }
    }

    _animateTextContent(newText) {
        if (!this._text || !this._text.scene) return;

        this._scene.tweens.killTweensOf([this._text, this._bubble]);

        const isPortrait = this._isPortrait;
        const durationHide = 150;
        const durationShow = 280;

        // Base positions & scales
        const bX = this._bubBaseX ?? this._bubble.x;
        const bY = this._bubBaseY ?? this._bubble.y;
        const tX = this._textBaseX ?? this._text.x;
        const tY = this._textBaseY ?? this._text.y;
        const bScale = this._bubBaseScale ?? this._bubble.scaleX;

        // Hide targets: shift right in portrait (e.g. +220px), downwards in landscape (e.g. +220px)
        const hideOffsetX = isPortrait ? 220 : 0;
        const hideOffsetY = isPortrait ? 0 : 220;

        const isFirstAppear = (this._text.text === '');

        const startShow = () => {
            if (!this._text || !this._text.scene) return;

            // Update content
            this._text.setText(newText);

            // Set initial states for reappear (outside the viewport/offset)
            this._bubble.setPosition(bX + hideOffsetX, bY + hideOffsetY).setAlpha(0).setScale(0, bScale);
            this._text.setPosition(tX + hideOffsetX, tY + hideOffsetY).setAlpha(0).setScale(0, 1);

            // Reappear Bubble: slide back, fade in, expand X
            this._scene.tweens.add({
                targets: this._bubble,
                x: bX,
                y: bY,
                alpha: 1,
                scaleX: bScale,
                duration: durationShow,
                ease: 'Back.Out'
            });

            // Reappear Text: slide back, fade in, expand X
            this._scene.tweens.add({
                targets: this._text,
                x: tX,
                y: tY,
                alpha: 1,
                scaleX: 1,
                duration: durationShow,
                ease: 'Back.Out'
            });
        };

        if (isFirstAppear) {
            // No hide animation, show immediately
            startShow();
        } else {
            // Hide Bubble: slide, fade, shrink X
            this._scene.tweens.add({
                targets: this._bubble,
                x: bX + hideOffsetX,
                y: bY + hideOffsetY,
                alpha: 0,
                scaleX: 0,
                duration: durationHide,
                ease: 'Power2.In'
            });

            // Hide Text: slide, fade, shrink X
            this._scene.tweens.add({
                targets: this._text,
                x: tX + hideOffsetX,
                y: tY + hideOffsetY,
                alpha: 0,
                scaleX: 0,
                duration: durationHide,
                ease: 'Power2.In',
                onComplete: startShow
            });
        }
    }

    _playAudio(key) {
        if (!key) return;
        try {
            const json = this._scene.game.cache.json.get('sfx');
            if (!json || !json.spritemap || !json.spritemap[key]) return;
            Utils.addAudio(this._scene, key, 0.9);
        } catch (e) {
            // Audio not ready / key missing - ignore silently
        }
    }

    _getCustW() {
        const obj = this._customer?.spineObj || this._customer;
        return obj?.width || obj?.skeleton?.data?.width || 524;
    }

    _getCustH() {
        const obj = this._customer?.spineObj || this._customer;
        return obj?.height || obj?.skeleton?.data?.height || 827;
    }

    _playSpineReaction(animName) {
        const obj = this._customer?.spineObj || this._customer;
        if (!obj || (!obj.skeleton && !obj.animationState)) {
            console.log(`[Character] Skipping reaction '${animName}': no valid spineObj found.`);
            return;
        }
        console.log(`[Character] Playing spine reaction '${animName}'...`);
        try {
            if (typeof obj.setAnimation === 'function') {
                obj.setAnimation(0, animName, false);
            } else if (obj.animationState) {
                obj.animationState.setAnimation(0, animName, false);
            }

            if (typeof obj.addAnimation === 'function') {
                obj.addAnimation(0, 'Idle', true, 0);
            } else if (obj.animationState) {
                obj.animationState.addAnimation(0, 'Idle', true, 0);
            }
            console.log(`[Character] Reaction '${animName}' started successfully.`);
        } catch (e) {
            console.warn(`[Character] Spine reaction '${animName}' failed:`, e);
        }
    }
}
