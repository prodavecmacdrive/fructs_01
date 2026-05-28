import SETTINGS from '../stress_scale.json';

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

        this.addProperties(['pos', 'align', 'image', 'scale']);
        this.pScaleX = this.pScaleY = 1;
        this.lScaleX = this.lScaleY = 1;

        // ── Background – texture is swapped on resize via setTexture() ───────
        this._bg = scene.add.image(0, 0, bgCfg.pImage);
        this.add(this._bg);
        this._bg.setDepth(bgCfg.depth ?? 0);

        // Store the per-orientation origin settings for the background image.
        this._pBgOriginX = bgCfg.pOriginX;
        this._pBgOriginY = bgCfg.pOriginY;
        this._lBgOriginX = bgCfg.lOriginX;
        this._lBgOriginY = bgCfg.lOriginY;
        this._bg.setOrigin(this._pBgOriginX, this._pBgOriginY);

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
        this._staticBgScaleX = staticBgCfg.scaleX;
        this._staticBgScaleY = staticBgCfg.scaleY;

        // ── Circular scale / needle ──────────────────────────────────────────
        this._dial = scene.add.image(0, 0, 'stress_scale');
        this.add(this._dial);
        this._dial.setDepth(dialCfg.depth ?? 2);

        // Store the per-orientation dial layout values.
        this._dialPortraitX = dialCfg.px;
        this._dialPortraitY = dialCfg.py;
        this._dialLandscapeX = dialCfg.lx;
        this._dialLandscapeY = dialCfg.ly;
        this._dialScaleX = dialCfg.scaleX;
        this._dialScaleY = dialCfg.scaleY;

        // ── Wire into the responsive position / align / image system ─────────

        // Portrait: top-centre  |  Landscape: left-centre
        this.px = containerCfg.portraitCx;   this.py = containerCfg.portraitCy;
        this.lx = containerCfg.landscapeCx;  this.ly = containerCfg.landscapeCy;

        // Image property (handled by setTexture override below)
        this.pImage = bgCfg.pImage;
        this.lImage = bgCfg.lImage;

        this._updateContainerScale();
        this._applyStaticBgOrientation(this.scene.game?.size?.isPortrait ?? true);
        this._applyDialOrientation(this.scene.game?.size?.isPortrait ?? true);
        this.sort('depth');

        // Align – set after px/py/lx/ly so setAlign() has the right offsets
        this.pAlign = containerCfg.portraitAlign;
        this.lAlign = containerCfg.landscapeAlign;

        container.add(this);
        this.setDepth(containerCfg.depth ?? 1);
        if (typeof container.sort === 'function') {
            container.sort('depth');
        }

        // Apply initial position for the current orientation
        const isPortrait = this.scene.game?.size?.isPortrait ?? true;
        this.setCustomPosition(0, 0)
            .setAlign(isPortrait ? cfg.portraitAlign : cfg.landscapeAlign);
    }

    // ── Public API ────────────────────────────────────────────────────────────

    /** Call when a card is placed in the correct drop zone (+15° clockwise). */
    notifyCorrect() {
        this._rotate(this._rotationCfg.step);
    }

    /** Call when a card is placed in the wrong drop zone (−15° counter-clockwise). */
    notifyIncorrect() {
        if (this._currentAngle <= 0) {
            return;
        }

        const delta = -this._rotationCfg.step;
        const nextAngle = Math.max(0, this._currentAngle + delta);
        this._rotate(nextAngle - this._currentAngle);
    }

    // ── Internals ─────────────────────────────────────────────────────────────

    _rotate(delta) {
        const nextAngle = Math.max(0, Math.min(170, this._currentAngle + delta));
        if (nextAngle === this._currentAngle) {
            return;
        }

        this._currentAngle = nextAngle;
        this.scene.tweens.add({
            targets:  this._dial,
            angle:    this._currentAngle,
            duration: this._rotationCfg.durationMs,
            ease:     this._rotationCfg.ease
        });
    }

    _applyStaticBgOrientation(isPortrait) {
        if (!this._staticBg) return;

        if (isPortrait) {
            this._staticBg.setPosition(this._staticBgPortraitX, this._staticBgPortraitY);
        } else {
            this._staticBg.setPosition(this._staticBgLandscapeX, this._staticBgLandscapeY);
        }
        this._staticBg.setScale(this._staticBgScaleX, this._staticBgScaleY);
    }

    _applyDialOrientation(isPortrait) {
        if (!this._dial) return;

        if (isPortrait) {
            this._dial.setPosition(this._dialPortraitX, this._dialPortraitY);
        } else {
            this._dial.setPosition(this._dialLandscapeX, this._dialLandscapeY);
        }
        this._dial.setScale(this._dialScaleX, this._dialScaleY);
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

    _updateContainerScale() {
        const size = this.scene.game?.size;
        if (!size) return;

        const screenWidth = size.x * 2;
        const screenHeight = size.y * 2;

        const portraitSize = this._getTextureSourceSize(this.pImage);
        const landscapeSize = this._getTextureSourceSize(this.lImage);

        const portraitScale = portraitSize.height ? screenHeight / portraitSize.height : 1;
        const landscapeScale = landscapeSize.width ? screenWidth / landscapeSize.width : 1;

        this.pScaleX = this.pScaleY = portraitScale;
        this.lScaleX = this.lScaleY = landscapeScale;

        const isPortrait = size.isPortrait;
        this.setScale(isPortrait ? portraitScale : landscapeScale);
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
        this._applyStaticBgOrientation(isPortrait);
        this._applyDialOrientation(isPortrait);
        return this;
    }
}
