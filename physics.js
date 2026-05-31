/* ==========================================================================
   Cosmic Fusion Mobile - Custom 2D Circle Physics Engine
   ========================================================================== */

// Planet Visual & Size Configuration Table
// Contains details of all 10 planetary levels
const PLANET_PRESETS = {
    1: { name: "Moon",    radius: 16,  mass: 1.0,  color: "#94a3b8", score: 2,   gradient: ["#64748b", "#94a3b8", "#cbd5e1"] },
    2: { name: "Mercury", radius: 22,  mass: 1.8,  color: "#f97316", score: 4,   gradient: ["#ea580c", "#f97316", "#fdba74"] },
    3: { name: "Venus",   radius: 28,  mass: 2.8,  color: "#eab308", score: 8,   gradient: ["#ca8a04", "#eab308", "#fef08a"] },
    4: { name: "Earth",   radius: 36,  mass: 4.2,  color: "#3b82f6", score: 16,  gradient: ["#2563eb", "#3b82f6", "#93c5fd"] },
    5: { name: "Mars",    radius: 44,  mass: 6.0,  color: "#ef4444", score: 32,  gradient: ["#dc2626", "#ef4444", "#fca5a5"] },
    6: { name: "Jupiter", radius: 54,  mass: 8.5,  color: "#a855f7", score: 64,  gradient: ["#9333ea", "#a855f7", "#d8b4fe"] },
    7: { name: "Saturn",  radius: 66,  mass: 12.0, color: "#f43f5e", score: 128, gradient: ["#e11d48", "#f43f5e", "#fda4af"] },
    8: { name: "Uranus",  radius: 78,  mass: 16.0, color: "#06b6d4", score: 256, gradient: ["#0891b2", "#06b6d4", "#67e8f9"] },
    9: { name: "Neptune", radius: 90,  mass: 22.0, color: "#10b981", score: 512, gradient: ["#059669", "#10b981", "#6ee7b7"] },
    10: { name: "Sun",    radius: 104, mass: 30.0, color: "#f97316", score: 1024, gradient: ["#ea580c", "#f97316", "#fef08a"] }
};

const MAX_PLANET_LEVEL = 10;

class PhysicsPlanet {
    constructor(x, y, level) {
        const preset = PLANET_PRESETS[level];
        this.id = Math.random().toString(36).substring(2, 9);
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        
        // Physics attributes
        this.level = level;
        this.radius = preset.radius;
        this.mass = preset.mass;
        this.elasticity = 0.22; // Bounciness factor
        this.friction = 0.985;  // Dampens lateral movement
        
        // Visual presets
        this.name = preset.name;
        this.color = preset.color;
        this.gradient = preset.gradient;
        this.scoreValue = preset.score;
        
        // Scale animation (pops when spawned or merged)
        this.scale = 0.1;
        this.targetScale = 1.0;
        
        // Flags
        this.shouldDelete = false;
        this.isSpawner = false; // Aim planet doesn't fall
        this.spawningTimer = 0;
    }

    update() {
        if (this.isSpawner) return;

        // Apply scale transition animation
        if (this.scale < this.targetScale) {
            this.scale += (this.targetScale - this.scale) * 0.15;
            if (this.targetScale - this.scale < 0.01) this.scale = this.targetScale;
        }
    }
}

