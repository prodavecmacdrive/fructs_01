import SETTINGS from '../game-settings.json';
import Utils from '../core/framework/Utils';

/**
 * SpineCharacter
 * Wraps a Spine game object and handles layout alignment, orientation scaling, and reactions.
 */
export default class SpineCharacter extends window.SpinePlugin.SpineContainer {
    /**
     * @param {object}                       opts
     * @param {Phaser.Scene}                 opts.scene
     * @param {Phaser.GameObjects.Container} opts.container mainContainer
     */
    constructor({ scene, container, cfg }) {
        super(scene, scene.spine, 0, 0);

        this.cfg = cfg || scene.SETTINGS?.spineCharacter || SETTINGS.spineCharacter;
        
        if (!this.cfg || !this.cfg.enabled) {
            return;
        }

        // ── Create Spine Object ──────────────────────────────────────────────────
        this.spineObj = new window.SpinePlugin.SpineGameObject(
            scene,
            scene.spine,
            -1418,
            1505,
            this.cfg.spineKey,
            this.cfg.idleAnimation || 'Idle',
            true
        );
        this.add(this.spineObj);

        if (scene.sys.updateList) {
            scene.sys.updateList.add(this.spineObj);
        }

        this.spineObj.setSkinByName(this.cfg.skin || 'default');
        this.spineObj.skeleton.setSlotsToSetupPose();

        const idleAnim = this.cfg.idleAnimation || 'Idle';
        try {
            this.spineObj.animationState.setAnimation(0, idleAnim, true);
        } catch (e) {
            console.warn(`Animation '${idleAnim}' not found for ${this.cfg.spineKey}`);
        }

        // ── Framework Layout System ──────────────────────────────────────────────
        // Register properties so Utils will apply them on orientation changes.
        Utils.addDefaultProperties(this);
        this.addProperties(['pos', 'scale', 'align']);

        // Default position and scales
        this.px = this.cfg.px ?? 0;
        this.py = this.cfg.py ?? 0;
        this.lx = this.cfg.lx ?? 0;
        this.ly = this.cfg.ly ?? 0;
        this.pScaleX = this.cfg.pScaleX ?? this.cfg.scale ?? 1;
        this.pScaleY = this.cfg.pScaleY ?? this.cfg.scale ?? 1;
        this.lScaleX = this.cfg.lScaleX ?? this.cfg.scale ?? 1;
        this.lScaleY = this.cfg.lScaleY ?? this.cfg.scale ?? 1;

        // Base container depth
        this.setDepth(this.cfg.depth ?? 3);

        const isPortrait = this.scene.game?.size?.isPortrait ?? true;
        this.setScale(isPortrait ? this.pScaleX : this.lScaleX, isPortrait ? this.pScaleY : this.lScaleY);

        // Align – set after px/py/lx/ly so setAlign() has the right offsets
        this.pAlign = this.cfg.pAlign || 'Center';
        this.lAlign = this.cfg.lAlign || 'Center';

        container.add(this);
        
        if (typeof container.sort === 'function') {
            container.sort('depth');
        }

        // Apply initial position for the current orientation
        this.setCustomPosition(0, 0).setAlign(isPortrait ? this.pAlign : this.lAlign);
    }

    /** Call when a card is sorted correctly. */
    notifyCorrect() {
        if (!this.spineObj) return;

        const reactAnim = this.cfg.correctAnimation || 'Smile';
        this._playReaction(reactAnim);
    }

    /** Call when a card is sorted incorrectly. */
    notifyIncorrect() {
        if (!this.spineObj) return;

        const reactAnim = this.cfg.incorrectAnimation || 'Sad';
        this._playReaction(reactAnim);
    }

    _playReaction(animName) {
        try {
            // Play one-shot reaction
            this.spineObj.animationState.setAnimation(0, animName, false);
            // Queue idle back
            this.spineObj.animationState.addAnimation(0, this.cfg.idleAnimation || 'Idle', true, 0);
        } catch (e) {
            console.warn(`Reaction animation failed for ${this.cfg.spineKey}: ${e}`);
        }
    }
}
