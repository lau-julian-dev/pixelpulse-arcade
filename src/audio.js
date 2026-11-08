/**
 * Procedural Web Audio API Sound Synthesizer
 * Generates retro arcade sound effects in real-time without external audio assets.
 */
export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  playTone(freq, type = 'sine', duration = 0.08, volume = 0.15, slideTo = null) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(slideTo, now + duration);
    }

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
  }

  paddleHit() {
    this.playTone(320, 'triangle', 0.09, 0.18, 440);
  }

  wallHit() {
    this.playTone(220, 'sine', 0.06, 0.12, 180);
  }

  brickDamage(combo = 1) {
    const baseFreq = Math.min(360 + combo * 35, 920);
    this.playTone(baseFreq, 'square', 0.07, 0.12, baseFreq * 1.15);
  }

  brickBreak(combo = 1) {
    const baseFreq = Math.min(440 + combo * 45, 1100);
    this.playTone(baseFreq, 'sawtooth', 0.12, 0.15, baseFreq * 1.45);
  }

  explosion() {
    this.playTone(140, 'sawtooth', 0.28, 0.25, 35);
  }

  laserShoot() {
    this.playTone(880, 'square', 0.08, 0.1, 240);
  }

  powerUp() {
    this.playTone(523.25, 'triangle', 0.08, 0.16, 659.25);
    setTimeout(() => this.playTone(659.25, 'triangle', 0.14, 0.16, 1046.5), 75);
  }

  loseLife() {
    this.playTone(300, 'sawtooth', 0.35, 0.2, 95);
  }

  levelWin() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      setTimeout(() => this.playTone(n, 'triangle', 0.14, 0.18), idx * 90);
    });
  }
}
