import SETTINGS from '../stress_scale.json';
import Utils from '../core/framework/Utils';

/**
 * StressScale – game-performance indicator.
 *
 * Displays a background panel (stress_bg_p in portrait / stress_bg_l in
 * landscape) with a circular stress_scale image centred on top of it.
 *
 * The scale rotates clockwise 15° on each correctly placed card and
 * counter-clockwise 15° on each incorrectly placed card.
 *
 * Portrait layout:  stress_bg_p, pinned to top-centre of the screen.
 * Landscape layout: stress_bg_l, pinned to the left-centre of the screen.
 *
 * All tuneable parameters live in stress_scale.json.
 */
export default class StressScale extends Phaser.GameObjects.Container {
    /**
     * @param {object}                       opts
     * @param {Phaser.Scene}                 opts.scene
     * @param {Phaser.GameObjects.Container} opts.container  mainContainer
     */
    constructor({ scene, container }) {
        super(scene, 0, 0);

        const cfg = SETTINGS;
        const containerCfg = cfg.container;
        const bgCfg = cfg.background;
        const dialCfg = cfg.dial;
        const staticBgCfg = cfg.staticBg;
        this._rotationCfg = cfg.rotation;
        this._currentAngle = 0;
        this._maxHeightP = containerCfg.maxHeightP ?? 0;
        this._maxWidthL = containerCfg.maxWidthL ?? 0;

        const emotionCfg = cfg.emotion || {};
        this._emotionCfg = emotionCfg;
        this._minRotation = emotionCfg.minRotation ?? 0;
        this._maxRotation = emotionCfg.maxRotation ?? 170;
        this._emotionPortraitX = emotionCfg.px ?? 0;
        this._emotionPortraitY = emotionCfg.py ?? 0;
        this._emotionLandscapeX = emotionCfg.lx ?? 0;
        this._emotionLandscapeY = emotionCfg.ly ?? 0;
        this._emotionPortraitScaleX = emotionCfg.pScaleX ?? 1;
        this._emotionPortraitScaleY = emotionCfg.pScaleY ?? 1;
        this._emotionLandscapeScaleX = emotionCfg.lScaleX ?? 1;
        this._emotionLandscapeScaleY = emotionCfg.lScaleY ?? 1;

        const stressedTextCfg = typeof emotionCfg.stressedText === 'object'
            ? emotionCfg.stressedText
            : { text: emotionCfg.stressedText || 'Stressed' };
        const happyTextCfg = typeof emotionCfg.happyText === 'object'
            ? emotionCfg.happyText
            : { text: emotionCfg.happyText || 'Happy' };

        this._emotionStressedText = stressedTextCfg.text || 'Stressed';
        this._emotionStressedTextPortraitX = stressedTextCfg.px ?? 0;
        this._emotionStressedTextPortraitY = stressedTextCfg.py ?? -22;
        this._emotionStressedTextLandscapeX = stressedTextCfg.lx ?? 0;
        this._emotionStressedTextLandscapeY = stressedTextCfg.ly ?? -22;
        this._emotionStressedTextFontSize = stressedTextCfg.fontSize ?? 24;
        this._emotionStressedTextColor = stressedTextCfg.color || '#ffffff';
        this._emotionStressedTextOutline = stressedTextCfg.outline ?? 0;
        this._emotionStressedTextOutlineColor = stressedTextCfg.outlineColor || '#000000';

        this._emotionHappyText = happyTextCfg.text || 'Happy';
        this._emotionHappyTextPortraitX = happyTextCfg.px ?? 0;
        this._emotionHappyTextPortraitY = happyTextCfg.py ?? 22;
        this._emotionHappyTextLandscapeX = happyTextCfg.lx ?? 0;
        this._emotionHappyTextLandscapeY = happyTextCfg.ly ?? 22;
        this._emotionHappyTextFontSize = happyTextCfg.fontSize ?? 24;
        this._emotionHappyTextColor = happyTextCfg.color || '#ffffff';
        this._emotionHappyTextOutline = happyTextCfg.outline ?? 0;
        this._emotionHappyTextOutlineColor = happyTextCfg.outlineColor || '#000000';

        this._activeEmotion = emotionCfg.defaultImage || 'emo_0';
        this._emotionTransitionMs = emotionCfg.transitionMs ?? 186;
        this._holdOnDecreaseMs = emotionCfg.holdOnDecreaseMs ?? 1700;
        this._emotionLevels = Array.isArray(emotionCfg.levels) ? emotionCfg.levels : [];
        this._pendingEmotion = null;
        this._emotionTimer = null;

        this.addProperties(['pos', 'align', 'image', 'scale']);
        this.pScaleX = this.pScaleY = 1;
        this.lScaleX = this.lScaleY = 1;

        // ── Background – texture is swapped on resize via setTexture() ───────
        this._bg = scene.add.image(0, 0, bgCfg.pImage);
        this.add(this._bg);
        this._bg.setDepth(bgCfg.depth ?? 0);

        // Store the per-orientation origin and scale settings for the background image.
        this._pBgOriginX = bgCfg.pOriginX;
        this._pBgOriginY = bgCfg.pOriginY;
        this._lBgOriginX = bgCfg.lOriginX;
        this._lBgOriginY = bgCfg.lOriginY;
        this._pBgScaleX = bgCfg.pScaleX ?? 1;
        this._pBgScaleY = bgCfg.pScaleY ?? 1;
        this._lBgScaleX = bgCfg.lScaleX ?? 1;
        this._lBgScaleY = bgCfg.lScaleY ?? 1;
        this._bg.setOrigin(this._pBgOriginX, this._pBgOriginY);

        this._buildEmoImages(scene);
        this._buildEmotionText(scene);

        // ── Static scale background image ─────────────────────────────────────
        this._staticBg = scene.add.image(0, 0, staticBgCfg.image)
            .setScale(staticBgCfg.scaleX, staticBgCfg.scaleY);
        this.add(this._staticBg);
        this._staticBg.setDepth(staticBgCfg.depth ?? 1);

        // Store the per-orientation static bg layout values.
        this._staticBgPortraitX = staticBgCfg.px;
        this._staticBgPortraitY = staticBgCfg.py;
        this._staticBgLandscapeX = staticBgCfg.lx;
        this._staticBgLandscapeY = staticBgCfg.ly;
        this._staticBgPortraitScaleX = staticBgCfg.pScaleX ?? staticBgCfg.scaleX ?? 1;
        this._staticBgPortraitScaleY = staticBgCfg.pScaleY ?? staticBgCfg.scaleY ?? 1;
        this._staticBgLandscapeScaleX = staticBgCfg.lScaleX ?? staticBgCfg.scaleX ?? 1;
        this._staticBgLandscapeScaleY = staticBgCfg.lScaleY ?? staticBgCfg.scaleY ?? 1;

        // ── Circular scale / needle ──────────────────────────────────────────
        this._dial = scene.add.image(0, 0, 'stress_scale');
        this.add(this._dial);
        this._dial.setDepth((dialCfg.depth ?? 2) + 3);

        // Store the per-orientation dial layout values.
        this._dialPortraitX = dialCfg.px;
        this._dialPortraitY = dialCfg.py;
        this._dialLandscapeX = dialCfg.lx;
        this._dialLandscapeY = dialCfg.ly;
        this._dialPortraitScaleX = dialCfg.pScaleX ?? dialCfg.scaleX ?? 1;
        this._dialPortraitScaleY = dialCfg.pScaleY ?? dialCfg.scaleY ?? 1;
        this._dialLandscapeScaleX = dialCfg.lScaleX ?? dialCfg.scaleX ?? 1;
        this._dialLandscapeScaleY = dialCfg.lScaleY ?? dialCfg.scaleY ?? 1;

        // ── Wire into the responsive position / align / image system ─────────

        // Portrait: top-centre  |  Landscape: left-centre
        this.px = containerCfg.portraitCx;   this.py = containerCfg.portraitCy;
        this.lx = containerCfg.landscapeCx;  this.ly = containerCfg.landscapeCy;

        // Image property (handled by setTexture override below)
        this.pImage = bgCfg.pImage;
        this.lImage = bgCfg.lImage;

        this._updateContainerScale();
        const isPortrait = this.scene.game?.size?.isPortrait ?? true;
        this._applyBackgroundOrientation(isPortrait);
        this._applyStaticBgOrientation(isPortrait);
        this._applyDialOrientation(isPortrait);
        this._applyEmotionOrientation(isPortrait);
        this.sort('depth');

        // Align – set after px/py/lx/ly so setAlign() has the right offsets
        this.pAlign = containerCfg.portraitAlign;
        this.lAlign = containerCfg.landscapeAlign;

        container.add(this);
        const initialEmotion = this._getEmotionForAngle(this._currentAngle);
        this._setEmotionNow(initialEmotion);
        this.setDepth(containerCfg.depth ?? 1);
        if (typeof container.sort === 'function') {
            container.sort('depth');
        }

        // Apply initial position for the current orientation
        this.setCustomPosition(0, 0)
            .setAlign(isPortrait ? cfg.portraitAlign : cfg.landscapeAlign);
    }

