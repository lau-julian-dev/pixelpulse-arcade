/**
 * Block Breaker Entities (Object-Oriented Design)
 * Classes: Paddle, Ball, Brick, PowerUp, Laser
 */

class Paddle {
  constructor(canvasWidth, canvasHeight) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.baseWidth = 128;
    this.width = this.baseWidth;
    this.height = 15;
    this.x = (canvasWidth - this.width) / 2;
    this.y = canvasHeight - 38;
    this.speed = 9.5;
    this.color = '#38bdf8';
    this.laserActive = false;
  }

  reset() {
    this.width = this.baseWidth;
    this.x = (this.canvasWidth - this.width) / 2;
    this.laserActive = false;
  }

  moveLeft() {
    this.x = Math.max(12, this.x - this.speed);
  }

  moveRight() {
    this.x = Math.min(this.canvasWidth - this.width - 12, this.x + this.speed);
  }

  setCenterX(targetX) {
    this.x = Math.max(
      12,
      Math.min(this.canvasWidth - this.width - 12, targetX - this.width / 2)
    );
  }

  draw(ctx) {
    ctx.save();
    ctx.fillStyle = this.color;

    // Rounded capsule paddle
    ctx.beginPath();
    ctx.roundRect(this.x, this.y, this.width, this.height, 8);
    ctx.fill();

    // Crisp inner highlight bar
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.beginPath();
    ctx.roundRect(this.x + 14, this.y + 3, this.width - 28, 4, 2);
    ctx.fill();

    // Laser turrets if active
    if (this.laserActive) {
      ctx.fillStyle = '#fb7185';
      ctx.fillRect(this.x + 5, this.y - 6, 6, 7);
      ctx.fillRect(this.x + this.width - 11, this.y - 6, 6, 7);
    }

    ctx.restore();
  }
}

class Ball {
  constructor(x, y, speed = 6.5, color = '#ffffff') {
    this.x = x;
    this.y = y;
    this.radius = 8;
    this.baseSpeed = speed;
    this.speed = speed;
    this.color = color;
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.5;
    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;
    this.attached = true;
    this.fireball = false;
    this.trail = [];
  }

  setSpeed(newSpeed) {
    const currentMag = Math.hypot(this.vx, this.vy) || 1;
    this.speed = newSpeed;
    this.vx = (this.vx / currentMag) * newSpeed;
    this.vy = (this.vy / currentMag) * newSpeed;
  }

  launch() {
    if (!this.attached) return;
    this.attached = false;
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.45;
    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;
  }

  update(paddle, canvasWidth) {
    if (this.attached) {
      this.x = paddle.x + paddle.width / 2;
      this.y = paddle.y - this.radius - 2;
      this.trail = [];
      return null;
    }

    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 7) {
      this.trail.shift();
    }

    this.x += this.vx;
    this.y += this.vy;

    if (this.x - this.radius < 0) {
      this.x = this.radius;
      this.vx = Math.abs(this.vx);
      return 'wall';
    }
    if (this.x + this.radius > canvasWidth) {
      this.x = canvasWidth - this.radius;
      this.vx = -Math.abs(this.vx);
      return 'wall';
    }
    if (this.y - this.radius < 0) {
      this.y = this.radius;
      this.vy = Math.abs(this.vy);
      return 'wall';
    }

    return null;
  }

  draw(ctx) {
    ctx.save();

    for (let i = 0; i < this.trail.length; i++) {
      const point = this.trail[i];
      const ratio = (i + 1) / this.trail.length;
      ctx.beginPath();
      ctx.arc(point.x, point.y, this.radius * ratio * 0.8, 0, Math.PI * 2);
      ctx.fillStyle = this.fireball
        ? `rgba(251, 146, 60, ${ratio * 0.35})`
        : `rgba(148, 163, 184, ${ratio * 0.25})`;
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.fireball ? '#fb923c' : this.color;
    ctx.fill();
    ctx.restore();
  }
}

class Brick {
  constructor(row, col, x, y, width, height, type) {
    this.row = row;
    this.col = col;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.type = type;
    this.indestructible = type === 9;
    this.explosive = type === 4;
    this.maxHp = this.indestructible ? Infinity : type === 4 ? 1 : type;
    this.hp = this.maxHp;
    this.alive = true;
  }

  getColor() {
    if (this.indestructible) return '#64748b';
    if (this.explosive) return '#fb7185';
    if (this.hp === 3) return '#a78bfa';
    if (this.hp === 2) return '#fb923c';
    const rowColors = ['#38bdf8', '#34d399', '#fbbf24', '#f472b6', '#60a5fa'];
    return rowColors[this.row % rowColors.length];
  }

  hit(piercing = false) {
    if (this.indestructible) return false;
    if (piercing) {
      this.hp = 0;
    } else {
      this.hp -= 1;
    }
    if (this.hp <= 0) {
      this.alive = false;
      return true;
    }
    return false;
  }

  draw(ctx) {
    if (!this.alive) return;
    const color = this.getColor();

    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(this.x, this.y, this.width, this.height, 5);
    ctx.fill();

    // Subtle top bevel
    ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.beginPath();
    ctx.roundRect(this.x + 3, this.y + 2, this.width - 6, 4, 2);
    ctx.fill();

    ctx.font = 'bold 11px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (this.explosive) {
      ctx.fillStyle = '#fff';
      ctx.fillText('TNT', this.x + this.width / 2, this.y + this.height / 2 + 1);
    } else if (this.indestructible) {
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(this.x + 2, this.y + 2, this.width - 4, this.height - 4);
    } else if (this.hp > 1) {
      ctx.fillStyle = '#fff';
      ctx.fillText(`${this.hp}x`, this.x + this.width / 2, this.y + this.height / 2 + 1);
    }

    ctx.restore();
  }
}

const POWERUP_TYPES = [
  { id: 'MULTI', label: '⚡ MULTI-BALL', color: '#38bdf8' },
  { id: 'WIDE', label: '↔️ WIDE PADDLE', color: '#34d399' },
  { id: 'LASER', label: '🔫 LASER CANNON', color: '#fb7185' },
  { id: 'FIRE', label: '🔥 FIREBALL', color: '#fb923c' },
  { id: 'LIFE', label: '❤️ +1 LIFE', color: '#f472b6' },
];

class PowerUp {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 36;
    this.height = 17;
    this.vy = 2.4;
    this.alive = true;
    const randomIndex = Math.floor(Math.random() * POWERUP_TYPES.length);
    this.info = POWERUP_TYPES[randomIndex];
  }

  update(canvasHeight) {
    this.y += this.vy;
    if (this.y > canvasHeight + 20) {
      this.alive = false;
    }
  }

  draw(ctx) {
    if (!this.alive) return;
    ctx.save();
    ctx.fillStyle = this.info.color;
    ctx.beginPath();
    ctx.roundRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height, 8);
    ctx.fill();

    ctx.fillStyle = '#0f1221';
    ctx.font = 'bold 10px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.info.id, this.x, this.y + 1);
    ctx.restore();
  }
}

class Laser {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 4;
    this.height = 14;
    this.vy = -10.5;
    this.alive = true;
  }

  update() {
    this.y += this.vy;
    if (this.y < -20) {
      this.alive = false;
    }
  }

  draw(ctx) {
    if (!this.alive) return;
    ctx.save();
    ctx.fillStyle = '#fb7185';
    ctx.fillRect(this.x - this.width / 2, this.y, this.width, this.height);
    ctx.restore();
  }
}
