// Kolize pláště balonu s terénem a překážkami za letu. Bez závislosti na Three.js.
// Plášť je rotační těleso podle `ENVELOPE_PROFILE`. Okolí osy se vzorkuje po kružnicích; překážka o výšce `s`
// v odstupu `d` od osy zasahuje do pláště, když je `d` menší než poloměr pláště ve výšce `s` (nad ústím).
// Reakce míří po normále profilu: na spodku břicha nahoru, na rovníku vodorovně od překážky, na kopuli dolů.
import { ENVELOPE_PROFILE as PROF, COLLISION as C, BASKET_SIZE } from '../config/GameConfig.js';
import { BIOME } from '../world/Biomes.js';

const H = PROF[PROF.length - 1][1];
const R_MAX = Math.max(...PROF.map((p) => p[0]));

// Délka profilu po oblouku (kvůli převodu výšky na souřadnici v textury pláště)
const CUM = [0];
for (let i = 1; i < PROF.length; i++) CUM.push(CUM[i - 1] + Math.hypot(PROF[i][0] - PROF[i - 1][0], PROF[i][1] - PROF[i - 1][1]));
const ARC = CUM[CUM.length - 1];

/** Obrys pláště ve výšce `hh` nad ústím: poloměr, sklon úseku a souřadnice `v` (0 ústí … 1 vrchlík). */
export function profileAt(hh) {
  if (hh < 0) return null;
  if (hh >= H) return { r: R_MAX, dr: 0, dh: 1, v: 1 };
  let i = 1;
  while (PROF[i][1] < hh) i++;
  const [r0, h0] = PROF[i - 1], [r1, h1] = PROF[i];
  const f = (hh - h0) / (h1 - h0);
  return { r: r0 + (r1 - r0) * f, dr: r1 - r0, dh: h1 - h0, v: (CUM[i - 1] + f * (CUM[i] - CUM[i - 1])) / ARC };
}

/** Tvrdost povrchu z výsledku `Biomes.sample()`: skála, budova / dominanta, les, svah, měkký terén. */
export function hardnessOf(s) {
  const hd = C.hardness;
  if (s.type === BIOME.ROCK) return hd.rock;
  if (s.type === BIOME.FOREST) return hd.forest;
  if (s.surface - s.ground > C.buildingRise) return hd.building;   // střechy, komíny, kostel, hrad
  if (s.type === BIOME.HILL) return hd.hill;
  return hd.soft;
}

/**
 * Najde nejhlubší zásah pláště do povrchu.
 * @param {{x:number,y:number,z:number}} pos  poloha spodku koše (osa pláště prochází bodem x, z)
 * @param {(x:number,z:number)=>{type:string,ground:number,surface:number}} sample
 * @returns {null | {depth:number, nx:number, ny:number, nz:number, hardness:number, angle:number, v:number}}
 *   `angle` = směr k překážce ve světě (rad, atan2(z, x)); normála (nx, ny, nz) je směr reakce (od překážky).
 */
export function probeEnvelope(pos, sample) {
  const y0 = pos.y + C.mouthAbove;
  if (pos.y - sample(pos.x, pos.z).surface > C.skipAgl) return null;
  let best = null, sx = 0, sy = 0, sz = 0;
  for (const d of C.radii) {
    for (let j = 0; j < C.angles; j++) {
      const a = (j / C.angles) * Math.PI * 2;
      const ca = Math.cos(a), sa = Math.sin(a);
      const s = sample(pos.x + d * ca, pos.z + d * sa);
      const pf = profileAt(s.surface - y0);
      if (!pf) continue;
      const pen = pf.r - d;
      if (pen <= 0) continue;
      const len = Math.hypot(pf.dr, pf.dh);
      const depth = pen * (pf.dh / len);           // hloubka po normále profilu
      const nh = pf.dh / len, ny = pf.dr / len;
      sx += -ca * nh * depth; sy += ny * depth; sz += -sa * nh * depth;
      if (!best || depth > best.depth) best = { depth, hardness: hardnessOf(s), angle: a, v: pf.v };
    }
  }
  if (!best) return null;
  const n = Math.hypot(sx, sy, sz) || 1;
  return { ...best, nx: sx / n, ny: sy / n, nz: sz / n };
}

/** Je v bodě překážka, o kterou se může koš zachytit? Les, skála nebo stavba; sklon louky řeší model země. */
export function isObstacle(s) {
  return s.type === BIOME.FOREST || s.type === BIOME.ROCK || s.surface - s.ground > C.buildingRise;
}

// Vzorky kolem půdorysu koše (rohy a středy stran), o `basketMargin` za okrajem; v souřadnicích koše (x, z)
const FEELERS = (() => {
  const hx = BASKET_SIZE.hx + C.basketMargin, hz = BASKET_SIZE.hz + C.basketMargin;
  return [[-hx, -hz], [0, -hz], [hx, -hz], [hx, 0], [hx, hz], [0, hz], [-hx, hz], [-hx, 0]];
})();

/**
 * Hledá překážku vedle koše: povrch (koruny stromů, střechy, komíny, skála) vyšší než spodek koše.
 * Vrací směr odtlačení (od překážky ke koši, vodorovně) a druh překážky.
 * @param {{x:number,y:number,z:number}} pos  poloha spodku koše
 * @param {number} headingDeg  natočení koše (stejné jako `PhysicsEngine.heading`)
 * @param {(x:number,z:number)=>{type:string,ground:number,surface:number}} sample
 * @returns {null | {nx:number, nz:number, depth:number, hardness:number, kind:'forest'|'rock'|'building'}}
 */
export function probeBasket(pos, headingDeg, sample) {
  if (pos.y - sample(pos.x, pos.z).surface > C.skipAgl) return null;
  const th = -headingDeg * Math.PI / 180, c = Math.cos(th), s = Math.sin(th);   // stejná rotace jako BalloonView.setPose
  let sx = 0, sz = 0, hits = 0, kind = null, hardness = 0;
  for (const [lx, lz] of FEELERS) {
    const px = pos.x + lx * c + lz * s, pz = pos.z - lx * s + lz * c;
    const o = sample(px, pz);
    if (o.surface - pos.y <= C.basketRise || !isObstacle(o)) continue;
    const dx = pos.x - px, dz = pos.z - pz, d = Math.hypot(dx, dz) || 1;
    sx += dx / d; sz += dz / d; hits++;
    const h = hardnessOf(o);
    if (h >= hardness) { hardness = h; kind = o.type === BIOME.FOREST ? 'forest' : o.type === BIOME.ROCK ? 'rock' : 'building'; }
  }
  if (!hits) return null;
  const n = Math.hypot(sx, sz);
  if (n < 1e-6) return { nx: 0, nz: 0, depth: 0, hardness, kind };   // překážky ze všech stran: koš jen zastavíme
  return { nx: sx / n, nz: sz / n, depth: 0.05, hardness, kind };
}
