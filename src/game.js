/**
 * Game Cartridge #1: Block Breaker (Breakout)
 * + Master Arcade Playground Hub Controller
 */

class BreakoutGame {
  constructor(canvas, sound, effects, onHudUpdate, onStateChange) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;
    this.sound = sound;
    this.effects = effects;
    this.onHudUpdate = onHudUpdate;
    this.onStateChange = onStateChange;

    this.paddle = new Paddle(this.width, this.height);
    this.config = {
      ballSpeed: 6.5,
      paddleBaseWidth: 128,
      paddleColor: '#FEB47B',
      powerUpChance: 0.24,
    };

    this.balls = [];
    this.bricks = [];
    this.powerUps = [];
    this.lasers = [];

    this.score = 0;
    this.highScore = Number(localStorage.getItem('neon_breakout_highscore') || 0);
    this.lives = 3;
    this.combo = 1;
    this.currentLevelIndex = 0;
    this.isCustomLevel = false;
    this.customGrid = null; // nivel personalizado activo (editor o reto diario)
    this.daily = null; // reto diario activo: { date, name, grid, config }
    this.configBeforeDaily = null;

    this.keys = { left: false, right: false };
    this.timers = { wide: 0, laser: 0, fire: 0 };
    this.laserCooldown = 0;

    this.loadStage(0);
  }

  applyConfig(newConfig, force = false) {
    // En el reto diario la velocidad, la paleta y los power-ups son iguales para todos.
    if (this.daily && !force) {
      newConfig = newConfig.paddleColor ? { paddleColor: newConfig.paddleColor } : {};
    }
    Object.assign(this.config, newConfig);
    this.paddle.color = this.config.paddleColor;
    this.paddle.baseWidth = Number(this.config.paddleBaseWidth);
    if (this.timers.wide === 0) {
      this.paddle.width = this.paddle.baseWidth;
    }
    this.balls.forEach((b) => b.setSpeed(Number(this.config.ballSpeed)));
    this.notifyHud();
  }

  reset() {
    this.score = 0;
    this.lives = 3;
    if (this.isCustomLevel) {
      this.buildBricksFromGrid(this.customGrid || loadCustomGrid());
      this.resetTurn();
    } else {
      this.loadStage(this.currentLevelIndex);
    }
  }

  loadStage(index) {
    this.exitDaily();
    this.currentLevelIndex = index;
    this.isCustomLevel = false;
    document.querySelectorAll('.stage-btn').forEach((b, i) => {
      b.classList.toggle('active', i === index);
    });
    const stage = LEVELS[index];
    this.buildBricksFromGrid(stage.grid);
    this.resetTurn();
  }

  loadCustomStage(grid) {
    this.exitDaily();
    this.customGrid = grid;
    this.isCustomLevel = true;
    this.score = 0;
    this.lives = 3;
    document.querySelectorAll('.stage-btn').forEach((b) => b.classList.remove('active'));
    this.buildBricksFromGrid(grid);
    this.resetTurn();
  }

  /** Carga el reto diario con sus ajustes fijos. */
  loadDailyStage(daily) {
    if (!this.daily) this.configBeforeDaily = { ...this.config };
    this.daily = daily;
    this.applyConfig(daily.config, true);
    this.customGrid = daily.grid;
    this.isCustomLevel = true;
    this.score = 0;
    this.lives = 3;
    document.querySelectorAll('.stage-btn').forEach((b) => b.classList.remove('active'));
    this.buildBricksFromGrid(daily.grid);
    this.resetTurn();
  }

  /** Sale del reto diario y devuelve los ajustes que tenía el jugador. */
  exitDaily() {
    if (!this.daily) return;
    this.daily = null;
    if (this.configBeforeDaily) this.applyConfig(this.configBeforeDaily, true);
    this.configBeforeDaily = null;
  }

  buildBricksFromGrid(grid) {
    this.bricks = [];
    const paddingX = 48;
    const paddingTop = 54;
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
    this.paddle.baseWidth = Number(this.config.paddleBaseWidth);
    this.paddle.color = this.config.paddleColor;
    this.paddle.reset();
    this.timers = { wide: 0, laser: 0, fire: 0 };
    this.powerUps = [];
    this.lasers = [];
    this.combo = 1;
    const speed = Number(this.config.ballSpeed);
    this.balls = [
      new Ball(this.paddle.x + this.paddle.width / 2, this.paddle.y - 10, speed),
    ];
    this.updatePowerUpHUD();
    this.notifyHud();
  }

  handleKeyDown(e) {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.keys.left = true;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.keys.right = true;
    if (e.code === 'Space') {
      e.preventDefault();
      this.launchOrShoot();
    }
  }

  handleKeyUp(e) {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.keys.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.keys.right = false;
  }

  handleMouseMove(mouseX) {
    this.paddle.setCenterX(mouseX);
  }

  handleClick() {
    this.launchOrShoot();
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

    if (this.paddle.laserActive && this.laserCooldown <= 0) {
      this.lasers.push(new Laser(this.paddle.x + 7, this.paddle.y - 8));
      this.lasers.push(new Laser(this.paddle.x + this.paddle.width - 7, this.paddle.y - 8));
      this.laserCooldown = 15;
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
      this.paddle.width = Math.min(240, this.paddle.baseWidth + 56);
      this.timers.wide = 60 * 12;
    } else if (typeId === 'LASER') {
      this.paddle.laserActive = true;
      this.timers.laser = 60 * 10;
    } else if (typeId === 'FIRE') {
      this.timers.fire = 60 * 8;
      this.balls.forEach((b) => (b.fireball = true));
    } else if (typeId === 'LIFE') {
      this.lives = Math.min(5, this.lives + 1);
    }

    this.updatePowerUpHUD();
    this.notifyHud();
  }

  detonateBrick(sourceBrick) {
    this.sound.explosion();
    this.effects.triggerShake(10, 6);
    this.effects.spawnExplosion(
      sourceBrick.x + sourceBrick.width / 2,
      sourceBrick.y + sourceBrick.height / 2,
      '#FF7E5F',
      24,
      1.4
    );

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
      localStorage.setItem('neon_breakout_highscore', String(this.highScore));
    }

    this.effects.spawnExplosion(cx, cy, brick.getColor(), 14, 1);
    this.effects.spawnText(
      cx,
      cy,
      `+${points}${this.combo > 1 ? ` (${this.combo}x)` : ''}`,
      brick.getColor()
    );

    if (Math.random() < Number(this.config.powerUpChance)) {
      this.powerUps.push(new PowerUp(cx, cy));
    }

    if (brick.explosive) {
      this.detonateBrick(brick);
    }
  }

  notifyHud() {
    this.onHudUpdate({
      score: this.score,
      highScore: this.highScore,
      stat1Label: 'COMBO',
      stat1Value: `${this.combo}x`,
      stat2Label: 'LIVES',
      stat2Value: '♥'.repeat(Math.max(0, this.lives)),
      stat3Label: 'STAGE',
      stat3Value: this.daily ? 'DAILY' : this.isCustomLevel ? 'CUSTOM' : `${this.currentLevelIndex + 1} / ${LEVELS.length}`,
    });
  }

  updatePowerUpHUD() {
    const bar = document.getElementById('powerup-bar');
    if (!bar) return;
    bar.innerHTML = '';
    const items = [
      { key: 'wide', label: '↔️ Wide', color: '#F5AB99' },
      { key: 'laser', label: '🔫 Laser (Space/Click)', color: '#FF7E5F' },
      { key: 'fire', label: '🔥 Fireball', color: '#FF9966' },
    ];
    items.forEach((item) => {
      const frames = this.timers[item.key];
      if (frames > 0) {
        const secs = Math.ceil(frames / 60);
        const tag = document.createElement('div');
        tag.className = 'active-powerup-tag';
        tag.style.background = item.color;
        tag.textContent = `${item.label}: ${secs}s`;
        bar.appendChild(tag);
      }
    });
  }

  update() {
    if (this.keys.left) this.paddle.moveLeft();
    if (this.keys.right) this.paddle.moveRight();
    if (this.laserCooldown > 0) this.laserCooldown--;

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

    this.balls.forEach((ball) => {
      const event = ball.update(this.paddle, this.width);
      if (event === 'wall') this.sound.wallHit();

      if (
        !ball.attached &&
        ball.vy > 0 &&
        ball.x + ball.radius >= this.paddle.x &&
        ball.x - ball.radius <= this.paddle.x + this.paddle.width &&
        ball.y + ball.radius >= this.paddle.y &&
        ball.y - ball.radius <= this.paddle.y + this.paddle.height
      ) {
        const hitOffset =
          (ball.x - (this.paddle.x + this.paddle.width / 2)) / (this.paddle.width / 2);
        const maxBounceAngle = (Math.PI * 66) / 180;
        const bounceAngle = hitOffset * maxBounceAngle;

        ball.vx = Math.sin(bounceAngle) * ball.speed;
        ball.vy = -Math.cos(bounceAngle) * ball.speed;
        ball.y = this.paddle.y - ball.radius - 1;
        this.combo = 1;
        this.sound.paddleHit();
        this.notifyHud();
      }

      for (const brick of this.bricks) {
        if (!brick.alive) continue;

        const closestX = Math.max(brick.x, Math.min(ball.x, brick.x + brick.width));
        const closestY = Math.max(brick.y, Math.min(ball.y, brick.y + brick.height));
        const dx = ball.x - closestX;
        const dy = ball.y - closestY;

        if (dx * dx + dy * dy <= ball.radius * ball.radius) {
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
            this.effects.spawnExplosion(closestX, closestY, '#E8DCEF', 5, 0.6);
          } else {
            const destroyed = brick.hit(ball.fireball);
            if (destroyed) {
              this.sound.brickBreak(this.combo);
              this.effects.triggerShake(4, 3);
              this.onBrickDestroyed(brick);
              this.combo = Math.min(8, this.combo + 1);
            } else {
              this.sound.brickDamage(this.combo);
              this.score += 15 * this.combo;
              this.effects.spawnExplosion(closestX, closestY, brick.getColor(), 6, 0.7);
            }
            this.notifyHud();
          }
          break;
        }
      }
    });

    this.balls = this.balls.filter((b) => b.y - b.radius <= this.height);
    if (this.balls.length === 0) {
      this.lives--;
      this.sound.loseLife();
      this.effects.triggerShake(9, 5);
      this.notifyHud();

      if (this.lives <= 0) {
        this.onStateChange('GAME_OVER', {
          subtitle: 'BLOCK BREAKER // OUT OF LIVES',
          title: 'GAME OVER',
          desc: `Final Score: ${this.score.toLocaleString()}. Ready to go again?`,
          buttonText: 'PLAY AGAIN (SPACE)',
        });
      } else {
        this.resetTurn();
      }
      return;
    }

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
        this.effects.spawnText(
          this.paddle.x + this.paddle.width / 2,
          this.paddle.y - 12,
          p.info.label,
          p.info.color
        );
        this.applyPowerUp(p.info.id);
      }
    });
    this.powerUps = this.powerUps.filter((p) => p.alive);

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
            this.notifyHud();
          }
          break;
        }
      }
    });
    this.lasers = this.lasers.filter((l) => l.alive);

    const remainingBreakable = this.bricks.some((b) => b.alive && !b.indestructible);
    if (!remainingBreakable) {
      this.sound.levelWin();
      if (this.isCustomLevel || this.currentLevelIndex >= LEVELS.length - 1) {
        this.onStateChange('VICTORY', {
          subtitle: this.daily ? `DAILY CHALLENGE // ${this.daily.name.toUpperCase()} CLEARED` : 'BLOCK BREAKER // ALL STAGES CLEARED',
          title: 'VICTORY!',
          desc: `Awesome run! You finished with ${this.score.toLocaleString()} points!`,
          buttonText: 'PLAY AGAIN (SPACE)',
        });
      } else {
        const nextIdx = this.currentLevelIndex + 1;
        this.loadStage(nextIdx);
        this.onStateChange('LEVEL_CLEAR', {
          subtitle: `STAGE ${nextIdx} UNLOCKED`,
          title: LEVELS[nextIdx].name.toUpperCase(),
          desc: LEVELS[nextIdx].subtitle,
          buttonText: 'START STAGE (SPACE)',
        });
      }
    }
  }

  draw() {
    const ctx = this.ctx;
    ctx.fillStyle = '#351C4D';
    ctx.fillRect(0, 0, this.width, this.height);

    // Subtle arcade dot matrix background
    ctx.fillStyle = 'rgba(255, 253, 249, 0.06)';
    for (let x = 30; x < this.width; x += 45) {
      for (let y = 30; y < this.height; y += 45) {
        ctx.fillRect(x, y, 2, 2);
      }
    }

    this.bricks.forEach((b) => b.draw(ctx));
    this.powerUps.forEach((p) => p.draw(ctx));
    this.lasers.forEach((l) => l.draw(ctx));
    this.paddle.draw(ctx);
    this.balls.forEach((b) => b.draw(ctx));
  }
}

