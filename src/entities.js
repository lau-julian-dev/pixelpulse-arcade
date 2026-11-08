/**
 * Core Game Entities (Object-Oriented Design)
 * Classes: Paddle, Ball, Brick, PowerUp, Laser
 */

export class Paddle {
  constructor(canvasWidth, canvasHeight) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.baseWidth = 124;
    this.width = this.baseWidth;
    this.height = 15;
    this.x = (canvasWidth - this.width) / 2;
    this.y = canvasHeight - 38;
    this.speed = 9.5;
    this.vx = 0;
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
    const grad = ctx.createLinearGradient(this.x, this.y, this.x + this.width, this.y);
    grad.addColorStop(0, '#38bdf8');
    grad.addColorStop(0.5, '#818cf8');
    grad.addColorStop(1, '#38bdf8');

    ctx.fillStyle = grad;
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 16;

    // Rounded capsule paddle
    ctx.beginPath();
    ctx.roundRect(this.x, this.y, this.width, this.height, 8);
    ctx.fill();

    // Inner core highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.beginPath();
    ctx.roundRect(this.x + 14, this.y + 3, this.width - 28, 4, 2);
    ctx.fill();

    // Laser turrets if active
    if (this.laserActive) {
      ctx.fillStyle = '#f43f5e';
      ctx.shadowColor = '#f43f5e';
      ctx.shadowBlur = 10;
      ctx.fillRect(this.x + 4, this.y - 6, 6, 8);
      ctx.fillRect(this.x + this.width - 10, this.y - 6, 6, 8);
    }

    ctx.restore();
  }
}

export class Ball {
  constructor(x, y, speed = 6.6) {
    this.x = x;
    this.y = y;
    this.radius = 8;
    this.baseSpeed = speed;
    this.speed = speed;
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.5;
    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;
    this.attached = true;
    this.fireball = false;
    this.trail = [];
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
      return;
    }

    // Store trail coordinates
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 9) {
      this.trail.shift();
    }

    this.x += this.vx;
    this.y += this.vy;

    // Left / Right wall bounce
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

    // Top ceiling bounce
    if (this.y - this.radius < 0) {
      this.y = this.radius;
      this.vy = Math.abs(this.vy);
      return 'wall';
    }

    return null;
  }

  draw(ctx) {
    ctx.save();

    // Draw motion trail
    for (let i = 0; i < this.trail.length; i++) {
      const point = this.trail[i];
      const ratio = (i + 1) / this.trail.length;
      ctx.beginPath();
      ctx.arc(point.x, point.y, this.radius * ratio * 0.85, 0, Math.PI * 2);
      ctx.fillStyle = this.fireball
        ? `rgba(251, 146, 60, ${ratio * 0.38})`
        : `rgba(56, 189, 248, ${ratio * 0.32})`;
      ctx.fill();
    }

    // Draw main ball
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.fireball ? '#fb923c' : '#ffffff';
    ctx.shadowColor = this.fireball ? '#ef4444' : '#38bdf8';
    ctx.shadowBlur = this.fireball ? 20 : 14;
    ctx.fill();
    ctx.restore();
  }
}

export class Brick {
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
    if (this.explosive) return '#ef4444';
    if (this.hp === 3) return '#a855f7';
    if (this.hp === 2) return '#fb923c';
    // Row-based neon palette for 1 HP bricks
    const rowColors = ['#38bdf8', '#22d3ee', '#34d399', '#a3e635', '#facc15'];
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
      return true; // Destroyed
    }
    return false; // Damaged but still standing
  }

  draw(ctx) {
    if (!this.alive) return;
    const color = this.getColor();

    ctx.save();
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = this.explosive ? 14 : 8;

    ctx.beginPath();
    ctx.roundRect(this.x, this.y, this.width, this.height, 5);
    ctx.fill();

    // Top bevel highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.beginPath();
    ctx.roundRect(this.x + 3, this.y + 2, this.width - 6, 4, 2);
    ctx.fill();

    // Symbol overlay for special bricks
    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
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

export const POWERUP_TYPES = [
  { id: 'MULTI', label: '⚡ MULTI-BALL', color: '#38bdf8' },
  { id: 'WIDE', label: '↔️ WIDE PADDLE', color: '#22c55e' },
  { id: 'LASER', label: '🔫 LASER CANNON', color: '#f43f5e' },
  { id: 'FIRE', label: '🔥 FIREBALL', color: '#fb923c' },
  { id: 'LIFE', label: '❤️ +1 LIFE', color: '#ec4899' },
];

export class PowerUp {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 34;
    this.height = 16;
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
    ctx.shadowColor = this.info.color;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.roundRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height, 8);
    ctx.fill();

    ctx.fillStyle = '#070913';
    ctx.font = 'bold 10px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.info.id, this.x, this.y + 1);
    ctx.restore();
  }
}

export class Laser {
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
    ctx.fillStyle = '#f43f5e';
    ctx.shadowColor = '#f43f5e';
    ctx.shadowBlur = 10;
    ctx.fillRect(this.x - this.width / 2, this.y, this.width, this.height);
    ctx.restore();
  }
}
