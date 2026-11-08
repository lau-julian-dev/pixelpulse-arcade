# ⚡ Neon Breakout — HTML5 Canvas & 2D Physics Engine

A modular, zero-dependency arcade **Breakout / Brick Breaker** game built with **Vanilla JavaScript (ES6 Modules)**, **HTML5 Canvas**, and the **Web Audio API**.

Designed with clean Object-Oriented Programming (OOP) principles, custom 2D collision detection, particle dynamics, and an interactive **Custom Level Editor**.

---

## ✨ Key Engineering Features

- **2D Physics & Collision Resolution:**
  - Circle-to-AABB (Axis-Aligned Bounding Box) collision detection with penetration-depth overlap resolution for accurate horizontal/vertical reflections.
  - Angle-based paddle deflection math (`-68°` to `+68°` dynamic bounce vector based on impact offset from paddle center).
- **Object-Oriented Entity System (`src/entities.js`):**
  - Encapsulated classes for [`Paddle`](./src/entities.js), [`Ball`](./src/entities.js), [`Brick`](./src/entities.js), [`PowerUp`](./src/entities.js), and [`Laser`](./src/entities.js).
  - Supports multi-hit armored bricks, indestructible steel barriers, and recursive chain-reaction **TNT explosive bricks**.
- **5 Power-Up Systems:**
  - `⚡ MULTI-BALL` (trigonometric velocity vector splitting)
  - `↔️ WIDE PADDLE` (timed paddle expansion)
  - `🔫 LASER CANNON` (dual projectile emitters)
  - `🔥 FIREBALL` (piercing trajectories that slice through bricks without reflecting)
  - `❤️ EXTRA LIFE`
- **Interactive Level Editor (`src/levels.js`):**
  - Paint custom $8 \times 11$ brick matrices, mirror layouts symmetrically, persist designs to `localStorage`, and playtest immediately.
- **Procedural Audio Synthesizer (`src/audio.js`):**
  - Real-time retro sound effects synthesized via Web Audio API oscillators and exponential frequency ramps (zero external audio files).
- **Particle & Camera Shake Engine (`src/particles.js`):**
  - Gravity-affected spark particles, motion trails, combo multiplier popups, and screen-shake feedback.

---

## 📂 Project Structure

```text
neon-breakout/
├── index.html          # Main viewport, HUD, and Level Editor modal
├── style.css           # Cyberpunk/Neon glassmorphism UI styling
├── README.md           # Documentation & architecture overview
└── src/
    ├── game.js         # Core game loop (requestAnimationFrame), state machine & collisions
    ├── entities.js     # OOP classes: Paddle, Ball, Brick, PowerUp, Laser
    ├── particles.js    # Particle system, floating combat text & screen shake
    ├── levels.js       # 5 built-in campaign stages + Level Editor persistence
    └── audio.js        # Web Audio API procedural sound synthesizer
```

---

## 🚀 Getting Started (Run Locally)

**Option 1: Open Directly in Your Browser**
Simply double-click `index.html` to play immediately in any modern browser!

**Option 2: Run Local Dev Server**
```bash
node server.js
```
Then open **`http://localhost:3000`** in your browser.
