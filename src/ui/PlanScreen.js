// Obrazovka plánování letu (DOM). Nemá znalost 3D scény; komunikuje přes callbacky.
// Rozvržení: čtyři očíslované karty (Pilot, Místo a čas, Balon, Posádka a palivo)
// a pevná spodní lišta s odhadem letu a tlačítkem Vzlétnout.
import { t, getLang, setLang } from '../i18n/index.js';
import { SITES, mapCenter, createBiomes } from '../world/Sites.js';
import { BIOME } from '../world/Biomes.js';
import { WORLD, TIME_OF_DAY } from '../config/GameConfig.js';
import { ICON_SETTINGS, ICON_WIKI } from './SettingsMenu.js';
import { estimateFlight } from '../core/FlightPlan.js';
import { bearingToVec } from '../core/WindModel.js';
import { designCanvas, loadCustomImage, templateCanvas } from '../entities/EnvelopeDesigns.js';
import { LOGO_HTML } from './brand.js';
import { versionText } from '../config/Version.js';

const MAP_RES = 110;
const MAP_COLORS = {
  [BIOME.MEADOW]: [120, 171, 70],
  [BIOME.HILL]: [95, 143, 58],
  [BIOME.FIELD]: [210, 180, 90],
  [BIOME.FOREST]: [45, 90, 39],
  [BIOME.WATER]: [44, 127, 168],
  [BIOME.ROCK]: [112, 114, 110],
  [BIOME.TOWN]: [72, 75, 82],
};
const mapCache = new Map();
const COMPASS = ['S', 'SV', 'V', 'JV', 'J', 'JZ', 'Z', 'SZ'];
const LAYER_COLORS = ['#ffffff', '#ffea80', '#ffd400', '#ef4444'];   // vrstvy větru: od nejnižší k nejvyšší

/** Text přepínače denní doby: úvodní symbol (☀ / ☾) se oddělí, aby šlo nastavit mezeru mezi ním a textem. */
function todLabel(key) {
  const [icon, ...rest] = t(key).split(' ');
  return `<span class="seg-ic">${icon}</span>${rest.join(' ')}`;
}

