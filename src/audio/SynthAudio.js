// Syntetizovaný zvuk přes WebAudio (bez souborů): hořák, vítr, paraventil, ventilátor, události.
// Kontext se spouští až po první interakci (autoplay politika prohlížečů).

function noiseBuffer(ctx, seconds = 2, color = 'white') {
  const len = ctx.sampleRate * seconds;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    if (color === 'pink') {
      b0 = 0.99765 * b0 + w * 0.099046;
      b1 = 0.963 * b1 + w * 0.2965164;
      b2 = 0.57 * b2 + w * 1.0526913;
      d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2;
    } else d[i] = w;
  }
  return buf;
}

const STORE_VOLUME = 'hotairsim.volume';
const STORE_MUTED = 'hotairsim.muted';

export class SynthAudio {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.volume = 0.6;   // hlavní hlasitost 0..1 (ukládá se do localStorage)
    try {
      const v = parseFloat(localStorage.getItem(STORE_VOLUME));
      if (Number.isFinite(v)) this.volume = Math.min(1, Math.max(0, v));
      this.muted = localStorage.getItem(STORE_MUTED) === '1';
    } catch { /* úložiště nemusí být dostupné */ }
  }

  applyGain() {
    if (this.master) this.master.gain.value = this.muted ? 0 : this.volume;
  }

  /** Volat z uživatelské události (klik / dotyk). */
  unlock() {
    if (this.ctx) { this.ctx.resume?.(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    const c = this.ctx;
    this.master = c.createGain();
    this.applyGain();
    this.master.connect(c.destination);

    const mkLoop = (color, build) => {
      const src = c.createBufferSource();
      src.buffer = noiseBuffer(c, 3, color);
      src.loop = true;
      const gain = c.createGain();
      gain.gain.value = 0;
      const nodes = build(c);
      src.connect(nodes[0]);
      for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]);
      nodes[nodes.length - 1].connect(gain);
      gain.connect(this.master);
      src.start();
      return { gain, nodes };
    };
    const filter = (type, f, q = 0.7) => { const n = c.createBiquadFilter(); n.type = type; n.frequency.value = f; n.Q.value = q; return n; };

    this.burner = mkLoop('white', () => [filter('lowpass', 900), filter('highpass', 70)]);
    this.wind = mkLoop('pink', () => [filter('bandpass', 500, 0.5)]);
    this.vent = mkLoop('white', () => [filter('bandpass', 900, 0.5), filter('lowpass', 1800)]);   // syčení paraventilu: nižší, měkčí
    this.fan = mkLoop('white', () => [filter('bandpass', 220, 0.8)]);

    // Při skrytí stránky se smyčka hry zastaví a poslední hladiny (hořák, ventilátor) by hrály dál
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { this.update({}); this.ctx.suspend?.(); } else this.ctx.resume?.();
    });
  }

  setMuted(m) {
    this.muted = m;
    this.applyGain();
    try { localStorage.setItem(STORE_MUTED, m ? '1' : '0'); } catch { /* ignorováno */ }
  }

  setVolume(v) {
    this.volume = Math.min(1, Math.max(0, v));
    this.applyGain();
    try { localStorage.setItem(STORE_VOLUME, String(this.volume)); } catch { /* ignorováno */ }
  }

  /** Průběžná aktualizace hladin (0..1) a výšky (pro útlum větru). */
  update({ burn = 0, vent = 0, wind = 0, fan = 0 }) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const set = (ch, v) => ch.gain.gain.setTargetAtTime(v, t, 0.06);
    set(this.burner, burn * 0.5);
    set(this.vent, vent * 0.14);
    set(this.wind, Math.min(1, wind) * 0.12);
    set(this.fan, fan * 0.28);
    this.burner.nodes[0].frequency.setTargetAtTime(500 + burn * 700, t, 0.1);
  }

  /** Ostré lupnutí piezo zapalovače. */
  click() {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime;
    const o = c.createOscillator(); o.type = 'square'; o.frequency.value = 2600;
    const g = c.createGain(); g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    o.connect(g).connect(this.master); o.start(t); o.stop(t + 0.06);
  }

  /** Vystřelení korku. */
  pop() {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime;
    const o = c.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(520, t); o.frequency.exponentialRampToValueAtTime(90, t + 0.12);
    const g = c.createGain(); g.gain.setValueAtTime(0.7, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    o.connect(g).connect(this.master); o.start(t); o.stop(t + 0.22);
    const n = c.createBufferSource(); n.buffer = noiseBuffer(c, 0.3);
    const ng = c.createGain(); ng.gain.setValueAtTime(0.4, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    n.connect(ng).connect(this.master); n.start(t);
  }

  /** Dosednutí koše (síla 0..1). */
  thud(strength = 0.5) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime;
    const n = c.createBufferSource(); n.buffer = noiseBuffer(c, 0.6);
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 300 + strength * 500;
    const g = c.createGain(); g.gain.setValueAtTime(0.3 + strength * 0.6, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    n.connect(f).connect(g).connect(this.master); n.start(t);
  }

  /** Cinknutí sklenic. */
  clink() {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime;
    for (const f of [2200, 3300]) {
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      const g = c.createGain(); g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      o.connect(g).connect(this.master); o.start(t); o.stop(t + 0.65);
    }
  }
}
