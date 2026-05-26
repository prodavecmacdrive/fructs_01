/**
 * StateManager
 * ------------
 * Tracks the user's progress through the level flow injected by the builder.
 *
 * window.App.flow  – array of scene-ids in this build, e.g. ['scene-1', 'scene-2']
 *
 * Usage:
 *   window.App.stateManager = new StateManager(window.App.flow);
 *   window.App.stateManager.markCompleted('scene-1');
 *   window.App.stateManager.getAvailableScenes(); // => ['scene-2']
 *   window.App.stateManager.isFlowComplete();     // => false
 */
export default class StateManager {
    constructor(flow) {
        this.flow       = Array.isArray(flow) ? flow : [];
        this._completed = [];
    }

    /** Record a level as finished. Safe to call multiple times. */
    markCompleted(sceneId) {
        if (!this._completed.includes(sceneId)) {
            this._completed.push(sceneId);
        }
    }

    /**
     * Returns scene-ids from the flow that have not yet been completed.
     * These are the scenes the player can still choose.
     */
    getAvailableScenes() {
        return this.flow.filter((id) => !this._completed.includes(id));
    }

    /** True when every scene in the flow has been completed. */
    isFlowComplete() {
        return this.flow.length > 0 && this.flow.every((id) => this._completed.includes(id));
    }
}