    // ── Public API ────────────────────────────────────────────────────────────

    /** Call when a card is placed in the correct drop zone (+15° clockwise). */
    notifyCorrect() {
        this._clearEmotionTimer();
        this._rotate(this._rotationCfg.step, false);
    }

    /** Call when a card is placed in the wrong drop zone (−15° counter-clockwise). */
    notifyIncorrect() {
        if (this._currentAngle <= 0) {
            return;
        }

        const delta = -this._rotationCfg.step;
        const nextAngle = Math.max(0, this._currentAngle + delta);
        const targetEmotion = this._getEmotionForAngle(nextAngle);
        this._setEmotionNow(this._emotionCfg.defaultImage || 'emo_0');
        this._clearEmotionTimer();
        this._emotionTimer = this.scene.time.delayedCall(this._holdOnDecreaseMs, () => {
            this._transitionToEmotion(targetEmotion);
            this._emotionTimer = null;
        });
        this._rotate(nextAngle - this._currentAngle, true);
    }

    _buildEmoImages(scene) {
        const baseKey = this._activeEmotion;
        this._emoPrev = scene.add.image(0, 0, baseKey).setOrigin(0.5).setAlpha(0).setDepth(2);
        this._emoActive = scene.add.image(0, 0, baseKey).setOrigin(0.5).setAlpha(1).setDepth(3);
        this._emoNext = scene.add.image(0, 0, baseKey).setOrigin(0.5).setAlpha(0).setDepth(4);

        this.add([this._emoPrev, this._emoActive, this._emoNext]);
    }

