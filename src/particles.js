/**
 * Particle & Visual Effects System
 * Handles brick shatter sparks, floating score popups, and screen-shake physics.
 */
class Particle {
  constructor(x, y, color, speedScale = 1) {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = (1.2 + Math.random() * 4.5) * speedScale;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.gravity = 0.12;
    this.alpha = 1;
    this.decay = 0.018 + Math.random() * 0.022;
    this.size = 2.5 + Math.random() * 3.5;
    this.color = color;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += this.gravity;
    this.alpha -= this.decay;
  }

  draw(ctx) {
    if (this.alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.alpha);
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 8;
    ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
    ctx.restore();
  }
}

class FloatingText {
  constructor(x, y, text, color = '#38bdf8') {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.alpha = 1;
    this.vy = -1.1;
  }

  update() {
    this.y += this.vy;
    this.alpha -= 0.022;
  }

  draw(ctx) {
    if (this.alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.alpha);
    ctx.font = 'bold 14px "Segoe UI", sans-serif';
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 6;
    ctx.textAlign = 'center';
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
}

class EffectsManager {
  constructor() {
    this.particles = [];
    this.floatingTexts = [];
    this.shakeTime = 0;
    this.shakeMagnitude = 0;
  }

  spawnExplosion(x, y, color, count = 18, speedScale = 1) {
    for (let i = 0; i < count; i++) {
      this.particles.push(new Particle(x, y, color, speedScale));
    }
  }

  spawnText(x, y, text, color) {
    this.floatingTexts.push(new FloatingText(x, y, text, color));
  }

  triggerShake(frames = 8, magnitude = 5) {
    this.shakeTime = Math.max(this.shakeTime, frames);
    this.shakeMagnitude = Math.max(this.shakeMagnitude, magnitude);
  }

  update() {
    this.particles.forEach((p) => p.update());
    this.particles = this.particles.filter((p) => p.alpha > 0);

    this.floatingTexts.forEach((t) => t.update());
    this.floatingTexts = this.floatingTexts.filter((t) => t.alpha > 0);

    if (this.shakeTime > 0) {
      this.shakeTime--;
    }
  }

  applyScreenShake(ctx) {
    if (this.shakeTime > 0) {
      const dx = (Math.random() - 0.5) * this.shakeMagnitude * 2;
      const dy = (Math.random() - 0.5) * this.shakeMagnitude * 2;
      ctx.translate(dx, dy);
    }
  }

  draw(ctx) {
    this.particles.forEach((p) => p.draw(ctx));
    this.floatingTexts.forEach((t) => t.draw(ctx));
  }

  clear() {
    this.particles = [];
    this.floatingTexts = [];
    this.shakeTime = 0;
  }
}
