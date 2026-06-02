/* ==========================================================================
   Cosmic Game Hub - Lobby & Navigation Manager
   ========================================================================== */

const GameLobby = {
    activeGame: null, // 'cosmic', 'cascade', or null

    init() {
        this.loadHighScores();
        this.setupEventListeners();
        console.log("Cosmic Game Hub Lobby Initialized!");
    },

    loadHighScores() {
        const cosmicBest = localStorage.getItem('cosmic_high_score') || 0;
        const cascadeBest = localStorage.getItem('cascade_high_score') || 0;
        const arrowBest = localStorage.getItem('arrow_high_score') || 0;
        const outBest = localStorage.getItem('out_high_score') || 0;
        const blockfitBest = localStorage.getItem('blockfit_high_score') || 0;
        
        document.getElementById('lobby-best-cosmic').textContent = cosmicBest;
        document.getElementById('lobby-best-cascade').textContent = cascadeBest;
        document.getElementById('lobby-best-arrow').textContent = arrowBest;
        document.getElementById('lobby-best-out').textContent = outBest;
        document.getElementById('lobby-best-blockfit').textContent = blockfitBest;
    },

    setupEventListeners() {
        // Play buttons in lobby
        const playButtons = document.querySelectorAll('.btn-card-play');
        playButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const gameType = e.target.getAttribute('data-game');
                
                // Initialize Synthesizer audio contexts on click
                AudioEngine.init();
                HapticEngine.triggerTap();

                this.launchGame(gameType);
            });
        });

        // Back to lobby buttons
        const cosmicBack = document.getElementById('cosmic-back-btn');
        if (cosmicBack) {
            cosmicBack.addEventListener('click', () => this.exitToLobby());
        }

        const cascadeBack = document.getElementById('cascade-back-btn');
        if (cascadeBack) {
            cascadeBack.addEventListener('click', () => this.exitToLobby());
        }

        const arrowBack = document.getElementById('arrow-back-btn');
        if (arrowBack) {
            arrowBack.addEventListener('click', () => this.exitToLobby());
        }

        const outBack = document.getElementById('out-back-btn');
        if (outBack) {
            outBack.addEventListener('click', () => this.exitToLobby());
        }

        const blockfitBack = document.getElementById('blockfit-back-btn');
        if (blockfitBack) {
            blockfitBack.addEventListener('click', () => this.exitToLobby());
        }
    },

    launchGame(gameType) {
        const lobby = document.getElementById('lobby-container');
        
        // Hide Lobby
        lobby.classList.add('hidden');

        if (gameType === 'cosmic') {
            this.activeGame = 'cosmic';
            const arena = document.getElementById('cosmic-fusion-arena');
            arena.classList.remove('hidden');
            
            // Boot Cosmic Fusion Engine
            if (window.GameEngine) {
                GameEngine.launch();
            }
        } 
        else if (gameType === 'cascade') {
            this.activeGame = 'cascade';
            const arena = document.getElementById('neon-cascade-arena');
            arena.classList.remove('hidden');
            
            // Boot Neon Cascade Engine
            if (window.NeonCascadeEngine) {
                NeonCascadeEngine.launch();
            }
        }
        else if (gameType === 'arrow') {
            this.activeGame = 'arrow';
            const arena = document.getElementById('pulse-arrow-arena');
            arena.classList.remove('hidden');
            
            // Boot Pulse Arrow Engine
            if (window.PulseArrowEngine) {
                PulseArrowEngine.launch();
            }
        }
        else if (gameType === 'out') {
            this.activeGame = 'out';
            const arena = document.getElementById('arrow-out-arena');
            arena.classList.remove('hidden');
            
            // Boot Arrow Out Engine
            if (window.ArrowOutEngine) {
                ArrowOutEngine.launch();
            }
        }
        else if (gameType === 'blockfit') {
            this.activeGame = 'blockfit';
            const arena = document.getElementById('block-fit-arena');
            arena.classList.remove('hidden');
            
            // Boot Neon Block Fit Engine
            if (window.NeonBlockFitEngine) {
                NeonBlockFitEngine.launch();
            }
        }
    },

    exitToLobby() {
        HapticEngine.triggerTap();

        // 1. Halt and clean up active loops
        if (this.activeGame === 'cosmic' && window.GameEngine) {
            GameEngine.halt();
            document.getElementById('cosmic-fusion-arena').classList.add('hidden');
        } 
        else if (this.activeGame === 'cascade' && window.NeonCascadeEngine) {
            NeonCascadeEngine.halt();
            document.getElementById('neon-cascade-arena').classList.add('hidden');
        }
        else if (this.activeGame === 'arrow' && window.PulseArrowEngine) {
            PulseArrowEngine.halt();
            document.getElementById('pulse-arrow-arena').classList.add('hidden');
        }
        else if (this.activeGame === 'out' && window.ArrowOutEngine) {
            ArrowOutEngine.halt();
            document.getElementById('arrow-out-arena').classList.add('hidden');
        }
        else if (this.activeGame === 'blockfit' && window.NeonBlockFitEngine) {
            NeonBlockFitEngine.halt();
            document.getElementById('block-fit-arena').classList.add('hidden');
        }

        this.activeGame = null;

        // 2. Reload scores and reveal Lobby
        this.loadHighScores();
        document.getElementById('lobby-container').classList.remove('hidden');
        
        // Safety: deactivate warning overlays
        const flash = document.getElementById('warning-flash');
        if (flash) flash.classList.remove('active');
    }
};

// Initialize Lobby when DOM settles
window.addEventListener('DOMContentLoaded', () => {
    GameLobby.init();
});
