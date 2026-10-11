// Sjednocený vstup: klávesnice + dotyková tlačítka (pointerdown/up bez zpoždění).
import { t } from '../i18n/index.js';

// Jednobarevné linkové ikony kamery: pohled na balon (třetí osoba) a pohled z koše (oko)
const SVG = (body) => `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
const CAM_ICONS = {
  chase: SVG('<path d="M12 2.5c-3.9 0-6.5 2.9-6.5 6.4 0 3 2 5.2 4 6.6h5c2-1.4 4-3.6 4-6.6 0-3.5-2.6-6.4-6.5-6.4z"/><path d="M10 15.5l.6 3.2M14 15.5l-.6 3.2"/><path d="M9.8 18.7h4.4v2.8H9.8z"/>'),
  cockpit: SVG('<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3" fill="currentColor"/>'),
};

export class TouchControls {
  constructor(root) {
    this.burn = false;
    this.vent = false;
    this.left = false;
    this.right = false;
    this.onCamera = null;
    this.onZoom = null;   // (směr) => void; -1 přiblížit, +1 oddálit
    this.keys = new Set();
    this.enabled = true;

    this.el = document.createElement('div');
    this.el.className = 'controls';
    this.el.innerHTML = `
      <div class="ctl-left">
        <button data-k="left" class="btn round" aria-label="${t('hud.rotL')}">⟲<kbd class="kh">A</kbd></button>
        <button data-k="right" class="btn round" aria-label="${t('hud.rotR')}">⟳<kbd class="kh">D</kbd></button>
        <button data-k="cam" class="btn round cam" aria-label="${t('hud.camera')}">${CAM_ICONS.chase}<kbd class="kh">C</kbd></button>
        <div class="zoom-col">
          <button data-k="zoomIn" class="btn zoom" aria-label="${t('hud.zoomIn')}">+</button>
          <button data-k="zoomOut" class="btn zoom" aria-label="${t('hud.zoomOut')}">−</button>
        </div>
      </div>
      <div class="ctl-right">
        <button data-k="vent" class="btn vent">${t('hud.vent')}<kbd class="kh">S</kbd></button>
        <button data-k="burn" class="btn burn">${t('hud.burner')}<kbd class="kh">${t('key.space')}</kbd></button>
      </div>`;
    root.appendChild(this.el);

    const bind = (btn, key) => {
      const down = (e) => { e.preventDefault(); this[key] = true; this.refresh(); try { btn.setPointerCapture(e.pointerId); } catch {} };
      const up = (e) => { e.preventDefault(); this[key] = false; this.refresh(); };
      btn.addEventListener('pointerdown', down);
      btn.addEventListener('pointerup', up);
      btn.addEventListener('pointercancel', up);
      btn.addEventListener('lostpointercapture', up);
      btn.addEventListener('contextmenu', (e) => e.preventDefault());
    };
    for (const k of ['burn', 'vent', 'left', 'right']) bind(this.el.querySelector(`[data-k="${k}"]`), k);
    this.el.querySelector('[data-k="cam"]').addEventListener('pointerdown', (e) => { e.preventDefault(); this.onCamera?.(); });

    // + / − drží se: opakuje přibližování, dokud je prst na tlačítku
    for (const [k, dir] of [['zoomIn', -1], ['zoomOut', 1]]) {
      const btn = this.el.querySelector(`[data-k="${k}"]`);
      let timer = 0;
      const stop = () => { clearInterval(timer); timer = 0; };
      btn.addEventListener('pointerdown', (e) => { e.preventDefault(); stop(); this.onZoom?.(dir); timer = setInterval(() => this.onZoom?.(dir), 50); });
      for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) btn.addEventListener(ev, stop);
      btn.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    window.addEventListener('keydown', (e) => {
      if (e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
      if (e.repeat) return;
      this.keys.add(e.code);
      if (e.code === 'KeyC') this.onCamera?.();
      this.refresh();
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => { this.keys.delete(e.code); this.refresh(); });
    window.addEventListener('blur', () => { this.keys.clear(); this.refresh(); });
  }

  /** Ikona tlačítka kamery podle aktuálního pohledu ('chase' = na balon, 'cockpit' = z koše). */
  setCamMode(mode) {
    const btn = this.el.querySelector('[data-k="cam"]');
    btn.querySelector('svg').outerHTML = CAM_ICONS[mode] || CAM_ICONS.chase;
  }

  /** Zvýrazní tlačítka, která jsou právě stisknutá myší / prstem nebo odpovídající klávesou. */
  refresh() {
    const k = this.keys;
    const held = {
      burn: this.burn || k.has('Space') || k.has('KeyW') || k.has('ArrowUp'),
      vent: this.vent || k.has('KeyS') || k.has('ArrowDown'),
      left: this.left || k.has('KeyA') || k.has('ArrowLeft'),
      right: this.right || k.has('KeyD') || k.has('ArrowRight'),
      cam: k.has('KeyC'),
    };
    for (const [key, on] of Object.entries(held)) this.el.querySelector(`[data-k="${key}"]`)?.classList.toggle('active', on);
  }

  setVisible(v) { this.el.style.display = v ? '' : 'none'; }

  destroy() { this.el.remove(); }

  /** @returns {{burn:number, vent:number, rotate:number}} */
  read() {
    if (!this.enabled) return { burn: 0, vent: 0, rotate: 0 };
    const k = this.keys;
    const burn = this.burn || k.has('Space') || k.has('KeyW') || k.has('ArrowUp');
    const vent = this.vent || k.has('KeyS') || k.has('ArrowDown');
    const left = this.left || k.has('KeyA') || k.has('ArrowLeft');
    const right = this.right || k.has('KeyD') || k.has('ArrowRight');
    return { burn: burn ? 1 : 0, vent: vent ? 1 : 0, rotate: (right ? 1 : 0) - (left ? 1 : 0) };
  }
}
