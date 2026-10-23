// Závěrečná obrazovka: balonářský křestní list (Canvas → PNG) a tlačítka „stáhnout“ a „letět znovu“.
import { t, getLang } from '../i18n/index.js';
import brand from '@brand';
import { linksHtml } from './links.js';

// Jedna šablona diplomu pro všechny značky: rozměr, barvy a záhlaví dodává brand.diploma (viz doc/16-znacky-brand.md).
const D = brand.diploma;
const W = 1400, H = D.height;
const M = 98;   // m okraj diplomu (volné místo kolem obsahu)
const FONT = brand.font.family;

const fmtDist = (m) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`);
const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function fitText(g, text, maxW, size, weight = 800) {
  let s = size;
  do { g.font = `${weight} ${s}px ${FONT}`; s -= 4; } while (g.measureText(text).width > maxW && s > 24);
}

function star(g, x, y, r, on) {
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 ? r * 0.45 : r;
    g.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
  }
  g.closePath();
  g.fillStyle = on ? D.colors.star : D.colors.starOff;
  g.fill();
}

export class ResultScreen {
  constructor(app, titleText) {
    this.app = app;
    this.titleText = titleText;
    this.el = document.createElement('div');
    this.el.className = 'screen result';
    this.el.innerHTML = `
      <div class="result-inner">
        <canvas id="diploma" width="${W}" height="${H}"></canvas>
        <div class="result-btns">
          <button class="btn cta" id="r-dl">${t('result.download')}</button>
          <button class="btn ghost" id="r-share">${t('result.share')}</button>
          ${linksHtml('diploma')}
          <button class="btn ghost" id="r-again">${t('result.again')}</button>
        </div>
        <p class="result-school">${t('result.school')}</p>
      </div>`;
    app.uiRoot.appendChild(this.el);
    this.canvas = this.el.querySelector('#diploma');
    this.el.querySelector('#r-dl').addEventListener('click', () => this.download());
    this.shareBtn = this.el.querySelector('#r-share');
    this.shareBtn.addEventListener('click', () => this.share());
    this.el.querySelector('#r-again').addEventListener('click', () => app.go('PLAN'));
    const draw = () => this.draw();
    draw();
    document.fonts?.load(brand.font.loadSpec).then(draw).catch(() => {});
  }

  destroy() { this.el.remove(); }

  download() {
    const a = document.createElement('a');
    a.download = 'hot-air-sim-diplom.png';
    a.href = this.canvas.toDataURL('image/png');
    a.click();
  }

  /** Sdílení letu: nativní okno sdílení (s diplomem jako obrázkem), jinak zkopíruje text s odkazem na hru do schránky. */
  async share() {
    const r = this.app.flightResult;
    const text = t('result.shareText').replace('{score}', r.score).replace('{stars}', '★'.repeat(r.stars)).replace('{dist}', fmtDist(r.targetDist));
    const url = `${location.origin}${location.pathname}`;
    const title = brand.name;
    try {
      const blob = await new Promise((res) => this.canvas.toBlob(res, 'image/png'));
      const file = blob && new File([blob], 'hot-air-sim-diplom.png', { type: 'image/png' });
      if (file && navigator.canShare?.({ files: [file] })) await navigator.share({ title, text: `${text}\n${url}`, files: [file] });
      else if (navigator.share) await navigator.share({ title, text, url });
      else await this.copyShare(`${text}\n${url}`);
    } catch (e) {
      if (e?.name === 'AbortError') return;   // uživatel okno sdílení zavřel
      await this.copyShare(`${text}\n${url}`);
    }
  }

  async copyShare(text) {
    try { await navigator.clipboard.writeText(text); } catch { return; }
    this.shareBtn.textContent = t('result.copied');
    setTimeout(() => { this.shareBtn.textContent = t('result.share'); }, 2500);
  }

  draw() {
    const app = this.app, r = app.flightResult, plan = app.plan, lang = getLang();
    const g = this.canvas.getContext('2d');
    g.clearRect(0, 0, W, H);

    // Pozadí: gradient značky, bez rámečků
    const C = D.colors;
    const bg = g.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, C.bgTop); bg.addColorStop(1, C.bgBottom);
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.textAlign = 'center';

    // Záhlaví (logo a název) kreslí značka; obsah diplomu začíná pod ním
    D.header(g, { W, H, FONT, plan, app });
    const y0 = D.headerHeight;

    // Nadpis, titul a jméno: každý řádek má kolem sebe volné místo
    g.fillStyle = C.text;
    fitText(g, t('result.heading'), W - 2 * M, 70);
    g.fillText(t('result.heading'), W / 2, y0 + 110);

    const name = plan.name.trim();
    g.fillStyle = C.title;
    fitText(g, this.titleText, W - 2 * M, 76);
    g.fillText(this.titleText, W / 2, y0 + (name ? 240 : 290));
    if (name) {   // bez zadaného jména se nepíše nic
      g.fillStyle = C.text;
      fitText(g, name, W - 2 * M, 100);
      g.fillText(name, W / 2, y0 + 375);
    }

    // Statistiky
    const kindLabel = r.kind === 'soft' ? t('result.soft') : t('result.hard');
    const boxes = [
      [t('result.duration'), fmtTime(r.flightTime)],
      [t('result.maxAlt'), `${Math.round(r.maxAlt)} m`],
      [t('result.target'), fmtDist(r.targetDist)],
      [t('result.landing'), `${kindLabel} · ${r.touch.vy.toFixed(1)} m/s`],
      [t('result.score'), `${r.score}`],
    ];
    const n = boxes.length, gap = 20, bw = (W - 2 * M - gap * (n - 1)) / n, x0 = M;
    boxes.forEach(([label, val], i) => {
      const x = x0 + i * (bw + gap), y = H - 335;
      g.fillStyle = C.statBg;
      g.fillRect(x, y, bw, 116);
      g.fillStyle = C.muted; g.font = `700 21px ${FONT}`;
      g.fillText(label.toUpperCase(), x + bw / 2, y + 36);
      g.fillStyle = C.text; fitText(g, val, bw - 24, 46);
      g.fillText(val, x + bw / 2, y + 88);
    });

    // Spodní řada: vlevo „virtuální let“, uprostřed hvězdičky, vpravo datum
    const rowY = H - M - 12;
    const badge = t('result.virtual');
    g.font = `700 24px ${FONT}`;
    const pillW = g.measureText(badge).width + 48;
    g.fillStyle = C.badge;
    g.fillRect(M, rowY - 38, pillW, 50);
    g.fillStyle = C.badgeText; g.textAlign = 'center';
    g.fillText(badge, M + pillW / 2, rowY - 4);

    for (let i = 0; i < 4; i++) star(g, W / 2 - 90 + i * 60, rowY - 13, 22, i < r.stars);

    g.fillStyle = C.muted; g.font = `400 24px ${FONT}`;
    const date = new Date().toLocaleDateString(lang === 'cs' ? 'cs-CZ' : 'en-GB');
    g.textAlign = 'right';
    g.fillText(`${t('result.date')}: ${date}`, W - M, rowY - 4);
    g.textAlign = 'center';
  }
}
