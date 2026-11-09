/**
 * Game Cartridge #4: Space Defender (Arcade Invaders)
 * Features customizable ship color, laser fire rate, alien march speed, and protective bunkers.
 */
class SpaceDefenderGame {
  constructor(canvas, sound, effects, onHudUpdate, onStateChange) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;
    this.sound = sound;
    this.effects = effects;
    this.onHudUpdate = onHudUpdate;
    this.onStateChange = onStateChange;

    this.config = {
      shipColor: '#B48BC4',  // Lavender default
      fireRate: 'normal',    // 'normal' | 'rapid' | 'twin'
      alienSpeed: 1,
    };

    this.highScore = Number(localStorage.getItem('arcade_invaders_highscore') || 0);
    this.keys = { left: false, right: false, shoot: false };
    this.stars = Array.from({ length: 55 }, () => ({
      x: Math.random() * this.width,
      y: Math.random() * this.height,
      size: 1 + Math.random() * 2,
      speed: 0.3 + Math.random() * 0.7,
    }));

    this.reset();
  }

  reset() {
    this.score = 0;
    this.lives = 3;
    this.wave = 1;
    this.ship = {
      x: this.width / 2,
      y: this.height - 42,
      width: 46,
      height: 24,
      speed: 7.5,
    };
    this.bullets = [];
    this.alienBullets = [];
    this.cooldown = 0;
    this.buildWave();
    this.buildBunkers();
    this.notifyHud();
  }

  buildBunkers() {
    this.bunkers = [];
    const count = 4;
    const spacing = this.width / (count + 1);
    for (let i = 1; i <= count; i++) {
      this.bunkers.push({
        x: spacing * i - 36,
        y: this.height - 115,
        width: 72,
        height: 18,
        hp: 10,
        maxHp: 10,
      });
    }
  }

  buildWave() {
    this.aliens = [];
    const rows = 4;
    const cols = 9;
    const startX = 110;
    const startY = 64;
    const gapX = 72;
    const gapY = 46;
    const rowColors = ['#FF7E5F', '#FFFDF9', '#FEB47B', '#F5AB99'];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        this.aliens.push({
          x: startX + c * gapX,
          y: startY + r * gapY,
          width: 38,
          height: 26,
          color: rowColors[r % rowColors.length],
          points: (rows - r) * 20,
          alive: true,
        });
      }
    }
    this.alienDir = 1;
    this.alienStepFrame = 0;
  }

  applyConfig(newConfig) {
    Object.assign(this.config, newConfig);
    this.notifyHud();
  }

  handleKeyDown(e) {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.keys.left = true;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.keys.right = true;
    if (e.code === 'Space') {
      this.keys.shoot = true;
      e.preventDefault();
    }
  }

  handleKeyUp(e) {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.keys.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.keys.right = false;
    if (e.code === 'Space') this.keys.shoot = false;
  }

  handleMouseMove(mouseX) {
    this.ship.x = Math.max(36, Math.min(this.width - 36, mouseX));
  }

  handleClick() {
    this.fireLaser();
  }

  fireLaser() {
    if (this.cooldown > 0) return;
    if (this.config.fireRate === 'twin') {
      this.bullets.push({ x: this.ship.x - 14, y: this.ship.y - 12, vy: -10 });
      this.bullets.push({ x: this.ship.x + 14, y: this.ship.y - 12, vy: -10 });
      this.cooldown = 16;
    } else if (this.config.fireRate === 'rapid') {
      this.bullets.push({ x: this.ship.x, y: this.ship.y - 14, vy: -11.5 });
      this.cooldown = 9;
    } else {
      this.bullets.push({ x: this.ship.x, y: this.ship.y - 14, vy: -10 });
      this.cooldown = 17;
    }
    this.sound.laserShoot();
  }

  notifyHud() {
    this.onHudUpdate({
      score: this.score,
      highScore: this.highScore,
      stat1Label: 'WAVE',
      stat1Value: `${this.wave}`,
      stat2Label: 'SHIELDS',
      stat2Value: '♥'.repeat(Math.max(0, this.lives)),
      stat3Label: 'WEAPON',
      stat3Value: this.config.fireRate.toUpperCase(),
    });
  }

  update() {
    // Move background stars
    this.stars.forEach((s) => {
      s.y += s.speed;
      if (s.y > this.height) {
        s.y = 0;
        s.x = Math.random() * this.width;
      }
    });

    if (this.keys.left) {
      this.ship.x = Math.max(36, this.ship.x - this.ship.speed);
    }
    if (this.keys.right) {
      this.ship.x = Math.min(this.width - 36, this.ship.x + this.ship.speed);
    }
    if (this.cooldown > 0) this.cooldown--;
    if (this.keys.shoot) {
      this.fireLaser();
    }

    // Move player bullets
    this.bullets.forEach((b) => {
      b.y += b.vy;
      for (const alien of this.aliens) {
        if (!alien.alive) continue;
        if (
          b.x >= alien.x &&
          b.x <= alien.x + alien.width &&
          b.y >= alien.y &&
          b.y <= alien.y + alien.height
        ) {
          alien.alive = false;
          b.dead = true;
          this.score += alien.points;
          if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('arcade_invaders_highscore', String(this.highScore));
          }
          this.sound.brickBreak(2);
          this.effects.spawnExplosion(
            alien.x + alien.width / 2,
            alien.y + alien.height / 2,
            alien.color,
            14,
            0.9
          );
          this.notifyHud();
          break;
        }
      }
    });
    this.bullets = this.bullets.filter((b) => !b.dead && b.y > -15);

    // Move Aliens
    const aliveAliens = this.aliens.filter((a) => a.alive);
    if (aliveAliens.length === 0) {
      this.wave++;
      this.sound.levelWin();
      this.buildWave();
      this.notifyHud();
      return;
    }

    const speedMultiplier =
      (1.1 + (1 - aliveAliens.length / 36) * 1.8 + (this.wave - 1) * 0.25) *
      Number(this.config.alienSpeed);

    let hitEdge = false;
    aliveAliens.forEach((a) => {
      a.x += this.alienDir * speedMultiplier;
      if (a.x + a.width >= this.width - 24 || a.x <= 24) {
        hitEdge = true;
      }
    });

    if (hitEdge) {
      this.alienDir = -this.alienDir;
      aliveAliens.forEach((a) => {
        a.y += 18;
        if (a.y + a.height >= this.ship.y - 8) {
          this.lives = 0;
          this.triggerGameOver('The alien fleet reached your homeworld!');
        }
      });
    }

    // Alien shooting
    if (Math.random() < 0.022 * Number(this.config.alienSpeed)) {
      const shooter = aliveAliens[Math.floor(Math.random() * aliveAliens.length)];
      this.alienBullets.push({
        x: shooter.x + shooter.width / 2,
        y: shooter.y + shooter.height,
        vy: 5.2,
      });
    }

    // Update alien bullets
    this.alienBullets.forEach((ab) => {
      ab.y += ab.vy;

      // Check bunker hit
      for (const bunker of this.bunkers) {
        if (bunker.hp <= 0) continue;
        if (
          ab.x >= bunker.x &&
          ab.x <= bunker.x + bunker.width &&
          ab.y >= bunker.y &&
          ab.y <= bunker.y + bunker.height
        ) {
          bunker.hp--;
          ab.dead = true;
          this.effects.spawnExplosion(ab.x, ab.y, '#F5AB99', 6, 0.6);
          break;
        }
      }

      // Check player ship hit
      if (
        !ab.dead &&
        ab.x >= this.ship.x - this.ship.width / 2 &&
        ab.x <= this.ship.x + this.ship.width / 2 &&
        ab.y >= this.ship.y - 10 &&
        ab.y <= this.ship.y + 14
      ) {
        ab.dead = true;
        this.lives--;
        this.sound.loseLife();
        this.effects.triggerShake(10, 5);
        this.effects.spawnExplosion(this.ship.x, this.ship.y, '#FF7E5F', 20, 1.1);
        this.notifyHud();
        if (this.lives <= 0) {
          this.triggerGameOver('Your starfighter shields were depleted!');
        }
      }
    });
    this.alienBullets = this.alienBullets.filter((ab) => !ab.dead && ab.y < this.height + 15);
  }

  triggerGameOver(reason) {
    this.onStateChange('GAME_OVER', {
      subtitle: 'SPACE DEFENDER // MISSION FAILED',
      title: 'GAME OVER',
      desc: `${reason} Reached Wave ${this.wave} | Score: ${this.score}`,
      buttonText: 'LAUNCH AGAIN (SPACE)',
    });
  }

  draw() {
    const ctx = this.ctx;
    ctx.fillStyle = '#351C4D';
    ctx.fillRect(0, 0, this.width, this.height);

    // Draw starfield
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    this.stars.forEach((s) => {
      ctx.fillRect(s.x, s.y, s.size, s.size);
    });

    // Draw Bunkers
    this.bunkers.forEach((b) => {
      if (b.hp <= 0) return;
      ctx.save();
      ctx.fillStyle = '#F5AB99';
      ctx.globalAlpha = 0.3 + (b.hp / b.maxHp) * 0.7;
      ctx.beginPath();
      ctx.roundRect(b.x, b.y, b.width, b.height, 5);
      ctx.fill();
      ctx.restore();
    });

    // Draw Aliens
    this.aliens.forEach((a) => {
      if (!a.alive) return;
      ctx.save();
      ctx.fillStyle = a.color;
      ctx.beginPath();
      ctx.roundRect(a.x, a.y, a.width, a.height, 6);
      ctx.fill();

      // Alien visor eyes
      ctx.fillStyle = '#351C4D';
      ctx.fillRect(a.x + 8, a.y + 8, 6, 6);
      ctx.fillRect(a.x + a.width - 14, a.y + 8, 6, 6);
      ctx.restore();
    });

    // Draw Player Ship
    ctx.save();
    ctx.fillStyle = this.config.shipColor;
    ctx.beginPath();
    ctx.moveTo(this.ship.x, this.ship.y - 14);
    ctx.lineTo(this.ship.x + this.ship.width / 2, this.ship.y + 12);
    ctx.lineTo(this.ship.x - this.ship.width / 2, this.ship.y + 12);
    ctx.closePath();
    ctx.fill();

    // Cockpit window
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(this.ship.x, this.ship.y + 2, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Draw Player Bullets
    ctx.fillStyle = '#FEB47B';
    this.bullets.forEach((b) => {
      ctx.fillRect(b.x - 2, b.y, 4, 12);
    });

    // Draw Alien Bullets
    ctx.fillStyle = '#FF7E5F';
    this.alienBullets.forEach((ab) => {
      ctx.fillRect(ab.x - 2, ab.y, 4, 10);
    });
  }
}
