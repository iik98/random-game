/* ==========================================================================
   Neon Brick Cascade - Game Engine & Physics Solver
   ========================================================================== */

const NeonCascadeEngine = {
    // Canvas & Render Context
    canvas: null,
    ctx: null,
    dpr: 1,
    scaleFactor: 1,
    logicalWidth: 300,  // Grid is 10 cols, each cell is 30px
    logicalHeight: 480, // Grid is 16 rows, each cell is 30px
    cols: 10,
    rows: 16,
    cellSize: 30,

    // Loop Control
    loopActive: false,
    state: 'splash', // 'splash', 'playing', 'gameOver'
    score: 0,
    bestScore: 0,
    linesCleared: 0,
    level: 1,

    // Core Game Grid: 16x10 matrix storing block details
    grid: [],

    // Active block state
    currentPiece: null,
    nextPieceMatrix: null,
    nextPieceColor: '',
    nextPieceName: '',

    // Timing & Intervals
    dropCounter: 0,
    dropInterval: 1000, // starting tick (1 second)
    lastTime: 0,

    // Particle Sparks & Visual Laser clear rings
    particles: [],
    clearingLines: [], // list of rows doing clear laser animation

    // DAS repeat intervals & keyboard controller
    keys: {},
    dasTimer: 0,
    dasDelay: 200,   // ms before repeat
    dasInterval: 45, // ms repeat rate

    // Cascade flags
    isCascading: false,
    cascadeChain: 0,

    // Presets for Tetrominoes (Classical shapes + Neon glows)
    presets: {
        'I': {
            matrix: [
                [0,0,0,0],
                [1,1,1,1],
                [0,0,0,0],
                [0,0,0,0]
            ],
            color: '#06b6d4', // Cyan
            gradient: ['#0891b2', '#06b6d4', '#67e8f9']
        },
        'O': {
            matrix: [
                [1,1],
                [1,1]
            ],
            color: '#eab308', // Gold
            gradient: ['#ca8a04', '#eab308', '#fef08a']
        },
        'T': {
            matrix: [
                [0,1,0],
                [1,1,1],
                [0,0,0]
            ],
            color: '#a855f7', // Purple
            gradient: ['#9333ea', '#a855f7', '#d8b4fe']
        },
        'S': {
            matrix: [
                [0,1,1],
                [1,1,0],
                [0,0,0]
            ],
            color: '#10b981', // Emerald Green
            gradient: ['#059669', '#10b981', '#6ee7b7']
        },
        'Z': {
            matrix: [
                [1,1,0],
                [0,1,1],
                [0,0,0]
            ],
            color: '#ef4444', // Red
            gradient: ['#dc2626', '#ef4444', '#fca5a5']
        },
        'J': {
            matrix: [
                [1,0,0],
                [1,1,1],
                [0,0,0]
            ],
            color: '#3b82f6', // Indigo Blue
            gradient: ['#2563eb', '#3b82f6', '#93c5fd']
        },
        'L': {
            matrix: [
                [0,0,1],
                [1,1,1],
                [0,0,0]
            ],
            color: '#f97316', // Orange
            gradient: ['#ea580c', '#f97316', '#fdba74']
        }
    },

    // Initialization
    init() {
        this.canvas = document.getElementById('cascade-canvas');
        this.ctx = this.canvas.getContext('2d');

        // Detect mobile or low-end device to automatically activate high-performance low-spec mode
        this.isMobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (window.innerWidth <= 768);
        console.log(`[Neon Cascade] Low-spec performance mode active: ${this.isMobile}`);

        // Initialize grid matrix early to prevent drawGridBlocks crashes before game starts
        this.grid = Array(this.rows).fill(null).map(() => Array(this.cols).fill(null));

        // Handle Responsive scaling
        this.resize();
        window.addEventListener('resize', () => this.resize());

        // Load High score
        this.bestScore = parseInt(localStorage.getItem('cascade_high_score')) || 0;
        document.getElementById('cascade-best-val').textContent = this.bestScore;

        // Bind Controls
        this.setupInput();
    },

    resize() {
        if (!this.canvas) return;
        const wrapper = this.canvas.parentElement;
        if (!wrapper) return;
        const rect = wrapper.getBoundingClientRect();
        
        // If container has 0 or extremely small size, it is hidden or transition layout hasn't settled yet
        if (rect.width < 50 || rect.height < 50) {
            if (this.loopActive) {
                // Retry in 50ms once browser layout settled
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
        // PC Keyboard Controls
        window.addEventListener('keydown', (e) => {
            if (this.state !== 'playing' || !this.loopActive) return;
            
            if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) {
                e.preventDefault();
            }

            if (!this.keys[e.key]) {
                this.keys[e.key] = true;
                this.handleKeyPress(e.key);
            }
        });

        window.addEventListener('keyup', (e) => {
            if (this.state !== 'playing' || !this.loopActive) return;
            this.keys[e.key] = false;
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                this.dasTimer = 0;
            }
        });

        // Mobile Button bindings using refined start/stop touch actions
        const bindButton = (id, action, isShift = false) => {
            const btn = document.getElementById(id);
            if (!btn) return;
            
            let touchTimer = null;
            let touchInterval = null;

            const startAction = (e) => {
                if (e) e.preventDefault();
                if (this.state !== 'playing' || this.isCascading) return;
                
                HapticEngine.triggerTap();
                action();
                
                if (isShift) {
                    if (touchTimer) clearTimeout(touchTimer);
                    if (touchInterval) clearInterval(touchInterval);
                    
                    touchTimer = setTimeout(() => {
                        touchInterval = setInterval(() => {
                            if (this.state === 'playing' && !this.isCascading) {
                                action();
                            } else {
                                stopAction();
                            }
                        }, 45);
                    }, 200);
                }
            };

            const stopAction = (e) => {
                if (e) e.preventDefault();
                if (touchTimer) clearTimeout(touchTimer);
                if (touchInterval) clearInterval(touchInterval);
                touchTimer = null;
                touchInterval = null;
            };

            btn.addEventListener('touchstart', startAction, { passive: false });
            btn.addEventListener('touchend', stopAction, { passive: false });
            btn.addEventListener('touchcancel', stopAction, { passive: false });

            // Mouse fallback
            btn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                startAction();
            });
            window.addEventListener('mouseup', () => {
                stopAction();
            });
        };

        bindButton('ctrl-left', () => this.movePiece(-1), true);
        bindButton('ctrl-right', () => this.movePiece(1), true);
        bindButton('ctrl-rotate', () => this.rotatePiece());
        bindButton('ctrl-drop', () => this.hardDropPiece());

        // Splash screens & HUD triggers
        const startBtn = document.getElementById('cascade-start-btn');
        const restartBtn = document.getElementById('cascade-restart-btn');
        const splash = document.getElementById('cascade-splash-screen');
        const gameOver = document.getElementById('cascade-game-over-screen');

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

    handleKeyPress(key) {
        if (this.state !== 'playing' || !this.currentPiece || this.isCascading) return;
        
        if (key === 'ArrowLeft') {
            this.movePiece(-1);
        } else if (key === 'ArrowRight') {
            this.movePiece(1);
        } else if (key === 'ArrowUp') {
            this.rotatePiece();
        } else if (key === 'ArrowDown') {
            this.dropPiece();
        } else if (key === ' ') {
            this.hardDropPiece();
        }
    },

    launch() {
        this.loopActive = true;
        this.state = 'splash';

        // Reveal Splash Screen
        const splash = document.getElementById('cascade-splash-screen');
        const gameOver = document.getElementById('cascade-game-over-screen');
        if (splash) splash.classList.add('active');
        if (gameOver) gameOver.classList.remove('active');

        // Reload High Scores
        this.bestScore = parseInt(localStorage.getItem('cascade_high_score')) || 0;
        document.getElementById('cascade-best-val').textContent = this.bestScore;

        // Reset variables
        this.lastTime = 0;
        this.dropCounter = 0;
        this.isCascading = false;
        this.cascadeChain = 0;
        this.keys = {};
        
        // Recalculate responsive dimensions now that container is visible!
        this.resize();

        requestAnimationFrame((t) => this.loop(t));
    },

    halt() {
        this.loopActive = false;
        this.state = 'splash';
        this.isCascading = false;
        this.cascadeChain = 0;
        this.keys = {};
        this.grid = Array(this.rows).fill(null).map(() => Array(this.cols).fill(null));
        this.particles = [];
        this.clearingLines = [];
        this.currentPiece = null;

        // Hide Overlays
        const splash = document.getElementById('cascade-splash-screen');
        const gameOver = document.getElementById('cascade-game-over-screen');
        if (splash) splash.classList.remove('active');
        if (gameOver) gameOver.classList.remove('active');

        // Clear canvas
        if (this.ctx) {
            this.ctx.clearRect(0, 0, this.logicalWidth, this.logicalHeight);
        }

        // Clear next preview canvas
        const nextCanvas = document.getElementById('cascade-preview-canvas');
        if (nextCanvas) {
            const nextCtx = nextCanvas.getContext('2d');
            if (nextCtx) {
                nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
            }
        }
    },

    startGame() {
        // Recalculate dimensions once layout settles after transitions
        this.resize();

        // Reset Grid
        this.grid = Array(this.rows).fill(null).map(() => Array(this.cols).fill(null));
        this.particles = [];
        this.clearingLines = [];
        
        this.score = 0;
        this.linesCleared = 0;
        this.level = 1;
        this.dropInterval = 1000;
        this.isCascading = false;
        this.cascadeChain = 0;
        this.keys = {};

        document.getElementById('cascade-score-val').textContent = 0;
        document.getElementById('cascade-lines-val').textContent = 0;
        document.getElementById('cascade-level-val').textContent = 1;

        this.state = 'playing';

        // Spawn first pieces
        this.nextPieceMatrix = this.generatePieceMatrix();
        this.spawnNextPiece();
    },

    generatePieceMatrix() {
        const keys = Object.keys(this.presets);
        const randKey = keys[Math.floor(Math.random() * keys.length)];
        this.nextPieceName = randKey;
        this.nextPieceColor = this.presets[randKey].color;
        return this.presets[randKey].matrix;
    },

    generatePiece() {
        let matrix = this.nextPieceMatrix;
        let color = this.nextPieceColor;
        let name = this.nextPieceName;

        if (!matrix) {
            const keys = Object.keys(this.presets);
            const randKey = keys[Math.floor(Math.random() * keys.length)];
            matrix = this.presets[randKey].matrix;
            color = this.presets[randKey].color;
            name = randKey;
        }

        const finalName = name || 'I';
        const preset = this.presets[finalName] || this.presets['I'];
        const finalMatrix = matrix || preset.matrix;
        const finalColor = color || preset.color;

        const width = finalMatrix[0] ? finalMatrix[0].length : 4;
        const x = Math.floor((this.cols - width) / 2);
        
        return {
            x: x,
            y: finalName === 'I' ? -1 : 0, 
            matrix: finalMatrix,
            color: finalColor,
            name: finalName,
            gradient: preset.gradient || ['#ffffff', '#ffffff', '#ffffff']
        };
    },

    movePiece(dir) {
        if (this.isCascading) return;
        this.currentPiece.x += dir;
        AudioEngine.playShiftSound();
        
        if (this.checkCollision()) {
            this.currentPiece.x -= dir; // Revert
        }
    },

    rotatePiece() {
        if (this.isCascading) return;
        const p = this.currentPiece;
        const origMatrix = p.matrix;
        
        const size = p.matrix.length;
        const newMatrix = Array(size).fill(null).map(() => Array(size).fill(0));
        
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                newMatrix[x][size - 1 - y] = p.matrix[y][x];
            }
        }
        
        p.matrix = newMatrix;
        AudioEngine.playRotateSound();

        const origX = p.x;
        let kickOffset = 0;
        
        while (this.checkCollision() && kickOffset < size) {
            kickOffset++;
            p.x = origX + (kickOffset % 2 === 0 ? -Math.floor(kickOffset / 2) : Math.floor(kickOffset / 2));
        }

        if (this.checkCollision()) {
            p.matrix = origMatrix;
            p.x = origX;
        }
    },

    dropPiece() {
        if (this.isCascading) return false;
        this.currentPiece.y++;
        if (this.checkCollision()) {
            this.currentPiece.y--;
            this.lockPiece();
            return false;
        }
        this.dropCounter = 0; 
        return true;
    },

    hardDropPiece() {
        if (this.state !== 'playing' || this.isCascading) return;
        let dropCount = 0;
        while (!this.checkCollision()) {
            this.currentPiece.y++;
            dropCount++;
        }
        this.currentPiece.y--;
        HapticEngine.triggerDrop();
        
        AudioEngine.playHardDropSound();
        
        this.lockPiece();
    },

    checkCollision() {
        const p = this.currentPiece;
        const mat = p.matrix;
        
        for (let y = 0; y < mat.length; y++) {
            for (let x = 0; x < mat[y].length; x++) {
                if (mat[y][x]) {
                    const gridX = p.x + x;
                    const gridY = p.y + y;
                    
                    if (gridX < 0 || gridX >= this.cols || gridY >= this.rows) {
                        return true;
                    }
                    
                    if (gridY >= 0 && this.grid[gridY][gridX] !== null) {
                        return true;
                    }
                }
            }
        }
        return false;
    },

    lockPiece() {
        const p = this.currentPiece;
        const mat = p.matrix;
        
        for (let y = 0; y < mat.length; y++) {
            for (let x = 0; x < mat[y].length; x++) {
                if (mat[y][x]) {
                    const gridX = p.x + x;
                    const gridY = p.y + y;
                    
                    if (gridY >= 0) {
                        this.grid[gridY][gridX] = {
                            color: p.color,
                            gradient: p.gradient,
                            visualY: gridY,
                            targetY: gridY,
                            vy: 0
                        };
                    } else {
                        this.triggerGameOver();
                        return;
                    }
                }
            }
        }

        this.checkClearsAndCascade();
    },

    checkClearsAndCascade() {
        if (!this.isCascading) {
            this.cascadeChain = 0;
        }

        const linesToClear = [];
        for (let y = 0; y < this.rows; y++) {
            let rowFilled = true;
            for (let x = 0; x < this.cols; x++) {
                if (this.grid[y][x] === null) {
                    rowFilled = false;
                    break;
                }
            }
            if (rowFilled) linesToClear.push(y);
        }

        if (linesToClear.length === 0) {
            if (this.isCascading) {
                this.isCascading = false;
            }
            this.spawnNextPiece();
            return;
        }

        this.isCascading = true;
        this.cascadeChain++;

        this.triggerLineClearEffects(linesToClear);

        for (let rowY of linesToClear) {
            for (let x = 0; x < this.cols; x++) {
                this.grid[rowY][x] = null;
            }
        }

        this.addClearScore(linesToClear.length, this.cascadeChain);

        setTimeout(() => {
            if (this.state !== 'playing' || !this.loopActive) return;

            let blocksMoved = true;
            while (blocksMoved) {
                blocksMoved = false;
                for (let y = this.rows - 2; y >= 0; y--) {
                    for (let x = 0; x < this.cols; x++) {
                        if (this.grid[y][x] !== null && this.grid[y + 1][x] === null) {
                            let targetY = y;
                            while (targetY + 1 < this.rows && this.grid[targetY + 1][x] === null) {
                                targetY++;
                            }
                            
                            let cell = this.grid[y][x];
                            cell.targetY = targetY;
                            cell.vy = 0; 
                            
                            this.grid[targetY][x] = cell;
                            this.grid[y][x] = null;
                            blocksMoved = true;
                        }
                    }
                }
            }

            this.waitForCascadeToSettle();
        }, 220); 
    },

    waitForCascadeToSettle() {
        const checkSettle = () => {
            if (this.state !== 'playing' || !this.loopActive) return;

            let allSettled = true;
            for (let y = 0; y < this.rows; y++) {
                for (let x = 0; x < this.cols; x++) {
                    const cell = this.grid[y][x];
                    if (cell && cell.visualY < cell.targetY) {
                        allSettled = false;
                        break;
                    }
                }
                if (!allSettled) break;
            }

            if (allSettled) {
                this.checkClearsAndCascade();
            } else {
                setTimeout(checkSettle, 30);
            }
        };

        setTimeout(checkSettle, 50);
    },

    triggerLineClearEffects(rowsList) {
        HapticEngine.triggerMerge(rowsList.length * 2);
        AudioEngine.playClearSound(rowsList.length);

        for (let rowY of rowsList) {
            this.clearingLines.push({
                y: rowY * this.cellSize + this.cellSize / 2,
                width: 0,
                alpha: 1.0
            });

            for (let x = 0; x < this.cols; x++) {
                const block = this.grid[rowY][x];
                if (!block) continue;
                
                const px = x * this.cellSize + this.cellSize / 2;
                const py = rowY * this.cellSize + this.cellSize / 2;
                
                const sparksPerBlock = this.isMobile ? 3 : 8;
                for (let i = 0; i < sparksPerBlock; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = 1.0 + Math.random() * 3.0;
                    this.particles.push({
                        x: px,
                        y: py,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed - 0.4,
                        radius: 2 + Math.random() * 3,
                        color: block.color,
                        alpha: 1.0,
                        decay: 0.02 + Math.random() * 0.02
                    });
                }
            }
        }
    },

    addClearScore(linesCount, combo) {
        const baseScores = { 1: 100, 2: 300, 3: 600, 4: 1200 };
        const scoreGain = (baseScores[linesCount] || 100) * combo;
        this.score += scoreGain;
        this.linesCleared += linesCount;

        const newLevel = Math.floor(this.linesCleared / 10) + 1;
        if (newLevel > this.level) {
            this.level = newLevel;
            this.dropInterval = Math.max(80, 1000 - (this.level - 1) * 120);
            AudioEngine.playLevelUpSound();
        }

        document.getElementById('cascade-score-val').textContent = this.score;
        document.getElementById('cascade-lines-val').textContent = this.linesCleared;
        document.getElementById('cascade-level-val').textContent = this.level;

        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            localStorage.setItem('cascade_high_score', this.bestScore);
            document.getElementById('cascade-best-val').textContent = this.bestScore;
        }
    },

    spawnNextPiece() {
        this.currentPiece = this.generatePiece();
        this.nextPieceMatrix = this.generatePieceMatrix();
        this.updatePreviewUI();
        
        if (this.checkCollision()) {
            this.triggerGameOver();
        }
    },

    updatePreviewUI() {
        this.drawNextPiecePreview();
    },

    drawNextPiecePreview() {
        const canvas = document.getElementById('cascade-preview-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const matrix = this.nextPieceMatrix;
        const color = this.nextPieceColor;
        
        if (!matrix) return;

        let minX = 4, maxX = 0, minY = 4, maxY = 0;
        let empty = true;
        for (let r = 0; r < matrix.length; r++) {
            for (let c = 0; c < matrix[r].length; c++) {
                if (matrix[r][c]) {
                    empty = false;
                    if (c < minX) minX = c;
                    if (c > maxX) maxX = c;
                    if (r < minY) minY = r;
                    if (r > maxY) maxY = r;
                }
            }
        }

        if (empty) return;

        const pWidth = maxX - minX + 1;
        const pHeight = maxY - minY + 1;

        const cellSize = 10; 
        const pad = 1;

        const offsetX = (canvas.width - pWidth * cellSize) / 2 - minX * cellSize;
        const offsetY = (canvas.height - pHeight * cellSize) / 2 - minY * cellSize;

        ctx.save();
        
        for (let r = 0; r < matrix.length; r++) {
            for (let c = 0; c < matrix[r].length; c++) {
                if (matrix[r][c]) {
                    const px = offsetX + c * cellSize;
                    const py = offsetY + r * cellSize;

                    ctx.save();
                    if (!this.isMobile) {
                        ctx.shadowColor = color;
                        ctx.shadowBlur = 4;
                    }

                    ctx.beginPath();
                    ctx.rect(px + pad, py + pad, cellSize - pad * 2, cellSize - pad * 2);

                    const preset = this.presets[this.nextPieceName] || this.presets['I'];
                    const gradient = preset.gradient || [color, color, '#ffffff'];

                    const grad = ctx.createLinearGradient(px + pad, py + pad, px + cellSize - pad, py + cellSize - pad);
                    grad.addColorStop(0, gradient[2]);
                    grad.addColorStop(0.5, gradient[1]);
                    grad.addColorStop(1, gradient[0]);
                    
                    ctx.fillStyle = grad;
                    ctx.fill();

                    ctx.shadowBlur = 0;
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 1;
                    ctx.stroke();

                    ctx.restore();
                }
            }
        }
        ctx.restore();
    },

    triggerGameOver() {
        this.state = 'gameOver';
        this.keys = {};

        HapticEngine.triggerGameOver();
        AudioEngine.playGameOverSound();

        document.getElementById('cascade-final-score').textContent = this.score;
        document.getElementById('cascade-final-best').textContent = this.bestScore;
        
        const screen = document.getElementById('cascade-game-over-screen');
        if (screen) screen.classList.add('active');
    },

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
        if (this.state === 'playing' && this.currentPiece && !this.isCascading) {
            this.updateDAS(dt);

            this.dropCounter += dt;
            if (this.dropCounter >= this.dropInterval) {
                this.dropPiece();
            }
        }

        // 1. Update settled blocks sliding gravity physics animation
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                const cell = this.grid[y][x];
                if (cell) {
                    if (cell.visualY < cell.targetY) {
                        const gravity = 18.0; 
                        cell.vy = cell.vy || 0;
                        cell.vy += gravity * (dt / 1000);
                        cell.visualY += cell.vy * (dt / 1000);
                        
                        if (cell.visualY >= cell.targetY) {
                            cell.visualY = cell.targetY;
                            cell.vy = 0;
                            AudioEngine.playCascadeTick(this.cascadeChain + x);
                        }
                    }
                }
            }
        }

        // 2. Spawn active piece trailing sparks
        if (this.state === 'playing' && this.currentPiece && !this.isCascading) {
            const p = this.currentPiece;
            const mat = p.matrix;
            
            for (let y = 0; y < mat.length; y++) {
                for (let x = 0; x < mat[y].length; x++) {
                    if (mat[y][x]) {
                        const gridX = p.x + x;
                        const gridY = p.y + y;
                        
                        const spawnChance = this.isMobile ? 0.04 : 0.12;
                        if (gridY >= 0 && Math.random() < spawnChance) {
                            const px = (gridX + Math.random()) * this.cellSize;
                            const py = (gridY + Math.random()) * this.cellSize;
                            
                            this.particles.push({
                                x: px,
                                y: py,
                                vx: (Math.random() - 0.5) * 0.5,
                                vy: -0.8 - Math.random() * 0.8,
                                radius: 1 + Math.random() * 2,
                                color: p.color,
                                alpha: 0.8,
                                decay: 0.02 + Math.random() * 0.02
                            });
                        }
                    }
                }
            }
        }

        // 3. Update Particle sparks
        for (let p of this.particles) {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.08; 
            p.alpha -= p.decay;
        }
        this.particles = this.particles.filter(p => p.alpha > 0);

        // 4. Update Laser Clears
        for (let l of this.clearingLines) {
            l.width += (this.logicalWidth - l.width) * 0.22;
            l.alpha -= 0.08;
        }
        this.clearingLines = this.clearingLines.filter(l => l.alpha > 0);
    },

    updateDAS(dt) {
        if (this.state !== 'playing' || !this.currentPiece || this.isCascading) return;
        
        if (this.keys['ArrowLeft']) {
            this.dasTimer += dt;
            if (this.dasTimer >= this.dasDelay) {
                this.dasTimer -= this.dasInterval;
                this.movePiece(-1);
            }
        } else if (this.keys['ArrowRight']) {
            this.dasTimer += dt;
            if (this.dasTimer >= this.dasDelay) {
                this.dasTimer -= this.dasInterval;
                this.movePiece(1);
            }
        } else {
            this.dasTimer = 0;
        }

        if (this.keys['ArrowDown']) {
            this.dropCounter += dt * 7; 
        }
    },

    render() {
        if (!this.ctx) return;
        
        this.ctx.clearRect(0, 0, this.logicalWidth, this.logicalHeight);

        this.drawBackgroundGrid();

        if (this.state === 'playing' && this.currentPiece) {
            this.drawAimShadow();
        }

        this.drawGridBlocks();

        if (this.state === 'playing' && this.currentPiece) {
            this.drawActivePiece();
        }

        this.drawVisualEffects();
    },

    drawBackgroundGrid() {
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        this.ctx.lineWidth = 1;

        for (let c = 1; c < this.cols; c++) {
            this.ctx.beginPath();
            this.ctx.moveTo(c * this.cellSize, 0);
            this.ctx.lineTo(c * this.cellSize, this.logicalHeight);
            this.ctx.stroke();
        }

        for (let r = 1; r < this.rows; r++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, r * this.cellSize);
            this.ctx.lineTo(this.logicalWidth, r * this.cellSize);
            this.ctx.stroke();
        }

        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        this.ctx.lineWidth = 2.5;
        this.ctx.strokeRect(0, 0, this.logicalWidth, this.logicalHeight);
        this.ctx.restore();
    },

    drawActivePiece() {
        const p = this.currentPiece;
        this.drawMatrix(p.matrix, p.x, p.y, p.color, p.gradient, 1.0);
    },

    drawAimShadow() {
        const p = this.currentPiece;
        const origY = p.y;
        
        while (!this.checkCollision()) {
            p.y++;
        }
        p.y--;
        const projectY = p.y;
        p.y = origY; 

        this.ctx.save();
        this.ctx.globalAlpha = 0.25;
        this.drawMatrixOutline(p.matrix, p.x, projectY, p.color);
        this.ctx.restore();
    },

    drawGridBlocks() {
        if (!this.grid || this.grid.length === 0) return;
        for (let y = 0; y < this.rows; y++) {
            if (!this.grid[y]) continue;
            for (let x = 0; x < this.cols; x++) {
                const cell = this.grid[y][x];
                if (cell !== null && cell !== undefined) {
                    this.drawSquare(x, cell.visualY, cell.color, cell.gradient, 1.0);
                }
            }
        }
    },

    drawMatrix(matrix, offsetCol, offsetRow, color, gradient, alpha) {
        if (!matrix || !Array.isArray(matrix)) return;
        for (let y = 0; y < matrix.length; y++) {
            if (!matrix[y] || !Array.isArray(matrix[y])) continue;
            for (let x = 0; x < matrix[y].length; x++) {
                if (matrix[y][x]) {
                    const gridX = offsetCol + x;
                    const gridY = offsetRow + y;
                    if (gridY >= 0) {
                        this.drawSquare(gridX, gridY, color, gradient, alpha);
                    }
                }
            }
        }
    },

    drawMatrixOutline(matrix, offsetCol, offsetRow, color) {
        if (!matrix || !Array.isArray(matrix)) return;
        for (let y = 0; y < matrix.length; y++) {
            if (!matrix[y] || !Array.isArray(matrix[y])) continue;
            for (let x = 0; x < matrix[y].length; x++) {
                if (matrix[y][x]) {
                    const gridX = offsetCol + x;
                    const gridY = offsetRow + y;
                    if (gridY >= 0) {
                        this.drawSquareOutline(gridX, gridY, color);
                    }
                }
            }
        }
    },

    drawSquare(col, row, color, gradient, alpha) {
        const px = col * this.cellSize;
        const py = row * this.cellSize;
        const size = this.cellSize;
        const pad = 2;

        this.ctx.save();
        this.ctx.globalAlpha = alpha;
        
        const shadowCol = color || '#ffffff';
        if (!this.isMobile) {
            this.ctx.shadowColor = shadowCol;
            this.ctx.shadowBlur = 8;
        }

        this.ctx.beginPath();
        const rx = px + pad;
        const ry = py + pad;
        const rWidth = size - pad * 2;
        const rHeight = size - pad * 2;
        this.ctx.rect(rx, ry, rWidth, rHeight);

        const gradColors = (gradient && gradient.length >= 3) ? gradient : [shadowCol, shadowCol, '#ffffff'];
        const grad = this.ctx.createLinearGradient(rx, ry, rx + rWidth, ry + rHeight);
        grad.addColorStop(0, gradColors[2]);
        grad.addColorStop(0.5, gradColors[1]);
        grad.addColorStop(1, gradColors[0]);
        this.ctx.fillStyle = grad;
        this.ctx.fill();

        this.ctx.shadowBlur = 0;
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 1.5;
        this.ctx.stroke();

        this.ctx.restore();
    },

    drawSquareOutline(col, row, color) {
        const px = col * this.cellSize;
        const py = row * this.cellSize;
        const size = this.cellSize;
        const pad = 2.5;

        this.ctx.save();
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 1.5;
        this.ctx.setLineDash([3, 3]);
        
        this.ctx.beginPath();
        this.ctx.rect(px + pad, py + pad, size - pad * 2, size - pad * 2);
        this.ctx.stroke();
        
        this.ctx.restore();
    },

    drawVisualEffects() {
        this.ctx.save();
        
        for (let p of this.particles) {
            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = p.alpha;
            this.ctx.beginPath();
            this.ctx.rect(p.x - p.radius, p.y - p.radius, p.radius * 2, p.radius * 2);
            this.ctx.fill();
        }

        for (let l of this.clearingLines) {
            this.ctx.globalAlpha = l.alpha;
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 4;
            
            if (!this.isMobile) {
                this.ctx.shadowColor = '#06b6d4';
                this.ctx.shadowBlur = 15;
            }
            
            this.ctx.beginPath();
            const leftX = (this.logicalWidth - l.width) / 2;
            this.ctx.moveTo(leftX, l.y);
            this.ctx.lineTo(leftX + l.width, l.y);
            this.ctx.stroke();
        }

        this.ctx.restore();
    }
};

window.NeonCascadeEngine = NeonCascadeEngine;

window.addEventListener('DOMContentLoaded', () => {
    NeonCascadeEngine.init();
});