    _buildEmotionText(scene) {
        const stressedStyle = {
            fontFamily: 'LilitaOne-Regular, Arial',
            fontSize: `${this._emotionStressedTextFontSize}px`,
            color: this._emotionStressedTextColor,
            stroke: this._emotionStressedTextOutlineColor,
            strokeThickness: this._emotionStressedTextOutline,
            align: 'center'
        };
        const happyStyle = {
            fontFamily: 'LilitaOne-Regular, Arial',
            fontSize: `${this._emotionHappyTextFontSize}px`,
            color: this._emotionHappyTextColor,
            stroke: this._emotionHappyTextOutlineColor,
            strokeThickness: this._emotionHappyTextOutline,
            align: 'center'
        };

        this._stressedText = scene.add.text(0, 0, this._emotionStressedText, stressedStyle)
            .setOrigin(0.5)
            .setDepth(5);
        this._happyText = scene.add.text(0, 0, this._emotionHappyText, happyStyle)
            .setOrigin(0.5)
            .setDepth(5);

        this.add([this._stressedText, this._happyText]);
    }

    _applyEmotionOrientation(isPortrait) {
        if (!this._emoPrev || !this._emoActive || !this._emoNext) return;

        const x = isPortrait ? this._emotionPortraitX : this._emotionLandscapeX;
        const y = isPortrait ? this._emotionPortraitY : this._emotionLandscapeY;
        const scaleX = isPortrait ? this._emotionPortraitScaleX : this._emotionLandscapeScaleX;
        const scaleY = isPortrait ? this._emotionPortraitScaleY : this._emotionLandscapeScaleY;

        [this._emoPrev, this._emoActive, this._emoNext].forEach((img) => {
            img.setPosition(x, y);
            img.setScale(scaleX, scaleY);
        });

        if (this._stressedText) {
            const stressedX = isPortrait ? this._emotionStressedTextPortraitX : this._emotionStressedTextLandscapeX;
            const stressedY = isPortrait ? this._emotionStressedTextPortraitY : this._emotionStressedTextLandscapeY;
            this._stressedText.setPosition(stressedX, stressedY);
        }
        if (this._happyText) {
            const happyX = isPortrait ? this._emotionHappyTextPortraitX : this._emotionHappyTextLandscapeX;
            const happyY = isPortrait ? this._emotionHappyTextPortraitY : this._emotionHappyTextLandscapeY;
            this._happyText.setPosition(happyX, happyY);
        }
    }

