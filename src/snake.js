/**
 * Game Cartridge #2: Arcade Snake
 * Features customizable snake color palette, speed, wrap-around walls, and multi-fruit mode.
 */
class SnakeGame {
  constructor(canvas, sound, effects, onHudUpdate, onStateChange) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;
    this.sound = sound;
    this.effects = effects;
    this.onHudUpdate = onHudUpdate;
    this.onStateChange = onStateChange;

    this.cellSize = 25;
    this.cols = Math.floor(this.width / this.cellSize); // 36
    this.rows = Math.floor(this.height / this.cellSize); // 24

    // Customizable Settings
    this.config = {
      snakeColor: '#34d399', // Mint green default
      speedLevel: 'normal',  // 'chill' | 'normal' | 'fast' | 'hyper'
      wrapWalls: false,
      fruitCount: 1,
    };

    this.score = 0;
    this.highScore = Number(localStorage.getItem('arcade_snake_highscore') || 0);
    this.reset();
  }

  getStepIntervalMs() {
    const map = {
      chill: 135,
      normal: 95,
      fast: 68,
      hyper: 48,
    };
    return map[this.config.speedLevel] || 95;
  }

  reset() {
    const startX = Math.floor(this.cols / 2);
    const startY = Math.floor(this.rows / 2);
    this.snake = [
      { x: startX, y: startY },
      { x: startX - 1, y: startY },
      { x: startX - 2, y: startY },
      { x: startX - 3, y: startY },
    ];
    this.dir = { x: 1, y: 0 };
    this.nextDir = { x: 1, y: 0 };
    this.fruits = [];
    this.score = 0;
    this.streak = 1;
    this.accumulator = 0;
    this.lastTimestamp = performance.now();
    this.ensureFruits();
    this.notifyHud();
  }

  applyConfig(newConfig) {
    Object.assign(this.config, newConfig);
    this.ensureFruits();
  }

  ensureFruits() {
    while (this.fruits.length > this.config.fruitCount) {
      this.fruits.pop();
    }
    while (this.fruits.length < this.config.fruitCount) {
      this.spawnFruit();
    }
  }

  spawnFruit() {
    const types = [
      { color: '#fb7185', points: 10, label: 'Apple' },
      { color: '#fbbf24', points: 25, label: 'Golden Berry' },
      { color: '#38bdf8', points: 15, label: 'Power Plum' },
    ];
    // 20% chance of special fruit
    const roll = Math.random();
    const type = roll < 0.15 ? types[1] : roll < 0.35 ? types[2] : types[0];

    for (let tries = 0; tries < 200; tries++) {
      const x = 1 + Math.floor(Math.random() * (this.cols - 2));
      const y = 1 + Math.floor(Math.random() * (this.rows - 2));
      const onSnake = this.snake.some((seg) => seg.x === x && seg.y === y);
      const onFruit = this.fruits.some((f) => f.x === x && f.y === y);
      if (!onSnake && !onFruit) {
        this.fruits.push({ x, y, ...type, pulse: Math.random() * Math.PI });
        return;
      }
    }
  }

  handleKeyDown(e) {
    const key = e.key;
    if ((key === 'ArrowUp' || key === 'w' || key === 'W') && this.dir.y === 0) {
      this.nextDir = { x: 0, y: -1 };
      e.preventDefault();
    } else if ((key === 'ArrowDown' || key === 's' || key === 'S') && this.dir.y === 0) {
      this.nextDir = { x: 0, y: 1 };
      e.preventDefault();
    } else if ((key === 'ArrowLeft' || key === 'a' || key === 'A') && this.dir.x === 0) {
      this.nextDir = { x: -1, y: 0 };
      e.preventDefault();
    } else if ((key === 'ArrowRight' || key === 'd' || key === 'D') && this.dir.x === 0) {
      this.nextDir = { x: 1, y: 0 };
      e.preventDefault();
    }
  }

  notifyHud() {
    this.onHudUpdate({
      score: this.score,
      highScore: this.highScore,
      stat1Label: 'LENGTH',
      stat1Value: `${this.snake.length}`,
      stat2Label: 'WALL MODE',
      stat2Value: this.config.wrapWalls ? 'PORTAL' : 'SOLID',
      stat3Label: 'SPEED',
      stat3Value: this.config.speedLevel.toUpperCase(),
    });
  }

  update(dtMs) {
    this.accumulator += dtMs;
    const stepMs = this.getStepIntervalMs();

    this.fruits.forEach((f) => {
      f.pulse += 0.08;
    });

    if (this.accumulator < stepMs) return;
    this.accumulator %= stepMs;

    this.dir = { ...this.nextDir };
    let headX = this.snake[0].x + this.dir.x;
    let headY = this.snake[0].y + this.dir.y;

    // Wall collision or Portal Wrap
    if (this.config.wrapWalls) {
      headX = (headX + this.cols) % this.cols;
      headY = (headY + this.rows) % this.rows;
    } else {
      if (headX < 0 || headX >= this.cols || headY < 0 || headY >= this.rows) {
        this.triggerGameOver('Crashed into the arena wall!');
        return;
      }
    }

    // Self collision check
    const hitSelf = this.snake.slice(0, -1).some((seg) => seg.x === headX && seg.y === headY);
    if (hitSelf) {
      this.triggerGameOver('Tangled into your own tail!');
      return;
    }

    const newHead = { x: headX, y: headY };
    this.snake.unshift(newHead);

    // Check fruit pickup
    const eatenIndex = this.fruits.findIndex((f) => f.x === headX && f.y === headY);
    if (eatenIndex !== -1) {
      const eaten = this.fruits[eatenIndex];
      this.fruits.splice(eatenIndex, 1);
      this.score += eaten.points;
      if (this.score > this.highScore) {
        this.highScore = this.score;
        localStorage.setItem('arcade_snake_highscore', String(this.highScore));
      }

      const px = headX * this.cellSize + this.cellSize / 2;
      const py = headY * this.cellSize + this.cellSize / 2;
      this.sound.powerUp();
      this.effects.spawnExplosion(px, py, eaten.color, 14, 0.9);
      this.effects.spawnText(px, py - 6, `+${eaten.points}`, eaten.color);
      this.ensureFruits();
      this.notifyHud();
    } else {
      this.snake.pop();
    }
  }

  triggerGameOver(reason) {
    this.sound.loseLife();
    this.effects.triggerShake(10, 5);
    this.onStateChange('GAME_OVER', {
      subtitle: 'SNAKE // RUN ENDED',
      title: 'GAME OVER',
      desc: `${reason} Final Length: ${this.snake.length} | Score: ${this.score}`,
      buttonText: 'PLAY AGAIN (SPACE)',
    });
  }

  draw() {
    const ctx = this.ctx;
    const cs = this.cellSize;

    // Subtle checkerboard grid
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        ctx.fillStyle = (r + c) % 2 === 0 ? '#111629' : '#0e1324';
        ctx.fillRect(c * cs, r * cs, cs, cs);
      }
    }

    // Border indicator for solid vs portal walls
    ctx.save();
    ctx.strokeStyle = this.config.wrapWalls
      ? 'rgba(56, 189, 248, 0.4)'
      : 'rgba(251, 113, 133, 0.55)';
    ctx.lineWidth = 4;
    if (this.config.wrapWalls) {
      ctx.setLineDash([10, 8]);
    }
    ctx.strokeRect(2, 2, this.width - 4, this.height - 4);
    ctx.restore();

    // Draw Fruits
    this.fruits.forEach((f) => {
      const cx = f.x * cs + cs / 2;
      const cy = f.y * cs + cs / 2;
      const radius = cs * 0.36 + Math.sin(f.pulse) * 1.6;

      ctx.save();
      ctx.fillStyle = f.color;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();

      // Little leaf highlight
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx - radius * 0.3, cy - radius * 0.3, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Draw Snake segments
    this.snake.forEach((seg, idx) => {
      const x = seg.x * cs;
      const y = seg.y * cs;
      const isHead = idx === 0;
      const pad = isHead ? 1.5 : 2.5;

      ctx.save();
      ctx.fillStyle = this.config.snakeColor;
      ctx.globalAlpha = isHead ? 1 : Math.max(0.45, 1 - (idx / (this.snake.length + 6)) * 0.55);

      ctx.beginPath();
      ctx.roundRect(x + pad, y + pad, cs - pad * 2, cs - pad * 2, isHead ? 7 : 5);
      ctx.fill();

      // Cute arcade eyes on the head
      if (isHead) {
        ctx.fillStyle = '#0f1221';
        const eyeOffsetX = this.dir.y !== 0 ? 5 : this.dir.x > 0 ? 4 : -4;
        const eyeOffsetY = this.dir.x !== 0 ? 5 : this.dir.y > 0 ? 4 : -4;
        const cx = x + cs / 2;
        const cy = y + cs / 2;

        if (this.dir.x !== 0) {
          ctx.beginPath();
          ctx.arc(cx + eyeOffsetX, cy - 4, 2.3, 0, Math.PI * 2);
          ctx.arc(cx + eyeOffsetX, cy + 4, 2.3, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(cx - 4, cy + eyeOffsetY, 2.3, 0, Math.PI * 2);
          ctx.arc(cx + 4, cy + eyeOffsetY, 2.3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    });
  }
}
