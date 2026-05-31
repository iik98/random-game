/* ==========================================================================
   Cosmic Fusion Mobile - Haptic Feedback Manager (Vibration API)
   ========================================================================== */

const HapticEngine = {
    enabled: true,

    // Safe vibration wrapper
    vibrate(duration) {
        if (!this.enabled) return;
        
        const canVibrate = 'vibrate' in navigator;
        if (canVibrate) {
            try {
                navigator.vibrate(duration);
            } catch (e) {
                console.warn('Vibration failed or blocked by sandbox permissions:', e);
            }
        }
    },

    // Trigger a light haptic tap (e.g., UI select, button press)
    triggerTap() {
        this.vibrate(10);
    },

    // Trigger a drop impact vibration (light bump)
    triggerDrop() {
        this.vibrate(15);
    },

    // Dynamic haptic vibration when planets merge
    // Vibration intensity/length increases with planet level
    triggerMerge(level) {
        // level ranges from 1 (Moon merge) to 10 (Sun merge)
        const duration = 12 + level * 5; // scales from ~17ms to ~62ms
        this.vibrate(duration);
    },

    // Epic double pulse when reaching a monumental high level
    triggerSuperMerge() {
        this.vibrate([40, 50, 40]);
    },

    // Intense warning pattern for Game Over
    triggerGameOver() {
        this.vibrate([100, 100, 150, 80, 200]);
    }
};

// Explicit global export for other modules
window.HapticEngine = HapticEngine;