    _clearEmotionTimer() {
        if (this._emotionTimer) {
            this._emotionTimer.remove(false);
            this._emotionTimer = null;
        }
    }

    _getEmotionForAngle(angle) {
        const normalized = Math.max(this._minRotation, Math.min(this._maxRotation, angle));
        for (const item of this._emotionLevels) {
            if (typeof item.minRotation === 'number' && typeof item.maxRotation === 'number') {
                if (normalized >= item.minRotation && normalized <= item.maxRotation) {
                    return item.image;
                }
            }
        }
        return this._emotionCfg.defaultImage || 'emo_0';
    }

    _setEmotionNow(key) {
        if (!this._emoActive || !this._emoPrev || !this._emoNext) return;

        this._emoActive.setTexture(key);
        this._emoActive.setAlpha(1);
        this._emoPrev.setAlpha(0);
        this._emoNext.setAlpha(0);
        this._currentEmotionKey = key;
    }

    _transitionToEmotion(key) {
        if (!this._emoActive || !this._emoPrev || !this._emoNext) return;
        if (this._currentEmotionKey === key) {
            return;
        }

        this._clearEmotionTimer();
        const currentKey = this._currentEmotionKey || this._emotionCfg.defaultImage || 'emo_0';
        const ghostFadeDuration = Math.max(40, Math.round(this._emotionTransitionMs * 0.55));
        const activeFadeDelay = Math.round(this._emotionTransitionMs * 0.2);
        const activeFadeDuration = Math.max(40, this._emotionTransitionMs - activeFadeDelay);

        this._emoPrev.setTexture(currentKey);
        this._emoPrev.setAlpha(0.35);
        this._emoActive.setTexture(currentKey);
        this._emoActive.setAlpha(1);
        this._emoNext.setTexture(key);
        this._emoNext.setAlpha(0);

        Utils.addAudio(this.scene, key, 1.0);

        this.scene.tweens.killTweensOf([this._emoPrev, this._emoActive, this._emoNext]);
        this.scene.tweens.add({
            targets: this._emoPrev,
            alpha: 0,
            duration: ghostFadeDuration,
            ease: 'Sine.Out'
        });
        this.scene.tweens.add({
            targets: this._emoActive,
            alpha: 0,
            delay: activeFadeDelay,
            duration: activeFadeDuration,
            ease: 'Sine.Out'
        });
        this.scene.tweens.add({
            targets: this._emoNext,
            alpha: 1,
            duration: this._emotionTransitionMs,
            ease: 'Sine.InOut',
            onComplete: () => {
                this._emoActive.setTexture(key);
                this._emoActive.setAlpha(1);
                this._emoPrev.setAlpha(0);
                this._emoNext.setAlpha(0);
                this._currentEmotionKey = key;
            }
        });
    }

    _rotate(delta, isDecrease = false) {
        const nextAngle = Math.max(this._minRotation, Math.min(this._maxRotation, this._currentAngle + delta));
        if (nextAngle === this._currentAngle) {
            return;
        }

        this._currentAngle = nextAngle;
        const targetEmotion = this._getEmotionForAngle(nextAngle);
        this.scene.tweens.add({
            targets:  this._dial,
            angle:    this._currentAngle,
            duration: this._rotationCfg.durationMs,
            ease:     this._rotationCfg.ease,
            onComplete: () => {
                if (!isDecrease) {
                    this._transitionToEmotion(targetEmotion);
                }
            }
        });
    }

    _applyStaticBgOrientation(isPortrait) {
        if (!this._staticBg) return;

        const scaleX = isPortrait ? this._staticBgPortraitScaleX : this._staticBgLandscapeScaleX;
        const scaleY = isPortrait ? this._staticBgPortraitScaleY : this._staticBgLandscapeScaleY;

        if (isPortrait) {
            this._staticBg.setPosition(this._staticBgPortraitX, this._staticBgPortraitY);
        } else {
            this._staticBg.setPosition(this._staticBgLandscapeX, this._staticBgLandscapeY);
        }
        this._staticBg.setScale(scaleX, scaleY);
    }

    _applyBackgroundOrientation(isPortrait) {
        if (!this._bg) return;

        const scaleX = isPortrait ? this._pBgScaleX : this._lBgScaleX;
        const scaleY = isPortrait ? this._pBgScaleY : this._lBgScaleY;
        this._bg.setScale(scaleX, scaleY);
    }