/**
 * Master Arcade Playground Hub
 * Manages switching between games, shared rendering loop, overlay states, and live customizer controls.
 */
class ArcadePlaygroundHub {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.sound = new SoundEngine();
    this.effects = new EffectsManager();

    this.state = 'MENU'; // 'MENU' | 'PLAYING' | 'PAUSED' | 'LEVEL_CLEAR' | 'GAME_OVER' | 'VICTORY'
    this.activeGameKey = 'breakout';
    this.lastTime = performance.now();

    const hudCallback = (data) => this.renderHUD(data);
    const stateCallback = (newState, modalInfo) => this.handleCartridgeState(newState, modalInfo);

    this.cartridges = {
      breakout: new BreakoutGame(this.canvas, this.sound, this.effects, hudCallback, stateCallback),
      snake: new SnakeGame(this.canvas, this.sound, this.effects, hudCallback, stateCallback),
      pong: new PongGame(this.canvas, this.sound, this.effects, hudCallback, stateCallback),
      invaders: new SpaceDefenderGame(this.canvas, this.sound, this.effects, hudCallback, stateCallback),
    };

    this.gameMeta = {
      breakout: {
        badge: 'ARCADE CARTRIDGE #1',
        title: 'BLOCK BREAKER',
        desc: 'Bounce the ball, chain combos, collect power-ups, or tune your paddle and speed on the right!',
        controls: 'Move: <strong>Mouse</strong> or <strong>← / → / A / D</strong> &bull; Launch/Laser: <strong>Space / Click</strong> &bull; Pause: <strong>P</strong>',
        tip: 'Hit the ball near the edges of your paddle to angle your shots toward tough bricks!',
      },
      snake: {
        badge: 'ARCADE CARTRIDGE #2',
        title: 'CYBER SNAKE',
        desc: 'Collect apples, golden berries, and plums to grow longer without crashing into your tail!',
        controls: 'Steer: <strong>Arrow Keys</strong> or <strong>W / A / S / D</strong> &bull; Pause: <strong>P</strong>',
        tip: 'Try enabling "Portal Wrap" and "5 Feast!" in the right sidebar for a high-scoring frenzy!',
      },
      pong: {
        badge: 'ARCADE CARTRIDGE #3',
        title: 'PONG ARENA',
        desc: 'Fast-paced rally action! Face off against the adaptive AI or play 2-Player on one keyboard.',
        controls: '1P: <strong>Mouse / W / S / Arrows</strong> &bull; 2P Mode: <strong>W / S</strong> (Left) vs <strong>↑ / ↓</strong> (Right)',
        tip: 'Every consecutive paddle hit speeds up the rally—angle your shots to catch the AI off guard!',
      },
      invaders: {
        badge: 'ARCADE CARTRIDGE #4',
        title: 'SPACE DEFENDER',
        desc: 'Defend your homeworld from descending alien waves and take cover behind energy bunkers!',
        controls: 'Move: <strong>Mouse</strong> or <strong>← / → / A / D</strong> &bull; Fire Lasers: <strong>Space / Click</strong>',
        tip: 'Switch your Weapon System to "Twin Laser" or "Rapid" in the customizer panel for extra firepower!',
      },
    };

