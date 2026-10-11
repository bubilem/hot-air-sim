// Závěrečná obrazovka: balonářský křestní list (Canvas → PNG) a tlačítka „stáhnout“ a „letět znovu“.
import { t, getLang } from '../i18n/index.js';
import { SCHOOL_IT_URL } from '../config/GameConfig.js';

const W = 1400, H = 1190;
const M = 98;   // m okraj diplomu (volné místo kolem obsahu)
const FONT = 'Raleway, Arial, sans-serif';

// Symbol školy (viz doc/09-design-system.md): body polygonů ve viewBoxu 1000 × 866.
const MARK = [
  ['#ffd400', [0, 0, 500, 0, 500, 188, 326, 188]],
  ['#ffea80', [0, 0, 326, 188, 413, 339, 250, 433]],
  ['#41d7ff', [500, 0, 1000, 0, 674, 188, 500, 188]],
  ['#00c0f3', [674, 188, 1000, 0, 750, 433, 587, 339]],
  ['#c2dd78', [250, 433, 413, 339, 500, 490, 500, 866]],
  ['#a6ce39', [500, 490, 587, 339, 750, 433, 500, 866]],
];

function drawMark(g, x, y, w) {
  const k = w / 1000;
  for (const [color, pts] of MARK) {
    g.beginPath();
    for (let i = 0; i < pts.length; i += 2) g[i ? 'lineTo' : 'moveTo'](x + pts[i] * k, y + pts[i + 1] * k);
    g.closePath();
    g.fillStyle = color;
    g.fill();
  }
}

const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function fitText(g, text, maxW, size, weight = 800) {
  let s = size;
  do { g.font = `${weight} ${s}px Raleway, Arial, sans-serif`; s -= 4; } while (g.measureText(text).width > maxW && s > 24);
}

function star(g, x, y, r, on) {
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 ? r * 0.45 : r;
    g.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
  }
  g.closePath();
  g.fillStyle = on ? '#ffd400' : 'rgba(255,255,255,0.15)';
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
          <button class="btn ghost" id="r-again">${t('result.again')}</button>
        </div>
        <p class="result-school">${t('result.school')}
          <a href="${SCHOOL_IT_URL}" target="_blank" rel="noopener noreferrer">${t('result.moreIt')}</a></p>
      </div>`;
    app.uiRoot.appendChild(this.el);
    this.canvas = this.el.querySelector('#diploma');
    this.el.querySelector('#r-dl').addEventListener('click', () => this.download());
    this.el.querySelector('#r-again').addEventListener('click', () => app.go('PLAN'));
    const draw = () => this.draw();
    draw();
    document.fonts?.load('700 40px Raleway').then(draw).catch(() => {});
  }

  destroy() { this.el.remove(); }

  download() {
    const a = document.createElement('a');
    a.download = 'hot-air-sim-diplom.png';
    a.href = this.canvas.toDataURL('image/png');
    a.click();
  }

  draw() {
    const app = this.app, r = app.flightResult, plan = app.plan, lang = getLang();
    const g = this.canvas.getContext('2d');
    g.clearRect(0, 0, W, H);

    // Pozadí: gradient z design systému, bez rámečků
    const bg = g.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#003b4b'); bg.addColorStop(1, '#006783');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.textAlign = 'center';

    // Nahoře velký symbol školy (trojúhelník hrotem dolů = balon), pod ním název HotAirSim jako koš
    const markW = 240, markY = 84;
    drawMark(g, (W - markW) / 2, markY, markW);
    g.font = `700 60px ${FONT}`;
    const w1 = g.measureText('HotAir').width, w2 = g.measureText('Sim').width;
    const tx = W / 2 - (w1 + w2) / 2, ty = markY + markW * 0.866 + 74;
    g.textAlign = 'left';
    g.fillStyle = '#ffffff'; g.fillText('HotAir', tx, ty);
    g.fillStyle = '#41d7ff'; g.fillText('Sim', tx + w1, ty);
    g.textAlign = 'center';

    // Nadpis, titul a jméno: každý řádek má kolem sebe volné místo
    g.fillStyle = '#ffffff';
    fitText(g, t('result.heading'), W - 2 * M, 70);
    g.fillText(t('result.heading'), W / 2, 510);

    const name = plan.name.trim();
    g.fillStyle = '#ffd400';
    fitText(g, this.titleText, W - 2 * M, 76);
    g.fillText(this.titleText, W / 2, name ? 640 : 690);
    if (name) {   // bez zadaného jména se nepíše nic
      g.fillStyle = '#ffffff';
      fitText(g, name, W - 2 * M, 100);
      g.fillText(name, W / 2, 775);
    }

    // Statistiky
    const kindLabel = r.kind === 'soft' ? t('result.soft') : t('result.hard');
    const boxes = [
      [t('result.duration'), fmtTime(r.flightTime)],
      [t('result.maxAlt'), `${Math.round(r.maxAlt)} m`],
      [t('result.landing'), `${kindLabel} · ${r.touch.vy.toFixed(1)} m/s`],
      [t('result.score'), `${r.score}`],
    ];
    const bw = 280, gap = 28, x0 = (W - (bw * 4 + gap * 3)) / 2;
    boxes.forEach(([label, val], i) => {
      const x = x0 + i * (bw + gap), y = 855;
      g.fillStyle = 'rgba(0,27,34,0.45)';
      g.fillRect(x, y, bw, 116);
      g.fillStyle = '#ffffffb3'; g.font = '700 22px Raleway, Arial, sans-serif';
      g.fillText(label.toUpperCase(), x + bw / 2, y + 36);
      g.fillStyle = '#ffffff'; fitText(g, val, bw - 24, 46);
      g.fillText(val, x + bw / 2, y + 88);
    });

    // Spodní řada: vlevo „virtuální let“, uprostřed hvězdičky, vpravo datum
    const rowY = H - M - 12;
    const badge = t('result.virtual');
    g.font = `700 24px ${FONT}`;
    const pillW = g.measureText(badge).width + 48;
    g.fillStyle = '#0083a6';
    g.fillRect(M, rowY - 38, pillW, 50);
    g.fillStyle = '#ffffff'; g.textAlign = 'center';
    g.fillText(badge, M + pillW / 2, rowY - 4);

    for (let i = 0; i < 4; i++) star(g, W / 2 - 90 + i * 60, rowY - 13, 22, i < r.stars);

    g.fillStyle = '#ffffffb3'; g.font = `400 24px ${FONT}`;
    const date = new Date().toLocaleDateString(lang === 'cs' ? 'cs-CZ' : 'en-GB');
    g.textAlign = 'right';
    g.fillText(`${t('result.date')}: ${date}`, W - M, rowY - 4);
    g.textAlign = 'center';
  }
}
