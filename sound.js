// ================= WEB AUDIO SYNTHESIZER ENGINE =================
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.drillOsc = null;
    this.drillGain = null;
    this.isDrilling = false;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // 1. High-Pitched Pneumatic Dental Drill Whine
  startDrill(pitchFactor = 1.0) {
    this.init();
    if (this.isDrilling) return;
    this.isDrilling = true;

    this.drillOsc = this.ctx.createOscillator();
    this.drillGain = this.ctx.createGain();

    this.drillOsc.type = 'sawtooth';
    const baseFreq = 4200 * pitchFactor; // ~4.2kHz base frequency
    this.drillOsc.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);

    // 30Hz LFO pitch vibration
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.value = 30;
    lfoGain.gain.value = 180;
    lfo.connect(this.drillOsc.frequency);
    lfo.start();

    this.drillGain.gain.setValueAtTime(0.04, this.ctx.currentTime);
    this.drillOsc.connect(this.drillGain);
    this.drillGain.connect(this.ctx.destination);
    this.drillOsc.start();
  }

  stopDrill() {
    if (!this.isDrilling || !this.drillOsc) return;
    this.drillGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.08);
    setTimeout(() => {
      if (this.drillOsc) {
        this.drillOsc.stop();
        this.drillOsc.disconnect();
        this.drillOsc = null;
      }
      this.isDrilling = false;
    }, 90);
  }

  // 2. Stomach Rumble Sound
  playStomachRumble() {
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(85, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.9);

    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.9);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.9);
  }

  // 3. Lecturer Foot-Tapping
  playFootTap() {
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(500, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.06);

    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.06);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.06);
  }

  // 4. End-of-Shift Victory Arpeggio Chime
  playVictoryChime() {
    this.init();
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.frequency.setValueAtTime(freq, now + idx * 0.1);
      gain.gain.setValueAtTime(0.08, now + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + idx * 0.1);
      osc.stop(now + idx * 0.1 + 0.4);
    });
  }
}

const audioFX = new SoundEngine();