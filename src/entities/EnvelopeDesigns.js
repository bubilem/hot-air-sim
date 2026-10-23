// Vzory pláště balonu kreslené procedurálně do canvasu 1024×512 + import vlastního obrázku.
// Mapování: osa x = obvod pláště (32 výsečí), osa y = výška (dole ústí, nahoře vrchlík).
// Bez závislosti na Three.js (texturu z canvasu vyrábí BalloonView).
import brand from '@brand';

export const TEX_W = 1024;
export const TEX_H = 512;
const GORES = 32;
const BLUE = brand.canvas.accent;
const NAVY = brand.canvas.primary;
const FONT = brand.font.family;

export const DESIGNS = [
  { id: 'checker', name: { cs: 'Šachovnice', en: 'Checkerboard' } },
  ...(brand.envelope?.designs ?? []).map(({ id, name }) => ({ id, name })),
  { id: 'rainbow', name: { cs: 'Duha', en: 'Rainbow' } },
  { id: 'sunset', name: { cs: 'Západ slunce', en: 'Sunset' } },
  { id: 'retro', name: { cs: 'Retro pruhy', en: 'Retro stripes' } },
];

/** Pomůcky pro vzory značky (štítky s názvem, rozměry textury). */
const kit = { TEX_W, TEX_H, GORES, drawLogoPatches: (g, o) => drawLogoPatches(g, o) };
const brandPainters = Object.fromEntries((brand.envelope?.designs ?? []).map((d) => [d.id, (g) => d.paint(g, kit)]));

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

function newCanvas() {
  const c = document.createElement('canvas');
  c.width = TEX_W; c.height = TEX_H;
  return c;
}

/** Nápis s názvem značky ve „štítku“ na dvou protilehlých stranách (zepředu i zezadu). */
function drawLogoPatches(g, { bg = NAVY, fg = BLUE, y = TEX_H * 0.5, w = 380, h = 120 } = {}) {
  for (const u of [0.25, 0.75]) {
    const x = TEX_W * u - w / 2;
    g.fillStyle = bg;
    g.fillRect(x, y - h / 2, w, h);
    g.fillStyle = fg;
    g.font = `700 74px ${FONT}`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(brand.name, TEX_W * u, y + 4);
  }
}

/** Jemné švy mezi výsečemi pláště. */
function drawSeams(g) {
  g.strokeStyle = 'rgba(0,0,0,0.16)';
  g.lineWidth = 2;
  const w = TEX_W / GORES;
  for (let i = 0; i < GORES; i++) {
    g.beginPath(); g.moveTo(i * w, 0); g.lineTo(i * w, TEX_H); g.stroke();
  }
}

const painters = {
  checker(g) {
    const rows = 16, cw = TEX_W / GORES, ch = TEX_H / rows;
    for (let r = 0; r < rows; r++) for (let c = 0; c < GORES; c++) {
      g.fillStyle = (r + c) % 2 ? '#f5efe6' : '#b3202e';
      g.fillRect(c * cw, r * ch, cw + 1, ch + 1);
    }
    g.fillStyle = BLUE; // pás u ústí
    g.fillRect(0, TEX_H - 34, TEX_W, 34);
  },

  rainbow(g) {
    const cols = ['#e03131', '#f76707', '#fcc419', '#37b24d', '#00c0f3', '#3b5bdb', '#9c36b5', '#e64980'];
    const cw = TEX_W / GORES;
    for (let c = 0; c < GORES; c++) {
      g.fillStyle = cols[c % cols.length];
      g.fillRect(c * cw, 0, cw + 1, TEX_H);
    }
    g.fillStyle = '#ffffff';
    g.fillRect(0, TEX_H * 0.62, TEX_W, 26);
    g.fillRect(0, TEX_H * 0.22, TEX_W, 14);
    drawLogoPatches(g, { bg: 'rgba(17,24,39,0.9)', y: TEX_H * 0.42 });
  },

  sunset(g) {
    const grad = g.createLinearGradient(0, TEX_H, 0, 0);
    grad.addColorStop(0, '#ff8a1f');
    grad.addColorStop(0.35, '#ff4d6d');
    grad.addColorStop(0.7, '#9d3fb0');
    grad.addColorStop(1, '#2b1b6b');
    g.fillStyle = grad; g.fillRect(0, 0, TEX_W, TEX_H);
    g.fillStyle = 'rgba(255,255,255,0.85)';
    g.fillRect(0, TEX_H * 0.7, TEX_W, 14);
    drawLogoPatches(g, { bg: 'rgba(255,255,255,0.92)', fg: NAVY, y: TEX_H * 0.46 });
  },

  retro(g) {
    const bands = ['#b3202e', '#f5efe6', '#1b4f9c', '#f5efe6', '#b3202e', '#f2c230'];
    const bh = TEX_H / bands.length;
    bands.forEach((c, i) => { g.fillStyle = c; g.fillRect(0, TEX_H - (i + 1) * bh, TEX_W, bh + 1); });
    drawLogoPatches(g, { bg: '#f5efe6', fg: '#1b4f9c', y: TEX_H - 2.5 * bh, h: 110 });
  },
};

const cache = new Map();

const fleetCanvases = new Map();

