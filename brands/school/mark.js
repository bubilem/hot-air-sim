// Značka školy (trojúhelník) a nápis jako textury pro 3D objekty: polepy auta a vleku, znak na trikách posádky.
// Body polygonů jsou stejné jako v logo.js (viewBox 1000 × 866). THREE dostává značka od jádra (jádro i značka tak sdílejí jednu instanci).
import { FONT_FAMILY, FONT_LOAD } from './font.js';

const MARK = [
  ['#ffd400', [0, 0, 500, 0, 500, 188, 326, 188]],
  ['#ffea80', [0, 0, 326, 188, 413, 339, 250, 433]],
  ['#41d7ff', [500, 0, 1000, 0, 674, 188, 500, 188]],
  ['#00c0f3', [674, 188, 1000, 0, 750, 433, 587, 339]],
  ['#c2dd78', [250, 433, 413, 339, 500, 490, 500, 866]],
  ['#a6ce39', [500, 490, 587, 339, 750, 433, 500, 866]],
];

export function drawMark(g, x, y, w) {
  const k = w / 1000;
  for (const [color, pts] of MARK) {
    g.beginPath();
    for (let i = 0; i < pts.length; i += 2) g[i ? 'lineTo' : 'moveTo'](x + pts[i] * k, y + pts[i + 1] * k);
    g.closePath();
    g.fillStyle = color;
    g.fill();
  }
}

const planeMat = (THREE, tex) => new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.5, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });

/** Samotný symbol (pro vesty). Čtverec w × (w·0,866). */
export function markPlane(THREE, w) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 222;
  drawMark(c.getContext('2d'), 0, 0, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(w, w * 0.866), planeMat(THREE, tex));
}

/** Polep: symbol + nápis „VOŠ | SPŠ | SOŠ Varnsdorf“ (w × h m). Po načtení písma se textura překreslí. */
export function labelPlane(THREE, w, h, textColor) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = Math.round(1024 * h / w);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const draw = () => {
    const g = c.getContext('2d');
    g.clearRect(0, 0, c.width, c.height);
    const mh = c.height * 0.8, mw = mh / 0.866;
    drawMark(g, c.height * 0.1, c.height * 0.1, mw);
    g.fillStyle = textColor; g.textBaseline = 'middle'; g.textAlign = 'left';
    const x = c.height * 0.1 + mw + c.height * 0.15, fs = c.height * 0.3;
    g.font = `700 ${fs}px ${FONT_FAMILY}`;
    g.fillText('VOŠ | SPŠ | SOŠ', x, c.height * 0.36);
    g.fillStyle = textColor;
    g.fillText('Varnsdorf', x, c.height * 0.68);
    tex.needsUpdate = true;
  };
  draw();
  document.fonts?.load(FONT_LOAD).then(draw).catch(() => {});
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), planeMat(THREE, tex));
}

/** Znak na hrudi a zádech pilota a pozemního týmu (průhledný trojúhelník přímo na triku). */
export function decorateCharacter(THREE, group, role) {
  if (role !== 'pilot' && role !== 'crew') return;
  for (const s of [1, -1]) {
    const m = markPlane(THREE, 0.22);
    m.position.set(0, 1.18, s * 0.142);
    if (s < 0) m.rotation.y = Math.PI;
    group.add(m);
  }
}

/** Polep vozu: na obou bocích; s = +1 je levý bok (pohled po směru jízdy), s = -1 pravý; pravý je zrcadlově otočený, proto se nápis posouvá dopředu. */
export function decorateCar(THREE, group) {
  for (const s of [-1, 1]) {
    const l = labelPlane(THREE, 2.4, 0.56, '#ffffff');
    l.position.set(s * 0.905, 0.9, s > 0 ? -0.3 : 0.25);
    l.rotation.y = s * Math.PI / 2;
    group.add(l);
  }
}

/** Polep přívěsu (azurový nápis na tmavé plachtě). */
export function decorateTrailer(THREE, group) {
  for (const s of [-1, 1]) {
    const l = labelPlane(THREE, 2.6, 0.7, '#41d7ff');
    l.position.set(s * 0.912, 1.2, 0);
    l.rotation.y = s * Math.PI / 2;
    group.add(l);
  }
}
