// Hudba na pozadí: smyčka z mp3 (public/music). Vlastní hlasitost a ztlumení, nezávislé na zvucích hry.
// Hlasitost jde přes WebAudio (GainNode), protože iOS ignoruje HTMLMediaElement.volume.
import brand from '@brand';

import { MUSIC } from '../config/GameConfig.js';

const STORE_VOLUME = `${brand.storagePrefix}.musicVolume`;
const STORE_MUTED = `${brand.storagePrefix}.musicMuted`;

export class MusicPlayer {
  /** @param {import('./SynthAudio.js').SynthAudio} audio  zvuk hry (sdílí AudioContext) */
  constructor(audio) {
    this.audio = audio;
    this.el = null;
    this.gain = null;
    this.started = false;
    this.muted = false;
    this.volume = MUSIC.defaultVolume;
    try {
      const v = parseFloat(localStorage.getItem(STORE_VOLUME));
      if (Number.isFinite(v)) this.volume = Math.min(1, Math.max(0, v));
      this.muted = localStorage.getItem(STORE_MUTED) === '1';
    } catch { /* úložiště nemusí být dostupné */ }
    document.addEventListener('visibilitychange', () => {
      if (!this.el) return;
      if (document.hidden) this.el.pause(); else if (this.started) this.el.play().catch(() => {});
    });
  }

  applyGain() {
    const v = this.muted ? 0 : this.volume;
    if (this.gain) this.gain.gain.value = v;
    else if (this.el) this.el.volume = v;
  }

  /** Volat z uživatelské události (autoplay politika): spustí smyčku. */
  start() {
    if (this.started) { this.el?.play().catch(() => {}); return; }
    this.started = true;
    const el = new Audio(`${import.meta.env.BASE_URL}${MUSIC.src}`);
    el.loop = true;
    el.preload = 'auto';
    this.el = el;
    const ctx = this.audio.ctx;
    if (ctx) {
      try {
        this.gain = ctx.createGain();
        ctx.createMediaElementSource(el).connect(this.gain);
        this.gain.connect(ctx.destination);
      } catch { this.gain = null; }
    }
    this.applyGain();
    el.play().catch(() => { this.started = false; });   // bez souboru / zablokováno: příští interakce to zkusí znovu
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
}