    _applyDialOrientation(isPortrait) {
        if (!this._dial) return;

        const scaleX = isPortrait ? this._dialPortraitScaleX : this._dialLandscapeScaleX;
        const scaleY = isPortrait ? this._dialPortraitScaleY : this._dialLandscapeScaleY;

        if (isPortrait) {
            this._dial.setPosition(this._dialPortraitX, this._dialPortraitY);
        } else {
            this._dial.setPosition(this._dialLandscapeX, this._dialLandscapeY);
        }
        this._dial.setScale(scaleX, scaleY);
    }

    _getTextureSourceSize(key) {
        const texture = this.scene.textures.get(key);
        if (!texture) return { width: 1, height: 1 };
        let source = null;
        if (typeof texture.getSourceImage === 'function') {
            source = texture.getSourceImage();
        }
        if (!source && texture.source && texture.source[0]) {
            source = texture.source[0].image || texture.source[0];
        }
        if (source) {
            return { width: source.width || 1, height: source.height || 1 };
        }
        return { width: 1, height: 1 };
    }

    _getStressScaleClamp(isPortrait, candidateScale) {
        const maxHeightP = this._maxHeightP;
        const maxWidthL = this._maxWidthL;
        if ((!isPortrait && !(typeof maxWidthL === 'number' && maxWidthL > 0)) ||
            (isPortrait && !(typeof maxHeightP === 'number' && maxHeightP > 0))) {
            return candidateScale;
        }

        const candidateScaleX = candidateScale;
        const candidateScaleY = candidateScale;
        this.setScale(candidateScaleX, candidateScaleY);
        const bounds = this.getBounds();
        if (bounds.width <= 0 || bounds.height <= 0) {
            return candidateScale;
        }

        if (isPortrait) {
            const maxHeight = this.scene.game.scale.height * maxHeightP;
            if (bounds.height > maxHeight) {
                return candidateScale * (maxHeight / bounds.height);
            }
        } else {
            const maxWidth = this.scene.game.scale.width * maxWidthL;
            if (bounds.width > maxWidth) {
                return candidateScale * (maxWidth / bounds.width);
            }
        }

        return candidateScale;
    }

    _updateContainerScale() {
        const size = this.scene.game?.size;
        if (!size) return;

        const screenWidth = size.x * 2;
        const screenHeight = size.y * 2;

        const portraitSize = this._getTextureSourceSize(this.pImage);
        const landscapeSize = this._getTextureSourceSize(this.lImage);

        const portraitScale = (portraitSize.width && portraitSize.height)
            ? Math.max(screenWidth / portraitSize.width, screenHeight / portraitSize.height)
            : 1;
        const landscapeScale = (landscapeSize.width && landscapeSize.height)
            ? Math.max(screenWidth / landscapeSize.width, screenHeight / landscapeSize.height)
            : 1;

        const clampedPortraitScale = this._getStressScaleClamp(true, portraitScale);
        const clampedLandscapeScale = this._getStressScaleClamp(false, landscapeScale);

        this.pScaleX = this.pScaleY = clampedPortraitScale;
        this.lScaleX = this.lScaleY = clampedLandscapeScale;

        const isPortrait = size.isPortrait;
        this.setScale(isPortrait ? clampedPortraitScale : clampedLandscapeScale);

        if (this._bg) {
            this.setSize(this._bg.displayWidth, this._bg.displayHeight);
        }
    }

    /**
     * Called by the responsive system (via the 'image' property) whenever the
     * orientation changes.  Forwards the texture key to the internal bg sprite.
     */
    setTexture(key) {
        if (this._bg) {
            const isPortrait = this.scene.game?.size?.isPortrait ?? true;
            if (isPortrait) {
                this._bg.setOrigin(this._pBgOriginX, this._pBgOriginY);
            } else {
                this._bg.setOrigin(this._lBgOriginX, this._lBgOriginY);
            }
            this._bg.setTexture(key);
        }

        const isPortrait = this.scene.game?.size?.isPortrait ?? true;
        this._updateContainerScale();
        this._applyBackgroundOrientation(isPortrait);
        this._applyStaticBgOrientation(isPortrait);
        this._applyDialOrientation(isPortrait);
        this._applyEmotionOrientation(isPortrait);
        return this;
    }
}
