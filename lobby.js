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
        
        document.getElementById('lobby-best-cosmic').textContent = cosmicBest;
        document.getElementById('lobby-best-cascade').textContent = cascadeBest;
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
