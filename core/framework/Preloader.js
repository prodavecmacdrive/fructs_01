import TRANSITION_SETTINGS from '../../transition-screen-settings.json';

export default class Preloader extends Phaser.Scene {
    constructor() {
        super({key: 'Preloader'});
    }

    preload() {
        for (var key in window.App.resources.spine) {
            this.textures.addBase64(key + '.png', window.App.resources.spine[key].png);
        }
    }
  
    create() {
        this.loaded = 0;
        this.audioLoaded = false;

        this.loadTotal = Object.keys(App.resources.textures).length + Object.keys(App.resources.spine).length;
        window.App.resources.sheets.json && this.loadTotal++;
        window.App.resources.audio.json && this.loadTotal++;

        for (let key in App.resources.textures) {
            this.textures.addBase64(key, window.App.resources.textures[key]);
            this.loaded++;
        }

        if(window.App.resources.sheets.json) {
            let shardsImg = new Image();
            shardsImg.onload = () => {
                this.textures.addAtlas('atlas', shardsImg, window.App.resources.sheets.json);
                this.loaded++;

                this.startGame();
            };
            shardsImg.src = window.App.resources.sheets.png;
        }

        if(window.App.resources.audio.json) {
            this.cache.json.add('sfx', window.App.resources.audio.json);
            
            let codec = window.App.resources.audio.m4a;
            if(!this.game.device.audio.m4a) codec = window.App.resources.audio.ogg;
            let audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            audioCtx.decodeAudioData(this.base64ToArrayBuffer(codec), (buffer) => {
                if(this.audioLoaded) return;

                this.cache.audio.add('sfx', buffer);
                this.loaded++;

                this.audioLoaded = true;
                
                // Play background music once global audio is loaded
                if (window.App.resources.audio.json && !window.App.isMusicPlaying) {
                    let sound = this.game.sound.addAudioSprite('sfx');
                    sound.play('music', { loop: true, volume: 0.35 });
                    window.App.isMusicPlaying = true;
                    window.App.bgMusic = sound;
                }

                this.startGame();
            });

            setTimeout(() => {
                if(this.audioLoaded) return;
                this.loaded++;
                
                this.audioLoaded = true;

                this.startGame();
            }, 1000)
        }

        this.time.addEvent({delay: 250, callback: () => {
            for (var key in App.resources.spine) {
                let image = new Image();
                image.src = window.App.resources.spine[key].png;
                image.onload = () => {
                    //console.log(this);
                    //console.log(this.spine.plugin.webgl.GLTexture( this.game.context, image, false ));
                }

                this.cache.custom.spine.add(key, {preMultipliedAlpha: true, data: window.App.resources.spine[key].atlas} );
                //console.log(this.game.context, window.App.resources.spine[key].png);
                //console.log(this.spine.plugin.webgl.GLTexture( this.game.context, window.App.resources.spine[key].png ));
                this.cache.custom.spineTextures.add(key, this.spine.getAtlas(key));
                //console.log(this.spine.spineTextures.get(key));
                this.cache.json.add(key, window.App.resources.spine[key].json);
                
                this.loaded++;
            }

            this.startGame();
        }, callbackScope: this});

        this.startGame();
    }

    base64ToArrayBuffer(base64) {
        let binaryString = window.atob(base64);
        let len = binaryString.length;
        let bytes = new Uint8Array( len );

        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        return bytes.buffer;
    }

    startGame() {
        if(this.loaded !== this.loadTotal) return;
        
        this.loadTotal = -1;

        this.time.addEvent({delay: 250, callback: () => {
            document.getElementById('loader').style.display = 'none';
            document.getElementById('app').style.display = 'block';
            
            if (typeof window.App.isDev === 'undefined') {
                window.App.isDev = window.location && (
                    window.location.hostname === 'localhost' ||
                    window.location.hostname === '127.0.0.1' ||
                    window.location.port === '3080'
                );
            }

            console.log('[Preloader] autoShowOnLaunchMs test', {
                isDev: window.App.isDev,
                autoShowOnLaunchMs: TRANSITION_SETTINGS.autoShowOnLaunchMs,
                willShowTransition: window.App.isDev && TRANSITION_SETTINGS.autoShowOnLaunchMs > 0
            });

            if (window.App.isDev && TRANSITION_SETTINGS.autoShowOnLaunchMs > 0) {
                this.time.delayedCall(TRANSITION_SETTINGS.autoShowOnLaunchMs, () => {
                    this.scene.start('TransitionScene');
                });
            } else if (window.App.levelSelect) {
                this.scene.start('TransitionScene');
            } else {
                this.scene.start('Game', { sceneId: window.App.flow && window.App.flow[0] });
            }
        }, callbackScope: this});
    }
}