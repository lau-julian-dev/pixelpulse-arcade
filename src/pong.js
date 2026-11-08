/**
 * Game Cartridge #3: Pong Arena
 * Features 1P vs Smart AI or 2P Local mode, customizable ball speed, paddle color, AI difficulty, and target score.
 */
class PongGame {
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
      mode: '1p',           // '1p' (vs AI) | '2p' (Local W/S vs Up/Down)
      aiDifficulty: 'medium', // 'easy' | 'medium' | 'hard'
      ballSpeed: 7,
      paddleColor: '#38bdf8',
      winScore: 7,
    };

    this.highScore = Number(localStorage.getItem('arcade_pong_highscore') || 0);
    this.keys = { w: false, s: false, up: false, down: false };
    this.reset();
  }

  reset() {
    this.paddleWidth = 14;
    this.paddleHeight = 96;
    this.p1 = {
      x: 28,
      y: this.height / 2 - this.paddleHeight / 2,
      score: 0,
      speed: 8.5,
    };
    this.p2 = {
      x: this.width - 28 - this.paddleWidth,
      y: this.height / 2 - this.paddleHeight / 2,
      score: 0,
      speed: 8.5,
    };
    this.rally = 0;
    this.resetBall(1);
    this.notifyHud();
  }

  resetBall(direction = 1) {
    const angle = (Math.random() - 0.5) * 0.7;
    const speed = Number(this.config.ballSpeed);
    this.ball = {
      x: this.width / 2,
      y: this.height / 2,
      radius: 9,
      speed,
      vx: Math.cos(angle) * speed * direction,
      vy: Math.sin(angle) * speed,
    };
    this.rally = 0;
  }

  applyConfig(newConfig) {
    const prevMode = this.config.mode;
    Object.assign(this.config, newConfig);
    this.ball.speed = Number(this.config.ballSpeed);
    if (prevMode !== this.config.mode) {
      this.reset();
    } else {
      this.notifyHud();
    }
  }

  handleKeyDown(e) {
    if (e.key === 'w' || e.key === 'W') this.keys.w = true;
    if (e.key === 's' || e.key === 'S') this.keys.s = true;
    if (e.key === 'ArrowUp') {
      this.keys.up = true;
      e.preventDefault();
    }
    if (e.key === 'ArrowDown') {
      this.keys.down = true;
      e.preventDefault();
    }
  }

  handleKeyUp(e) {
    if (e.key === 'w' || e.key === 'W') this.keys.w = false;
    if (e.key === 's' || e.key === 'S') this.keys.s = false;
    if (e.key === 'ArrowUp') this.keys.up = false;
    if (e.key === 'ArrowDown') this.keys.down = false;
  }

  handleMouseMove(mouseX, mouseY) {
    if (this.config.mode === '1p') {
      this.p1.y = Math.max(
        14,
        Math.min(this.height - this.paddleHeight - 14, mouseY - this.paddleHeight / 2)
      );
    }
  }

  notifyHud() {
    this.onHudUpdate({
      score: this.p1.score,
      highScore: this.highScore,
      stat1Label: 'MATCH SCORE',
      stat1Value: `${this.p1.score} - ${this.p2.score}`,
      stat2Label: 'RALLY',
      stat2Value: `${this.rally} hits`,
      stat3Label: 'OPPONENT',
      stat3Value: this.config.mode === '1p' ? `AI (${this.config.aiDifficulty.toUpperCase()})` : 'PLAYER 2',
    });
  }

  update() {
    // Player 1 keyboard movement (W/S or Up/Down in 1P mode)
    if (this.keys.w || (this.config.mode === '1p' && this.keys.up)) {
      this.p1.y = Math.max(14, this.p1.y - this.p1.speed);
    }
    if (this.keys.s || (this.config.mode === '1p' && this.keys.down)) {
      this.p1.y = Math.min(this.height - this.paddleHeight - 14, this.p1.y + this.p1.speed);
    }

    // Player 2 or AI movement
    if (this.config.mode === '2p') {
      if (this.keys.up) {
        this.p2.y = Math.max(14, this.p2.y - this.p2.speed);
      }
      if (this.keys.down) {
        this.p2.y = Math.min(this.height - this.paddleHeight - 14, this.p2.y + this.p2.speed);
      }
    } else {
      const aiSpeeds = { easy: 4.2, medium: 6.4, hard: 8.8 };
      const aiSpeed = aiSpeeds[this.config.aiDifficulty] || 6.4;
      const targetY = this.ball.vx > 0 ? this.ball.y - this.paddleHeight / 2 : this.height / 2 - this.paddleHeight / 2;
      const diff = targetY - this.p2.y;
      if (Math.abs(diff) > 6) {
        this.p2.y += Math.sign(diff) * Math.min(Math.abs(diff), aiSpeed);
        this.p2.y = Math.max(14, Math.min(this.height - this.paddleHeight - 14, this.p2.y));
      }
    }

    // Move ball
    this.ball.x += this.ball.vx;
    this.ball.y += this.ball.vy;

    // Top/Bottom bounce
    if (this.ball.y - this.ball.radius <= 8) {
      this.ball.y = 8 + this.ball.radius;
      this.ball.vy = Math.abs(this.ball.vy);
      this.sound.wallHit();
    } else if (this.ball.y + this.ball.radius >= this.height - 8) {
      this.ball.y = this.height - 8 - this.ball.radius;
      this.ball.vy = -Math.abs(this.ball.vy);
      this.sound.wallHit();
    }

    // Left Paddle (P1) Collision
    if (
      this.ball.vx < 0 &&
      this.ball.x - this.ball.radius <= this.p1.x + this.paddleWidth &&
      this.ball.x + this.ball.radius >= this.p1.x &&
      this.ball.y + this.ball.radius >= this.p1.y &&
      this.ball.y - this.ball.radius <= this.p1.y + this.paddleHeight
    ) {
      this.bounceOffPaddle(this.p1, 1);
    }

    // Right Paddle (P2/AI) Collision
    if (
      this.ball.vx > 0 &&
      this.ball.x + this.ball.radius >= this.p2.x &&
      this.ball.x - this.ball.radius <= this.p2.x + this.paddleWidth &&
      this.ball.y + this.ball.radius >= this.p2.y &&
      this.ball.y - this.ball.radius <= this.p2.y + this.paddleHeight
    ) {
      this.bounceOffPaddle(this.p2, -1);
    }

    // Scoring
    if (this.ball.x < -15) {
      this.p2.score++;
      this.sound.loseLife();
      this.effects.spawnExplosion(30, this.ball.y, '#fb7185', 18, 1.1);
      this.checkMatchEnd(-1);
    } else if (this.ball.x > this.width + 15) {
      this.p1.score++;
      if (this.p1.score > this.highScore) {
        this.highScore = this.p1.score;
        localStorage.setItem('arcade_pong_highscore', String(this.highScore));
      }
      this.sound.powerUp();
      this.effects.spawnExplosion(this.width - 30, this.ball.y, this.config.paddleColor, 18, 1.1);
      this.checkMatchEnd(1);
    }
  }

  bounceOffPaddle(paddle, dirX) {
    const relY = (this.ball.y - (paddle.y + this.paddleHeight / 2)) / (this.paddleHeight / 2);
    const bounceAngle = relY * ((Math.PI * 55) / 180);
    this.rally++;
    const currentSpeed = Math.min(14, Number(this.config.ballSpeed) + this.rally * 0.35);

    this.ball.vx = Math.cos(bounceAngle) * currentSpeed * dirX;
    this.ball.vy = Math.sin(bounceAngle) * currentSpeed;
    this.sound.paddleHit();
    this.effects.spawnExplosion(
      dirX > 0 ? paddle.x + this.paddleWidth : paddle.x,
      this.ball.y,
      dirX > 0 ? this.config.paddleColor : '#fb7185',
      8,
      0.7
    );
    this.notifyHud();
  }

  checkMatchEnd(lastScorerDir) {
    const winTarget = Number(this.config.winScore);
    if (this.p1.score >= winTarget || this.p2.score >= winTarget) {
      const p1Won = this.p1.score >= winTarget;
      const winnerName = p1Won
        ? 'Player 1 Wins!'
        : this.config.mode === '1p'
        ? 'AI Wins the Match!'
        : 'Player 2 Wins!';
      this.onStateChange('VICTORY', {
        subtitle: 'PONG ARENA // MATCH COMPLETE',
        title: winnerName.toUpperCase(),
        desc: `Final Score: ${this.p1.score} - ${this.p2.score}. Ready for a rematch?`,
        buttonText: 'REMATCH (SPACE)',
      });
    } else {
      this.resetBall(lastScorerDir);
      this.notifyHud();
    }
  }

  draw() {
    const ctx = this.ctx;

    // Court background
    ctx.fillStyle = '#0f1325';
    ctx.fillRect(0, 0, this.width, this.height);

    // Center dashed line & circle
    ctx.save();
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(this.width / 2, this.height / 2, 70, 0, Math.PI * 2);
    ctx.stroke();

    ctx.setLineDash([12, 12]);
    ctx.beginPath();
    ctx.moveTo(this.width / 2, 16);
    ctx.lineTo(this.width / 2, this.height - 16);
    ctx.stroke();
    ctx.restore();

    // Big background score watermark
    ctx.save();
    ctx.font = '800 72px "Segoe UI", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.textAlign = 'center';
    ctx.fillText(String(this.p1.score), this.width / 2 - 110, 95);
    ctx.fillText(String(this.p2.score), this.width / 2 + 110, 95);
    ctx.restore();

    // Left Paddle (Player 1)
    ctx.save();
    ctx.fillStyle = this.config.paddleColor;
    ctx.beginPath();
    ctx.roundRect(this.p1.x, this.p1.y, this.paddleWidth, this.paddleHeight, 7);
    ctx.fill();
    ctx.restore();

    // Right Paddle (AI / Player 2)
    ctx.save();
    ctx.fillStyle = '#fb7185';
    ctx.beginPath();
    ctx.roundRect(this.p2.x, this.p2.y, this.paddleWidth, this.paddleHeight, 7);
    ctx.fill();
    ctx.restore();

    // Ball
    ctx.save();
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
