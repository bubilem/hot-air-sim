// Značka školy (trojúhelník) a nápis jako textury pro 3D objekty: polepy auta a vleku, znak na trikách posádky.
// Body polygonů jsou stejné jako v ui/brand.js (viewBox 1000 × 866).
import * as THREE from 'three';

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

const planeMat = (tex) => new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.5, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });

/** Samotný symbol (pro vesty). Čtverec w × (w·0,866). */
export function markPlane(w) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 222;
  drawMark(c.getContext('2d'), 0, 0, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(w, w * 0.866), planeMat(tex));
}

/** Polep: symbol + nápis „VOŠ | SPŠ | SOŠ Varnsdorf“ (w × h m). Po načtení písma se textura překreslí. */
export function labelPlane(w, h, textColor) {
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
    g.font = `700 ${fs}px Raleway, Arial, sans-serif`;
    g.fillText('VOŠ | SPŠ | SOŠ', x, c.height * 0.36);
    g.fillStyle = textColor;
    g.fillText('Varnsdorf', x, c.height * 0.68);
    tex.needsUpdate = true;
  };
  draw();
  document.fonts?.load('700 40px Raleway').then(draw).catch(() => {});
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), planeMat(tex));
}
