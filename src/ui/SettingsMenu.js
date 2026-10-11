// Nastavení za hry: hlasitost / ztlumení a přehled ovládání. Otevírá se tlačítkem s ikonou posuvníků.
// Tlačítko je buď součástí HUD (let, přistání), nebo samostatné (start, oslava); při plánování se nezobrazuje.
import { t } from '../i18n/index.js';
import { Encyclopedia, ICON_WIKI } from './Encyclopedia.js';

export { ICON_WIKI };

export const ICON_HOME = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M3.5 11.5L12 4l8.5 7.5"/><path d="M6 10v9.5h12V10"/><path d="M10 19.5v-5h4v5"/></svg>`;

/**
 * Tlačítko "domů" (zpět na plánování). Aby se hráč nevrátil omylem, první klepnutí jen vyžádá potvrzení,
 * druhé do 3 s provede návrat.
 */
export function bindHomeButton(btn, onHome) {
  let timer = null;
  const reset = () => { btn.classList.remove('confirm'); btn.removeAttribute('data-tip'); clearTimeout(timer); timer = null; };
  btn.setAttribute('aria-label', t('home.title'));
  btn.addEventListener('click', () => {
    if (timer) { reset(); onHome?.(); return; }
    btn.classList.add('confirm');
    btn.setAttribute('data-tip', t('home.confirm'));
    timer = setTimeout(reset, 3000);
  });
}
export const ICON_SETTINGS = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
  <path d="M4 7h9M17 7h3M4 17h3M11 17h9M4 12h16"/><circle cx="15" cy="7" r="2" fill="currentColor"/><circle cx="9" cy="17" r="2" fill="currentColor"/><circle cx="8" cy="12" r="2" fill="currentColor"/></svg>`;

const ICON_VOL = (muted) => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" fill="currentColor"/>${muted ? '<path d="M16 9.5l5 5M21 9.5l-5 5"/>' : '<path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"/>'}</svg>`;

/** Řádky nápovědy: [klávesy, popis]. */
const HELP = [
  [['key.space', 'W', '↑'], 'help.burner'],
  [['S', '↓'], 'help.vent'],
  [['A', 'D', '←', '→'], 'help.rotate'],
  [['C'], 'help.camera'],
  [['M'], 'help.mute'],
  [['key.drag'], 'help.look'],
  [['key.wheel'], 'help.zoom'],
];