function renderMapImage(site) {
  if (mapCache.has(site.id)) return mapCache.get(site.id);
  const center = mapCenter(site);
  const biomes = createBiomes(site);
  const c = document.createElement('canvas');
  c.width = c.height = MAP_RES;
  const g = c.getContext('2d');
  const img = g.createImageData(MAP_RES, MAP_RES);
  for (let j = 0; j < MAP_RES; j++) {
    for (let i = 0; i < MAP_RES; i++) {
      const x = ((i + 0.5) / MAP_RES - 0.5) * WORLD.size + center.x;
      const z = ((j + 0.5) / MAP_RES - 0.5) * WORLD.size + center.z;
      const s = biomes.sample(x, z);
      const col = MAP_COLORS[s.type];
      const shade = 0.92 + biomes.variation(x, z) * 0.08;
      const k = (j * MAP_RES + i) * 4;
      img.data[k] = col[0] * shade; img.data[k + 1] = col[1] * shade; img.data[k + 2] = col[2] * shade; img.data[k + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const target = biomes.findMeadow(site.target.bearing, site.target.dist);
  const out = { canvas: c, target, half: WORLD.size / 2, center };
  mapCache.set(site.id, out);
  return out;
}

export class PlanScreen {
  /**
   * @param {HTMLElement} root
   * @param {import('../core/FlightPlan.js').FlightPlan} plan
   * @param {{onChange:(kind:string)=>void, onStart:()=>void, getFleet:()=>any[]}} cb
   */
  constructor(root, plan, cb) {
    this.plan = plan;
    this.cb = cb;
    this.el = document.createElement('div');
    this.el.className = 'screen plan';
    root.appendChild(this.el);
    this.build();
  }

  show() { this.el.style.display = ''; this.refresh(); }
  hide() { this.el.style.display = 'none'; }

  build() {
    const p = this.plan;
    const lang = getLang();
    const esc = (s) => s.replace(/"/g, '&quot;');
    this.el.innerHTML = `
      <div class="plan-inner">
        <header class="plan-head">
          <div class="logo">${LOGO_HTML}</div>
          <div class="plan-tools">
          <button class="btn round small gear" data-f="settings" aria-label="${t('settings.title')}">${ICON_SETTINGS}</button>
          <button class="btn round small gear" data-f="wiki" aria-label="${t('wiki.title')}">${ICON_WIKI}</button>
          <div class="seg small">
            <button data-lang="cs" class="${lang === 'cs' ? 'on' : ''}">CS</button>
            <button data-lang="en" class="${lang === 'en' ? 'on' : ''}">EN</button>
          </div>
          </div>
        </header>

        <div class="plan-body">
          <div class="plan-hero">
            <h1>${t('plan.title')}</h1>
            <p>${t('plan.sub')}</p>
          </div>

          <section class="card">
            <h3><i>1</i>${t('plan.sec.pilot')}</h3>
            <label class="lbl" for="plan-name">${t('plan.name')}</label>
            <input id="plan-name" type="text" maxlength="24" placeholder="${t('plan.namePh')}" value="${esc(p.name)}" autocomplete="off" />
            <label class="lbl">${t('plan.honor')}</label>
            <div class="seg">
              <button data-honor="m">${t('plan.honor.m')}</button>
              <button data-honor="f">${t('plan.honor.f')}</button>
            </div>
          </section>

          <section class="card">
            <h3><i>2</i>${t('plan.sec.where')}</h3>
            <div class="sitelist" id="plan-sites">
              ${SITES.map((s) => `<button data-site="${s.id}" class="sitecard"><b>${s.name[lang]}</b><span>${s.desc[lang]}</span></button>`).join('')}
            </div>
            <div class="mapgrid">
              <div class="mapwrap"><canvas id="plan-map" width="440" height="440"></canvas></div>
              <div>
                <label class="lbl">${t('plan.wind')}</label>
                <div id="plan-wind" class="windlist"></div>
              </div>
            </div>
            <small class="legend"><i class="dot" style="background:#78ab46"></i>${t('plan.legend.meadow')}
              <i class="dot" style="background:#d2b45a"></i>${t('plan.legend.field')}
              <i class="dot" style="background:#2d5a27"></i>${t('plan.legend.forest')}
              <i class="dot" style="background:#2c7fa8"></i>${t('plan.legend.water')}
              <i class="dot" style="background:#70726e"></i>${t('plan.legend.rock')}
              <i class="dot" style="background:#484b52"></i>${t('plan.legend.town')}
              &nbsp;·&nbsp; ◉ ${t('plan.start.marker')} &nbsp; ★ ${t('plan.target.marker')}</small>
            <label class="lbl">${t('plan.time')}</label>
            <div class="seg">
              <button data-tod="morning">${todLabel('plan.morning')}</button>
              <button data-tod="evening">${todLabel('plan.evening')}</button>
            </div>
            <small id="plan-tod-hint"></small>
          </section>

          <section class="card">
            <h3><i>3</i>${t('plan.sec.balloon')}</h3>
            <div class="designs" id="plan-designs"></div>
            <small id="plan-upload-msg">${t('plan.upload.hint')}</small>
            <button class="linkbtn" id="plan-template" type="button">⬇ ${t('plan.template')}</button>
          </section>

          <section class="card">
            <h3><i>4</i>${t('plan.sec.load')}</h3>
            <div class="loadgrid">
              <div>
                <label class="lbl">${t('plan.passengers')}</label>
                <div class="stepper"><button data-step="pax-">−</button><b id="plan-pax"></b><button data-step="pax+">+</button></div>
                <div id="plan-masses" class="masses"></div>
              </div>
              <div>
                <label class="lbl">${t('plan.bottles')}</label>
                <div class="stepper"><button data-step="bot-">−</button><b id="plan-bot"></b><button data-step="bot+">+</button></div>
                <div id="plan-bottles" class="bottles"></div>
              </div>
            </div>
          </section>

          <p class="goal">${t('plan.goal')}</p>

        </div>

        <footer class="plan-foot">
          <div class="sum">
            <div><span>${t('plan.mass')}</span><b id="sum-mass"></b></div>
            <div><span>${t('plan.duration')}</span><b id="sum-min"></b></div>
            <div><span>${t('plan.hover')}</span><b id="sum-hover"></b></div>
          </div>
          <div id="plan-warn" class="warn"></div>
          <button id="plan-start" class="btn cta">${t('plan.start')} →</button>
        </footer>
      </div>
      <div class="app-version" aria-hidden="true">${versionText()}</div>
      <input id="plan-upload" type="file" accept="image/png,image/webp,image/jpeg" hidden />`;

    const $ = (s) => this.el.querySelector(s);
    this.q = {
      name: $('#plan-name'), map: $('#plan-map'), wind: $('#plan-wind'), todHint: $('#plan-tod-hint'),
      pax: $('#plan-pax'), bot: $('#plan-bot'), masses: $('#plan-masses'), bottles: $('#plan-bottles'),
      mass: $('#sum-mass'), min: $('#sum-min'), hover: $('#sum-hover'), warn: $('#plan-warn'),
      start: $('#plan-start'), upload: $('#plan-upload'), uploadMsg: $('#plan-upload-msg'),
    };

    this.buildDesignButtons();

    $('#plan-template').addEventListener('click', () => {
      const a = document.createElement('a');
      a.download = 'hot-air-sim-sablona-plaste.png';
      a.href = templateCanvas().toDataURL('image/png');
      a.click();
    });

    this.q.upload.addEventListener('change', async () => {
      const f = this.q.upload.files[0];
      if (!f) return;
      try {
        p.customCanvas = await loadCustomImage(f);
        p.envelopeId = 'custom';
        p.envelopeTouched = true;
        
        this.q.uploadMsg.textContent = t('plan.upload.hint');
        this.buildDesignButtons();
        this.cb.onChange('load');
        this.refresh();
      } catch {
        this.q.uploadMsg.textContent = t('plan.upload.err');
      }
      this.q.upload.value = '';
    });

    this.q.name.addEventListener('input', () => { p.name = this.q.name.value; });
    // build() běží i při změně jazyka: starý posluchač se musí odebrat, jinak se každé klepnutí zpracuje víckrát
    if (this.onClick) this.el.removeEventListener('click', this.onClick);
    this.onClick = (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      const d = b.dataset;
      if (b.dataset.f === 'settings') { this.cb.onSettings?.(b); return; }
      if (b.dataset.f === 'wiki') { this.cb.onWiki?.(); return; }
      if (d.upload) { this.q.upload.click(); return; }
      if (d.lang) { setLang(d.lang); this.build(); this.refresh(); this.cb.onChange('lang'); return; }
      if (d.honor) { p.honorific = d.honor; this.cb.onChange('crew'); }
      if (d.site) { p.siteId = d.site; this.cb.onChange('world'); }
      if (d.tod) { p.timeOfDay = d.tod; this.cb.onChange('world'); }
      if (d.design) { p.envelopeId = d.design; p.envelopeTouched = true; this.cb.onChange('load'); }
      if (d.step) {
        if (d.step === 'pax+') p.setPassengers(p.passengers + 1);
        if (d.step === 'pax-') p.setPassengers(p.passengers - 1);
        if (d.step === 'bot+') p.setBottles(p.bottles + 1);
        if (d.step === 'bot-') p.setBottles(p.bottles - 1);
        this.cb.onChange('load');
      }
      this.refresh();
    };
    this.el.addEventListener('click', this.onClick);
    this.q.start.addEventListener('click', () => this.cb.onStart());
  }

  /** Dlaždice pláště: vestavěné vzory a vlastní obrázek. */
  buildDesignButtons() {
    const lang = getLang(), p = this.plan;
    const box = this.el.querySelector('#plan-designs');
    box.innerHTML = '';
    const fleet = (this.cb.getFleet?.() || []).map((f) => ({ id: f.id, label: f.name[lang], canvas: f.canvas }));
    // jen balony z public/envelopes; bez nich nouzově jeden výchozí vzor
    const items = fleet.length ? fleet : [{ id: 'checker', label: t('plan.default'), canvas: designCanvas('checker') }];
    if (p.customCanvas) items.push({ id: 'custom', label: t('plan.custom'), canvas: p.customCanvas });

    for (const it of items) {
      const btn = document.createElement('button');
      btn.className = 'dtile';
      btn.dataset.design = it.id;
      const c = document.createElement('canvas');
      c.width = 160; c.height = 80;
      c.getContext('2d').drawImage(it.canvas, 0, 0, 160, 80);
      btn.append(c, Object.assign(document.createElement('span'), { textContent: it.label }));
      box.appendChild(btn);
    }
    const up = document.createElement('button');
    up.className = 'dtile upload';
    up.dataset.upload = '1';
    up.innerHTML = `<b>＋</b><span>${t('plan.upload')}</span>`;
    box.appendChild(up);
    this.markSelected();
  }

  markSelected() {
    const p = this.plan;
    this.el.querySelectorAll('[data-design]').forEach((b) => b.classList.toggle('on', b.dataset.design === p.envelopeId));
  }

  refresh() {
    const p = this.plan;
    const q = this.q;
    const mark = (attr, val) => this.el.querySelectorAll(`[data-${attr}]`).forEach((b) => b.classList.toggle('on', b.dataset[attr] === val));
    mark('honor', p.honorific); mark('site', p.siteId); mark('tod', p.timeOfDay);
    this.markSelected();
    q.todHint.textContent = t(p.timeOfDay === 'morning' ? 'plan.morning.hint' : 'plan.evening.hint');
    q.pax.textContent = p.passengers;
    q.bot.textContent = p.bottles;
    q.masses.innerHTML = p.masses.map((m) => `<span class="pill">${m} kg</span>`).join('');
    q.bottles.innerHTML = Array.from({ length: p.bottles }, () => '<span class="gas"></span>').join('');

    const wscale = TIME_OF_DAY[p.timeOfDay].windScale;
    q.wind.innerHTML = p.site.wind.map((l, i) => {
      const kmh = Math.round(l.speed * wscale * 3.6);
      const dir = COMPASS[Math.round(l.bearing / 45) % 8];
      return `<div class="wl"><span class="sw" style="background:${LAYER_COLORS[i % 4]}"></span><span>${l.alt} m</span><i style="transform:rotate(${l.bearing - 90}deg)">➤</i><b>${kmh} km/h ${dir}</b></div>`;
    }).join('');

    const est = estimateFlight(p);
    q.mass.textContent = `${Math.round(est.totalMass)} kg`;
    q.min.textContent = `${Math.round(est.minutes)} ${t('plan.min')}`;
    q.hover.textContent = `${Math.round(est.hoverTemp)} °C`;
    q.warn.textContent = !est.canFly ? t('plan.heavy') : est.tight ? t('plan.tight') : '';
    q.warn.className = `warn ${!est.canFly ? 'bad' : est.tight ? 'mid' : ''}`;
    q.start.disabled = !est.canFly;
    this.drawMap();
  }

  drawMap() {
    const site = this.plan.site;
    const { canvas, target, half, center } = renderMapImage(site);
    const c = this.q.map, g = c.getContext('2d');
    const S = c.width;
    g.imageSmoothingEnabled = false;
    g.drawImage(canvas, 0, 0, S, S);
    const toPx = (x, z) => [(x - center.x + half) / WORLD.size * S, (z - center.z + half) / WORLD.size * S];
    const [sx, sy] = toPx(0, 0);

    const wscale = TIME_OF_DAY[this.plan.timeOfDay].windScale;
    g.font = '700 15px Raleway, sans-serif';
    g.lineJoin = 'round';
    site.wind.forEach((l, i) => {
      const v = bearingToVec(l.bearing, 1);
      const len = 16 + l.speed * wscale * 11;
      const ex = sx + v.x * len, ey = sy + v.z * len;
      const col = LAYER_COLORS[i % 4];
      g.lineWidth = 3; g.strokeStyle = col; g.fillStyle = col;
      g.beginPath(); g.moveTo(sx, sy); g.lineTo(ex, ey); g.stroke();
      const a = Math.atan2(ey - sy, ex - sx);
      g.beginPath();
      g.moveTo(ex, ey);
      g.lineTo(ex - Math.cos(a - 0.45) * 11, ey - Math.sin(a - 0.45) * 11);
      g.lineTo(ex - Math.cos(a + 0.45) * 11, ey - Math.sin(a + 0.45) * 11);
      g.closePath(); g.fill();
      g.lineWidth = 4; g.strokeStyle = 'rgba(0,27,34,0.85)';
      g.strokeText(`${l.alt}`, ex + 6, ey - 6);
      g.fillText(`${l.alt}`, ex + 6, ey - 6);
    });

    g.fillStyle = '#ffffff'; g.strokeStyle = '#003b4b'; g.lineWidth = 3;
    g.beginPath(); g.arc(sx, sy, 8, 0, 7); g.fill(); g.stroke();
    const [tx, ty] = toPx(target.x, target.z);
    g.fillStyle = '#41d7ff';
    g.beginPath(); g.arc(tx, ty, 11, 0, 7); g.fill(); g.stroke();
    g.fillStyle = '#003b4b'; g.font = '700 13px Raleway, sans-serif'; g.textAlign = 'center';
    g.fillText('★', tx, ty + 4);
    g.textAlign = 'left';
  }
}
