import Network from '../networks/Network';
import Applovin from '../networks/Applovin';
import Facebook from '../networks/Facebook';
import Google from '../networks/Google';
import IronSource from '../networks/IronSource';
import Liftoff from '../networks/Liftoff';
import TikTok from '../networks/TikTok';
import UnityAds from '../networks/UnityAds';
import Vungle from '../networks/Vungle';

import Preloader from './Preloader';
import Game from '../../src/Game';
import TransitionScene from '../../src/TransitionScene';
import StateManager from '../../src/StateManager';

import Utils from './Utils';

class App extends Phaser.Game {
    constructor() {
        const config = {
            type: Phaser.AUTO,
            parent: 'app',
            scale: {
                mode: Phaser.Scale.NONE,
                width: window.innerWidth * window.devicePixelRatio,
                height: window.innerHeight * window.devicePixelRatio,
            },
            title: 'Core Version: ' + window.App.CORE_VERSION,
            backgroundColor: '#1e1e1e',
            scene: [Preloader, Game, TransitionScene]
        };

        if(window.SpinePlugin) {
            config['plugins'] = {
                scene: [{ key: 'SpinePlugin', plugin: window.SpinePlugin, start: true, mapping: 'spine' }]
            };
        }

        super(config);

        this.create();
        this.addStyle();
        this.setObjects();
        this.fixedAudioStop();
        this.resize();
    }

    create() {
        setTimeout('window.scrollTo(0, 1)', 10);

        if(!window.dapi) window.addEventListener('resize', this.resize.bind(this), true);

        this.network = network;
        this.network.game = this;
        this.size = {resize: this.resize.bind(this)};

        // Initialise the state manager with the level flow injected by the builder
        window.App.stateManager = new StateManager(window.App.flow || []);
    }

    addStyle() {
        document.body.style.margin = '0%';
        document.body.style.padding = '0%';
        document.body.style.backgroundColor = '#000000';

        document.getElementById('app').style.position = 'relative';

        let styleNode = document.createElement('style');
        styleNode.type = 'text/css';
        document.getElementsByTagName('head')[0].appendChild(styleNode);

        this.changeLoaderStyle();
            
        let webkitKeyFrames = '@-webkit-keyframes spin{0%{-webkit-transform:rotate(0deg);}100%{-webkit-transform:rotate(360deg);}}';
        let webkitTextNode = document.createTextNode(webkitKeyFrames);
        document.getElementsByTagName('style')[0].appendChild(webkitTextNode);

        let keyFrames = '@keyframes spin{0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}';
        let textNode = document.createTextNode(keyFrames);
        document.getElementsByTagName('style')[0].appendChild(textNode);
    }

    changeLoaderStyle() {
        let loader = document.getElementById('loader').style.display;

        let w = (window.innerWidth > window.innerHeight) ? window.innerHeight : window.innerWidth;
        let size = (w / 10) * window.devicePixelRatio;
        let sizeBorder = size / 10;
        let margin = (size / 2) + (sizeBorder / 2);
        
        let loaderStyle = 'position: absolute;top: 50%;left: 50%;margin-left: -' + margin + 'px;margin-top: -' + margin + 'px;';
        loaderStyle += 'background-color: #000000;border:' + sizeBorder + 'px solid #000000;border-radius: 50%;';
        loaderStyle += 'width: 100%;height: 100%;display:' + loader + ';';
        loaderStyle += 'border-bottom:' + sizeBorder + 'px solid #ffffff;border-top:' + sizeBorder + 'px solid #ffffff;';
        loaderStyle += 'width:' + size + 'px;height:' + size + 'px;-webkit-animation:spin 2s linear infinite;animation:spin 2s linear infinite;'
        document.getElementById('loader').style.cssText = loaderStyle;
    }

    setObjects() {
        const objects = [Phaser.GameObjects.Sprite.prototype, Phaser.GameObjects.Graphics.prototype,
                         Phaser.GameObjects.Container.prototype,Phaser.GameObjects.Image.prototype, 
                         Phaser.GameObjects.Text.prototype, Phaser.GameObjects.TileSprite.prototype,
                         Phaser.GameObjects.RenderTexture.prototype,
                         Phaser.GameObjects.Particles.ParticleEmitterManager.prototype];
 
        if (window.SpinePlugin) objects.push(SpinePlugin.SpineGameObject.prototype);
        
        for (let i = 0; i < objects.length; i++) {
            Utils.addDefaultProperties(objects[i]);
        }
    }

