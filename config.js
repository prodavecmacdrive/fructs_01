module.exports = {
    'name': 'cts_mip_grknopa_stacksort',
    // 'networks': ['Applovin', 'Facebook', 'Google', 'IronSource', 'Liftoff', 'TikTok', 'UnityAds', 'Vungle'],
    'networks': ['Applovin', 'Facebook', 'Google', 'UnityAds'],
    'customPhaser': true,
    'compressAtlas': true,
    'compressTexture': true,
    'compressAudio': true,
    'ios': 'https://apps.apple.com/ua/app/category-sort/id6758512068',
    'android': 'https://play.google.com/store/apps/details?id=com.meemeegames.categorysort',

    // Dev mode previews scene-1 only; override to test other flows.
    'currentVersion': 'scene-1',

    // ── 4 game-settings build variants ───────────────────────────────────────
    'versions': {
        '60s_sky': { flow: ['scene-1'], audio: [], fonts: [], sheets: [], textures: [] }, // 60s limit + sky_bg
        '60s_wood': { flow: ['scene-2'], audio: [], fonts: [], sheets: [], textures: [] }, // 60s limit + wood_bg
        '4tap_wood': { flow: ['scene-3'], audio: [], fonts: [], sheets: [], textures: [] }, // 4-tap limit + wood_bg
        '4tap_sky': { flow: ['scene-4'], audio: [], fonts: [], sheets: [], textures: [] }  // 4-tap limit + sky_bg
    }
};