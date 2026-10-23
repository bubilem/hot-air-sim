// Přístrojová deska: výška, variometr, teplota, plyn, vítr (rozbalovací žebříček po vrstvách), cíl.
import { t } from '../i18n/index.js';
import { PHYSICS } from '../config/GameConfig.js';
import { vecToBearing } from '../core/WindModel.js';
import { LOGO_HTML } from './brand.js';
import { ICON_SETTINGS, ICON_HOME, ICON_WIKI, bindHomeButton } from './SettingsMenu.js';
import { AlertCenter, ALERTS, ALERT_ICONS } from './Alerts.js';

const HUD_BIOME_AGL = 150;   // m nad terénem, od kdy se ukazuje povrch pod košem
const BIOME_KIND = { meadow: 'ok', hill: 'ok', field: 'warn', forest: 'bad', water: 'bad', rock: 'bad', town: 'bad' };
const COMPASS = ['S', 'SV', 'V', 'JV', 'J', 'JZ', 'Z', 'SZ'];
const STORE_KEY = 'hotairsim.windLadder';

function loadOpen() {
  try {
    const v = localStorage.getItem(STORE_KEY);
    if (v !== null) return v === '1';
  } catch { /* úložiště nemusí být dostupné */ }
  return Math.min(window.innerWidth, window.innerHeight) >= 700;
}

export class HUD {
  constructor(root, onSettings, onHome, onWiki) {
    this.el = document.createElement('div');
    this.el.className = 'hud';
    this.el.innerHTML = `
      <div class="hud-vignette" data-f="vig"></div>
      <div class="hud-top">
        <div class="hud-left">
          <div class="logo">${LOGO_HTML}</div>
          <button class="btn round small gear" data-f="gear" aria-label="${t('settings.title')}">${ICON_SETTINGS}</button>
          <button class="btn round small gear" data-f="wiki" aria-label="${t('wiki.title')}">${ICON_WIKI}</button>
          <button class="btn round small gear home" data-f="home">${ICON_HOME}</button>
        </div>
        <div class="hud-right">
          <div class="panel windp">
            <button class="windhead" data-f="windtoggle" aria-label="${t('hud.wind.toggle')}">
              <small>${t('hud.wind')}</small><b data-f="wind">–</b><i class="arrow" data-f="arrow">➤</i><em class="chev" data-f="chev">▾</em>
            </button>
            <div class="ladder" data-f="ladder"></div>
          </div>
          <div class="panel wind tgt"><small>${t('hud.target')}</small><b data-f="tdist">–</b><i class="arrow" data-f="tarrow">➤</i></div>
        </div>
      </div>
      <div class="hud-side panel">
        <div><small>${t('hud.altitude')}</small><b><span data-f="alt">0</span> m</b></div>
        <div><small>${t('hud.vsi')}</small><b><span data-f="vsi">0.0</span> m/s</b></div>
        <div class="biome" data-f="biomerow" style="display:none"><small>${t('hud.below')}</small><b data-f="biome">–</b></div>
        <div data-f="temprow"><small>${t('hud.temp')}</small><b><span data-f="temp">0</span> °C</b></div>
        <div><small>${t('hud.tempOut')}</small><b><span data-f="tempout">0</span> °C</b></div>
        <div class="dmg" data-f="dmg" style="display:none"><small>${t('hud.hull')}</small><b>${ALERT_ICONS.tear}<span data-f="dmgn">0</span></b></div>
        <div class="gasbar"><small>${t('hud.gas')}</small><div class="bar"><div data-f="gas"></div></div></div>
      </div>`;
    root.appendChild(this.el);
    this.f = {};
    this.el.querySelectorAll('[data-f]').forEach((n) => { this.f[n.dataset.f] = n; });
    this.cacheText = {};
    this.alerts = new AlertCenter(this.el);
    this.prevHoles = 0;
    this.ladderSig = '';
    this.open = loadOpen();
    this.applyOpen();
    this.f.gear.addEventListener('click', () => onSettings?.(this.f.gear));
    this.f.wiki.addEventListener('click', () => onWiki?.());
    bindHomeButton(this.f.home, onHome);
    this.f.windtoggle.addEventListener('click', () => {
      this.open = !this.open;
      try { localStorage.setItem(STORE_KEY, this.open ? '1' : '0'); } catch { /* ignorováno */ }
      this.ladderSig = '';
      this.applyOpen();
    });
  }

  applyOpen() {
    this.f.ladder.style.display = this.open ? '' : 'none';
    this.f.chev.textContent = this.open ? '▴' : '▾';
  }

  setVisible(v) { this.el.style.display = v ? '' : 'none'; }

  destroy() { this.el.remove(); }

  set(key, text) {
    if (this.cacheText[key] !== text) { this.f[key].textContent = text; this.cacheText[key] = text; }
  }