    resize() {
        let width = window.innerWidth;
        let height = window.innerHeight;

        let deviceWidth = width * window.devicePixelRatio;
        let deviceHeight = height * window.devicePixelRatio;
        if(window.dapi) {
            width = window.dapi.getScreenSize().width;
            height = window.dapi.getScreenSize().height;

            deviceWidth = window.dapi.getScreenSize().width * window.devicePixelRatio;
            deviceHeight = window.dapi.getScreenSize().height * window.devicePixelRatio;
        } else if (window.App.network === 'Applovin') {
            width = window.mraid.getScreenSize().width;
            height = window.mraid.getScreenSize().height;

            deviceWidth = window.mraid.getScreenSize().width * window.devicePixelRatio;
            deviceHeight = window.mraid.getScreenSize().height * window.devicePixelRatio;
        }
        
        document.getElementById('app').style.width = width + 'px';
        document.getElementById('app').style.height = height + 'px';

        this.canvas.style.width = width + 'px';
        this.canvas.style.height = height + 'px';

        this.scale.resize(deviceWidth, deviceHeight);

        let scale = Math.min(deviceWidth / 600, deviceHeight / 900);
        this.size.scale = scale.toFixed(1);
        this.size.isPortrait = deviceWidth < deviceHeight;
        
        this.updateScale();
        this.scaleContainer();
        this.changeLoaderStyle();
    }

    scaleContainer() {
        for (let i = 0; i < this.scene.scenes.length; i++) {
            if(this.scene.scenes[i].mainContainer) {
                const container = this.scene.scenes[i].mainContainer;
                const coff = Utils.coefficient(1, this.size.scale, 1);
                
                container.setCustomPosition(-this.size.x, -this.size.y);
                container.setScale(1).setScale(this.size.scale);
                container.cx /= coff;
                container.cy /= coff;

                this.resizeObj(container);
            }
        }
        
        this.updateScale();
    }

    resizeObj(container) {
        for (let j = 0; j < container.list.length; j++) {
            const obj = container.list[j];
            if( obj.customProps.includes('pos') ) {
                this.size.isPortrait ? obj.setCustomPosition(obj.px, obj.py) : obj.setCustomPosition(obj.lx, obj.ly);
            } else {
                obj.setCustomPosition(obj.cx, obj.cy);
            }

            if( obj.customProps.includes('scale') ) this.size.isPortrait ? obj.setScale(obj.pScaleX, obj.pScaleY) : obj.setScale(obj.lScaleX, obj.lScaleY);
            if( obj.customProps.includes('angle') ) this.size.isPortrait ? obj.setAngle(obj.pAngle) : obj.setAngle(obj.lAngle);
            if( obj.customProps.includes('alpha') ) this.size.isPortrait ? obj.setAlpha(obj.pAlpha) : obj.setAlpha(obj.lAlpha);
            if( obj.customProps.includes('visible') ) this.size.isPortrait ? obj.setVisible(obj.pVisible) : obj.setVisible(obj.lVisible);
            if( obj.customProps.includes('align') ) this.size.isPortrait ? obj.setAlign(obj.pAlign) : obj.setAlign(obj.lAlign);
            if( obj.customProps.includes('image') ) {
                const img = this.size.isPortrait ? obj.pImage : obj.lImage;
                (window.App.resources.textures[img] || img === "__MISSING" || img === "None") ?  obj.setTexture(img) : obj.setTexture('atlas', img);
            }
            if( obj.customProps.includes('origin') ) this.size.isPortrait ? obj.setOrigin(obj.pOriginX, obj.pOriginY) : obj.setOrigin(obj.lOriginX, obj.lOriginY);
        }
    }

    updateScale() {
        const width = this.scale.width;
        const height = this.scale.height;

        this.size.x = width / 2;
        this.size.y = height / 2;
        this.size.top = ((height / this.size.scale) / 2) - this.size.y;
        this.size.top = (this.size.top < (height / this.size.scale) / 2) ? -this.size.top : this.size.top;
        this.size.left = ((width / this.size.scale) / 2) - this.size.x;
        this.size.left = (this.size.left < (width / this.size.scale) / 2) ? -this.size.left : this.size.left;
        this.size.bottom = ((height / this.size.scale) / 2) + this.size.y;
        this.size.bottom = (this.size.bottom < (height / this.size.scale) / 2) ? -this.size.bottom : this.size.bottom;
        this.size.right = ((width / this.size.scale) / 2) + this.size.x;
        this.size.right = (this.size.right < (width / this.size.scale) / 2) ? -this.size.right : this.size.right;
        //this.size.isPortrait = this.scale.orientation === Phaser.Scale.PORTRAIT;
    }

    fixedAudioStop() {
        let audioContext = this.sound.context;
        setInterval(() => {
            if (audioContext.state === 'suspended') {
                this.sound.mute = true;
            } else {
                if(this.sound.mute) this.sound.mute = false;
            }
        }, 1);
    }
}

let network;
const start = () => {
    new App();
}

if(window.App.network === 'Applovin') {
    network = new Applovin(start);
} else if(window.App.network === 'Facebook') {
    network = new Facebook(start);
} else if(window.App.network === 'Google') {
    network = new Google(start);
} else if(window.App.network === 'IronSource') {
    network = new IronSource(start);
} else if(window.App.network === 'Liftoff') {
    network = new Liftoff(start);
} else if(window.App.network === 'TikTok') {
    network = new TikTok(start);
} else if(window.App.network === 'UnityAds') {
    network = new UnityAds(start);
} else if(window.App.network === 'Vungle') {
    network = new Vungle(start);
} else {
    network = new Network(start);
}

window.App.CORE_VERSION = '0.0.5';