class PhysicsWorld {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.planets = [];
        this.gravity = 0.32;    // Planetary gravitational acceleration
        this.substeps = 8;     // Physics solver iterations for stability (Verlet / Impulse standard)
        this.onMergeCallback = null;
    }

    addPlanet(planet) {
        this.planets.push(planet);
    }

    clear() {
        this.planets = [];
    }

    update() {
        // Run physics solver iterations to prevent overlaps and clipping
        for (let step = 0; step < this.substeps; step++) {
            this.applyGravityAndMovement();
            this.resolveWallCollisions();
            this.resolvePlanetCollisions();
        }

        // Clean up deleted merged planets
        this.planets = this.planets.filter(p => !p.shouldDelete);

        // Update planet animations (scale pops)
        for (let p of this.planets) {
            p.update();
        }
    }

    applyGravityAndMovement() {
        const dt = 1.0 / this.substeps;
        for (let p of this.planets) {
            if (p.isSpawner || p.shouldDelete) continue;

            // Apply gravity
            p.vy += this.gravity * dt;

            // Apply friction (damping)
            p.vx *= Math.pow(p.friction, dt);

            // Update positions
            p.x += p.vx * dt;
            p.y += p.vy * dt;
        }
    }

    resolveWallCollisions() {
        for (let p of this.planets) {
            if (p.isSpawner || p.shouldDelete) continue;

            const radius = p.radius * p.scale;

            // Left wall boundary
            if (p.x - radius < 0) {
                p.x = radius;
                p.vx = -p.vx * p.elasticity;
            }
            // Right wall boundary
            else if (p.x + radius > this.width) {
                p.x = this.width - radius;
                p.vx = -p.vx * p.elasticity;
            }

            // Bottom floor boundary
            if (p.y + radius > this.height) {
                p.y = this.height - radius;
                p.vy = -p.vy * p.elasticity;
                // Apply sliding ground friction
                p.vx *= 0.95;
            }
        }
    }

    resolvePlanetCollisions() {
        const len = this.planets.length;
        
        for (let i = 0; i < len; i++) {
            const p1 = this.planets[i];
            if (p1.isSpawner || p1.shouldDelete) continue;

            for (let j = i + 1; j < len; j++) {
                const p2 = this.planets[j];
                if (p2.isSpawner || p2.shouldDelete) continue;

                // Calculate center distance
                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const distSqr = dx * dx + dy * dy;
                
                const r1 = p1.radius * p1.scale;
                const r2 = p2.radius * p2.scale;
                const minDist = r1 + r2;

                if (distSqr < minDist * minDist) {
                    const dist = Math.sqrt(distSqr);
                    // Safe fallbacks to prevent division by zero
                    const nx = dist > 0 ? dx / dist : 1;
                    const ny = dist > 0 ? dy / dist : 0;

                    // 1. Check if they should merge (same level, not Sun, not already marked)
                    if (p1.level === p2.level && p1.level < MAX_PLANET_LEVEL && !p1.shouldDelete && !p2.shouldDelete) {
                        this.handlePlanetMerge(p1, p2);
                        continue;
                    }

                    // 2. Standard Elastic Collision Impulse & Overlap Resolution
                    const overlap = minDist - dist;
                    const totalMass = p1.mass + p2.mass;

                    // Push out overlapping parts (Mass-ratio weighted displacement)
                    p1.x -= nx * overlap * (p2.mass / totalMass);
                    p1.y -= ny * overlap * (p2.mass / totalMass);
                    p2.x += nx * overlap * (p1.mass / totalMass);
                    p2.y += ny * overlap * (p1.mass / totalMass);

                    // Relative velocity along normal axis
                    const rvx = p2.vx - p1.vx;
                    const rvy = p2.vy - p1.vy;
                    const velAlongNormal = rvx * nx + rvy * ny;

                    // Only apply impulse if objects are moving towards each other
                    if (velAlongNormal < 0) {
                        const e = Math.min(p1.elasticity, p2.elasticity);
                        const jImpulse = -(1 + e) * velAlongNormal / (1 / p1.mass + 1 / p2.mass);

                        // Adjust velocities
                        p1.vx -= (jImpulse / p1.mass) * nx;
                        p1.vy -= (jImpulse / p1.mass) * ny;
                        p2.vx += (jImpulse / p2.mass) * nx;
                        p2.vy += (jImpulse / p2.mass) * ny;
                    }
                }
            }
        }
    }

    handlePlanetMerge(p1, p2) {
        // Mark both for deletion to prevent duplicate triggers
        p1.shouldDelete = true;
        p2.shouldDelete = true;

        // Midpoint of collision for spawning the new evolved planet
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;

        const nextLevel = p1.level + 1;

        // Apply conservation of momentum + slightly upward bounce!
        const totalMass = p1.mass + p2.mass;
        const newVx = (p1.mass * p1.vx + p2.mass * p2.vx) / totalMass;
        // Small upward boost (-0.8vy) to make merges pop beautifully
        const newVy = ((p1.mass * p1.vy + p2.mass * p2.vy) / totalMass) - 0.8;

        // Spawn merged planet
        const mergedPlanet = new PhysicsPlanet(midX, midY, nextLevel);
        mergedPlanet.vx = newVx;
        mergedPlanet.vy = newVy;
        this.addPlanet(mergedPlanet);

        // Notify Game manager (audio, score, haptics, particle effects)
        if (this.onMergeCallback) {
            this.onMergeCallback(midX, midY, nextLevel);
        }
    }
}

// Explicit global exports for other modules
window.PhysicsWorld = PhysicsWorld;
window.PhysicsPlanet = PhysicsPlanet;
window.PLANET_PRESETS = PLANET_PRESETS;
