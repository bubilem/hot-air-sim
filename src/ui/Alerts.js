// Hlášení pilotovi (přehřátí, požár, trhliny, …): ploché karty podle design systému školy.
// Trvalé stavy se předávají každý snímek v `update(active)` a drží se, dokud platí; jednorázové události
// (nová trhlina) se přidávají přes `flash(def, ttl)` a po několika sekundách samy zmizí.
// Najednou je vidět nejvýš `MAX_VISIBLE` karet, nejzávažnější nahoře. Texty jdou přes i18n (`alert.<id>.title|text`).
import { t } from '../i18n/index.js';

const MAX_VISIBLE = 3;
const LEVEL_ORDER = { danger: 0, warning: 1, info: 2 };
const OUT_MS = 220;

const svg = (d) => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;

/** Ikony hlášení (24 × 24, linka 2 px jako ostatní ikony rozhraní). */
export const ALERT_ICONS = {
  flame: svg('<path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2.5-4.5C9.5 10.5 10.5 11 11 11c0-3 0-5 1-8z"/>'),
  thermo: svg('<path d="M10 14.5V5a2 2 0 0 1 4 0v9.5a4 4 0 1 1-4 0z"/><path d="M12 9v7"/>'),
  tear: svg('<path d="M3 12l4-4 3 6 3-8 3 8 3-4 2 2"/><path d="M3 19h18" opacity=".5"/>'),
  burn: svg('<path d="M12 3l9 16H3z"/><path d="M12 10v4"/><path d="M12 17h.01"/>'),
  contact: svg('<path d="M4 20V10l5-3 5 3v10"/><path d="M14 4h6M17 1v6"/>'),
  air: svg('<path d="M3 8h11a3 3 0 1 0-3-3"/><path d="M3 12h15a3 3 0 1 1-3 3"/><path d="M3 16h7"/>'),
  person: svg('<circle cx="12" cy="8" r="3.5"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/>'),
  gas: svg('<path d="M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z"/><path d="M5 5l14 14"/>'),
  edge: svg('<path d="M4 4h4v16H4z"/><path d="M12 12h8"/><path d="M16 8l4 4-4 4"/>'),
  ceiling: svg('<path d="M5 3h14"/><path d="M12 20V8"/><path d="M7 12l5-5 5 5"/>'),
};

/** Definice hlášení: id, závažnost, ikona. Texty: `alert.<id>.title` a `alert.<id>.text`. */
export const ALERTS = {
  fire: { id: 'fire', level: 'danger', icon: 'flame' },
  passedout: { id: 'passedout', level: 'danger', icon: 'person' },
  overheat: { id: 'overheat', level: 'danger', icon: 'thermo' },
  contact: { id: 'contact', level: 'warning', icon: 'contact' },
  tear: { id: 'tear', level: 'warning', icon: 'tear' },
  burn: { id: 'burn', level: 'warning', icon: 'burn' },
  thin: { id: 'thin', level: 'warning', icon: 'air' },
  nogas: { id: 'nogas', level: 'warning', icon: 'gas' },
  edge: { id: 'edge', level: 'warning', icon: 'edge' },
  ceiling: { id: 'ceiling', level: 'info', icon: 'ceiling' },
};

export class AlertCenter {
  /** @param {HTMLElement} parent */
  constructor(parent) {
    this.el = document.createElement('div');
    this.el.className = 'hud-alerts';
    this.el.setAttribute('role', 'status');
    this.el.setAttribute('aria-live', 'polite');
    parent.appendChild(this.el);
    this.shown = new Map();     // id -> { node, stamp }
    this.flashes = new Map();   // id -> { def, until, stamp, ttl }
    this.stamp = 0;
  }

  /** Jednorázové hlášení na `ttl` sekund (opakované hlášení stejného id odpočet znovu spustí). */
  flash(def, ttl = 5) {
    this.flashes.set(def.id, { def, ttl, until: performance.now() + ttl * 1000, stamp: ++this.stamp });
  }

  /** Smaže všechna hlášení (nový let). */
  clear() {
    this.flashes.clear();
    this.update([]);
  }

  /** @param {{id:string, level:string, icon:string}[]} active  právě platné trvalé stavy */
  update(active) {
    const now = performance.now();
    const want = new Map();
    for (const a of active) want.set(a.id, { def: a, ttl: 0, stamp: 0 });
    for (const [id, f] of this.flashes) {
      if (f.until <= now) this.flashes.delete(id);
      else if (!want.has(id)) want.set(id, f);
    }
    const list = [...want.values()].sort((a, b) => LEVEL_ORDER[a.def.level] - LEVEL_ORDER[b.def.level]).slice(0, MAX_VISIBLE);
    const ids = new Set(list.map((x) => x.def.id));

    for (const [id, s] of this.shown) {
      if (ids.has(id)) continue;
      this.shown.delete(id);
      s.node.classList.add('out');
      setTimeout(() => s.node.remove(), OUT_MS);
    }
    list.forEach((x, i) => {
      let s = this.shown.get(x.def.id);
      if (!s || s.stamp !== x.stamp) {
        const node = this.build(x);
        if (s) s.node.remove();
        s = { node, stamp: x.stamp };
        this.shown.set(x.def.id, s);
      }
      if (this.el.children[i] !== s.node) this.el.insertBefore(s.node, this.el.children[i] || null);
    });
  }

  build({ def, ttl }) {
    const n = document.createElement('div');
    n.className = `alert ${def.level}`;
    const ic = document.createElement('div');
    ic.className = 'ai';
    ic.innerHTML = ALERT_ICONS[def.icon] || '';
    const body = document.createElement('div');
    body.className = 'at';
    const title = document.createElement('strong');
    title.textContent = t(`alert.${def.id}.title`);
    const text = document.createElement('span');
    text.textContent = t(`alert.${def.id}.text`);
    body.append(title, text);
    n.append(ic, body);
    if (ttl > 0) {
      const bar = document.createElement('i');
      bar.className = 'ttl';
      bar.style.setProperty('--ttl', `${ttl}s`);
      n.appendChild(bar);
    }
    return n;
  }
}
