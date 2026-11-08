const HIGH_SCORE_KEY = 'neon_breakout_highscore';

class NeonBreakoutGame {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.width = this.canvas.width;
    this.height = this.canvas.height;

    this.sound = new SoundEngine();
    this.effects = new EffectsManager();
    this.paddle = new Paddle(this.width, this.height);

    this.balls = [];
    this.bricks = [];
    this.powerUps = [];
    this.lasers = [];

    this.score = 0;
    this.highScore = Number(localStorage.getItem(HIGH_SCORE_KEY) || 0);
    this.lives = 3;
    this.combo = 1;
    this.currentLevelIndex = 0;
    this.isCustomLevel = false;

    // State: 'MENU' | 'PLAYING' | 'PAUSED' | 'LEVEL_CLEAR' | 'GAME_OVER' | 'VICTORY'
    this.state = 'MENU';
    this.keys = { left: false, right: false };

    // Timed Power-up Timers (in frames @ 60fps)
    this.timers = {
      wide: 0,
      laser: 0,
      fire: 0,
    };
    this.laserCooldown = 0;

    this.bindUI();
    this.initLevelEditor();
    this.loadStage(0);
    this.updateHUD();

    requestAnimationFrame(() => this.loop());
  }

  bindUI() {
    // Keyboard controls
    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.keys.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.keys.right = true;

      if (e.code === 'Space') {
        e.preventDefault();
        if (this.state === 'MENU' || this.state === 'LEVEL_CLEAR' || this.state === 'GAME_OVER' || this.state === 'VICTORY') {
          this.handlePrimaryOverlayAction();
        } else if (this.state === 'PLAYING') {
          this.launchOrShoot();
        }
      }

      if (e.key === 'p' || e.key === 'P') {
        this.togglePause();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.keys.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.keys.right = false;
    });

    // Mouse / Touch controls on Canvas
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.width / rect.width;
      const mouseX = (e.clientX - rect.left) * scaleX;
      this.paddle.setCenterX(mouseX);
    });

    this.canvas.addEventListener('click', () => {
      if (this.state === 'PLAYING') {
        this.launchOrShoot();
      }
    });

    // Buttons
    document.getElementById('btn-start').addEventListener('click', () => {
      this.handlePrimaryOverlayAction();
    });

    document.getElementById('btn-pause').addEventListener('click', () => {
      this.togglePause();
    });

    document.getElementById('btn-sound').addEventListener('click', (e) => {
      const enabled = this.sound.toggle();
      e.currentTarget.textContent = enabled ? '🔊' : '🔇';
    });

    // Stage selector buttons
    document.querySelectorAll('.stage-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.level);
        this.isCustomLevel = false;
        this.score = 0;
        this.lives = 3;
        this.loadStage(idx);
        this.startPlaying();
      });
    });
  }

  initLevelEditor() {
    const modal = document.getElementById('editor-modal');
    const gridEl = document.getElementById('editor-grid');
    let selectedType = 1;
    let isPainting = false;
    let customGrid = loadCustomGrid();

    const renderGrid = () => {
      gridEl.innerHTML = '';
      for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          const cell = document.createElement('div');
          cell.className = 'editor-cell';
          cell.dataset.type = customGrid[r][c];
          const paint = () => {
            customGrid[r][c] = selectedType;
            cell.dataset.type = selectedType;
            saveCustomGrid(customGrid);
          };
          cell.addEventListener('mousedown', () => {
            isPainting = true;
            paint();
          });
          cell.addEventListener('mouseenter', () => {
            if (isPainting) paint();
          });
          gridEl.appendChild(cell);
        }
      }
    };

    window.addEventListener('mouseup', () => {
      isPainting = false;
    });

    document.querySelectorAll('.palette-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.palette-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        selectedType = Number(btn.dataset.type);
      });
    });

    const openEditor = () => {
      this.state = 'PAUSED';
      customGrid = loadCustomGrid();
      renderGrid();
      modal.classList.remove('hidden');
      modal.classList.add('active');
    };

    const closeEditor = () => {
      modal.classList.remove('active');
      modal.classList.add('hidden');
    };

    document.getElementById('btn-editor').addEventListener('click', openEditor);
    document.getElementById('btn-open-editor-overlay').addEventListener('click', openEditor);
    document.getElementById('btn-close-editor').addEventListener('click', closeEditor);

    document.getElementById('btn-clear-grid').addEventListener('click', () => {
      customGrid = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(0));
      saveCustomGrid(customGrid);
      renderGrid();
    });

    document.getElementById('btn-mirror-grid').addEventListener('click', () => {
      for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < Math.floor(GRID_COLS / 2); c++) {
          customGrid[r][GRID_COLS - 1 - c] = customGrid[r][c];
        }
      }
      saveCustomGrid(customGrid);
      renderGrid();
    });

    document.getElementById('btn-play-custom').addEventListener('click', () => {
      // Ensure at least one breakable brick exists
      const hasBreakable = customGrid.some((row) => row.some((cell) => cell > 0 && cell !== 9));
      if (!hasBreakable) {
        customGrid[0][5] = 1;
      }
      saveCustomGrid(customGrid);
      closeEditor();
      this.isCustomLevel = true;
      this.score = 0;
      this.lives = 3;
      this.buildBricksFromGrid(customGrid);
      this.resetTurn();
      this.startPlaying();
    });
  }

  loadStage(index) {
    this.currentLevelIndex = index;
    document.querySelectorAll('.stage-btn').forEach((b, i) => {
      b.classList.toggle('active', i === index && !this.isCustomLevel);
    });

    const stage = LEVELS[index];
    this.buildBricksFromGrid(stage.grid);
    this.resetTurn();
    this.updateHUD();
  }

  buildBricksFromGrid(grid) {
    this.bricks = [];
    const paddingX = 48;
    const paddingTop = 58;
    const gap = 8;
    const totalAvailableWidth = this.width - paddingX * 2 - gap * (GRID_COLS - 1);
    const brickWidth = totalAvailableWidth / GRID_COLS;
    const brickHeight = 24;

    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const type = grid[r][c];
        if (type > 0) {
          const x = paddingX + c * (brickWidth + gap);
          const y = paddingTop + r * (brickHeight + gap);
          this.bricks.push(new Brick(r, c, x, y, brickWidth, brickHeight, type));
        }
      }
    }
  }

  resetTurn() {
    this.paddle.reset();
    this.timers = { wide: 0, laser: 0, fire: 0 };
    this.powerUps = [];
    this.lasers = [];
    this.combo = 1;
    const speed = 6.6 + this.currentLevelIndex * 0.35;
    this.balls = [
      new Ball(this.paddle.x + this.paddle.width / 2, this.paddle.y - 10, speed),
    ];
    this.updatePowerUpHUD();
    this.updateHUD();
  }

  startPlaying() {
    this.sound.init();
    this.state = 'PLAYING';
    document.getElementById('overlay').classList.remove('active');
    this.updateHUD();
  }

  handlePrimaryOverlayAction() {
    if (this.state === 'MENU') {
      this.startPlaying();
    } else if (this.state === 'PAUSED') {
      this.startPlaying();
    } else if (this.state === 'LEVEL_CLEAR') {
      this.loadStage(this.currentLevelIndex + 1);
      this.startPlaying();
    } else if (this.state === 'GAME_OVER' || this.state === 'VICTORY') {
      this.score = 0;
      this.lives = 3;
      if (this.isCustomLevel) {
        this.buildBricksFromGrid(loadCustomGrid());
        this.resetTurn();
      } else {
        this.loadStage(0);
      }
      this.startPlaying();
    }
  }

  togglePause() {
    if (this.state === 'PLAYING') {
      this.state = 'PAUSED';
      this.showOverlay(
        'GAME PAUSED',
        'PAUSED',
        'Take a breather! Press Space or click below to jump back in.',
        'RESUME GAME (SPACE)'
      );
    } else if (this.state === 'PAUSED') {
      this.startPlaying();
    }
  }

  showOverlay(subtitle, title, desc, buttonText) {
    document.getElementById('overlay-subtitle').textContent = subtitle;
    document.getElementById('overlay-title').textContent = title;
    document.getElementById('overlay-desc').textContent = desc;
    document.getElementById('btn-start').textContent = buttonText;
    document.getElementById('overlay').classList.add('active');
  }

  launchOrShoot() {
    let launchedAny = false;
    this.balls.forEach((b) => {
      if (b.attached) {
        b.launch();
        launchedAny = true;
      }
    });
    if (launchedAny) {
      this.sound.paddleHit();
      return;
    }

    // Fire twin lasers if laser power-up is active
    if (this.paddle.laserActive && this.laserCooldown <= 0) {
      this.lasers.push(new Laser(this.paddle.x + 7, this.paddle.y - 8));
      this.lasers.push(new Laser(this.paddle.x + this.paddle.width - 7, this.paddle.y - 8));
      this.laserCooldown = 16;
      this.sound.laserShoot();
    }
  }

  applyPowerUp(typeId) {
    this.sound.powerUp();

    if (typeId === 'MULTI') {
      const sourceBall = this.balls[0];
      if (sourceBall && this.balls.length < 6) {
        for (const offset of [-0.35, 0.35]) {
          const clone = new Ball(sourceBall.x, sourceBall.y, sourceBall.speed);
          clone.attached = false;
          clone.fireball = this.timers.fire > 0;
          const angle = Math.atan2(sourceBall.vy, sourceBall.vx) + offset;
          clone.vx = Math.cos(angle) * clone.speed;
          clone.vy = -Math.abs(Math.sin(angle) * clone.speed);
          this.balls.push(clone);
        }
      }
    } else if (typeId === 'WIDE') {
      this.paddle.width = 185;
      this.timers.wide = 60 * 12; // 12 seconds
    } else if (typeId === 'LASER') {
      this.paddle.laserActive = true;
      this.timers.laser = 60 * 10; // 10 seconds
    } else if (typeId === 'FIRE') {
      this.timers.fire = 60 * 8; // 8 seconds
      this.balls.forEach((b) => (b.fireball = true));
    } else if (typeId === 'LIFE') {
      this.lives = Math.min(5, this.lives + 1);
    }

    this.updatePowerUpHUD();
    this.updateHUD();
  }

  detonateBrick(sourceBrick) {
    this.sound.explosion();
    this.effects.triggerShake(14, 8);
    this.effects.spawnExplosion(
      sourceBrick.x + sourceBrick.width / 2,
      sourceBrick.y + sourceBrick.height / 2,
      '#ef4444',
      32,
      1.6
    );

    // Damage all neighbors within 1 grid cell radius
    this.bricks.forEach((other) => {
      if (!other.alive || other === sourceBrick) return;
      const rowDist = Math.abs(other.row - sourceBrick.row);
      const colDist = Math.abs(other.col - sourceBrick.col);
      if (rowDist <= 1 && colDist <= 1) {
        const destroyed = other.hit(true);
        if (destroyed) {
          this.onBrickDestroyed(other);
        }
      }
    });
  }

  onBrickDestroyed(brick) {
    const cx = brick.x + brick.width / 2;
    const cy = brick.y + brick.height / 2;
    const points = 50 * this.combo;
    this.score += points;

    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem(HIGH_SCORE_KEY, String(this.highScore));
    }

    this.effects.spawnExplosion(cx, cy, brick.getColor(), 18, 1);
    this.effects.spawnText(cx, cy, `+${points}${this.combo > 1 ? ` (${this.combo}x)` : ''}`, brick.getColor());

    // 22% chance to drop a Power-Up
    if (Math.random() < 0.22) {
      this.powerUps.push(new PowerUp(cx, cy));
    }

    if (brick.explosive) {
      this.detonateBrick(brick);
    }
  }

  update() {
    this.effects.update();
    if (this.state !== 'PLAYING') return;

    // Move paddle with keyboard
    if (this.keys.left) this.paddle.moveLeft();
    if (this.keys.right) this.paddle.moveRight();

    if (this.laserCooldown > 0) this.laserCooldown--;

    // Update power-up durations
    let timerChanged = false;
    if (this.timers.wide > 0) {
      this.timers.wide--;
      if (this.timers.wide === 0) {
        this.paddle.width = this.paddle.baseWidth;
        timerChanged = true;
      }
    }
    if (this.timers.laser > 0) {
      this.timers.laser--;
      if (this.timers.laser === 0) {
        this.paddle.laserActive = false;
        timerChanged = true;
      }
    }
    if (this.timers.fire > 0) {
      this.timers.fire--;
      if (this.timers.fire === 0) {
        this.balls.forEach((b) => (b.fireball = false));
        timerChanged = true;
      }
    }
    if (timerChanged || (this.timers.wide + this.timers.laser + this.timers.fire) % 30 === 0) {
      this.updatePowerUpHUD();
    }

    // Update balls
    this.balls.forEach((ball) => {
      const event = ball.update(this.paddle, this.width);
      if (event === 'wall') {
        this.sound.wallHit();
      }

      // Paddle collision check
      if (
        !ball.attached &&
        ball.vy > 0 &&
        ball.x + ball.radius >= this.paddle.x &&
        ball.x - ball.radius <= this.paddle.x + this.paddle.width &&
        ball.y + ball.radius >= this.paddle.y &&
        ball.y - ball.radius <= this.paddle.y + this.paddle.height
      ) {
        // Calculate deflection angle based on where the ball hit the paddle (-1 to +1)
        const hitOffset =
          (ball.x - (this.paddle.x + this.paddle.width / 2)) / (this.paddle.width / 2);
        const maxBounceAngle = (Math.PI * 68) / 180; // 68 degrees max
        const bounceAngle = hitOffset * maxBounceAngle;

        ball.vx = Math.sin(bounceAngle) * ball.speed;
        ball.vy = -Math.cos(bounceAngle) * ball.speed;
        ball.y = this.paddle.y - ball.radius - 1;
        this.combo = 1; // Reset combo on paddle touch
        this.sound.paddleHit();
        this.updateHUD();
      }

      // Brick collision check (Circle vs AABB)
      for (const brick of this.bricks) {
        if (!brick.alive) continue;

        const closestX = Math.max(brick.x, Math.min(ball.x, brick.x + brick.width));
        const closestY = Math.max(brick.y, Math.min(ball.y, brick.y + brick.height));
        const dx = ball.x - closestX;
        const dy = ball.y - closestY;

        if (dx * dx + dy * dy <= ball.radius * ball.radius) {
          // Reflect ball unless fireball piercing a breakable brick
          if (!ball.fireball || brick.indestructible) {
            const overlapLeft = ball.x + ball.radius - brick.x;
            const overlapRight = brick.x + brick.width - (ball.x - ball.radius);
            const overlapTop = ball.y + ball.radius - brick.y;
            const overlapBottom = brick.y + brick.height - (ball.y - ball.radius);
            const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

            if (minOverlap === overlapLeft || minOverlap === overlapRight) {
              ball.vx = -ball.vx;
            } else {
              ball.vy = -ball.vy;
            }
          }

          if (brick.indestructible) {
            this.sound.wallHit();
            this.effects.spawnExplosion(closestX, closestY, '#cbd5e1', 6, 0.6);
          } else {
            const destroyed = brick.hit(ball.fireball);
            if (destroyed) {
              this.sound.brickBreak(this.combo);
              this.effects.triggerShake(5, 3.5);
              this.onBrickDestroyed(brick);
              this.combo = Math.min(8, this.combo + 1);
            } else {
              this.sound.brickDamage(this.combo);
              this.score += 15 * this.combo;
              this.effects.spawnExplosion(closestX, closestY, brick.getColor(), 7, 0.7);
            }
            this.updateHUD();
          }
          break;
        }
      }
    });

    // Filter out fallen balls
    this.balls = this.balls.filter((b) => b.y - b.radius <= this.height);
    if (this.balls.length === 0) {
      this.lives--;
      this.sound.loseLife();
      this.effects.triggerShake(12, 7);
      this.updateHUD();

      if (this.lives <= 0) {
        this.state = 'GAME_OVER';
        this.showOverlay(
          'OUT OF LIVES',
          'GAME OVER',
          `Final Score: ${this.score.toLocaleString()} — Ready for another run?`,
          'PLAY AGAIN (SPACE)'
        );
      } else {
        this.resetTurn();
      }
      return;
    }

    // Update Power-Ups
    this.powerUps.forEach((p) => {
      p.update(this.height);
      if (
        p.alive &&
        p.x + p.width / 2 >= this.paddle.x &&
        p.x - p.width / 2 <= this.paddle.x + this.paddle.width &&
        p.y + p.height / 2 >= this.paddle.y &&
        p.y - p.height / 2 <= this.paddle.y + this.paddle.height
      ) {
        p.alive = false;
        this.effects.spawnText(this.paddle.x + this.paddle.width / 2, this.paddle.y - 12, p.info.label, p.info.color);
        this.applyPowerUp(p.info.id);
      }
    });
    this.powerUps = this.powerUps.filter((p) => p.alive);

    // Update Lasers
    this.lasers.forEach((laser) => {
      laser.update();
      for (const brick of this.bricks) {
        if (!brick.alive) continue;
        if (
          laser.x >= brick.x &&
          laser.x <= brick.x + brick.width &&
          laser.y >= brick.y &&
          laser.y <= brick.y + brick.height
        ) {
          laser.alive = false;
          if (!brick.indestructible) {
            const destroyed = brick.hit(false);
            if (destroyed) {
              this.sound.brickBreak(this.combo);
              this.onBrickDestroyed(brick);
            } else {
              this.sound.brickDamage(this.combo);
            }
            this.updateHUD();
          }
          break;
        }
      }
    });
    this.lasers = this.lasers.filter((l) => l.alive);

    // Check if all breakable bricks are cleared
    const remainingBreakable = this.bricks.some((b) => b.alive && !b.indestructible);
    if (!remainingBreakable) {
      this.sound.levelWin();
      if (this.isCustomLevel || this.currentLevelIndex >= LEVELS.length - 1) {
        this.state = 'VICTORY';
        this.showOverlay(
          'ALL STAGES CLEARED',
          'VICTORY!',
          `Incredible! You finished with ${this.score.toLocaleString()} points!`,
          'PLAY AGAIN (SPACE)'
        );
      } else {
        this.state = 'LEVEL_CLEAR';
        const nextStage = LEVELS[this.currentLevelIndex + 1];
        this.showOverlay(
          `STAGE ${this.currentLevelIndex + 1} COMPLETE`,
          nextStage.name.toUpperCase(),
          nextStage.subtitle,
          'NEXT STAGE (SPACE)'
        );
      }
    }
  }

  updatePowerUpHUD() {
    const bar = document.getElementById('powerup-bar');
    bar.innerHTML = '';
    const items = [
      { key: 'wide', label: '↔️ Wide', color: '#22c55e' },
      { key: 'laser', label: '🔫 Laser (Click/Space)', color: '#f43f5e' },
      { key: 'fire', label: '🔥 Fireball', color: '#fb923c' },
    ];
    items.forEach((item) => {
      const frames = this.timers[item.key];
      if (frames > 0) {
        const secs = Math.ceil(frames / 60);
        const tag = document.createElement('div');
        tag.className = 'active-powerup-tag';
        tag.style.borderColor = item.color;
        tag.textContent = `${item.label}: ${secs}s`;
        bar.appendChild(tag);
      }
    });
  }

  updateHUD() {
    document.getElementById('score-display').textContent = this.score.toLocaleString();
    document.getElementById('highscore-display').textContent = this.highScore.toLocaleString();
    document.getElementById('combo-display').textContent = `${this.combo}x`;
    document.getElementById('level-display').textContent = this.isCustomLevel
      ? 'CUSTOM'
      : `${this.currentLevelIndex + 1} / ${LEVELS.length}`;
    document.getElementById('lives-display').textContent = '♥'.repeat(Math.max(0, this.lives));
  }

  drawBackgroundGrid() {
    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(56, 189, 248, 0.045)';
    this.ctx.lineWidth = 1;
    const step = 45;
    for (let x = 0; x < this.width; x += step) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.height);
      this.ctx.stroke();
    }
    for (let y = 0; y < this.height; y += step) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.width, y);
      this.ctx.stroke();
    }
    this.ctx.restore();
  }

  draw() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    this.ctx.save();
    this.effects.applyScreenShake(this.ctx);

    this.drawBackgroundGrid();

    this.bricks.forEach((b) => b.draw(this.ctx));
    this.powerUps.forEach((p) => p.draw(this.ctx));
    this.lasers.forEach((l) => l.draw(this.ctx));
    this.paddle.draw(this.ctx);
    this.balls.forEach((b) => b.draw(this.ctx));
    this.effects.draw(this.ctx);

    this.ctx.restore();
  }

  loop() {
    this.update();
    this.draw();
    requestAnimationFrame(() => this.loop());
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new NeonBreakoutGame();
});
