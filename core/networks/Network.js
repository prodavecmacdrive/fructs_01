export default class Network {
    constructor(callback) {
        this.game = null;

        callback && window.addEventListener('load', callback);
    }

    addClickToStore(obj) {
        obj.setInteractive().on("pointerdown", this.ctaClick, this);
    }

    ctaClick() {
        this.openStore();
    }

    openStore() {
        const url = this.getUrl();
        try {
            if (window.mraid && typeof window.mraid.open === 'function') {
                window.mraid.open(url);
            } else if (window.top && typeof window.top.open === 'function') {
                window.top.open(url);
            } else if (url) {
                window.open(url, '_blank');
            }
        } catch (_err) {
            if (url) window.open(url, '_blank');
        }
    }

    getUrl() {
        const isAndroid = Boolean(this.game?.device?.os?.android);
        if (isAndroid) {
            return window.App?.androidUrl || window.App?.iosUrl || '';
        }
        return window.App?.iosUrl || window.App?.androidUrl || '';
    }

    complete() {}
}