  /** Žebříček větru: všechny vrstvy a řádek "Vy" na odpovídající výšce. */
  updateLadder({ layers, altStart, wind, cameraYaw }) {
    if (!this.open || !layers) return;
    const rows = layers.map((l) => ({ alt: l.alt, x: l.x, z: l.z, you: false }));
    rows.push({ alt: altStart, x: wind.x, z: wind.z, you: true });
    rows.sort((a, b) => b.alt - a.alt);
    const fmt = (r) => {
      const kmh = Math.round(Math.hypot(r.x, r.z) * 3.6);
      const b = vecToBearing(r.x, r.z);
      return { kmh, b, dir: COMPASS[Math.round(b / 45) % 8] };
    };
    const sig = rows.map((r) => { const f = fmt(r); return `${r.you ? 'Y' : ''}${Math.round(r.alt / 5)}:${f.kmh}:${Math.round(f.b / 3)}`; }).join('|') + Math.round(cameraYaw / 3);
    if (sig === this.ladderSig) return;
    this.ladderSig = sig;
    this.f.ladder.innerHTML = rows.map((r) => {
      const f = fmt(r);
      const rot = (f.b - cameraYaw - 90).toFixed(0);
      const label = r.you ? `${t('hud.you')} · ${Math.max(0, Math.round(r.alt))} m` : `${r.alt} m`;
      return `<div class="lr${r.you ? ' you' : ''}"><span>${label}</span><i style="transform:rotate(${rot}deg)">➤</i><b>${f.kmh} km/h ${f.dir}</b></div>`;
    }).join('') + `<div class="lnote">${t('hud.ladder.note')}</div>`;
  }

  update({ agl, vy, tempIn, gasFrac, wind, cameraYaw, target, edge, layers, altStart, fire = 0, holes = [], biome = null, contact = false, tempOut = 0, hypoxia = 0, unconscious = false, thin = false, ceiling = false }) {
    this.set('alt', Math.round(agl));
    this.set('vsi', (vy >= 0 ? '+' : '') + vy.toFixed(1));
    this.set('temp', Math.round(tempIn));
    this.set('tempout', Math.round(tempOut));
    this.f.vig.style.opacity = unconscious ? '0.92' : (hypoxia * 0.75).toFixed(2);
    this.f.gas.style.width = `${Math.round(gasFrac * 100)}%`;
    this.f.gas.style.background = gasFrac < 0.2 ? 'var(--danger)' : '';
    const sp = Math.hypot(wind.x, wind.z) * 3.6;
    const b = vecToBearing(wind.x, wind.z);
    this.set('wind', `${Math.round(sp)} km/h ${COMPASS[Math.round(b / 45) % 8]}`);
    // Šipka větru relativně k pohledu kamery (nahoře = dopředu)
    this.f.arrow.style.transform = `rotate(${(b - cameraYaw - 90).toFixed(0)}deg)`;
    this.updateLadder({ layers, altStart, wind, cameraYaw });

    if (target) {
      const d = target.dist;
      this.set('tdist', d >= 1000 ? `${(d / 1000).toFixed(1)} km` : `${Math.round(d)} m`);
      this.f.tarrow.style.transform = `rotate(${(target.bearing - cameraYaw - 90).toFixed(0)}deg)`;
    }

    // Povrch pod košem (jen při přiblížení k zemi): zelená = bezpečné přistání, žlutá = pole (penalizace), červená = neúspěch
    const showBiome = biome && agl < HUD_BIOME_AGL;
    this.f.biomerow.style.display = showBiome ? '' : 'none';
    if (showBiome) {
      this.set('biome', t(`biome.${biome}`));
      this.f.biomerow.dataset.kind = BIOME_KIND[biome] || 'bad';
    }

    // Stav přístrojů: přehřátá teplota a počet poškození pláště
    const overheat = tempIn >= PHYSICS.alarmTemp;
    this.f.temprow.classList.toggle('hot', overheat);
    this.f.dmg.style.display = holes.length ? '' : 'none';
    this.set('dmgn', holes.length);

    // Nové poškození: jednorázové hlášení (při novém letu se počítadlo vynuluje)
    if (holes.length > this.prevHoles) this.alerts.flash(holes[holes.length - 1].kind === 'tear' ? ALERTS.tear : ALERTS.burn, 6);
    this.prevHoles = holes.length;

    const active = [];
    if (unconscious) active.push(ALERTS.passedout);
    if (fire > 0) active.push(ALERTS.fire);
    else if (overheat) active.push(ALERTS.overheat);
    if (contact) active.push(ALERTS.contact);
    if (edge) active.push(ALERTS.edge);
    if (gasFrac <= 0) active.push(ALERTS.nogas);
    if (thin) active.push(ALERTS.thin);
    if (ceiling) active.push(ALERTS.ceiling);
    this.alerts.update(active);
  }
}
