export default class Background extends Phaser.GameObjects.Container {
    constructor({scene, background = {}, pImage, lImage, pScaleX = 1, pScaleY = 1, lScaleX = 1, lScaleY = 1, container}) {
        super(scene, 0, 0);
        this.background = background;
        Background.ensureWoodTexture(scene);
        this.init(background, pImage, lImage, pScaleX, pScaleY, lScaleX, lScaleY);
        container.add(this);
    }

    static ensureWoodTexture(scene) {
        if (!scene || !scene.textures) return;
        if (scene.textures.exists('wood_bg')) {
            const tex = scene.textures.get('wood_bg');
            if (tex && tex.key !== '__MISSING') return;
            scene.textures.remove('wood_bg');
        }

        const width = 1024;
        const height = 1024;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Base warm wood tone gradient
        const baseGrad = ctx.createLinearGradient(0, 0, width, 0);
        baseGrad.addColorStop(0.00, '#6e3c1b');
        baseGrad.addColorStop(0.20, '#8c5228');
        baseGrad.addColorStop(0.40, '#77431e');
        baseGrad.addColorStop(0.65, '#995a2d');
        baseGrad.addColorStop(0.85, '#7b441f');
        baseGrad.addColorStop(1.00, '#633517');
        ctx.fillStyle = baseGrad;
        ctx.fillRect(0, 0, width, height);

        // Vertical plank seams & highlights
        const numPlanks = 5;
        const plankW = width / numPlanks;
        for (let p = 0; p <= numPlanks; p++) {
            const px = p * plankW;

            // Dark seam line
            ctx.fillStyle = 'rgba(15, 6, 2, 0.45)';
            ctx.fillRect(px - 2, 0, 4, height);

            // Subtle highlight line on seam right edge
            ctx.fillStyle = 'rgba(255, 220, 170, 0.12)';
            ctx.fillRect(px + 2, 0, 2, height);
        }

        // Procedural wood grain lines (vertical flowing waves)
        const totalGrains = 160;
        for (let i = 0; i < totalGrains; i++) {
            const startX = Math.random() * width;
            const startY = Math.random() * height;
            const len = 350 + Math.random() * 550;
            const alpha = 0.04 + Math.random() * 0.08;
            const isDark = Math.random() > 0.35;

            ctx.strokeStyle = isDark
                ? `rgba(20, 8, 2, ${alpha})`
                : `rgba(240, 190, 130, ${alpha * 0.75})`;
            ctx.lineWidth = 1 + Math.random() * 1.5;

            ctx.beginPath();
            ctx.moveTo(startX, startY);

            const freq = 0.006 + Math.random() * 0.008;
            const amp = 5 + Math.random() * 14;

            for (let step = 0; step <= len; step += 12) {
                const cy = startY + step;
                const cx = startX + Math.sin(step * freq) * amp + (Math.random() - 0.5) * 1.2;
                ctx.lineTo(cx, cy);
            }
            ctx.stroke();
        }

        // Natural wood knots
        const knotPositions = [
            { x: 180, y: 280, r: 26 },
            { x: 540, y: 720, r: 32 },
            { x: 860, y: 410, r: 24 }
        ];

        for (const knot of knotPositions) {
            const kx = knot.x + (Math.random() - 0.5) * 40;
            const ky = knot.y + (Math.random() - 0.5) * 40;
            const rMax = knot.r;

            for (let r = rMax; r > 3; r -= 3.5) {
                ctx.beginPath();
                const opacity = 0.08 + ((rMax - r) / rMax) * 0.18;
                ctx.strokeStyle = `rgba(30, 12, 4, ${opacity})`;
                ctx.lineWidth = 2;
                ctx.ellipse(kx, ky, r, r * 1.6, Math.PI * 0.08, 0, Math.PI * 2);
                ctx.stroke();
            }
        }

        // Subtle vignette for depth & atmosphere
        const vignette = ctx.createRadialGradient(width / 2, height / 2, width * 0.25, width / 2, height / 2, width * 0.72);
        vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vignette.addColorStop(1, 'rgba(12, 4, 0, 0.38)');
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, width, height);

        scene.textures.addCanvas('wood_bg', canvas);
    }

    init(background, pImage, lImage, pScaleX, pScaleY, lScaleX, lScaleY) {
        this.setCustomPosition(0, 0);

        const imgKey = pImage || background.pImage;
        this.isSkyBg = (imgKey === 'sky_bg');
        this.isWoodBg = (imgKey === 'wood_bg');

        if (!this.isSkyBg && !this.isWoodBg) {
            this.addProperties(["scale"]);
            this.pScaleX = pScaleX || 1;
            this.pScaleY = pScaleY || 1;
            this.lScaleX = lScaleX || 1;
            this.lScaleY = lScaleY || 1;
        }

        // Always render color fill if present
        if (background.color || background.mode === 'color') {
            this.color = background.color || '#000000';
            this._colorFill = this.scene.add.graphics();
            this.add(this._colorFill);
        }

        if (background.mode !== 'color' || imgKey) {
            this.addProperties(["image"]);
            this.imageSprite = this.scene.add.image(0, 0, imgKey);
            this.add(this.imageSprite);
            this.pImage = imgKey;
            this.lImage = lImage || background.lImage;
        }

        if (this._colorFill || this.isSkyBg || this.isWoodBg) {
            this._updateColorFill();

            // Keep a named reference so we can remove it when the scene shuts down.
            this._resizeHandler = () => this._updateColorFill();
            const sceneScale = this.scene.scale;
            sceneScale.on('resize', this._resizeHandler);
            this.scene.events.once('shutdown', () => {
                sceneScale.off('resize', this._resizeHandler);
            });
        }
    }

    _updateColorFill() {
        if (!this.scene) return;
        // The background lives inside the scaled main container, so convert the
        // screen size back into container-local space before drawing the fill.
        const containerScale = Number(this.scene.game?.size?.scale) || 1;
        const width = (this.scene.scale?.width ?? 0) / containerScale;
        const height = (this.scene.scale?.height ?? 0) / containerScale;
        
        if (this._colorFill) {
            this._colorFill.clear();
            const hex = this.color.replace('#', '');
            const colorInt = parseInt(hex.length === 6 ? hex : hex.split('').map((c) => c + c).join(''), 16);
            this._colorFill.fillStyle(colorInt, 1);
            this._colorFill.fillRect(-width / 2, -height / 2, width, height);
        }

        if (this.imageSprite && (this.isSkyBg || this.isWoodBg)) {
            const imgW = this.imageSprite.width || 1024;
            const imgH = this.imageSprite.height || 1024;
            const isPortrait = height > width;
            let scaleX = 1;
            let scaleY = 1;
            
            if (isPortrait) {
                scaleY = height / imgH;
                scaleX = scaleY;
                if (scaleX * imgW < width) {
                    scaleX = width / imgW;
                    scaleY = scaleX;
                }
            } else {
                scaleX = width / imgW;
                scaleY = scaleX;
                if (scaleY * imgH < height) {
                    scaleY = height / imgH;
                    scaleX = scaleY;
                }
            }
            
            this.imageSprite.setScale(scaleX, scaleY);
            this.imageSprite.x = 0;
            this.imageSprite.y = this.isSkyBg ? (height / 2) - (imgH * scaleY) / 2 : 0;
        }
    }

    setTexture(key) {
        if (this.imageSprite) {
            this.imageSprite.setTexture(key);
        }
        return this;
    }

    changeImage(pImage, lImage) {
        if (this.imageSprite) {
            this.pImage = pImage;
            this.lImage = lImage;
            this.imageSprite.setTexture(pImage);
        }
    }
}
