/* ==========================================================================
   Neon Block Fit - Core Game Engine & Solver
   ========================================================================== */

const NeonBlockFitEngine = {
    // Canvas & Rendering Context
    canvas: null,
    ctx: null,
    dpr: 1,
    scaleFactor: 1,
    logicalWidth: 320,
    logicalHeight: 480,

    // Game States
    state: 'splash', // 'splash', 'playing', 'victory', 'levelComplete', 'gameOver'
    level: 1,
    score: 0,
    bestScore: 0,
    loopActive: false,
    lastTime: 0,

    // Layout configuration
    boardLeft: 20,
    boardTop: 24,
    boardWidth: 280,
    boardHeight: 240,
    cellSize: 0,

    trayLeft: 10,
    trayTop: 310,
    trayWidth: 300,
    trayHeight: 140,

    // Level active elements
    targetGrid: [],     // Array of {x, y, occupied} in absolute coordinates
    minGridX: 0,
    maxGridX: 0,
    minGridY: 0,
    maxGridY: 0,
    gridWidth: 0,
    gridHeight: 0,

    blocks: [],         // Active blocks in the level
    draggingBlock: null,// Block currently being dragged
    dragX: 0,           // Visual current X of drag
    dragY: 0,           // Visual current Y of drag
    dragOffsetX: 0,     // Relative offset from click point to top-left of block
    dragOffsetY: 0,     // Relative offset from click point to top-left of block
    dragVisualOffset: 0,// Vertical offset to prevent finger obscuring block (special for mobile)
    canSnap: false,
    snapGridX: 0,
    snapGridY: 0,

    particles: [],      // Particle effects
    isMobile: false,

    // Victory animation state
    victoryTimer: 0,
    victoryDuration: 1200, // 1.2s pause on level clear screen

    // Presets for Block Color Gradients (matching style.css Neon theme)
    colorGradients: {
        '#06b6d4': ['#0891b2', '#06b6d4', '#67e8f9'], // Cyan
        '#ec4899': ['#db2777', '#ec4899', '#fbcfe8'], // Magenta
        '#eab308': ['#ca8a04', '#eab308', '#fef08a'], // Gold
        '#10b981': ['#059669', '#10b981', '#6ee7b7'], // Green
        '#8b5cf6': ['#7c3aed', '#8b5cf6', '#c4b5fd'], // Purple
        '#f97316': ['#ea580c', '#f97316', '#fdba74']  // Orange
    },

    // Handcrafted levels using absolute layout grid partitions (guarantees solvability)
    levelDesigns: {
        1: [
            { color: '#06b6d4', coords: [[0,0], [1,0], [2,0]] },
            { color: '#ec4899', coords: [[0,1], [0,2]] },
            { color: '#eab308', coords: [[1,1], [2,1], [1,2], [2,2]] }
        ],
        2: [
            { color: '#06b6d4', coords: [[0,0], [1,0], [2,0], [3,0]] },
            { color: '#ec4899', coords: [[0,1], [0,2], [0,3]] },
            { color: '#eab308', coords: [[1,1], [2,1], [1,2], [2,2]] },
            { color: '#10b981', coords: [[3,1], [3,2], [3,3], [2,3], [1,3]] }
        ],
        3: [
            { color: '#06b6d4', coords: [[1,0], [2,0], [1,1]] },
            { color: '#ec4899', coords: [[0,1], [0,2], [1,2]] },
            { color: '#eab308', coords: [[2,1], [3,1], [3,2]] },
            { color: '#10b981', coords: [[2,2], [1,3], [2,3]] }
        ],
        4: [
            { color: '#8b5cf6', coords: [[0,0], [0,1], [0,2]] },
            { color: '#06b6d4', coords: [[3,0], [3,1], [3,2]] },
            { color: '#ec4899', coords: [[0,3], [1,3], [1,2]] },
            { color: '#eab308', coords: [[3,3], [2,3], [2,2]] },
            { color: '#10b981', coords: [[1,1], [2,1]] }
        ],
        5: [
            { color: '#06b6d4', coords: [[0,0], [1,0], [0,1], [1,1]] },
            { color: '#ec4899', coords: [[3,0], [4,0], [3,1], [4,1]] },
            { color: '#eab308', coords: [[2,0], [2,1], [2,2]] },
            { color: '#10b981', coords: [[3,2], [3,3], [2,3]] }
        ],
        6: [
            { color: '#06b6d4', coords: [[0,0], [0,1], [0,2]] },
            { color: '#ec4899', coords: [[4,0], [4,1], [4,2]] },
            { color: '#eab308', coords: [[2,0], [2,1]] },
            { color: '#10b981', coords: [[3,1], [3,2], [2,2]] },
            { color: '#8b5cf6', coords: [[1,1], [1,2]] }
        ],
        7: [
            { color: '#06b6d4', coords: [[1,0], [0,1], [1,1]] },
            { color: '#ec4899', coords: [[3,0], [3,1], [4,1]] },
            { color: '#eab308', coords: [[2,1], [2,2], [2,3]] },
            { color: '#10b981', coords: [[0,2], [1,2], [1,3]] },
            { color: '#8b5cf6', coords: [[3,2], [4,2], [3,3]] },
            { color: '#f97316', coords: [[2,4]] }
        ],
        8: [
            { color: '#06b6d4', coords: [[0,0], [1,0], [2,0]] },
            { color: '#ec4899', coords: [[3,0], [3,1], [3,2]] },
            { color: '#eab308', coords: [[3,3], [2,3], [1,3]] },
            { color: '#10b981', coords: [[0,3], [0,2], [0,1]] }
        ],
        9: [
            { color: '#06b6d4', coords: [[0,0], [1,0], [2,0], [3,0]] },
            { color: '#ec4899', coords: [[4,0], [4,1], [4,2]] },
            { color: '#eab308', coords: [[0,2], [1,2], [2,2]] },
            { color: '#10b981', coords: [[0,3], [0,4], [1,4]] },
            { color: '#8b5cf6', coords: [[4,3], [4,4], [3,4], [2,4]] }
        ],
        10: [
            { color: '#06b6d4', coords: [[0,0], [0,1], [1,1]] },
            { color: '#ec4899', coords: [[0,2], [0,3], [1,3]] },
            { color: '#eab308', coords: [[1,2], [2,2], [2,3]] },
            { color: '#10b981', coords: [[3,3]] }
        ]
    },

    // Initialize
    init() {
        try {
            this.canvas = document.getElementById('blockfit-canvas');
            this.ctx = this.canvas.getContext('2d');

            this.isMobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (window.innerWidth <= 768);
            this.dragVisualOffset = this.isMobile ? 55 : 0;
            console.log(`[Neon Block Fit] Mobile offset: ${this.dragVisualOffset}px`);

            this.resize();
            window.addEventListener('resize', () => this.resize());

            this.bestScore = parseInt(localStorage.getItem('blockfit_high_score')) || 0;
            this.updateHUD();

            this.setupInput();
        } catch (e) {
            alert("Error in BlockFit init: " + e.message + "\n" + e.stack);
            console.error(e);
        }
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

        this.ctx.setTransform(1, 0, 0, 1, 0, 0);

        this.scaleFactor = rect.width / this.logicalWidth;
        this.ctx.scale(this.dpr * this.scaleFactor, this.dpr * this.scaleFactor);
    },

    setupInput() {
        const getTouchPos = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            return {
                x: (clientX - rect.left) / this.scaleFactor,
                y: (clientY - rect.top) / this.scaleFactor
            };
        };

        const onStart = (e) => {
            if (this.state !== 'playing' || !this.loopActive) return;
            const pos = getTouchPos(e);
            
            // Check tray blocks first
            for (let block of this.blocks) {
                if (block.placed || block.state === 'returning') continue;

                // Calculate bounding box in tray
                const width = block.shapeWidth * block.trayCellSize;
                const height = block.shapeHeight * block.trayCellSize;
                const left = block.traySlotX - width / 2;
                const top = block.traySlotY - height / 2;

                // Margined click target
                const margin = 10;
                if (pos.x >= left - margin && pos.x <= left + width + margin &&
                    pos.y >= top - margin && pos.y <= top + height + margin) {
                    
                    if (e.cancelable) e.preventDefault();
                    this.draggingBlock = block;
                    block.dragging = true;

                    // Grab offset relative to block's top-left cell center
                    this.dragOffsetX = (block.shapeWidth - 1) / 2 * block.trayCellSize;
                    this.dragOffsetY = (block.shapeHeight - 1) / 2 * block.trayCellSize;

                    this.dragX = pos.x;
                    this.dragY = pos.y;
                    
                    AudioEngine.playShiftSound();
                    HapticEngine.triggerTap();
                    return;
                }
            }

            // Check placed blocks on the board
            for (let block of this.blocks) {
                if (!block.placed) continue;

                // For each cell in block, check if mouse matches its board coordinates
                for (let cell of block.shape) {
                    const gx = block.gridX + cell[0];
                    const gy = block.gridY + cell[1];

                    const rx = this.gridOffsetX + (gx - this.minGridX) * this.cellSize;
                    const ry = this.gridOffsetY + (gy - this.minGridY) * this.cellSize;

                    if (pos.x >= rx && pos.x <= rx + this.cellSize &&
                        pos.y >= ry && pos.y <= ry + this.cellSize) {
                        
                        if (e.cancelable) e.preventDefault();

                        // Unplace the block
                        block.placed = false;
                        this.draggingBlock = block;
                        block.dragging = true;

                        // Grab offset so the cell that was touched centers under the cursor (shifted)
                        this.dragOffsetX = cell[0] * this.cellSize + this.cellSize / 2;
                        this.dragOffsetY = cell[1] * this.cellSize + this.cellSize / 2;

                        this.dragX = pos.x;
                        this.dragY = pos.y;

                        AudioEngine.playShiftSound();
                        HapticEngine.triggerTap();
                        return;
                    }
                }
            }
        };

        const onMove = (e) => {
            if (!this.draggingBlock || this.state !== 'playing') return;
            if (e.cancelable) e.preventDefault();

            const pos = getTouchPos(e);
            this.dragX = pos.x;
            this.dragY = pos.y;

            // Check if top-left cell aligns with any grid coordinate
            const visualLeft = this.dragX - this.dragOffsetX;
            const visualTop = this.dragY - this.dragOffsetY - this.dragVisualOffset;

            // Nearest grid column/row index (absolute coordinates)
            const gx = Math.round((visualLeft - this.gridOffsetX) / this.cellSize) + this.minGridX;
            const gy = Math.round((visualTop - this.gridOffsetY) / this.cellSize) + this.minGridY;

            // Validate placement
            let valid = true;
            for (let cell of this.draggingBlock.shape) {
                const tx = gx + cell[0];
                const ty = gy + cell[1];

                // Must be part of the target silhouette
                const targetCell = this.targetGrid.find(c => c.x === tx && c.y === ty);
                if (!targetCell) {
                    valid = false;
                    break;
                }

                // Must not overlap any OTHER placed block
                const overlapping = this.blocks.find(b => {
                    if (b === this.draggingBlock || !b.placed) return false;
                    return b.shape.some(bc => b.gridX + bc[0] === tx && b.gridY + bc[1] === ty);
                });

                if (overlapping) {
                    valid = false;
                    break;
                }
            }

            this.canSnap = valid;
            if (valid) {
                this.snapGridX = gx;
                this.snapGridY = gy;
            }
        };

        const onEnd = (e) => {
            if (!this.draggingBlock) return;
            if (e.cancelable) e.preventDefault();

            const block = this.draggingBlock;
            block.dragging = false;
            this.draggingBlock = null;

            if (this.canSnap) {
                // Snap it into place!
                block.placed = true;
                block.gridX = this.snapGridX;
                block.gridY = this.snapGridY;

                AudioEngine.playClickSound();
                HapticEngine.triggerDrop();

                // Spawn snap particles
                for (let cell of block.shape) {
                    const gx = block.gridX + cell[0];
                    const gy = block.gridY + cell[1];
                    const px = this.gridOffsetX + (gx - this.minGridX) * this.cellSize + this.cellSize / 2;
                    const py = this.gridOffsetY + (gy - this.minGridY) * this.cellSize + this.cellSize / 2;
                    this.spawnSparks(px, py, block.color, this.isMobile ? 3 : 6);
                }

                // Check victory condition
                this.checkVictory();
            } else {
                // Return to tray slot with animation
                block.state = 'returning';
                block.returnStartX = this.dragX - this.dragOffsetX;
                block.returnStartY = this.dragY - this.dragOffsetY - this.dragVisualOffset;
                block.returnTimer = 220; // 220ms anim duration

                AudioEngine.playBlockedBeep();
                HapticEngine.vibrate(15);
            }
            this.canSnap = false;
        };

        this.canvas.addEventListener('touchstart', onStart, { passive: false });
        this.canvas.addEventListener('touchmove', onMove, { passive: false });
        this.canvas.addEventListener('touchend', onEnd, { passive: false });

        this.canvas.addEventListener('mousedown', onStart);
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onEnd);

        // Buttons
        const startBtn = document.getElementById('blockfit-start-btn');
        const restartBtn = document.getElementById('blockfit-restart-btn');
        const splash = document.getElementById('blockfit-splash-screen');
        const gameOver = document.getElementById('blockfit-game-over-screen');

        if (startBtn) {
            startBtn.addEventListener('click', () => {
                try {
                    AudioEngine.init();
                    HapticEngine.triggerTap();
                    if (splash) splash.classList.remove('active');
                    this.startGame();
                } catch (e) {
                    alert("Error in BlockFit startBtn click: " + e.message + "\n" + e.stack);
                    console.error(e);
                }
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

        const splash = document.getElementById('blockfit-splash-screen');
        const gameOver = document.getElementById('blockfit-game-over-screen');
        if (splash) splash.classList.add('active');
        if (gameOver) gameOver.classList.remove('active');

        this.bestScore = parseInt(localStorage.getItem('blockfit_high_score')) || 0;
        this.updateHUD();

        this.blocks = [];
        this.particles = [];
        this.lastTime = 0;

        this.resize();
        requestAnimationFrame((t) => this.loop(t));
    },

    halt() {
        this.loopActive = false;
        this.state = 'splash';
        this.blocks = [];
        this.particles = [];

        const splash = document.getElementById('blockfit-splash-screen');
        const gameOver = document.getElementById('blockfit-game-over-screen');
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
        try {
            this.resize();
            this.level = 1;
            this.score = 0;
            this.loadLevel(this.level);
            this.updateHUD();
            this.state = 'playing';
        } catch (e) {
            alert("Error in BlockFit startGame: " + e.message + "\n" + e.stack);
            console.error(e);
        }
    },

    loadLevel(lvl) {
        this.blocks = [];
        this.particles = [];
        this.draggingBlock = null;

        // Loop handcrafted level design configs
        const designsCount = Object.keys(this.levelDesigns).length;
        const designKey = ((lvl - 1) % designsCount) + 1;
        const design = this.levelDesigns[designKey];

        // 1. Gather all target coordinates to define the silhouette board
        const allCoords = [];
        design.forEach(blockPreset => {
            blockPreset.coords.forEach(coord => {
                allCoords.push({ x: coord[0], y: coord[1] });
            });
        });

        this.targetGrid = allCoords.map(c => ({ x: c.x, y: c.y }));
        
        // Find bounds of the grid
        const xs = allCoords.map(c => c.x);
        const ys = allCoords.map(c => c.y);
        this.minGridX = Math.min(...xs);
        this.maxGridX = Math.max(...xs);
        this.minGridY = Math.min(...ys);
        this.maxGridY = Math.max(...ys);

        this.gridWidth = this.maxGridX - this.minGridX + 1;
        this.gridHeight = this.maxGridY - this.minGridY + 1;

        // Calculate dynamic cell sizes to fit centered in the board area
        this.cellSize = Math.min(this.boardWidth / this.gridWidth, this.boardHeight / this.gridHeight);
        if (this.cellSize > 48) this.cellSize = 48; // cap max size

        const renderWidth = this.gridWidth * this.cellSize;
        const renderHeight = this.gridHeight * this.cellSize;
        this.gridOffsetX = this.boardLeft + (this.boardWidth - renderWidth) / 2;
        this.gridOffsetY = this.boardTop + (this.boardHeight - renderHeight) / 2;

        // 2. Initialize Block objects
        const numBlocks = design.length;
        const slotWidth = this.trayWidth / numBlocks;

        design.forEach((preset, index) => {
            const blockCoords = JSON.parse(JSON.stringify(preset.coords));
            
            // Normalize shape to start at local (0,0)
            const bXs = blockCoords.map(c => c[0]);
            const bYs = blockCoords.map(c => c[1]);
            const minX = Math.min(...bXs);
            const minY = Math.min(...bYs);

            const shape = blockCoords.map(c => [c[0] - minX, c[1] - minY]);
            const shapeWidth = Math.max(...bXs) - minX + 1;
            const shapeHeight = Math.max(...bYs) - minY + 1;

            // Slot spacing in tray
            const traySlotX = this.trayLeft + (index + 0.5) * slotWidth;
            const traySlotY = this.trayTop + this.trayHeight / 2;

            // Block scaled down cell size for baki / tray representation
            const maxDimension = Math.max(shapeWidth, shapeHeight);
            let trayCellSize = Math.min(slotWidth * 0.75 / shapeWidth, this.trayHeight * 0.75 / shapeHeight);
            if (trayCellSize > this.cellSize * 0.52) trayCellSize = this.cellSize * 0.52; // cap slot scaling

            this.blocks.push({
                id: `block_${index}`,
                color: preset.color,
                gradient: this.colorGradients[preset.color],
                shape: shape,
                shapeWidth: shapeWidth,
                shapeHeight: shapeHeight,
                placed: false,
                gridX: 0,
                gridY: 0,
                visualX: 0,
                visualY: 0,
                traySlotX: traySlotX,
                traySlotY: traySlotY,
                trayCellSize: trayCellSize,
                dragging: false,
                state: 'tray', // 'tray', 'returning'
                returnTimer: 0,
                returnStartX: 0,
                returnStartY: 0
            });
        });
    },

    updateHUD() {
        document.getElementById('blockfit-level-val').textContent = this.level;
        document.getElementById('blockfit-score-val').textContent = `SCORE: ${this.score}`;
        document.getElementById('blockfit-best-val').textContent = this.bestScore;
        document.getElementById('lobby-best-blockfit').textContent = this.bestScore;
    },

    checkVictory() {
        // If all blocks are placed, we covered the silhouette perfectly
        const allPlaced = this.blocks.every(b => b.placed);
        if (allPlaced) {
            this.state = 'levelComplete';
            this.victoryTimer = this.victoryDuration;

            AudioEngine.playVictoryFanfare();
            HapticEngine.triggerSuperMerge();

            // Spawn fireworks sparks
            for (let i = 0; i < 6; i++) {
                const px = this.logicalWidth / 2 + (Math.random() - 0.5) * 80;
                const py = this.logicalHeight / 3 + (Math.random() - 0.5) * 80;
                const colors = ['#06b6d4', '#ec4899', '#eab308', '#10b981', '#8b5cf6'];
                this.spawnSparks(px, py, colors[i % colors.length], this.isMobile ? 12 : 24);
            }
        }
    },

    triggerNextLevel() {
        this.score += 1000 * this.level;
        this.level++;

        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            localStorage.setItem('blockfit_high_score', this.bestScore);
        }
        this.updateHUD();

        // 10 Unique levels limit check
        if (this.level > 10) {
            this.triggerGameCompleted();
        } else {
            this.loadLevel(this.level);
            this.state = 'playing';
        }
    },

    triggerGameCompleted() {
        this.state = 'gameOver';
        
        HapticEngine.triggerGameOver();

        document.getElementById('blockfit-final-level').textContent = this.level - 1;
        document.getElementById('blockfit-final-score').textContent = this.score;
        
        const screen = document.getElementById('blockfit-game-over-screen');
        if (screen) screen.classList.add('active');
    },

    spawnSparks(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.6 + Math.random() * 2.2;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: 1.2 + Math.random() * 2.5,
                color: color,
                alpha: 1.0,
                decay: 0.02 + Math.random() * 0.02
            });
        }
    },

    // Game loop
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
        // 1. Update returning animation of blocks
        for (let block of this.blocks) {
            if (block.state === 'returning') {
                block.returnTimer -= dt;
                if (block.returnTimer <= 0) {
                    block.state = 'tray';
                    block.returnTimer = 0;
                } else {
                    const t = 1 - block.returnTimer / 220;
                    const ease = 1 - Math.pow(1 - t, 3); // easeOutCubic

                    // Center of block in slot is traySlotX, traySlotY
                    const slotW = block.shapeWidth * block.trayCellSize;
                    const slotH = block.shapeHeight * block.trayCellSize;
                    const endX = block.traySlotX - slotW / 2;
                    const endY = block.traySlotY - slotH / 2;

                    block.visualX = block.returnStartX + (endX - block.returnStartX) * ease;
                    block.visualY = block.returnStartY + (endY - block.returnStartY) * ease;
                }
            }
        }

        // 2. Update level clear countdown
        if (this.state === 'levelComplete') {
            this.victoryTimer -= dt;
            if (this.victoryTimer <= 0) {
                this.triggerNextLevel();
            }
        }

        // 3. Update sparks particles
        for (let p of this.particles) {
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= p.decay;
        }
        this.particles = this.particles.filter(p => p.alpha > 0);
    },

    // Rendering Loops
    render() {
        if (!this.ctx) return;

        // Clear canvas
        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.restore();

        // 1. Draw target silhouette outline grid
        this.drawTargetGrid();

        // 2. Draw snapping preview if dragging and canSnap
        this.drawSnapPreview();

        // 3. Draw active placed blocks on the board
        this.drawPlacedBlocks();

        // 4. Draw blocks in the tray (and returning blocks)
        this.drawTrayBlocks();

        // 5. Draw currently dragged block on top of everything
        this.drawDraggedBlock();

        // 6. Draw particle sparks
        this.drawParticles();

        // 7. Draw "LEVEL CLEARED" text if levelComplete state
        if (this.state === 'levelComplete') {
            this.drawVictoryOverlay();
        }
    },

    drawTargetGrid() {
        this.ctx.save();

        // Outline border wrapper for the whole canvas
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        this.ctx.lineWidth = 2.0;
        this.ctx.strokeRect(0, 0, this.logicalWidth, this.logicalHeight);

        // Draw slots of the silhouette
        this.targetGrid.forEach(cell => {
            const rx = this.gridOffsetX + (cell.x - this.minGridX) * this.cellSize;
            const ry = this.gridOffsetY + (cell.y - this.minGridY) * this.cellSize;

            const pad = 2.5;
            const size = this.cellSize - pad * 2;

            // Draw faint glowing dashed outline for placeholder
            this.ctx.strokeStyle = 'rgba(139, 92, 246, 0.16)';
            this.ctx.lineWidth = 1.5;
            this.ctx.setLineDash([4, 3]);

            this.ctx.beginPath();
            this.ctx.roundRect(rx + pad, ry + pad, size, size, 6);
            this.ctx.stroke();

            // Draw very soft background inside target spots
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.015)';
            this.ctx.beginPath();
            this.ctx.roundRect(rx + pad, ry + pad, size, size, 6);
            this.ctx.fill();
        });

        this.ctx.restore();
    },

    drawSnapPreview() {
        if (!this.draggingBlock || !this.canSnap) return;

        this.ctx.save();
        const block = this.draggingBlock;
        const pad = 2.5;
        const size = this.cellSize - pad * 2;

        this.ctx.fillStyle = block.color;
        this.ctx.globalAlpha = 0.28; // semi-transparent

        block.shape.forEach(cell => {
            const gx = this.snapGridX + cell[0];
            const gy = this.snapGridY + cell[1];
            const rx = this.gridOffsetX + (gx - this.minGridX) * this.cellSize;
            const ry = this.gridOffsetY + (gy - this.minGridY) * this.cellSize;

            this.ctx.beginPath();
            this.ctx.roundRect(rx + pad, ry + pad, size, size, 6);
            this.ctx.fill();

            // Glow pulsing white outline
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 2.0;
            this.ctx.setLineDash([2, 2]);
            this.ctx.stroke();
        });

        this.ctx.restore();
    },

    drawPlacedBlocks() {
        this.blocks.forEach(block => {
            if (!block.placed) return;

            block.shape.forEach(cell => {
                const gx = block.gridX + cell[0];
                const gy = block.gridY + cell[1];

                const rx = this.gridOffsetX + (gx - this.minGridX) * this.cellSize;
                const ry = this.gridOffsetY + (gy - this.minGridY) * this.cellSize;

                this.drawCell(rx, ry, this.cellSize, block.color, block.gradient);
            });
        });
    },

    drawTrayBlocks() {
        this.ctx.save();

        // Draw tray boundary line (very faint divider)
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        this.ctx.lineWidth = 1.0;
        this.ctx.beginPath();
        this.ctx.moveTo(10, this.trayTop - 10);
        this.ctx.lineTo(this.logicalWidth - 10, this.trayTop - 10);
        this.ctx.stroke();

        this.blocks.forEach(block => {
            if (block.dragging) return;

            if (block.placed) {
                // Draw greyed out dashed silhouette in the tray slot
                this.ctx.save();
                const width = block.shapeWidth * block.trayCellSize;
                const height = block.shapeHeight * block.trayCellSize;
                const left = block.traySlotX - width / 2;
                const top = block.traySlotY - height / 2;

                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
                this.ctx.lineWidth = 1.0;
                this.ctx.setLineDash([2, 3]);

                block.shape.forEach(cell => {
                    const cx = left + cell[0] * block.trayCellSize;
                    const cy = top + cell[1] * block.trayCellSize;
                    this.ctx.beginPath();
                    this.ctx.roundRect(cx + 1, cy + 1, block.trayCellSize - 2, block.trayCellSize - 2, 3);
                    this.ctx.stroke();
                });
                this.ctx.restore();
                return;
            }

            // Normal or returning blocks
            let renderX = 0;
            let renderY = 0;

            if (block.state === 'returning') {
                renderX = block.visualX;
                renderY = block.visualY;
            } else {
                // Static in tray
                const width = block.shapeWidth * block.trayCellSize;
                const height = block.shapeHeight * block.trayCellSize;
                renderX = block.traySlotX - width / 2;
                renderY = block.traySlotY - height / 2;
            }

            block.shape.forEach(cell => {
                const cx = renderX + cell[0] * block.trayCellSize;
                const cy = renderY + cell[1] * block.trayCellSize;
                this.drawCell(cx, cy, block.trayCellSize, block.color, block.gradient, true);
            });
        });

        this.ctx.restore();
    },

    drawDraggedBlock() {
        if (!this.draggingBlock) return;

        this.ctx.save();
        const block = this.draggingBlock;

        // Visual coordinates shifted up vertically on mobile to prevent blocking with fingers
        const left = this.dragX - this.dragOffsetX;
        const top = this.dragY - this.dragOffsetY - this.dragVisualOffset;

        block.shape.forEach(cell => {
            const cx = left + cell[0] * this.cellSize;
            const cy = top + cell[1] * this.cellSize;

            this.drawCell(cx, cy, this.cellSize, block.color, block.gradient);
        });

        this.ctx.restore();
    },

    drawCell(x, y, size, color, gradient, isSmall = false) {
        const pad = isSmall ? 1.2 : 2.5;
        const rSize = size - pad * 2;
        const borderRadius = isSmall ? 3 : 6;

        this.ctx.save();

        // 1. Desktop Shadow Glow
        if (!this.isMobile && !isSmall) {
            this.ctx.shadowColor = color;
            this.ctx.shadowBlur = 10;
        }

        this.ctx.beginPath();
        this.ctx.roundRect(x + pad, y + pad, rSize, rSize, borderRadius);

        // 2. Gradient fills
        const grad = this.ctx.createLinearGradient(x + pad, y + pad, x + size - pad, y + size - pad);
        grad.addColorStop(0, gradient[2]); // light shade
        grad.addColorStop(0.5, gradient[1]); // mid
        grad.addColorStop(1, gradient[0]); // dark shade
        
        this.ctx.fillStyle = grad;
        this.ctx.fill();

        // 3. Clear stroke outline border
        this.ctx.shadowBlur = 0;
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = isSmall ? 0.75 : 1.5;
        this.ctx.stroke();

        // 4. Gloss internal highlight line
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.24)';
        this.ctx.lineWidth = isSmall ? 0.5 : 1.2;
        this.ctx.beginPath();
        this.ctx.roundRect(x + pad + 1.5, y + pad + 1.5, rSize - 3, rSize - 3, borderRadius - 1);
        this.ctx.stroke();

        this.ctx.restore();
    },

    drawParticles() {
        this.ctx.save();
        for (let p of this.particles) {
            this.ctx.globalAlpha = p.alpha;
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.restore();
    },

    drawVictoryOverlay() {
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(5, 6, 20, 0.45)';
        this.ctx.fillRect(0, 0, this.logicalWidth, this.logicalHeight);

        // Glass panel overlay card
        const cardW = 200;
        const cardH = 80;
        const cardX = (this.logicalWidth - cardW) / 2;
        const cardY = this.logicalHeight / 3 - cardH / 2;

        this.ctx.fillStyle = 'rgba(13, 17, 43, 0.82)';
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.roundRect(cardX, cardY, cardW, cardH, 18);
        this.ctx.fill();
        this.ctx.stroke();

        // Glowing text
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        // Title
        this.ctx.font = '800 1.2rem Outfit, sans-serif';
        this.ctx.fillStyle = '#ffffff';
        if (!this.isMobile) {
            this.ctx.shadowColor = '#8b5cf6';
            this.ctx.shadowBlur = 10;
        }
        this.ctx.fillText('LEVEL CLEARED', this.logicalWidth / 2, cardY + cardH * 0.35);

        // Subtitle
        this.ctx.shadowBlur = 0;
        this.ctx.font = '600 0.8rem Outfit, sans-serif';
        this.ctx.fillStyle = '#06b6d4';
        this.ctx.fillText(`+${1000 * this.level} BONUS SCORE`, this.logicalWidth / 2, cardY + cardH * 0.68);

        this.ctx.restore();
    }
};

// Explicit global export
window.NeonBlockFitEngine = NeonBlockFitEngine;

// Initialize when file loads
NeonBlockFitEngine.init();
