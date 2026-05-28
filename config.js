module.exports = {
    'name': 'category-sort',
    // 'networks': ['Applovin', 'Facebook', 'Google', 'IronSource', 'Liftoff', 'TikTok', 'UnityAds', 'Vungle'],
    'networks': ['Applovin', 'Facebook', 'Google', 'UnityAds'],
    'customPhaser': true,
    'compressAtlas': true,
    'compressTexture': true,
    'compressAudio': true,
    'ios': 'https://apps.apple.com/ua/app/category-sort/id6758512068',
    'android': 'https://play.google.com/store/apps/details?id=com.meemeegames.categorysor',

    // Dev mode previews scene-1 only; override to test other flows.
    'currentVersion': 's1',

    // ── Single build variant using only base game-settings.json ───────────────
    // The production build will no longer inject scene-specific settings files.
    'versions': {
        's1': { flow: ['scene-1'], audio: [], fonts: [], sheets: [], textures: [] },
    }
};