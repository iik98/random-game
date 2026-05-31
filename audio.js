/* ==========================================================================
   Cosmic Fusion Mobile - Synthesized Audio Engine (Web Audio API)
   ========================================================================== */

const AudioEngine = {
    ctx: null,
    muted: false,

    // Initialize Audio Context on user gesture
    init() {
        if (this.ctx) return;
        try {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
            
            // Resume context if suspended (browser security autoplays lock)
            if (this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
            console.log('Audio Engine initialized successfully!');
        } catch (e) {
            console.warn('Web Audio API not supported in this browser:', e);
        }
    },

    // Create a beautiful, sweep sound for dropping planets
    playDropSound() {
        if (!this.ctx || this.muted) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const now = this.ctx.currentTime;
        
        // Setup nodes
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'triangle'; // Soft and pleasing
        
        // Sweeping frequency downwards
        osc.frequency.setValueAtTime(380, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.18);
        
        // Volume Envelope
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.18);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start(now);
        osc.stop(now + 0.2);
    },

    // Create a glowing, sci-fi harmonic chime when two planets merge
    // Sound depth/tone scales with the evolution level of the planet
    playMergeSound(level) {
        if (!this.ctx || this.muted) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const now = this.ctx.currentTime;
        const duration = 0.28 + level * 0.04;
        
        // Level-dependent frequencies
        // Lower levels: Sparkly, high chime
        // Higher levels: Deep, epic rumble + bright sweep
        const baseFreq = 220 * Math.pow(1.15, level);
        
        // Primary Oscillator (Main tone sweep)
        const osc1 = this.ctx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(baseFreq, now);
        osc1.frequency.exponentialRampToValueAtTime(baseFreq * 2.2, now + duration);
        
        // Secondary Oscillator (Adds harmonic sparkle)
        const osc2 = this.ctx.createOscillator();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(baseFreq * 3, now);
        osc2.frequency.exponentialRampToValueAtTime(baseFreq * 4, now + duration * 0.7);
        
        // Master Gain Node for dynamic envelope
        const gain1 = this.ctx.createGain();
        const gain2 = this.ctx.createGain();
        const masterGain = this.ctx.createGain();
        
        // Envelopes
        gain1.gain.setValueAtTime(0.12, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + duration);
        
        gain2.gain.setValueAtTime(0.06, now);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.6);
        
        masterGain.gain.setValueAtTime(1.0, now);
        
        // Connections
        osc1.connect(gain1);
        osc2.connect(gain2);
        
        gain1.connect(masterGain);
        gain2.connect(masterGain);
        
        masterGain.connect(this.ctx.destination);
        
        // Play oscillators
        osc1.start(now);
        osc2.start(now);
        
        osc1.stop(now + duration);
        osc2.stop(now + duration);
    },

    // Create a sad, low-frequency descending synth sequence for Game Over
    playGameOverSound() {
        if (!this.ctx || this.muted) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const now = this.ctx.currentTime;
        
        // We will play 3 quick descending notes
        const notes = [220, 165, 110];
        const noteDur = 0.25;
        
        notes.forEach((freq, index) => {
            const time = now + index * (noteDur * 0.85);
            
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = 'sawtooth';
            
            // Apply low pass filter to make it sound vintage/dark
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(400, time);
            
            osc.frequency.setValueAtTime(freq, time);
            osc.frequency.linearRampToValueAtTime(freq * 0.8, time + noteDur);
            
            gain.gain.setValueAtTime(0.15, time);
            gain.gain.linearRampToValueAtTime(0.001, time + noteDur);
            
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.start(time);
            osc.stop(time + noteDur);
        });
    },

    // Short crisp UI click sound
    playClickSound() {
        if (!this.ctx || this.muted) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const now = this.ctx.currentTime;
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1000, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.05);
        
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start(now);
        osc.stop(now + 0.06);
    },

    // Short crisp tick for sliding blocks in Neon Cascade
    playShiftSound() {
        if (!this.ctx || this.muted) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.03);
        
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start(now);
        osc.stop(now + 0.04);
    },

    // A snappy quick pitch sweep for block rotations
    playRotateSound() {
        if (!this.ctx || this.muted) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.08);
        
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start(now);
        osc.stop(now + 0.09);
    },

    // A beautiful retro-synth chord clear for lines
    playClearSound(lines) {
        if (!this.ctx || this.muted) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const now = this.ctx.currentTime;
        
        // Define arpeggio notes depending on number of lines cleared
        const baseFreqs = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98];
        const noteCount = Math.min(6, 1 + lines * 1.25);
        const noteSpacing = 0.06; // staggered note entry
        
        for (let i = 0; i < noteCount; i++) {
            const time = now + i * noteSpacing;
            const freq = baseFreqs[i % baseFreqs.length];
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = i === 3 || i === 4 ? 'triangle' : 'sine';
            osc.frequency.setValueAtTime(freq, time);
            osc.frequency.exponentialRampToValueAtTime(freq * 1.2, time + 0.22);
            
            gain.gain.setValueAtTime(0.08, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.start(time);
            osc.stop(time + 0.25);
        }
    },

    // Level up fanfare sweep
    playLevelUpSound() {
        if (!this.ctx || this.muted) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const now = this.ctx.currentTime;
        const freqs = [523.25, 659.25, 783.99, 1046.50];
        
        freqs.forEach((freq, idx) => {
            const time = now + idx * 0.1;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, time);
            
            gain.gain.setValueAtTime(0.07, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.start(time);
            osc.stop(time + 0.35);
        });
    },

    // A deep retro white-noise bass boom on hard drops
    playHardDropSound() {
        if (!this.ctx || this.muted) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const now = this.ctx.currentTime;

        // 1. Deep sub bass oscillator (sine wave sweeping downwards)
        const subOsc = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(140, now);
        subOsc.frequency.exponentialRampToValueAtTime(45, now + 0.35);

        subGain.gain.setValueAtTime(0.4, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        subOsc.connect(subGain);
        subGain.connect(this.ctx.destination);
        subOsc.start(now);
        subOsc.stop(now + 0.36);

        // 2. White noise punch / impact
        try {
            const bufferSize = this.ctx.sampleRate * 0.25; // 0.25 seconds
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }

            const noiseNode = this.ctx.createBufferSource();
            noiseNode.buffer = buffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(300, now);
            filter.frequency.exponentialRampToValueAtTime(80, now + 0.25);
            filter.Q.setValueAtTime(4, now);

            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(0.35, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

            noiseNode.connect(filter);
            filter.connect(noiseGain);
            noiseGain.connect(this.ctx.destination);

            noiseNode.start(now);
            noiseNode.stop(now + 0.26);
        } catch (e) {
            console.warn("Could not play white noise buffer:", e);
        }
    },

    // A snappy retro computing chime that rises in pitch as cascade steps proceed
    playCascadeTick(step = 0) {
        if (!this.ctx || this.muted) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const now = this.ctx.currentTime;
        
        // Pentatonic scale starting at C5
        const scale = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50, 1174.66, 1318.51, 1567.98, 1760.00];
        const baseFreq = scale[step % scale.length] * (1 + Math.floor(step / scale.length) * 0.5);

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.linearRampToValueAtTime(baseFreq * 1.5, now + 0.08);
        
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start(now);
        osc.stop(now + 0.09);
    }
};

// Explicit global export for other modules
window.AudioEngine = AudioEngine;