    this.bindGlobalEvents();
    this.bindCustomizerControls();
    this.initLevelEditor();
    this.initDailyChallenge();
    this.switchGame('breakout');
    this.openSharedLevel();

    requestAnimationFrame((t) => this.loop(t));
  }

  get currentGame() {
    return this.cartridges[this.activeGameKey];
  }

  switchGame(gameKey) {
    this.activeGameKey = gameKey;
    this.effects.clear();
    document.getElementById('powerup-bar').innerHTML = '';

    // Highlight active tab
    document.querySelectorAll('.game-tab').forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.game === gameKey);
    });

    // Show matching customizer panel
    ['breakout', 'snake', 'pong', 'invaders'].forEach((k) => {
      const panel = document.getElementById(`custom-${k}`);
      if (panel) panel.classList.toggle('hidden', k !== gameKey);
    });

    const meta = this.gameMeta[gameKey];
    document.getElementById('howto-text').textContent = meta.tip;
    document.getElementById('overlay-controls-hint').innerHTML = meta.controls;

    this.currentGame.reset();
    this.state = 'MENU';
    this.showOverlay(meta.badge, meta.title, meta.desc, '▶️ PLAY NOW (SPACE)');
    window.PPLeaderboard?.hideOffer();
    window.PPLeaderboard?.show(gameKey, this.rankingDaily());
  }

  renderHUD(data) {
    document.getElementById('hud-score').textContent = Number(data.score || 0).toLocaleString();
    document.getElementById('hud-highscore').textContent = Number(data.highScore || 0).toLocaleString();
    document.getElementById('hud-stat1-label').textContent = data.stat1Label || 'STAT';
    document.getElementById('hud-stat1-val').textContent = data.stat1Value || '-';
    document.getElementById('hud-stat2-label').textContent = data.stat2Label || 'STAT';
    document.getElementById('hud-stat2-val').textContent = data.stat2Value || '-';
    document.getElementById('hud-stat3-label').textContent = data.stat3Label || 'STAT';
    document.getElementById('hud-stat3-val').textContent = data.stat3Value || '-';
  }

  handleCartridgeState(newState, modalInfo) {
    this.state = newState;
    if (modalInfo) {
      this.showOverlay(modalInfo.subtitle, modalInfo.title, modalInfo.desc, modalInfo.buttonText);
    }
    if (newState === 'GAME_OVER' || newState === 'VICTORY') {
      window.PPLeaderboard?.offer(this.activeGameKey, this.rankingScore(), this.rankingDaily());
    } else {
      window.PPLeaderboard?.hideOffer();
    }
  }

  /** Reto diario activo en el juego actual, o null. */
  rankingDaily() {
    return this.activeGameKey === 'breakout' ? this.cartridges.breakout.daily : null;
  }

  /** Puntaje que cuenta para el ranking global. En Pong: rally más largo contra la IA. */
  rankingScore() {
    const game = this.currentGame;
    if (this.activeGameKey === 'pong') {
      return game.config.mode === '1p' ? game.maxRally || 0 : 0;
    }
    // Los niveles del editor o compartidos no cuentan: serían fáciles de inflar.
    if (this.activeGameKey === 'breakout' && game.isCustomLevel && !game.daily) return 0;
    return game.score || 0;
  }

  showOverlay(subtitle, title, desc, buttonText) {
    document.getElementById('overlay-subtitle').textContent = subtitle;
    document.getElementById('overlay-title').textContent = title;
    document.getElementById('overlay-desc').textContent = desc;
    document.getElementById('btn-start').textContent = buttonText;
    document.getElementById('overlay').classList.add('active');
  }

  startOrResume() {
    window.PPLeaderboard?.hideOffer();
    this.sound.init();
    if (this.state === 'GAME_OVER' || this.state === 'VICTORY') {
      this.currentGame.reset();
    }
    this.state = 'PLAYING';
    document.getElementById('overlay').classList.remove('active');
  }

  togglePause() {
    if (this.state === 'PLAYING') {
      this.state = 'PAUSED';
      this.showOverlay(
        'ARCADE PAUSED',
        'GAME PAUSED',
        'Adjust your live settings on the right or press Space to jump back in!',
        '▶️ RESUME (SPACE)'
      );
    } else if (this.state === 'PAUSED') {
      this.startOrResume();
    }
  }

  bindGlobalEvents() {
    // Tab switching
    document.querySelectorAll('.game-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        this.switchGame(tab.dataset.game);
      });
    });

    // Header buttons
    document.getElementById('btn-start').addEventListener('click', () => {
      this.startOrResume();
    });

    document.getElementById('btn-pause').addEventListener('click', () => {
      this.togglePause();
    });

    document.getElementById('btn-restart').addEventListener('click', () => {
      this.effects.clear();
      this.currentGame.reset();
      this.startOrResume();
    });

    document.getElementById('btn-sound').addEventListener('click', (e) => {
      const enabled = this.sound.toggle();
      e.currentTarget.textContent = enabled ? '🔊' : '🔇';
    });

    // Keyboard routing
    const isTyping = (e) => e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable="true"]');

    window.addEventListener('keydown', (e) => {
      if (isTyping(e)) return;
      if (e.key === 'p' || e.key === 'P') {
        this.togglePause();
        return;
      }
      if (e.code === 'Space' && this.state !== 'PLAYING') {
        e.preventDefault();
        this.startOrResume();
        return;
      }
      if (this.state === 'PLAYING' && this.currentGame.handleKeyDown) {
        this.currentGame.handleKeyDown(e);
      }
    });

    window.addEventListener('keyup', (e) => {
      if (isTyping(e)) return;
      if (this.currentGame.handleKeyUp) {
        this.currentGame.handleKeyUp(e);
      }
    });

    // Mouse routing
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      const mouseX = (e.clientX - rect.left) * scaleX;
      const mouseY = (e.clientY - rect.top) * scaleY;
      if (this.currentGame.handleMouseMove) {
        this.currentGame.handleMouseMove(mouseX, mouseY);
      }
    });

    this.canvas.addEventListener('click', () => {
      if (this.state === 'PLAYING' && this.currentGame.handleClick) {
        this.currentGame.handleClick();
      }
    });
  }

  bindCustomizerControls() {
    // Helper for segmented button rows
    const bindSegmented = (containerId, callback) => {
      const container = document.getElementById(containerId);
      if (!container) return;
      container.querySelectorAll('.seg-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          container.querySelectorAll('.seg-btn').forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          callback(btn.dataset.val);
        });
      });
    };

    // Helper for color swatch rows
    const bindSwatches = (containerId, callback) => {
      const container = document.getElementById(containerId);
      if (!container) return;
      container.querySelectorAll('.swatch').forEach((sw) => {
        sw.addEventListener('click', () => {
          container.querySelectorAll('.swatch').forEach((s) => s.classList.remove('active'));
          sw.classList.add('active');
          callback(sw.dataset.color);
        });
      });
    };

    // 1. Block Breaker Options
    const bbSpeed = document.getElementById('opt-bb-speed');
    bbSpeed.addEventListener('input', () => {
      document.getElementById('val-bb-speed').textContent = bbSpeed.value;
      this.cartridges.breakout.applyConfig({ ballSpeed: Number(bbSpeed.value) });
    });
    bindSegmented('opt-bb-paddle-size', (val) => {
      this.cartridges.breakout.applyConfig({ paddleBaseWidth: Number(val) });
    });
    bindSwatches('opt-bb-color', (color) => {
      this.cartridges.breakout.applyConfig({ paddleColor: color });
    });
    bindSegmented('opt-bb-powerups', (val) => {
      this.cartridges.breakout.applyConfig({ powerUpChance: Number(val) });
    });
    document.querySelectorAll('.stage-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.cartridges.breakout.loadStage(Number(btn.dataset.level));
        window.PPLeaderboard?.show('breakout', null);
        this.startOrResume();
      });
    });

    // 2. Snake Options
    bindSwatches('opt-snake-color', (color) => {
      this.cartridges.snake.applyConfig({ snakeColor: color });
    });
    bindSegmented('opt-snake-speed', (val) => {
      this.cartridges.snake.applyConfig({ speedLevel: val });
      this.cartridges.snake.notifyHud();
    });
    bindSegmented('opt-snake-walls', (val) => {
      this.cartridges.snake.applyConfig({ wrapWalls: val === 'portal' });
      this.cartridges.snake.notifyHud();
    });
    bindSegmented('opt-snake-fruits', (val) => {
      this.cartridges.snake.applyConfig({ fruitCount: Number(val) });
    });

    // 3. Pong Options
    bindSegmented('opt-pong-mode', (val) => {
      document.getElementById('pong-ai-block').style.display = val === '1p' ? 'flex' : 'none';
      this.cartridges.pong.applyConfig({ mode: val });
    });
    bindSegmented('opt-pong-ai', (val) => {
      this.cartridges.pong.applyConfig({ aiDifficulty: val });
    });
    const pongSpeed = document.getElementById('opt-pong-speed');
    pongSpeed.addEventListener('input', () => {
      document.getElementById('val-pong-speed').textContent = pongSpeed.value;
      this.cartridges.pong.applyConfig({ ballSpeed: Number(pongSpeed.value) });
    });
    bindSwatches('opt-pong-color', (color) => {
      this.cartridges.pong.applyConfig({ paddleColor: color });
    });
    bindSegmented('opt-pong-win', (val) => {
      this.cartridges.pong.applyConfig({ winScore: Number(val) });
    });

    // 4. Space Defender Options
    bindSwatches('opt-inv-color', (color) => {
      this.cartridges.invaders.applyConfig({ shipColor: color });
    });
    bindSegmented('opt-inv-weapon', (val) => {
      this.cartridges.invaders.applyConfig({ fireRate: val });
    });
    bindSegmented('opt-inv-speed', (val) => {
      this.cartridges.invaders.applyConfig({ alienSpeed: Number(val) });
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
      if (this.state === 'PLAYING') this.state = 'PAUSED';
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
    window.PPShare?.init(() => customGrid);
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
      const hasBreakable = customGrid.some((row) => row.some((cell) => cell > 0 && cell !== 9));
      if (!hasBreakable) customGrid[0][5] = 1;
      saveCustomGrid(customGrid);
      closeEditor();
      this.cartridges.breakout.loadCustomStage(customGrid);
      window.PPLeaderboard?.show('breakout', null);
      this.startOrResume();
    });
  }

  /**
   * Reto diario: nivel de Block Breaker generado por fecha en /api/daily.
   * Sin API (GitHub Pages) el botón queda oculto.
   */
  async initDailyChallenge() {
    const btn = document.getElementById('btn-daily');
    if (!btn) return;
    let daily;
    try {
      const res = await fetch('api/daily', { headers: { Accept: 'application/json' } });
      const type = res.headers.get('content-type') || '';
      if (!res.ok || !type.includes('application/json')) return;
      daily = await res.json();
    } catch (_) {
      return;
    }

    btn.querySelector('[data-daily-name]').textContent = daily.name;
    btn.hidden = false;
    btn.addEventListener('click', () => {
      if (this.activeGameKey !== 'breakout') this.switchGame('breakout');
      this.effects.clear();
      this.cartridges.breakout.loadDailyStage(daily);
      this.state = 'MENU';
      this.showOverlay(
        `DAILY CHALLENGE // ${daily.date}`,
        daily.name.toUpperCase(),
        'Same level and settings for everyone today. Speed, paddle size and power-ups are locked. Clear it with the highest score!',
        '▶️ START CHALLENGE (SPACE)'
      );
      window.PPLeaderboard?.hideOffer();
      window.PPLeaderboard?.show('breakout', daily);
    });
  }

  /** Abre el nivel de un link play.html?level=CODIGO, si lo hay. */
  async openSharedLevel() {
    const level = await window.PPShare?.loadFromUrl();
    if (!level) return;
    if (level.error) {
      this.showOverlay('SHARED LEVEL', 'LEVEL NOT AVAILABLE', level.error, '▶️ PLAY NOW (SPACE)');
      return;
    }
    if (this.activeGameKey !== 'breakout') this.switchGame('breakout');
    this.effects.clear();
    this.cartridges.breakout.loadCustomStage(level.grid);
    this.state = 'MENU';
    this.showOverlay(
      `SHARED LEVEL // BY ${level.author.toUpperCase()}${level.verified ? ' ✓' : ''}`,
      level.name.toUpperCase(),
      'A Block Breaker level made by a player. Custom levels don’t count for the global ranking.',
      '▶️ PLAY LEVEL (SPACE)'
    );
    window.PPLeaderboard?.hideOffer();
    window.PPLeaderboard?.show('breakout', null);
  }

  loop(timestamp) {
    const dtMs = Math.min(50, timestamp - this.lastTime);
    this.lastTime = timestamp;

    this.effects.update();
    if (this.state === 'PLAYING') {
      this.currentGame.update(dtMs);
    }

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.save();
    this.effects.applyScreenShake(this.ctx);
    this.currentGame.draw();
    this.effects.draw(this.ctx);
    this.ctx.restore();

    requestAnimationFrame((t) => this.loop(t));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new ArcadePlaygroundHub();
});
