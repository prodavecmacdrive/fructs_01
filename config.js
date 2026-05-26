module.exports = {
    'name': 'category-sort',
    // 'networks': ['Applovin', 'Facebook', 'Google', 'IronSource', 'Liftoff', 'TikTok', 'UnityAds', 'Vungle'],
    'networks': ['UnityAds'],
    'customPhaser': true,
    'compressAtlas': true,
    'compressTexture': true,
    'compressAudio': true,
    'ios': 'https://apps.apple.com/ua/app/category-sort/id6758512068',
    'android': 'https://play.google.com/store/apps/details?id=com.meemeegames.categorysor',

    // Dev mode previews scene-1 only; override to test other flows.
    'currentVersion': 's1',

    // ── 18 combinatorial build variants ─────────────────────────────────────
    // Each entry defines the ordered pool of scenes for that build.
    // Assets are identical across all variants; only the injected flow differs.
    // levelSelect: true  →  start with TransitionScene (level-selection screen).
    'versions': {
        // 1-scene builds (3)
        's1':           { flow: ['scene-1'],                     audio: [], fonts: [], sheets: [], textures: [] },
        's2':           { flow: ['scene-2'],                     audio: [], fonts: [], sheets: [], textures: [] },
        's3':           { flow: ['scene-3'],                     audio: [], fonts: [], sheets: [], textures: [] },

        // 2-scene builds with inter-scene transition (6)
        's1-t-s2':      { flow: ['scene-1', 'scene-2'],          audio: [], fonts: [], sheets: [], textures: [] },
        's1-t-s3':      { flow: ['scene-1', 'scene-3'],          audio: [], fonts: [], sheets: [], textures: [] },
        's2-t-s1':      { flow: ['scene-2', 'scene-1'],          audio: [], fonts: [], sheets: [], textures: [] },
        's2-t-s3':      { flow: ['scene-2', 'scene-3'],          audio: [], fonts: [], sheets: [], textures: [] },
        's3-t-s1':      { flow: ['scene-3', 'scene-1'],          audio: [], fonts: [], sheets: [], textures: [] },
        's3-t-s2':      { flow: ['scene-3', 'scene-2'],          audio: [], fonts: [], sheets: [], textures: [] },

        // Level-selection builds — start with TransitionScene (9)
        't-s1':         { flow: ['scene-1'],                     levelSelect: true, audio: [], fonts: [], sheets: [], textures: [] },
        't-s2':         { flow: ['scene-2'],                     levelSelect: true, audio: [], fonts: [], sheets: [], textures: [] },
        't-s3':         { flow: ['scene-3'],                     levelSelect: true, audio: [], fonts: [], sheets: [], textures: [] },
        't-s1-t-s2':    { flow: ['scene-1', 'scene-2'],          levelSelect: true, audio: [], fonts: [], sheets: [], textures: [] },
        't-s1-t-s3':    { flow: ['scene-1', 'scene-3'],          levelSelect: true, audio: [], fonts: [], sheets: [], textures: [] },
        't-s2-t-s1':    { flow: ['scene-2', 'scene-1'],          levelSelect: true, audio: [], fonts: [], sheets: [], textures: [] },
        't-s2-t-s3':    { flow: ['scene-2', 'scene-3'],          levelSelect: true, audio: [], fonts: [], sheets: [], textures: [] },
        't-s3-t-s1':    { flow: ['scene-3', 'scene-1'],          levelSelect: true, audio: [], fonts: [], sheets: [], textures: [] },
        't-s3-t-s2':    { flow: ['scene-3', 'scene-2'],          levelSelect: true, audio: [], fonts: [], sheets: [], textures: [] },
    }
};