/** Canvas se vzorem (vestavěný vzor, balon z flotily `fleet:<id>` nebo vlastní obrázek). */
export function designCanvas(id, custom = null) {
  if (id === 'custom' && custom) return custom;
  if (typeof id === 'string' && id.startsWith('fleet:') && fleetCanvases.has(id)) return fleetCanvases.get(id);
  const key = painters[id] || brandPainters[id] ? id : 'checker';
  if (!cache.has(key)) {
    const c = newCanvas();
    const g = c.getContext('2d');
    (painters[key] || brandPainters[key])(g);
    drawSeams(g);
    cache.set(key, c);
  }
  return cache.get(key);
}

/** Vyřízne obrázek do poměru 2:1 a vykreslí ho do canvasu textury. */
function imageToCanvas(img) {
  const c = newCanvas();
  const g = c.getContext('2d');
  const target = TEX_W / TEX_H;
  const ratio = img.width / img.height;
  let sw = img.width, sh = img.height, sx = 0, sy = 0;
  if (ratio > target) { sw = img.height * target; sx = (img.width - sw) / 2; }
  else { sh = img.width / target; sy = (img.height - sh) / 2; }
  g.drawImage(img, sx, sy, sw, sh, 0, 0, TEX_W, TEX_H);
  return c;
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`decode ${url}`));
    img.src = url;
  });
}

/**
 * Načte vlastní obrázek (PNG / WebP / JPEG) a vyřízne ho do poměru 2:1.
 * Obrázek zůstává jen v prohlížeči hráče (nikam se neodesílá).
 * @returns {Promise<HTMLCanvasElement>}
 */
export async function loadCustomImage(file) {
  if (!file || !/^image\/(png|webp|jpeg)$/.test(file.type)) throw new Error('type');
  if (file.size > MAX_UPLOAD_BYTES) throw new Error('size');
  const url = URL.createObjectURL(file);
  try {
    return imageToCanvas(await loadImage(url));
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Načte balony z `public/envelopes/manifest.json`.
 * Formát: { "balloons": [ { "id": "skolavdf", "name": { "cs": "…", "en": "…" }, "file": "skolavdf.webp" } ] }
 * Nedostupný manifest nebo obrázek se tiše přeskočí (hra běží i bez nich).
 * @returns {Promise<{id:string, name:{cs:string,en:string}, canvas:HTMLCanvasElement}[]>}
 */
export async function loadFleet(baseUrl = '/') {
  const dir = `${baseUrl}envelopes/`;
  let list = [];
  try {
    const res = await fetch(`${dir}manifest.json`, { cache: 'no-cache' });
    if (!res.ok) return [];
    list = (await res.json()).balloons || [];
  } catch {
    return [];
  }
  const out = [];
  for (const b of list) {
    if (!b?.id || !b?.file) continue;
    try {
      const canvas = imageToCanvas(await loadImage(`${dir}${encodeURIComponent(b.file)}`));
      const id = `fleet:${b.id}`;
      fleetCanvases.set(id, canvas);
      const name = typeof b.name === 'string' ? { cs: b.name, en: b.name } : { cs: b.name?.cs || b.id, en: b.name?.en || b.name?.cs || b.id };
      out.push({ id, name, canvas });
    } catch {
      // chybějící nebo poškozený obrázek: balon se do nabídky nedostane
    }
  }
  return out;
}

/** Šablona pro grafiky: mřížka výsečí, popisky a doporučené místo pro logo. */
export function templateCanvas() {
  const c = newCanvas();
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, TEX_H, 0, 0);
  grad.addColorStop(0, '#e8eef7'); grad.addColorStop(1, '#c5d2e6');
  g.fillStyle = grad; g.fillRect(0, 0, TEX_W, TEX_H);
  const w = TEX_W / GORES;
  g.strokeStyle = 'rgba(17,24,39,0.35)'; g.lineWidth = 2;
  for (let i = 0; i <= GORES; i++) { g.beginPath(); g.moveTo(i * w, 0); g.lineTo(i * w, TEX_H); g.stroke(); }
  g.strokeStyle = 'rgba(17,24,39,0.2)';
  for (let i = 1; i < 8; i++) { g.beginPath(); g.moveTo(0, (i * TEX_H) / 8); g.lineTo(TEX_W, (i * TEX_H) / 8); g.stroke(); }
  for (const u of [0.25, 0.75]) {
    g.fillStyle = 'rgba(0,192,243,0.25)';
    g.fillRect(TEX_W * u - 190, TEX_H * 0.5 - 60, 380, 120);
    g.strokeStyle = BLUE; g.lineWidth = 3; g.strokeRect(TEX_W * u - 190, TEX_H * 0.5 - 60, 380, 120);
  }
  g.fillStyle = NAVY; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `800 30px ${FONT}`;
  g.fillText('VRCHLÍK / TOP  (nahoře)', TEX_W / 2, 40);
  g.fillText('ÚSTÍ / MOUTH  (dole)', TEX_W / 2, TEX_H - 40);
  g.font = `700 22px ${FONT}`;
  g.fillText('logo: 25 % a 75 % šířky / logo spots', TEX_W / 2, TEX_H / 2 + 90);
  g.fillText('levý a pravý okraj na sebe navazují / left & right edges join', TEX_W / 2, TEX_H / 2 - 90);
  g.fillStyle = brand.canvas.warn; g.textAlign = 'left';
  g.font = `700 20px ${FONT}`;
  g.fillText('1024×512 px (2:1)  ·  PNG / WebP', 16, TEX_H / 2);
  return c;
}
