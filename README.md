# 🕹️ PixelPulse — Web Arcade Playground

A modular, multi-game **Retro Arcade Playground** built with **Vanilla JavaScript**, **HTML5 Canvas**, and a real-time **Live Game Customizer Engine**.

Designed using a clean **Cartridge / Plugin Architecture** where a central Arcade Hub orchestrates shared rendering loops, procedural Web Audio synthesis, particle effects, high-score persistence, and per-game live settings.

---

## 🎮 Included Arcade Cartridges & Live Customizations

### 1. 🧱 Block Breaker (`BreakoutGame`)
- **Mechanics:** Circle-to-AABB collision physics, dynamic paddle deflection angles (`-66°` to `+66°`), 5 power-ups (`Multi-Ball`, `Wide Paddle`, `Laser Cannon`, `Fireball`, `Extra Life`), recursive TNT chain-reaction bricks, and a **Custom Level Editor**.
- **Live Customizer Options:**
  - Ball Speed slider (`4.0` to `11.0`)
  - Paddle Size (`Compact`, `Normal`, `Wide`)
  - Paddle Color Swatches (Sky, Mint, Coral, Gold, Lavender)
  - Power-Up Drop Rate (`Low`, `Normal`, `Chaos!`)

### 2. 🐍 Cyber Snake (`SnakeGame`)
- **Mechanics:** Grid-based queue segment movement, multi-tier fruits (Apples, Power Plums, Golden Berries), self-collision detection, and portal boundary math.
- **Live Customizer Options:**
  - Snake Color Palette
  - Movement Speed (`Chill`, `Normal`, `Fast`, `Hyper`)
  - Arena Wall Mode (`Solid Walls` vs. `Portal Wrap-Around`)
  - Simultaneous Fruits (`1 Fruit`, `3 Fruits`, `5 Feast!`)

### 3. 🏓 Pong Arena (`PongGame`)
- **Mechanics:** Autonomous tracking AI with difficulty scaling, local 2-player keyboard support, and rally-based velocity acceleration.
- **Live Customizer Options:**
  - Match Mode (`1P vs AI` or `2P Keyboard`)
  - AI Difficulty (`Easy`, `Medium`, `Pro AI`)
  - Serve Ball Speed (`5.0` to `11.0`)
  - Player Paddle Color & Target Score (`5`, `7`, `11` pts)

### 4. 👾 Space Defender (`SpaceDefenderGame`)
- **Mechanics:** Classic wave-based alien formation movement, destructible energy bunkers, starfield parallax, and multi-mode laser weapons.
- **Live Customizer Options:**
  - Starfighter Color Palette
  - Weapon System (`Standard`, `Rapid Fire`, `Twin Laser`)
  - Alien Fleet Speed (`Chill`, `Normal`, `Blitz`)

---

## 📂 Project Architecture

```text
neon-breakout/
├── index.html          # Landing page (Kinetic Neo-Brutalism, single file)
├── play.html           # Arcade cabinet shell, game tabs & live customizer sidebar
├── style.css           # Clean, modern retro-pop arcade theme
├── server.js           # Zero-dependency Node.js local static server
└── src/
    ├── game.js         # ArcadePlaygroundHub controller + BreakoutGame cartridge
    ├── entities.js     # OOP classes for Block Breaker (Paddle, Ball, Brick, PowerUp, Laser)
    ├── snake.js        # SnakeGame cartridge engine
    ├── pong.js         # PongGame cartridge engine (1P AI & 2P local)
    ├── invaders.js     # SpaceDefenderGame cartridge engine
    ├── levels.js       # Campaign stage matrices & Level Editor persistence
    ├── particles.js    # Shared particle explosions, floating text & screen shake
    └── audio.js        # Procedural Web Audio API sound synthesizer
```

---

## 🚀 How to Run

1. **Direct Browser Launch:** Double-click `play.html` in File Explorer to play immediately in any browser (`index.html` is the landing page).
2. **Local Dev Server:** Run `node server.js` and open `http://localhost:3000` for the landing page or `http://localhost:3000/play.html` to play.

---

## 🏆 Global Ranking (Vercel)

When deployed on Vercel, the arcade shows a global leaderboard per game. Players submit their score with just a name, no account needed.

- `api/scores.mjs`: Vercel Function. `GET /api/scores?game=breakout` returns the top 10; `POST /api/scores` saves a score.
- Database: Neon Postgres from the Vercel Marketplace (`DATABASE_URL`).
- Pong ranks the longest rally against the AI.
- Daily Challenge (`api/daily.mjs`): a Block Breaker level generated from the UTC date, the same for everyone, with locked speed, paddle and power-ups and its own ranking.
- Shared levels (`api/levels.mjs`, `src/share.js`): the Block Breaker editor can publish a level and get a `play.html?level=CODE` link. Custom and shared levels don't count for the global ranking.
- Optional sign-in with Clerk (`api/config.mjs`, `src/auth.js`). Signed-in players submit with their account name and get a ✓ badge. Guests can still play and submit with any name.
- On GitHub Pages or when opening the file directly there is no API, so the panel hides itself and the arcade works as before.

Create the table once:

```bash
vercel env pull .env.local --yes
npm install
npm run db:init
```
