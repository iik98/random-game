/* ==========================================================================
   Pulse Arrow Rhythm Game - Core Engine & Visuals
   ========================================================================== */

const PulseArrowEngine = {
    // Canvas & Rendering
    canvas: null,
    ctx: null,
    dpr: 1,
    scaleFactor: 1,
    logicalWidth: 280,
    logicalHeight: 450,
    
    // Game States
    state: 'splash', // 'splash', 'playing', 'gameOver'
    score: 0,
    bestScore: 0,
    combo: 0,
    maxCombo: 0,
    life: 100,
    loopActive: false,

    // Timing & Beats
    lastTime: 0,
    spawnTimer: 0,
    spawnInterval: 650, // ms between arrows (BPM ~92)
    beatCounter: 0,

    // Tracks Config
    tracks: [
        { dir: 'L', key: 'ArrowLeft', char: '◀', color: '#06b6d4', x: 35 },
        { dir: 'D', key: 'ArrowDown', char: '▼', color: '#10b981', x: 105 },
        { dir: 'U', key: 'ArrowUp', char: '▲', color: '#ec4899', x: 175 },
        { dir: 'R', key: 'ArrowRight', char: '▶', color: '#eab308', x: 245 }
    ],
    targetY: 65, // Y position of the target outlines at the top
    noteSpeed: 0.17, // speed multiplier (pixels/ms)

    // Elements State
    notes: [],       // active rising arrows
    particles: [],   // tap spark explosions
    shockwaves: [],  // glow expansion rings
    ratings: [],     // floating ratings ("PERFECT", "GOOD", "MISS")

    // Input States
    keysPressed: {},
    isMobile: false,

    // Initialization
    init() {
        this.canvas = document.getElementById('arrow-canvas');
        this.ctx = this.canvas.getContext('2d');

        // Detect mobile or low-end device to enable low-spec performance mode
        this.isMobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (window.innerWidth <= 768);
        console.log(`[Pulse Arrow] Low-spec performance mode active: ${this.isMobile}`);

        // Handle Responsive scaling
        this.resize();
        window.addEventListener('resize', () => this.resize());

        // Load High score
        this.bestScore = parseInt(localStorage.getItem('arrow_high_score')) || 0;
        document.getElementById('arrow-best-val').textContent = this.bestScore;

        // Bind Controls
        this.setupInput();
    },

    resize() {
        if (!this.canvas) return;
        const wrapper = this.canvas.parentElement;
        if (!wrapper) return;
        const rect = wrapper.getBoundingClientRect();

        // Safe retry if container dimensions are not finalized yet
        if (rect.width < 50 || rect.height < 50) {
            if (this.loopActive) {
                setTimeout(() => this.resize(), 50);
            }
            return;
        }

        this.dpr = window.devicePixelRatio || 1;
        this.canvas.width = rect.width * this.dpr;
        this.canvas.height = rect.height * this.dpr;

        this.scaleFactor = rect.width / this.logicalWidth;
        this.ctx.scale(this.dpr * this.scaleFactor, this.dpr * this.scaleFactor);
    },

    setupInput() {
        // Keyboard bindings (Arrows + WASD support)
        window.addEventListener('keydown', (e) => {
            if (this.state !== 'playing' || !this.loopActive) return;

            let colIdx = -1;
            if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') colIdx = 0;
            else if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's') colIdx = 1;
            else if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') colIdx = 2;
            else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') colIdx = 3;

            if (colIdx !== -1 && !this.keysPressed[colIdx]) {
                e.preventDefault();
                this.keysPressed[colIdx] = true;
                this.handleTap(colIdx);
            }
        });

        window.addEventListener('keyup', (e) => {
            if (this.state !== 'playing' || !this.loopActive) return;

            let colIdx = -1;
            if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') colIdx = 0;
            else if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's') colIdx = 1;
            else if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') colIdx = 2;
            else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') colIdx = 3;

            if (colIdx !== -1) {
                this.keysPressed[colIdx] = false;
            }
        });

        // Mobile button configurations
        const bindBtn = (id, colIdx) => {
            const btn = document.getElementById(id);
            if (!btn) return;

            const trigger = (e) => {
                e.preventDefault();
                if (this.state !== 'playing') return;
                HapticEngine.triggerTap();
                this.handleTap(colIdx);
                this.keysPressed[colIdx] = true;
                setTimeout(() => {
                    this.keysPressed[colIdx] = false;
                }, 100);
            };

            btn.addEventListener('touchstart', trigger, { passive: false });
            btn.addEventListener('mousedown', trigger);
        };

        bindBtn('arrow-ctrl-left', 0);
        bindBtn('arrow-ctrl-down', 1);
        bindBtn('arrow-ctrl-up', 2);
        bindBtn('arrow-ctrl-right', 3);

        // Start & Restart overlays
        const startBtn = document.getElementById('arrow-start-btn');
        const restartBtn = document.getElementById('arrow-restart-btn');
        const splash = document.getElementById('arrow-splash-screen');
        const gameOver = document.getElementById('arrow-game-over-screen');

        if (startBtn) {
            startBtn.addEventListener('click', () => {
                AudioEngine.init();
                HapticEngine.triggerTap();
                if (splash) splash.classList.remove('active');
                this.startGame();
            });
        }

        if (restartBtn) {
            restartBtn.addEventListener('click', () => {
                AudioEngine.init();
                HapticEngine.triggerTap();
                if (gameOver) gameOver.classList.remove('active');
                this.startGame();
            });
        }
    },

    launch() {
        this.loopActive = true;
        this.state = 'splash';

        const splash = document.getElementById('arrow-splash-screen');
        const gameOver = document.getElementById('arrow-game-over-screen');
        if (splash) splash.classList.add('active');
        if (gameOver) gameOver.classList.remove('active');

        // Reload Scores
        this.bestScore = parseInt(localStorage.getItem('arrow_high_score')) || 0;
        document.getElementById('arrow-best-val').textContent = this.bestScore;

        this.notes = [];
        this.particles = [];
        this.shockwaves = [];
        this.ratings = [];
        this.lastTime = 0;

        this.resize();
        requestAnimationFrame((t) => this.loop(t));
    },

    halt() {
        this.loopActive = false;
        this.state = 'splash';
        this.notes = [];
        this.particles = [];
        this.shockwaves = [];
        this.ratings = [];

        const splash = document.getElementById('arrow-splash-screen');
        const gameOver = document.getElementById('arrow-game-over-screen');
        if (splash) splash.classList.remove('active');
        if (gameOver) gameOver.classList.remove('active');

        if (this.ctx) {
            this.ctx.clearRect(0, 0, this.logicalWidth, this.logicalHeight);
        }
    },

    startGame() {
        this.resize();

        this.notes = [];
        this.particles = [];
        this.shockwaves = [];
        this.ratings = [];

        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.life = 100;
        this.spawnTimer = 0;
        this.spawnInterval = 650;
        this.beatCounter = 0;
        this.lastTime = 0;

        document.getElementById('arrow-score-val').textContent = 0;
        const lifeFill = document.getElementById('arrow-life-fill');
        if (lifeFill) lifeFill.style.width = '100%';
        document.getElementById('arrow-combo-val').textContent = '0x COMBO';

        this.state = 'playing';
    },

    // Main loops
    loop(timestamp) {
        if (!this.loopActive) return;

        if (!this.lastTime) this.lastTime = timestamp;
        const dt = timestamp - this.lastTime;
        this.lastTime = timestamp;

        this.update(dt);
        this.render();

        requestAnimationFrame((t) => this.loop(t));
    },

    update(dt) {
        if (this.state === 'playing') {
            // Adjust note speed and spawn rates over time for incremental difficulty scaling
            this.spawnInterval = Math.max(380, 650 - this.score * 0.015);
            const currentSpeed = this.noteSpeed * (1.0 + this.score * 0.00004);

            // 1. Spawning arrows according to interval beat
            this.spawnTimer += dt;
            if (this.spawnTimer >= this.spawnInterval) {
                this.spawnTimer -= this.spawnInterval;
                this.spawnArrow();
            }

            // 2. Rising note arrows calculations
            for (let n of this.notes) {
                n.y -= currentSpeed * dt;
            }

            // Check for missed arrows flying past top zone
            for (let n of this.notes) {
                if (!n.hit && n.y < this.targetY - 35) {
                    n.hit = true;
                    this.triggerRating('MISS', n.x, this.targetY - 10);
                }
            }

            // Filter out old and hit arrows
            this.notes = this.notes.filter(n => !n.hit && n.y > -40);
        }

        // 3. Update Visual Rating Text floats
        for (let r of this.ratings) {
            r.y -= 0.6;
            r.alpha -= 0.025;
        }
        this.ratings = this.ratings.filter(r => r.alpha > 0);

        // 4. Update Particle sparks decay
        for (let p of this.particles) {
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= p.decay;
        }
        this.particles = this.particles.filter(p => p.alpha > 0);

        // 5. Update shockwave rings expansion
        for (let s of this.shockwaves) {
            s.radius += (s.maxRadius - s.radius) * 0.16;
            s.alpha -= 0.08;
        }
        this.shockwaves = this.shockwaves.filter(s => s.alpha > 0);
    },

    spawnArrow() {
        // Dynamic metronome tick
        this.beatCounter++;
        const isStrong = this.beatCounter % 4 === 0;
        AudioEngine.playRhythmBeat(isStrong);

        // Random column selector
        const trackIdx = Math.floor(Math.random() * this.tracks.length);
        this.notes.push({
            trackIdx: trackIdx,
            x: this.tracks[trackIdx].x,
            y: this.logicalHeight + 20, // start below visible screen
            hit: false
        });

        // 15% double arrow spawn chance on strong beats for premium challenge density
        if (isStrong && Math.random() < 0.28) {
            let secondIdx = (trackIdx + 2) % this.tracks.length;
            this.notes.push({
                trackIdx: secondIdx,
                x: this.tracks[secondIdx].x,
                y: this.logicalHeight + 20,
                hit: false
            });
        }
    },

    handleTap(trackIdx) {
        // Find closest rising arrow in this track
        let closest = null;
        let minDist = Infinity;

        for (let n of this.notes) {
            if (n.trackIdx === trackIdx && !n.hit) {
                const dist = Math.abs(n.y - this.targetY);
                if (dist < minDist) {
                    minDist = dist;
                    closest = n;
                }
            }
        }

        if (closest && minDist < 45) {
            closest.hit = true;
            
            // Judge overlap timing
            if (minDist <= 16) {
                this.triggerRating('PERFECT', closest.x, closest.y);
            } else {
                this.triggerRating('GOOD', closest.x, closest.y);
            }
        } else {
            // Tapped empty track -> minor spark burst and score deduction, but no combo break to feel fluid
            this.spawnTapSparks(this.tracks[trackIdx].x, this.targetY, '#475569', 3);
        }
    },

    triggerRating(type, x, y) {
        let ratingText = '';
        let ratingColor = '';
        let points = 0;

        if (type === 'PERFECT') {
            ratingText = 'PERFECT';
            ratingColor = '#ec4899';
            points = 100;
            this.combo++;
            this.life = Math.min(100, this.life + 3.0);
            AudioEngine.playTapHit('perfect');
            HapticEngine.vibrate(10);
            
            // Perfect bursts
            this.spawnTapSparks(x, this.targetY, ratingColor, this.isMobile ? 6 : 14);
            this.shockwaves.push({
                x: x,
                y: this.targetY,
                radius: 12,
                maxRadius: 40,
                color: ratingColor,
                alpha: 1.0
            });
        } 
        else if (type === 'GOOD') {
            ratingText = 'GOOD';
            ratingColor = '#06b6d4';
            points = 50;
            this.combo++;
            this.life = Math.min(100, this.life + 1.2);
            AudioEngine.playTapHit('good');
            HapticEngine.vibrate(5);

            // Good bursts
            this.spawnTapSparks(x, this.targetY, ratingColor, this.isMobile ? 4 : 8);
        } 
        else {
            // MISS
            ratingText = 'MISS';
            ratingColor = '#ef4444';
            this.combo = 0;
            this.life = Math.max(0, this.life - 9.0);
            AudioEngine.playTapHit('miss');
            HapticEngine.vibrate(25);

            // Miss flash
            const arena = document.getElementById('pulse-arrow-arena');
            if (arena) {
                arena.style.boxShadow = 'inset 0 0 25px rgba(239, 68, 68, 0.15)';
                setTimeout(() => {
                    arena.style.boxShadow = 'none';
                }, 100);
            }

            if (this.life <= 0) {
                this.triggerGameOver();
            }
        }

        // Apply score combo multipliers
        if (points > 0) {
            const multiplier = Math.min(5, 1 + Math.floor(this.combo / 10));
            this.score += points * multiplier;
            document.getElementById('arrow-score-val').textContent = this.score;

            if (this.score > this.bestScore) {
                this.bestScore = this.score;
                localStorage.setItem('arrow_high_score', this.bestScore);
                document.getElementById('arrow-best-val').textContent = this.bestScore;
            }
        }

        // Update Combo & HUD Gauge
        document.getElementById('arrow-combo-val').textContent = `${this.combo}x COMBO`;
        const lifeFill = document.getElementById('arrow-life-fill');
        if (lifeFill) {
            lifeFill.style.width = this.life + '%';
            if (this.life <= 25) {
                lifeFill.style.background = 'linear-gradient(90deg, #dc2626, #ef4444)';
                lifeFill.style.boxShadow = '0 0 10px rgba(239, 68, 68, 0.8)';
            } else {
                lifeFill.style.background = 'linear-gradient(90deg, #ef4444, #f43f5e)';
                lifeFill.style.boxShadow = '0 0 10px rgba(244, 63, 94, 0.5)';
            }
        }

        // Spawn Floating Text Indicator
        this.ratings.push({
            x: x,
            y: this.targetY - 20,
            text: ratingText,
            color: ratingColor,
            alpha: 1.0
        });
    },

    spawnTapSparks(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1.0 + Math.random() * 3.5;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: 1.5 + Math.random() * 3,
                color: color,
                alpha: 1.0,
                decay: 0.02 + Math.random() * 0.02
            });
        }
    },

    triggerGameOver() {
        this.state = 'gameOver';
        this.combo = 0;

        HapticEngine.triggerGameOver();
        AudioEngine.playGameOverSound();

        document.getElementById('arrow-final-score').textContent = this.score;
        document.getElementById('arrow-final-best').textContent = this.bestScore;

        const screen = document.getElementById('arrow-game-over-screen');
        if (screen) screen.classList.add('active');
    },

    // Rendering Loops
    render() {
        if (!this.ctx) return;

        // Clear screen
        this.ctx.clearRect(0, 0, this.logicalWidth, this.logicalHeight);

        // 1. Draw Columns & Tracks
        this.drawTracks();

        // 2. Draw Target zones at the top
        this.drawTargets();

        // 3. Draw Rising arrow notes
        this.drawNotes();

        // 4. Draw shockwave explosions & sparks
        this.drawEffects();

        // 5. Draw Rating floating texts
        this.drawRatings();
    },

    drawTracks() {
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
        this.ctx.lineWidth = 1;

        // Draw track separator lines
        const sepX = [70, 140, 210];
        for (let x of sepX) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.logicalHeight);
            this.ctx.stroke();
        }

        // Draw glass border container
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        this.ctx.lineWidth = 2.5;
        this.ctx.strokeRect(0, 0, this.logicalWidth, this.logicalHeight);
        this.ctx.restore();
    },

    drawTargets() {
        this.ctx.save();
        for (let i = 0; i < this.tracks.length; i++) {
            const t = this.tracks[i];
            const isPressed = this.keysPressed[i];

            // Render hollow outlined target arrow in top region
            this.ctx.save();
            this.ctx.strokeStyle = t.color;
            this.ctx.lineWidth = isPressed ? 3.5 : 2.0;

            if (!this.isMobile && isPressed) {
                this.ctx.shadowColor = t.color;
                this.ctx.shadowBlur = 10;
            }

            this.ctx.globalAlpha = isPressed ? 0.9 : 0.25;

            // Draw glowing outline arrow shape
            this.drawArrowShape(t.x, this.targetY, 15, t.dir, false);

            this.ctx.restore();
        }
        this.ctx.restore();
    },

    drawNotes() {
        this.ctx.save();
        for (let n of this.notes) {
            if (n.hit) continue;

            const t = this.tracks[n.trackIdx];

            // Render rising arrow
            this.ctx.save();
            
            // Dynamic glow on desktop
            if (!this.isMobile) {
                this.ctx.shadowColor = t.color;
                this.ctx.shadowBlur = 8;
            }

            this.ctx.fillStyle = t.color;
            this.ctx.globalAlpha = 0.95;

            // Draw solid arrow shape
            this.drawArrowShape(n.x, n.y, 14, t.dir, true);

            this.ctx.restore();
        }
        this.ctx.restore();
    },

    drawArrowShape(x, y, size, direction, fill = false) {
        this.ctx.beginPath();

        // Design vector coordinates relative to center (x, y)
        // Arrow pointing Up
        let pts = [];
        if (direction === 'U') {
            pts = [
                { x: 0, y: -size },
                { x: size, y: 0 },
                { x: size * 0.4, y: 0 },
                { x: size * 0.4, y: size },
                { x: -size * 0.4, y: size },
                { x: -size * 0.4, y: 0 },
                { x: -size, y: 0 }
            ];
        } 
        else if (direction === 'D') {
            pts = [
                { x: 0, y: size },
                { x: size, y: 0 },
                { x: size * 0.4, y: 0 },
                { x: size * 0.4, y: -size },
                { x: -size * 0.4, y: -size },
                { x: -size * 0.4, y: 0 },
                { x: -size, y: 0 }
            ];
        } 
        else if (direction === 'L') {
            pts = [
                { x: -size, y: 0 },
                { x: 0, y: -size },
                { x: 0, y: -size * 0.4 },
                { x: size, y: -size * 0.4 },
                { x: size, y: size * 0.4 },
                { x: 0, y: size * 0.4 },
                { x: 0, y: size }
            ];
        } 
        else if (direction === 'R') {
            pts = [
                { x: size, y: 0 },
                { x: 0, y: -size },
                { x: 0, y: -size * 0.4 },
                { x: -size, y: -size * 0.4 },
                { x: -size, y: size * 0.4 },
                { x: 0, y: size * 0.4 },
                { x: 0, y: size }
            ];
        }

        this.ctx.moveTo(x + pts[0].x, y + pts[0].y);
        for (let i = 1; i < pts.length; i++) {
            this.ctx.lineTo(x + pts[i].x, y + pts[i].y);
        }
        this.ctx.closePath();

        if (fill) {
            this.ctx.fill();
        } else {
            this.ctx.stroke();
        }
    },

    drawEffects() {
        this.ctx.save();

        // 1. Draw glowing circular expanding shockwaves
        for (let s of this.shockwaves) {
            this.ctx.strokeStyle = s.color;
            this.ctx.lineWidth = 2.5;
            this.ctx.globalAlpha = s.alpha;

            if (!this.isMobile) {
                this.ctx.shadowColor = s.color;
                this.ctx.shadowBlur = 10;
            }

            this.ctx.beginPath();
            this.ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
            this.ctx.stroke();
        }

        // 2. Draw shooting spark particles
        this.ctx.shadowBlur = 0; // Disable blur for spark ticks performance
        for (let p of this.particles) {
            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = p.alpha;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            this.ctx.fill();
        }

        this.ctx.restore();
    },

    drawRatings() {
        this.ctx.save();
        this.ctx.font = '800 12px Outfit, sans-serif';
        this.ctx.textAlign = 'center';

        for (let r of this.ratings) {
            this.ctx.fillStyle = r.color;
            this.ctx.globalAlpha = r.alpha;

            if (!this.isMobile) {
                this.ctx.shadowColor = 'rgba(0,0,0,0.8)';
                this.ctx.shadowBlur = 3;
            }

            this.ctx.fillText(r.text, r.x, r.y);
        }
        this.ctx.restore();
    }
};

window.PulseArrowEngine = PulseArrowEngine;

window.addEventListener('DOMContentLoaded', () => {
    PulseArrowEngine.init();
});
