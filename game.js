/* ==========================================================================
   Cosmic Fusion Mobile - Core Game Engine
   ========================================================================== */

const GameEngine = {
    // Canvas & Context
    canvas: null,
    ctx: null,
    dpr: 1,
    logicalWidth: 360,
    logicalHeight: 560,
    scaleFactor: 1,

    // World & Physics
    world: null,
    
    // Game States: 'splash', 'playing', 'gameOver'
    state: 'splash',
    score: 0,
    bestScore: 0,
    loopActive: false, // controls active animation loops

    // Spawner State
    spawnerPlanet: null,
    nextSpawnerLevel: 1,
    canDrop: true,
    dropCooldown: 600, // ms between drops
    spawnerY: 55,      // constant Y coordinate for spawner
    deadLineY: 100,     // vertical line above which planets overflow

    // Overflow Checking
    overflowTimer: 0,
    overflowDuration: 1800, // ms a planet must stay above deadline to trigger Game Over
    isWarningActive: false,

    // Time Attack Survival Mode Properties
    gameTime: 60,           // starting time in seconds
    maxGameTime: 90,        // maximum time cap in seconds

    // Particles & Visual effects
    particles: [],
    mergeFlashes: [],
    floatingTexts: [],

    // Initialization (Runs once on load to bind listeners)
    init() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Detect mobile or low-end device to automatically activate high-performance low-spec mode
        this.isMobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (window.innerWidth <= 768);
        console.log(`[Cosmic Fusion] Low-spec performance mode active: ${this.isMobile}`);
        
        // Initialize Physics World
        this.world = new PhysicsWorld(this.logicalWidth, this.logicalHeight);
        this.world.substeps = this.isMobile ? 4 : 8;
        
        // Connect Physics callback to game engine functions
        this.world.onMergeCallback = (x, y, nextLevel) => this.onMerge(x, y, nextLevel);
        
        // Handle High-DPI & Responsive Scaling
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        // Load High Score from LocalStorage
        this.bestScore = parseInt(localStorage.getItem('cosmic_high_score')) || 0;
        document.getElementById('best-val').textContent = this.bestScore;

        // Initialize Splash Evolution Guide
        this.populateEvolutionGuide();

        // Setup Interaction Touch/Mouse Event Listeners
        this.setupInput();
    },

    // Launch Cosmic Fusion (Called by Lobby Hub)
    launch() {
        this.loopActive = true;
        this.state = 'splash';
        
        // Ensure UI overlays are correctly shown/hidden
        document.getElementById('splash-screen').classList.add('active');
        document.getElementById('game-over-screen').classList.remove('active');
        
        // Reload high scores in HUD
        this.bestScore = parseInt(localStorage.getItem('cosmic_high_score')) || 0;
        document.getElementById('best-val').textContent = this.bestScore;
        
        // Recalculate responsive dimensions now that container is visible!
        this.resize();
        
        // Start animation frame loop
        requestAnimationFrame((t) => this.loop(t));
    },

    // Halt Cosmic Fusion (Called when returning to Lobby)
    halt() {
        this.loopActive = false;
        this.state = 'splash';
        this.world.clear();
        this.particles = [];
        this.mergeFlashes = [];
        this.floatingTexts = [];
        this.spawnerPlanet = null;
        
        // Clean up DOM overlays
        document.getElementById('splash-screen').classList.remove('active');
        document.getElementById('game-over-screen').classList.remove('active');
        
        // Clear canvas
        if (this.ctx) {
            this.ctx.clearRect(0, 0, this.logicalWidth, this.logicalHeight);
        }
    },

    resize() {
        const wrapper = this.canvas.parentElement;
        const rect = wrapper.getBoundingClientRect();
        
        // If container has 0 or extremely small size, it is hidden or transition layout hasn't settled yet
        if (rect.width < 50 || rect.height < 50) {
            if (this.loopActive) {
                // Retry in 50ms once browser finishes layout pass
                setTimeout(() => this.resize(), 50);
            }
            return;
        }
        
        // Determine dynamic pixel ratio
        this.dpr = window.devicePixelRatio || 1;
        
        // Scale canvas to match pixel ratio and keep crisp textures
        this.canvas.width = rect.width * this.dpr;
        this.canvas.height = rect.height * this.dpr;
        
        // Scale the canvas rendering context
        this.scaleFactor = rect.width / this.logicalWidth;
        this.ctx.scale(this.dpr * this.scaleFactor, this.dpr * this.scaleFactor);
    },

    setupInput() {
        // Elements
        const startBtn = document.getElementById('start-btn');
        const restartBtn = document.getElementById('restart-btn');
        const splashScreen = document.getElementById('splash-screen');
        const gameOverScreen = document.getElementById('game-over-screen');

        // Splash Button
        startBtn.addEventListener('click', () => {
            AudioEngine.init();
            HapticEngine.triggerTap();
            splashScreen.classList.remove('active');
            this.startGame();
        });

        // Restart Button
        restartBtn.addEventListener('click', () => {
            AudioEngine.init();
            HapticEngine.triggerTap();
            gameOverScreen.classList.remove('active');
            this.startGame();
        });

        // Touch Control Listeners
        const handleAim = (clientX) => {
            if (this.state !== 'playing' || !this.spawnerPlanet || !this.canDrop) return;
            
            // Get position relative to canvas bounding box
            const rect = this.canvas.getBoundingClientRect();
            const relativeX = (clientX - rect.left) / this.scaleFactor;
            
            // Constrain within physics container walls
            const margin = this.spawnerPlanet.radius;
            this.spawnerPlanet.x = Math.max(margin, Math.min(this.logicalWidth - margin, relativeX));
        };

        const handleRelease = () => {
            if (this.state !== 'playing' || !this.spawnerPlanet || !this.canDrop) return;
            this.dropPlanet();
        };

        // Touch events (Mobile)
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (e.touches.length > 0) handleAim(e.touches[0].clientX);
        }, { passive: false });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (e.touches.length > 0) handleAim(e.touches[0].clientX);
        }, { passive: false });

        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            handleRelease();
        }, { passive: false });

        // Mouse events (Desktop Simulation fallback)
        let isMouseDown = false;
        this.canvas.addEventListener('mousedown', (e) => {
            isMouseDown = true;
            handleAim(e.clientX);
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (isMouseDown) handleAim(e.clientX);
        });

        window.addEventListener('mouseup', () => {
            if (isMouseDown) {
                isMouseDown = false;
                handleRelease();
            }
        });
    },

    // Populate the splash screen evolution guide
    populateEvolutionGuide() {
        const guide = document.getElementById('evolution-line');
        guide.innerHTML = '';
        
        for (let lvl = 1; lvl <= 8; lvl++) {
            const orb = document.createElement('div');
            orb.className = 'evo-orb';
            orb.style.background = `linear-gradient(135deg, ${PLANET_PRESETS[lvl].gradient[0]}, ${PLANET_PRESETS[lvl].gradient[2]})`;
            orb.style.width = `${14 + lvl * 1.5}px`;
            orb.style.height = `${14 + lvl * 1.5}px`;
            orb.title = PLANET_PRESETS[lvl].name;
            guide.appendChild(orb);
            
            if (lvl < 8) {
                const arrow = document.createElement('span');
                arrow.className = 'evo-arrow';
                arrow.innerHTML = '➔';
                guide.appendChild(arrow);
            }
        }
    },

    startGame() {
        // Recalculate dimensions once layout settles after transitions
        this.resize();

        this.world.clear();
        this.particles = [];
        this.mergeFlashes = [];
        this.floatingTexts = [];
        this.score = 0;
        this.overflowTimer = 0;
        this.isWarningActive = false;
        this.gameTime = 60;
        document.getElementById('score-val').textContent = 0;
        
        // Reset warning state on progress bar if restarting
        const bar = document.getElementById('timer-bar-fill');
        if (bar) {
            bar.classList.remove('warning');
            bar.style.width = '100%';
        }

        // Reset screen vignette alarm flash
        const flash = document.getElementById('warning-flash');
        if (flash) flash.classList.remove('active');
        
        this.state = 'playing';
        this.canDrop = true;
        
        // Initialize randomized next level spawner
        this.nextSpawnerLevel = this.getRandomSpawnerLevel();
        this.spawnNextSpawner();
    },

    getRandomSpawnerLevel() {
        // Spawns Moon (1) to Earth (4) randomly
        return Math.floor(Math.random() * 4) + 1;
    },

    spawnNextSpawner() {
        // Spawn active planet spawner at center
        const level = this.nextSpawnerLevel;
        this.spawnerPlanet = new PhysicsPlanet(this.logicalWidth / 2, this.spawnerY, level);
        this.spawnerPlanet.isSpawner = true;
        this.spawnerPlanet.scale = 1.0; // Ready immediately
        this.world.addPlanet(this.spawnerPlanet);

        // Prep the next level preview
        this.nextSpawnerLevel = this.getRandomSpawnerLevel();
        this.updatePreviewUI();
    },

    updatePreviewUI() {
        const preview = document.getElementById('next-planet-preview');
        const nextPreset = PLANET_PRESETS[this.nextSpawnerLevel];
        
        preview.style.background = `linear-gradient(135deg, ${nextPreset.gradient[0]}, ${nextPreset.gradient[2]})`;
        preview.style.width = `${10 + this.nextSpawnerLevel * 3}px`;
        preview.style.height = `${10 + this.nextSpawnerLevel * 3}px`;
    },

    dropPlanet() {
        this.canDrop = false;
        
        // Remove spawner status, letting it fall
        const p = this.spawnerPlanet;
        p.isSpawner = false;
        p.vy = 1.0; // slight initial downward kick
        
        // Audio & Tactile Tap
        AudioEngine.playDropSound();
        HapticEngine.triggerDrop();

        this.spawnerPlanet = null;

        // Spawn next planet after dynamic delay
        setTimeout(() => {
            if (this.state === 'playing') {
                this.spawnNextSpawner();
                this.canDrop = true;
            }
        }, this.dropCooldown);
    },

    onMerge(x, y, level) {
        // Add score (preset point scaling)
        const points = PLANET_PRESETS[level].score;
        this.score += points;
        document.getElementById('score-val').textContent = this.score;

        // Save High Score
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            localStorage.setItem('cosmic_high_score', this.bestScore);
            document.getElementById('best-val').textContent = this.bestScore;
        }

        // Time Bonus for Merges (Survival mode extension)
        const timeBonus = level * 1.5;
        this.gameTime = Math.min(this.maxGameTime, this.gameTime + timeBonus);
        
        // Spawn satisfying floating time indicator
        this.floatingTexts.push({
            x: x,
            y: y - 10,
            text: `+${Math.ceil(timeBonus)}s`,
            alpha: 1.0,
            color: PLANET_PRESETS[level].color
        });

        // Trigger Procedural Sound & Mobile Haptic Vibration
        AudioEngine.playMergeSound(level);
        
        if (level >= 8) {
            HapticEngine.triggerSuperMerge();
        } else {
            HapticEngine.triggerMerge(level);
        }

        // Trigger Merge Visual Flash
        this.mergeFlashes.push({
            x: x,
            y: y,
            radius: PLANET_PRESETS[level].radius * 0.4,
            maxRadius: PLANET_PRESETS[level].radius * 2.2,
            alpha: 1.0,
            color: PLANET_PRESETS[level].color
        });

        // Trigger Particles Explosion (satisfying visual pop)
        const particleCount = this.isMobile ? (6 + level) : (14 + level * 2);
        const color = PLANET_PRESETS[level].color;
        
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1.5 + Math.random() * 3.5;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 0.5, // slightly upward drift
                radius: 2 + Math.random() * 4,
                color: color,
                alpha: 1.0,
                decay: 0.015 + Math.random() * 0.02
            });
        }
    },

    checkOverflowCondition(dt) {
        if (this.state !== 'playing') return;

        let hasOverflowingPlanet = false;

        for (let p of this.world.planets) {
            // Ignore spawners, merging nodes, or brand-new popping nodes
            if (p.isSpawner || p.shouldDelete || p.scale < 0.9) continue;

            const topY = p.y - p.radius * p.scale;
            
            // Check if planet is above the overflow deadline
            if (topY < this.deadLineY) {
                hasOverflowingPlanet = true;
                break;
            }
        }

        if (hasOverflowingPlanet) {
            this.isWarningActive = true;
            this.overflowTimer += dt;
            
            // Toggle screen vignette alarm flash active
            const flash = document.getElementById('warning-flash');
            if (flash) flash.classList.add('active');

            // Pulsing haptic indicator warning
            if (Math.floor(this.overflowTimer / 300) % 2 === 0) {
                HapticEngine.vibrate(5);
            }

            if (this.overflowTimer >= this.overflowDuration) {
                this.triggerGameOver('overflow');
            }
        } else {
            this.isWarningActive = false;
            this.overflowTimer = 0;
            
            // Toggle screen vignette alarm flash inactive
            const flash = document.getElementById('warning-flash');
            if (flash) flash.classList.remove('active');
        }
    },

    triggerGameOver(reason = 'overflow') {
        this.state = 'gameOver';
        
        // Haptic rumble & Audio Sad Ending
        HapticEngine.triggerGameOver();
        AudioEngine.playGameOverSound();

        // Deactivate full screen warning alarm vignette
        const flash = document.getElementById('warning-flash');
        if (flash) flash.classList.remove('active');

        // Dynamically adjust subtitle text depending on game over reason
        const subtitle = document.getElementById('game-over-subtitle');
        if (subtitle) {
            if (reason === 'time') {
                subtitle.textContent = "Waktu kelangsungan hidup Anda telah habis!";
            } else {
                subtitle.textContent = "Bola kosmik telah meluap!";
            }
        }

        // Update Overlays HTML values
        document.getElementById('final-score').textContent = this.score;
        document.getElementById('final-best').textContent = this.bestScore;
        
        document.getElementById('game-over-screen').classList.add('active');
    },

    // Main Game Loop
    loop(timestamp) {
        if (!this.loopActive) return; // Clean escape to prevent background processing
        
        const dt = 16.67; // standard tick frame step

        this.update(dt);
        this.render();

        requestAnimationFrame((t) => this.loop(t));
    },

    update(dt) {
        if (this.state === 'playing') {
            this.world.update();
            this.checkOverflowCondition(dt);

            // Tick countdown timer
            this.gameTime -= dt / 1000;
            if (this.gameTime <= 0) {
                this.gameTime = 0;
                this.triggerGameOver('time');
            }

            // Update countdown timer visual progress elements
            const pct = (this.gameTime / this.maxGameTime) * 100;
            const barFill = document.getElementById('timer-bar-fill');
            if (barFill) {
                barFill.style.width = pct + '%';
                if (this.gameTime <= 15) {
                    barFill.classList.add('warning');
                } else {
                    barFill.classList.remove('warning');
                }
            }
            const timerVal = document.getElementById('timer-val');
            if (timerVal) {
                timerVal.textContent = Math.ceil(this.gameTime) + 's';
            }
        }

        // Update Particles (fade and physics drift)
        for (let p of this.particles) {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.05; // tiny gravity pull on spark particles
            p.alpha -= p.decay;
        }
        this.particles = this.particles.filter(p => p.alpha > 0);

        // Update Merge Glowing rings
        for (let f of this.mergeFlashes) {
            f.radius += (f.maxRadius - f.radius) * 0.18;
            f.alpha -= 0.08;
        }
        this.mergeFlashes = this.mergeFlashes.filter(f => f.alpha > 0);

        // Update floating texts
        for (let t of this.floatingTexts) {
            t.y -= 0.6; // slow floating upward drift
            t.alpha -= 0.02; // gradual fade
        }
        this.floatingTexts = this.floatingTexts.filter(t => t.alpha > 0);
    },

    // ==========================================================================
    // Render Functions (HTML5 Canvas Drawing)
    // ==========================================================================
    render() {
        // Clear frame
        this.ctx.clearRect(0, 0, this.logicalWidth, this.logicalHeight);

        // 1. Draw Jar Box bounds
        this.drawJarContainer();

        // 2. Draw Aim Line trajectory
        if (this.state === 'playing' && this.spawnerPlanet && this.canDrop) {
            this.drawAimLine();
        }

        // 3. Draw Planets
        for (let p of this.world.planets) {
            this.drawPlanet(p);
        }

        // 4. Draw Glow Merge Rings & Particle Sparks
        this.drawMergeEffects();

        // 5. Draw Floating Time indicators
        this.drawFloatingTexts();

        // 6. Draw DeadLine Overflow warnings
        this.drawDeadline();
    },

    drawFloatingTexts() {
        this.ctx.save();
        this.ctx.font = '800 13px Outfit, sans-serif';
        this.ctx.textAlign = 'center';
        
        for (let t of this.floatingTexts) {
            this.ctx.fillStyle = t.color;
            this.ctx.globalAlpha = t.alpha;
            // High-contrast background drop shadow
            if (!this.isMobile) {
                this.ctx.shadowColor = 'rgba(0,0,0,0.85)';
                this.ctx.shadowBlur = 3;
            }
            this.ctx.fillText(t.text, t.x, t.y);
        }
        this.ctx.restore();
    },

    drawJarContainer() {
        // Deep glass overlay container border
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(0, 0, this.logicalWidth, this.logicalHeight);
        this.ctx.restore();
    },

    drawAimLine() {
        const p = this.spawnerPlanet;
        
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(236, 72, 153, 0.3)';
        this.ctx.lineWidth = 1.5;
        this.ctx.setLineDash([5, 5]);
        
        this.ctx.beginPath();
        this.ctx.moveTo(p.x, p.y + p.radius);
        this.ctx.lineTo(p.x, this.logicalHeight);
        this.ctx.stroke();
        
        // Small landing glow dot at the base
        this.ctx.fillStyle = 'rgba(236, 72, 153, 0.4)';
        this.ctx.beginPath();
        this.ctx.arc(p.x, this.logicalHeight - 5, 4, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
    },

    drawPlanet(p) {
        this.ctx.save();
        
        const radius = p.radius * p.scale;
        
        // Draw orbital Saturn ring (Level 7)
        if (p.level === 7) {
            this.ctx.save();
            this.ctx.translate(p.x, p.y);
            this.ctx.rotate(-Math.PI / 8);
            
            // Ring shadow
            this.ctx.strokeStyle = 'rgba(15, 10, 30, 0.4)';
            this.ctx.lineWidth = 10 * p.scale;
            this.ctx.scale(2.2, 0.35);
            this.ctx.beginPath();
            this.ctx.arc(0, 5, p.radius, 0, Math.PI * 2);
            this.ctx.stroke();
            
            // Main ring
            this.ctx.strokeStyle = 'rgba(244, 63, 94, 0.75)';
            this.ctx.lineWidth = 8 * p.scale;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
            this.ctx.stroke();
            
            this.ctx.restore();
        }

        // Set Planet Gradient Colors
        const grad = this.ctx.createRadialGradient(
            p.x - radius * 0.3, p.y - radius * 0.3, radius * 0.05,
            p.x, p.y, radius
        );
        grad.addColorStop(0, p.gradient[2]);
        grad.addColorStop(0.3, p.gradient[1]);
        grad.addColorStop(1, p.gradient[0]);

        // Planet shadow/glow effect
        if (!this.isMobile) {
            this.ctx.shadowColor = p.color;
            this.ctx.shadowBlur = p.isSpawner ? 10 : 8 * p.scale;
        }
        
        // Draw Main Planet Sphere
        this.ctx.fillStyle = grad;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        this.ctx.fill();

        // Remove shadow for internal details
        if (!this.isMobile) {
            this.ctx.shadowBlur = 0;
        }

        // Draw atmospheric highlight rim (makes spheres feel premium and glossy)
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.lineWidth = 1.5 * p.scale;
        this.ctx.beginPath();
        // Draws upper-left arc
        this.ctx.arc(p.x, p.y, radius - 1.5, Math.PI * 1.0, Math.PI * 1.6);
        this.ctx.stroke();

        this.ctx.restore();
    },

    drawMergeEffects() {
        this.ctx.save();
        
        // Draw particle explosions
        for (let p of this.particles) {
            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = p.alpha;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // Draw glowing expansion rings
        this.ctx.lineWidth = 3;
        for (let f of this.mergeFlashes) {
            this.ctx.strokeStyle = f.color;
            this.ctx.globalAlpha = f.alpha;
            if (!this.isMobile) {
                this.ctx.shadowColor = f.color;
                this.ctx.shadowBlur = 12;
            }
            this.ctx.beginPath();
            this.ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
            this.ctx.stroke();
        }

        this.ctx.restore();
    },

    drawDeadline() {
        this.ctx.save();
        
        // Draw dotted warning limit line near top
        if (this.isWarningActive) {
            // Glow bright warning red when overflows are pending
            const pulse = 0.4 + Math.sin(Date.now() * 0.01) * 0.3;
            this.ctx.strokeStyle = `rgba(239, 68, 68, ${pulse})`;
            if (!this.isMobile) {
                this.ctx.shadowColor = 'red';
                this.ctx.shadowBlur = 15;
            }
            this.ctx.lineWidth = 2.5;
        } else {
            // Calm cyan guideline
            this.ctx.strokeStyle = 'rgba(6, 182, 212, 0.15)';
            this.ctx.lineWidth = 1;
        }
        
        this.ctx.setLineDash([6, 4]);
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.deadLineY);
        this.ctx.lineTo(this.logicalWidth, this.deadLineY);
        this.ctx.stroke();

        this.ctx.restore();
    }
};

// Explicit global export for Lobby Hub access
window.GameEngine = GameEngine;

// Initialize game on script load
window.addEventListener('DOMContentLoaded', () => {
    GameEngine.init();
});
