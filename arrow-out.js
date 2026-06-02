/* ==========================================================================
   Arrow Out Winding Puzzle - Core Game Engine & Solver
   ========================================================================== */

const ArrowOutEngine = {
    // Canvas & Rendering
    canvas: null,
    ctx: null,
    dpr: 1,
    scaleFactor: 1,
    logicalWidth: 320,
    logicalHeight: 320,

    // Game States
    state: 'splash', // 'splash', 'playing', 'victory', 'gameOver'
    level: 1,
    score: 0,
    bestScore: 0,
    moves: 0,
    loopActive: false,

    // Grid config
    gridSize: 6, // 6x6 grid representing winding tracks
    padding: 12,
    cellSize: 0,

    // Core Game Elements
    arrows: [],      // Array of WindingArrow objects
    particles: [],   // Tap and exit vector spark particles
    lastTime: 0,

    // Detection
    isMobile: false,

    // Level Designs - Handcrafted beautiful winding puzzles matching the image
    levelDesigns: {
        1: [
            // Yellow Arrow: Top-right curves left, then down to bottom-left exit
            {
                id: 'yellow',
                color: '#eab308',
                points: [
                    { x: 4, y: 1 }, { x: 4, y: 2 }, { x: 0, y: 2 }, { x: 0, y: 5 }
                ]
            },
            // Orange/Gold Arrow: Curves around Yellow horizontally, exits left
            {
                id: 'orange',
                color: '#f97316',
                points: [
                    { x: 3, y: 0 }, { x: 3, y: 1 }, { x: 0, y: 1 }, { x: 0, y: 3 }
                ]
            },
            // Green Arrow: Exits right
            {
                id: 'green',
                color: '#10b981',
                points: [
                    { x: 3, y: 3 }, { x: 4, y: 3 }, { x: 4, y: 2 }, { x: 5, y: 2 }
                ]
            },
            // Pink Arrow: Complex curves around bottom-right, exits right
            {
                id: 'pink',
                color: '#ec4899',
                points: [
                    { x: 2, y: 4 }, { x: 2, y: 5 }, { x: 4, y: 5 }, { x: 4, y: 3 }, { x: 5, y: 3 }
                ]
            },
            // Blue Arrow: Winding center, exits left
            {
                id: 'blue',
                color: '#3b82f6',
                points: [
                    { x: 3, y: 5 }, { x: 3, y: 4 }, { x: 1, y: 4 }, { x: 1, y: 3 }, { x: 0, y: 3 }
                ]
            },
            // Black Arrow 1: Corner wrapper top-left
            {
                id: 'black1',
                color: '#475569',
                points: [
                    { x: 1, y: 2 }, { x: 1, y: 0 }, { x: 2, y: 0 }
                ]
            },
            // Black Arrow 2: Center loop top
            {
                id: 'black2',
                color: '#475569',
                points: [
                    { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 2, y: 2 }
                ]
            },
            // Black Arrow 3: Corner wrapper bottom-left
            {
                id: 'black3',
                color: '#475569',
                points: [
                    { x: 0, y: 4 }, { x: 1, y: 4 }, { x: 1, y: 5 }
                ]
            },
            // Black Arrow 4: Bottom wrapper pointing right
            {
                id: 'black4',
                color: '#475569',
                points: [
                    { x: 2, y: 5 }, { x: 5, y: 5 }, { x: 5, y: 4 }
                ]
            }
        ],
        2: [
            // Blue loop center
            {
                id: 'blue',
                color: '#3b82f6',
                points: [
                    { x: 1, y: 1 }, { x: 4, y: 1 }, { x: 4, y: 4 }, { x: 5, y: 4 }
                ]
            },
            // Pink outer curves
            {
                id: 'pink',
                color: '#ec4899',
                points: [
                    { x: 0, y: 5 }, { x: 0, y: 0 }, { x: 5, y: 0 }
                ]
            },
            // Yellow inner curves
            {
                id: 'yellow',
                color: '#eab308',
                points: [
                    { x: 1, y: 5 }, { x: 1, y: 2 }, { x: 3, y: 2 }, { x: 3, y: 5 }
                ]
            },
            // Green short sweep
            {
                id: 'green',
                color: '#10b981',
                points: [
                    { x: 2, y: 3 }, { x: 2, y: 4 }, { x: 0, y: 4 }
                ]
            },
            // Black wrappers
            {
                id: 'black1',
                color: '#475569',
                points: [
                    { x: 5, y: 1 }, { x: 5, y: 3 }, { x: 4, y: 3 }
                ]
            },
            {
                id: 'black2',
                color: '#475569',
                points: [
                    { x: 2, y: 0 }, { x: 2, y: 1 }
                ]
            }
        ],
        3: [
            // Concentric spirals matching retro maze configurations
            {
                id: 'yellow',
                color: '#eab308',
                points: [
                    { x: 0, y: 0 }, { x: 5, y: 0 }, { x: 5, y: 5 }, { x: 0, y: 5 }, { x: 0, y: 1 }
                ]
            },
            {
                id: 'pink',
                color: '#ec4899',
                points: [
                    { x: 1, y: 1 }, { x: 4, y: 1 }, { x: 4, y: 4 }, { x: 1, y: 4 }, { x: 1, y: 2 }
                ]
            },
            {
                id: 'blue',
                color: '#3b82f6',
                points: [
                    { x: 2, y: 2 }, { x: 3, y: 2 }, { x: 3, y: 3 }, { x: 2, y: 3 }
                ]
            }
        ]
    },

    // Initialization
    init() {
        this.canvas = document.getElementById('out-canvas');
        this.ctx = this.canvas.getContext('2d');

        this.isMobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (window.innerWidth <= 768);
        console.log(`[Arrow Out] Low-spec performance mode active: ${this.isMobile}`);

        this.resize();
        window.addEventListener('resize', () => this.resize());

        this.bestScore = parseInt(localStorage.getItem('out_high_score')) || 0;
        this.updateHUD();

        this.setupInput();
    },

    resize() {
        if (!this.canvas) return;
        const wrapper = this.canvas.parentElement;
        if (!wrapper) return;
        const rect = wrapper.getBoundingClientRect();

        if (rect.width < 50 || rect.height < 50) {
            if (this.loopActive) {
                setTimeout(() => this.resize(), 50);
            }
            return;
        }

        this.dpr = window.devicePixelRatio || 1;
        this.canvas.width = rect.width * this.dpr;
        this.canvas.height = rect.height * this.dpr;

        // Reset transformation matrix before calculating new scaling to prevent accumulation
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);

        const size = Math.min(rect.width, rect.height);
        this.scaleFactor = size / this.logicalWidth;

        // Calculate offsets to center the board inside the canvas
        const offsetX = (rect.width - size) / 2;
        const offsetY = (rect.height - size) / 2;

        // Apply scale & translation
        this.ctx.scale(this.dpr, this.dpr);
        this.ctx.translate(offsetX, offsetY);
        this.ctx.scale(this.scaleFactor, this.scaleFactor);
    },

    setupInput() {
        const triggerTap = (clientX, clientY) => {
            if (this.state !== 'playing' || !this.loopActive) return;

            const rect = this.canvas.getBoundingClientRect();
            const size = Math.min(rect.width, rect.height);
            const scale = size / this.logicalWidth;

            // Offsets that were used to center the board
            const offsetX = (rect.width - size) / 2;
            const offsetY = (rect.height - size) / 2;

            // Translate client coordinates relative to the canvas and subtract offsets
            const logicalX = (clientX - rect.left - offsetX) / scale;
            const logicalY = (clientY - rect.top - offsetY) / scale;

            const innerSize = this.logicalWidth - this.padding * 2;
            this.cellSize = innerSize / this.gridSize;

            const gridX = Math.floor((logicalX - this.padding) / this.cellSize);
            const gridY = Math.floor((logicalY - this.padding) / this.cellSize);

            if (gridX >= 0 && gridX < this.gridSize && gridY >= 0 && gridY < this.gridSize) {
                this.handleTap(gridX, gridY);
            }
        };

        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (e.touches.length > 0) {
                triggerTap(e.touches[0].clientX, e.touches[0].clientY);
            }
        }, { passive: false });

        this.canvas.addEventListener('mousedown', (e) => {
            triggerTap(e.clientX, e.clientY);
        });

        // Overlay buttons
        const startBtn = document.getElementById('out-start-btn');
        const restartBtn = document.getElementById('out-restart-btn');
        const splash = document.getElementById('out-splash-screen');
        const gameOver = document.getElementById('out-game-over-screen');

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

        const splash = document.getElementById('out-splash-screen');
        const gameOver = document.getElementById('out-game-over-screen');
        if (splash) splash.classList.add('active');
        if (gameOver) gameOver.classList.remove('active');

        this.bestScore = parseInt(localStorage.getItem('out_high_score')) || 0;
        this.updateHUD();

        this.arrows = [];
        this.particles = [];
        this.lastTime = 0;

        this.resize();
        requestAnimationFrame((t) => this.loop(t));
    },

    halt() {
        this.loopActive = false;
        this.state = 'splash';
        this.arrows = [];
        this.particles = [];

        const splash = document.getElementById('out-splash-screen');
        const gameOver = document.getElementById('out-game-over-screen');
        if (splash) splash.classList.remove('active');
        if (gameOver) gameOver.classList.remove('active');

        if (this.ctx) {
            this.ctx.save();
            this.ctx.setTransform(1, 0, 0, 1, 0, 0);
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.restore();
        }
    },

    startGame() {
        this.resize();

        this.level = 1;
        this.score = 0;
        this.moves = 0;
        this.arrows = [];
        this.particles = [];
        this.lastTime = 0;

        this.loadLevel(this.level);
        this.updateHUD();

        this.state = 'playing';
    },

    loadLevel(lvl) {
        this.arrows = [];
        this.particles = [];

        // Loop handcrafted level designs or generate variations
        const designKey = ((lvl - 1) % Object.keys(this.levelDesigns).length) + 1;
        const design = this.levelDesigns[designKey];

        for (let entry of design) {
            // Reconstruct points lists
            const pts = JSON.parse(JSON.stringify(entry.points));
            
            // Calculate escapeDirection based on vector of last segment
            const n = pts.length;
            const pLast = pts[n - 1];
            const pPrev = pts[n - 2] || pLast;
            
            let escapeDir = 'R';
            if (pLast.x > pPrev.x) escapeDir = 'R';
            else if (pLast.x < pPrev.x) escapeDir = 'L';
            else if (pLast.y > pPrev.y) escapeDir = 'D';
            else if (pLast.y < pPrev.y) escapeDir = 'U';

            this.arrows.push({
                id: entry.id,
                color: entry.color,
                points: pts,
                escapeDir: escapeDir,
                state: 'grid', // 'grid', 'escaping', 'done'
                escapeProgress: 0,
                wiggleTimer: 0,
                wiggleDuration: 220 // ms
            });
        }
    },

    updateHUD() {
        document.getElementById('out-level-val').textContent = this.level;
        document.getElementById('out-moves-val').textContent = this.moves;
        document.getElementById('out-score-val').textContent = `SCORE: ${this.score}`;
        document.getElementById('lobby-best-out').textContent = this.bestScore;
    },

    handleTap(gridX, gridY) {
        // Find which arrow body covers the clicked grid coordinate
        let tappedArrow = null;
        for (let arr of this.arrows) {
            if (arr.state !== 'grid') continue;
            for (let pt of arr.points) {
                if (pt.x === gridX && pt.y === gridY) {
                    tappedArrow = arr;
                    break;
                }
            }
            if (tappedArrow) break;
        }

        if (!tappedArrow) return;

        this.moves++;
        this.updateHUD();

        // Check if blocked by any other arrows in front of its head to the edge of the board
        if (this.isBlocked(tappedArrow)) {
            // Blocked: wiggle block and play deep warning beep
            AudioEngine.playBlockedBeep();
            HapticEngine.vibrate(20);
            tappedArrow.wiggleTimer = tappedArrow.wiggleDuration;
        } else {
            // Clear to escape! Slide offscreen
            tappedArrow.state = 'escaping';
            AudioEngine.playEscapeSweep();
            HapticEngine.triggerMerge(2);

            // Add scores
            this.score += 100 * this.level;
            this.updateHUD();
        }
    },

    isBlocked(arrow) {
        const head = arrow.points[arrow.points.length - 1];
        const vec = this.getDirVector(arrow.escapeDir);

        let cx = head.x + vec.dx;
        let cy = head.y + vec.dy;

        // Trace path to edge of board
        while (cx >= 0 && cx < this.gridSize && cy >= 0 && cy < this.gridSize) {
            // Check if another arrow covers (cx, cy)
            for (let other of this.arrows) {
                if (other.id === arrow.id || other.state !== 'grid') continue;
                for (let pt of other.points) {
                    if (pt.x === cx && pt.y === cy) {
                        return true; // Blocked!
                    }
                }
            }
            cx += vec.dx;
            cy += vec.dy;
        }
        return false; // Path clear!
    },

    getDirVector(dir) {
        if (dir === 'L') return { dx: -1, dy: 0 };
        if (dir === 'R') return { dx: 1, dy: 0 };
        if (dir === 'U') return { dx: 0, dy: -1 };
        return { dx: 0, dy: 1 }; // D
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
        // 1. Update Wiggling animations
        for (let arr of this.arrows) {
            if (arr.wiggleTimer > 0) {
                arr.wiggleTimer -= dt;
                if (arr.wiggleTimer < 0) arr.wiggleTimer = 0;
            }
        }

        // 2. Update Escaping slide progress
        for (let arr of this.arrows) {
            if (arr.state === 'escaping') {
                const escapeSpeed = 0.0075; // segments per ms
                arr.escapeProgress += escapeSpeed * dt;

                // Spawn neon trails behind the escaping arrowhead
                if (Math.random() < 0.35 && arr.escapeProgress < arr.points.length) {
                    const headIdx = Math.min(arr.points.length - 1, Math.floor(arr.escapeProgress));
                    const headPt = arr.points[headIdx];
                    const coords = this.getGridCoords(headPt.x, headPt.y);
                    
                    this.particles.push({
                        x: coords.cx + (Math.random() - 0.5) * 8,
                        y: coords.cy + (Math.random() - 0.5) * 8,
                        vx: (Math.random() - 0.5) * 0.4,
                        vy: (Math.random() - 0.5) * 0.4,
                        radius: 1.5 + Math.random() * 2.5,
                        color: arr.color,
                        alpha: 0.8,
                        decay: 0.02 + Math.random() * 0.02
                    });
                }

                // If fully escaped offscreen, mark as done
                if (arr.escapeProgress >= arr.points.length + 1) {
                    arr.state = 'done';
                    this.spawnTapSparks(
                        this.getGridCoords(arr.points[arr.points.length - 1].x, arr.points[arr.points.length - 1].y).cx,
                        this.getGridCoords(arr.points[arr.points.length - 1].x, arr.points[arr.points.length - 1].y).cy,
                        arr.color,
                        this.isMobile ? 8 : 16
                    );
                    this.checkLevelVictoryCondition();
                }
            }
        }

        // 3. Update Spark particles fade decay
        for (let p of this.particles) {
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= p.decay;
        }
        this.particles = this.particles.filter(p => p.alpha > 0);
    },

    spawnTapSparks(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.8 + Math.random() * 2.5;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: 1 + Math.random() * 3,
                color: color,
                alpha: 1.0,
                decay: 0.025 + Math.random() * 0.02
            });
        }
    },

    checkLevelVictoryCondition() {
        // Level cleared if all arrows are marked 'done'
        const allCleared = this.arrows.every(arr => arr.state === 'done');
        if (allCleared) {
            setTimeout(() => {
                this.triggerLevelVictory();
            }, 300);
        }
    },

    triggerLevelVictory() {
        AudioEngine.playVictoryFanfare();
        HapticEngine.triggerSuperMerge();

        // Victory bursts
        for (let i = 0; i < 4; i++) {
            const px = this.logicalWidth / 2 + (Math.random() - 0.5) * 60;
            const py = this.logicalHeight / 2 + (Math.random() - 0.5) * 60;
            const colors = ['#06b6d4', '#10b981', '#ec4899', '#eab308'];
            this.spawnTapSparks(px, py, colors[i], this.isMobile ? 12 : 24);
        }

        // Advance level
        this.score += 1000 * this.level;
        this.level++;

        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            localStorage.setItem('out_high_score', this.bestScore);
        }
        this.updateHUD();

        // Load next level puzzle
        this.loadLevel(this.level);
    },

    getGridCoords(gridX, gridY) {
        const innerSize = this.logicalWidth - this.padding * 2;
        this.cellSize = innerSize / this.gridSize;
        const cx = this.padding + gridX * this.cellSize + this.cellSize / 2;
        const cy = this.padding + gridY * this.cellSize + this.cellSize / 2;
        return { cx, cy };
    },

    // Rendering Loops
    render() {
        if (!this.ctx) return;

        // Save context, reset transform matrix to clear the entire canvas including centering margins
        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.restore();

        // 1. Draw Grid separator guidelines
        this.drawBackgroundGrid();

        // 2. Draw active Winding Arrows on board
        this.drawArrows();

        // 3. Draw trails particles
        this.drawParticles();
    },

    drawBackgroundGrid() {
        this.ctx.save();
        
        // Outlined container border
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        this.ctx.lineWidth = 2.5;
        this.ctx.strokeRect(0, 0, this.logicalWidth, this.logicalHeight);

        // Grid separator dots
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        const innerSize = this.logicalWidth - this.padding * 2;
        this.cellSize = innerSize / this.gridSize;

        for (let r = 1; r < this.gridSize; r++) {
            for (let c = 1; c < this.gridSize; c++) {
                const px = this.padding + c * this.cellSize;
                const py = this.padding + r * this.cellSize;
                this.ctx.beginPath();
                this.ctx.arc(px, py, 1.2, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
        this.ctx.restore();
    },

    drawArrows() {
        const innerSize = this.logicalWidth - this.padding * 2;
        this.cellSize = innerSize / this.gridSize;
        const thickness = this.cellSize * 0.38; // Thick rounded tubes

        for (let arr of this.arrows) {
            if (arr.state === 'done') continue;

            this.ctx.save();

            // Construct drawing points list representing the arrow body
            let drawPts = [];
            const pts = arr.points;

            // Simple Wiggle offset logic for blocked moves
            let wx = 0;
            let wy = 0;
            if (arr.wiggleTimer > 0) {
                const phase = arr.wiggleTimer * 0.04;
                const magnitude = 3.5;
                const vec = this.getDirVector(arr.escapeDir);
                wx = vec.dx * Math.sin(phase) * magnitude;
                wy = vec.dy * Math.sin(phase) * magnitude;
            }

            if (arr.state === 'grid') {
                // Not escaping: simply use static points shifted by wiggle
                for (let pt of pts) {
                    const coords = this.getGridCoords(pt.x, pt.y);
                    drawPts.push({ x: coords.cx + wx, y: coords.cy + wy });
                }
            } 
            else if (arr.state === 'escaping') {
                // Escaping: slide path forward by shifting segments smoothly
                const t = arr.escapeProgress;
                const startIdx = Math.floor(t);
                const frac = t - startIdx;

                // Build interpolated escaping coordinate array
                let tempPts = [];
                for (let i = 0; i < pts.length; i++) {
                    const targetIdx = i + t;
                    const baseIdx = Math.floor(targetIdx);
                    const remFrac = targetIdx - baseIdx;

                    if (baseIdx < pts.length) {
                        const p1 = pts[baseIdx];
                        const p2 = (baseIdx + 1 < pts.length) ? pts[baseIdx + 1] : this.getProjectedExitPoint(pts[pts.length - 1], arr.escapeDir, baseIdx + 1 - (pts.length - 1));
                        
                        const c1 = this.getGridCoords(p1.x, p1.y);
                        const c2 = this.getGridCoords(p2.x, p2.y);
                        
                        tempPts.push({
                            x: c1.cx + (c2.cx - c1.cx) * remFrac,
                            y: c1.cy + (c2.cy - c1.cy) * remFrac
                        });
                    } else {
                        // Beyond head coordinate: project outwards offscreen
                        const stepsOut = baseIdx - (pts.length - 1);
                        const p1 = this.getProjectedExitPoint(pts[pts.length - 1], arr.escapeDir, stepsOut);
                        const p2 = this.getProjectedExitPoint(pts[pts.length - 1], arr.escapeDir, stepsOut + 1);
                        
                        const c1 = this.getGridCoords(p1.x, p1.y);
                        const c2 = this.getGridCoords(p2.x, p2.y);

                        tempPts.push({
                            x: c1.cx + (c2.cx - c1.cx) * remFrac,
                            y: c1.cy + (c2.cy - c1.cy) * remFrac
                        });
                    }
                }

                // Slice path to shrink tail
                drawPts = tempPts.slice(startIdx);
            }

            if (drawPts.length < 2) {
                this.ctx.restore();
                continue; // too small or exited
            }

            // A. Draw Glow Shadows on Desktop
            if (!this.isMobile) {
                this.ctx.save();
                this.ctx.strokeStyle = arr.color;
                this.ctx.lineWidth = thickness + 4;
                this.ctx.lineCap = 'round';
                this.ctx.lineJoin = 'round';
                this.ctx.shadowColor = arr.color;
                this.ctx.shadowBlur = arr.wiggleTimer > 0 ? 15 : 6;
                this.ctx.beginPath();
                this.ctx.moveTo(drawPts[0].x, drawPts[0].y);
                for (let i = 1; i < drawPts.length; i++) {
                    this.ctx.lineTo(drawPts[i].x, drawPts[i].y);
                }
                this.ctx.stroke();
                this.ctx.restore();
            }

            // B. Draw Main rounded arrow line tube
            this.ctx.save();
            this.ctx.strokeStyle = arr.color;
            this.ctx.lineWidth = thickness;
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
            this.ctx.beginPath();
            this.ctx.moveTo(drawPts[0].x, drawPts[0].y);
            for (let i = 1; i < drawPts.length; i++) {
                this.ctx.lineTo(drawPts[i].x, drawPts[i].y);
            }
            this.ctx.stroke();

            // C. Draw premium internal gloss highlight line (makes tubes look glossy & 3D)
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
            this.ctx.lineWidth = thickness * 0.25;
            this.ctx.beginPath();
            this.ctx.moveTo(drawPts[0].x, drawPts[0].y);
            for (let i = 1; i < drawPts.length; i++) {
                this.ctx.lineTo(drawPts[i].x, drawPts[i].y);
            }
            this.ctx.stroke();
            this.ctx.restore();

            // D. Draw Arrowhead at the escaping head end coordinate
            const headCoord = drawPts[drawPts.length - 1];
            const prevCoord = drawPts[drawPts.length - 2] || headCoord;
            
            // Calculate accurate rotation angle of arrowhead based on last segment vector
            const angle = Math.atan2(headCoord.y - prevCoord.y, headCoord.x - prevCoord.x);

            this.ctx.save();
            this.ctx.translate(headCoord.x, headCoord.y);
            this.ctx.rotate(angle);
            this.ctx.fillStyle = '#ffffff';

            if (!this.isMobile) {
                this.ctx.shadowColor = arr.color;
                this.ctx.shadowBlur = 8;
            }

            // Elegant arrowhead shape
            const headSize = thickness * 0.72;
            this.ctx.beginPath();
            this.ctx.moveTo(headSize * 0.5, 0);
            this.ctx.lineTo(-headSize * 0.8, -headSize * 0.65);
            this.ctx.lineTo(-headSize * 0.4, 0);
            this.ctx.lineTo(-headSize * 0.8, headSize * 0.65);
            this.ctx.closePath();
            this.ctx.fill();

            this.ctx.restore();

            this.ctx.restore();
        }
    },

    getProjectedExitPoint(headPt, escapeDir, steps) {
        const vec = this.getDirVector(escapeDir);
        return {
            x: headPt.x + vec.dx * steps,
            y: headPt.y + vec.dy * steps
        };
    },

    drawParticles() {
        this.ctx.save();
        for (let p of this.particles) {
            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = p.alpha;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.restore();
    }
};

window.ArrowOutEngine = ArrowOutEngine;

window.addEventListener('DOMContentLoaded', () => {
    ArrowOutEngine.init();
});