export class SettingsMenu {
  /**
   * @param {HTMLElement} root
   * @param {import('../audio/SynthAudio.js').SynthAudio} audio
   * @param {import('../audio/MusicPlayer.js').MusicPlayer} music
   */
  constructor(root, audio, music, onHome, onPause) {
    this.audio = audio;
    this.music = music;
    this.mode = 'none';
    this.isOpen = false;
    this.anchor = null;

    this.btn = document.createElement('button');
    this.btn.className = 'btn round small gear standalone';
    this.btn.innerHTML = ICON_SETTINGS;
    this.btn.setAttribute('aria-label', t('settings.title'));
    this.btn.addEventListener('click', () => this.toggle(this.btn));

    this.panel = document.createElement('div');
    this.panel.className = 'panel interactive settings';
    this.panel.hidden = true;
    const keys = (arr) => arr.map((k) => `<kbd>${k.startsWith('key.') ? t(k) : k}</kbd>`).join('');
    this.panel.innerHTML = `
      <div class="set-head"><b>${t('settings.title')}</b><button class="set-close" data-f="close" aria-label="${t('settings.close')}">✕</button></div>
      <small>${t('settings.sound')}</small>
      <div class="set-vol">
        <button class="btn round small" data-f="mute" aria-pressed="false"></button>
        <input type="range" min="0" max="100" step="1" data-f="vol" aria-label="${t('settings.volume')}">
        <span data-f="pct"></span>
      </div>
      <small>${t('settings.music')}</small>
      <div class="set-vol">
        <button class="btn round small" data-f="mmute" aria-pressed="false"></button>
        <input type="range" min="0" max="100" step="1" data-f="mvol" aria-label="${t('settings.musicVolume')}">
        <span data-f="mpct"></span>
      </div>
      <small>${t('settings.controls')}</small>
      <div class="set-help">${HELP.map(([k, d]) => `<div class="krow"><span class="keys">${keys(k)}</span><span>${t(d)}</span></div>`).join('')}</div>
      <p class="set-tip">${t('help.tip')}</p>`;
    this.homeBtn = document.createElement('button');
    this.homeBtn.className = 'btn round small gear standalone home';
    this.homeBtn.innerHTML = ICON_HOME;
    bindHomeButton(this.homeBtn, onHome);
    // Encyklopedie: ikona vedle nastavení, okno přes celou hru
    this.wiki = new Encyclopedia(root, onPause);
    this.wikiBtn = document.createElement('button');
    this.wikiBtn.className = 'btn round small gear standalone wiki-btn';
    this.wikiBtn.innerHTML = ICON_WIKI;
    this.wikiBtn.setAttribute('aria-label', t('wiki.title'));
    this.wikiBtn.addEventListener('click', () => this.openWiki());
    root.append(this.btn, this.wikiBtn, this.homeBtn, this.panel);

    this.f = {};
    this.panel.querySelectorAll('[data-f]').forEach((n) => { this.f[n.dataset.f] = n; });
    this.f.close.addEventListener('click', () => this.close());
    this.f.mute.addEventListener('click', () => { this.audio.unlock(); this.audio.setMuted(!this.audio.muted); this.sync(); });
    this.f.mmute.addEventListener('click', () => { this.music.start(); this.music.setMuted(!this.music.muted); this.sync(); });
    this.f.mvol.addEventListener('input', () => {
      this.audio.unlock();
      this.music.start();
      const v = this.f.mvol.valueAsNumber / 100;
      this.music.setVolume(v);
      if (v > 0 && this.music.muted) this.music.setMuted(false);
      this.sync();
    });
    this.f.vol.addEventListener('input', () => {
      this.audio.unlock();
      const v = this.f.vol.valueAsNumber / 100;
      this.audio.setVolume(v);
      if (v > 0 && this.audio.muted) this.audio.setMuted(false);
      this.sync();
    });
    this.f.vol.addEventListener('change', () => this.audio.click());   // zvuková ukázka nové hlasitosti

    this.onDocDown = (e) => {
      if (this.isOpen && !this.panel.contains(e.target)
        && !(this.anchor && this.anchor.contains(e.target))) this.close();
    };
    this.onKey = (e) => {
      if (e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName) && e.target.type !== 'range') return;
      if (e.code === 'Escape') this.close();
      if (e.code === 'KeyM' && !e.repeat) {   // M ztlumí zvuky i hudbu (a znovu zapne)
        this.audio.unlock();
        const mute = !(this.audio.muted && this.music.muted);
        this.audio.setMuted(mute);
        this.music.setMuted(mute);
        this.sync();
      }
    };
    document.addEventListener('pointerdown', this.onDocDown, true);
    window.addEventListener('keydown', this.onKey);
    this.sync();
    this.setMode(this.mode);
  }

  /** 'hud' = tlačítko je v HUD, 'standalone' = vlastní tlačítko vlevo nahoře, 'plan' = tlačítko je na obrazovce plánování, 'none' = nic. */
  setMode(mode) {
    if (mode !== this.mode) this.close();   // panel patří k tlačítku z předchozí obrazovky
    this.mode = mode;
    this.btn.style.display = this.wikiBtn.style.display = this.homeBtn.style.display = mode === 'standalone' ? '' : 'none';
  }

  openWiki() {
    this.close();
    this.audio.unlock();
    this.wiki.open();
  }

  toggle(anchor) {
    const wasOpen = this.isOpen && !this.panel.hidden;
    this.close();
    if (wasOpen) return;
    this.anchor = anchor;
    this.audio.unlock();
    this.isOpen = true;
    this.panel.hidden = false;
    this.place(anchor);
    this.sync();
  }

  /** Panel pod tlačítkem, které ho otevřelo, pokud je tlačítko v plánování (vpravo nahoře); jinak výchozí místo vlevo nahoře. */
  place(anchor) {
    const st = this.panel.style;
    st.left = st.top = '';
    if (!anchor?.closest?.('.plan-head')) return;
    const r = anchor.getBoundingClientRect(), w = Math.min(340, window.innerWidth - 24);
    st.left = `${Math.max(12, Math.min(window.innerWidth - w - 12, r.right - w))}px`;
    st.top = `${r.bottom + 8}px`;
  }

  close() {
    this.isOpen = false;
    this.panel.hidden = true;
  }

  sync() {
    const a = this.audio;
    const v = a.muted ? 0 : Math.round(a.volume * 100);
    this.f.vol.value = String(v);
    this.f.vol.style.setProperty('--fill', `${v}%`);
    this.f.pct.textContent = `${v} %`;
    this.f.mute.innerHTML = ICON_VOL(a.muted || a.volume === 0);
    this.f.mute.setAttribute('aria-pressed', String(a.muted));
    this.f.mute.setAttribute('aria-label', t(a.muted ? 'settings.unmute' : 'settings.mute'));
    const m = this.music;
    const mv = m.muted ? 0 : Math.round(m.volume * 100);
    this.f.mvol.value = String(mv);
    this.f.mvol.style.setProperty('--fill', `${mv}%`);
    this.f.mpct.textContent = `${mv} %`;
    this.f.mmute.innerHTML = ICON_VOL(m.muted || m.volume === 0);
    this.f.mmute.setAttribute('aria-pressed', String(m.muted));
    this.f.mmute.setAttribute('aria-label', t(m.muted ? 'settings.unmute' : 'settings.mute'));
  }

  destroy() {
    document.removeEventListener('pointerdown', this.onDocDown, true);
    window.removeEventListener('keydown', this.onKey);
    this.btn.remove();
    this.wiki.destroy();
    this.wikiBtn.remove();
    this.homeBtn.remove();
    this.panel.remove();
  }
}
