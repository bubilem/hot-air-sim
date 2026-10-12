// Vizuální reprezentace balonu (procedurální geometrie). Žádná herní logika.
// Soustava souřadnic rigu: počátek = ústí pláště, koš visí pod ním (y = -3.4 až -2.4).
// Nafukování = deformace jedné geometrie pláště mezi tvarem "ležící placka" a "postavený balon".
import * as THREE from 'three';
import { COLORS } from '../config/Colors.js';
import { designCanvas } from './EnvelopeDesigns.js';
import { ENVELOPE_GLOW } from '../config/GameConfig.js';

const SEGS = 32;      // výseče po obvodu
const RINGS = 28;     // prstence po výšce
const PROFILE = [     // [poloměr, výška] pláště ve svislé poloze, v metrech
  [2.0, 0], [2.6, 1.4], [4.2, 3.6], [6.4, 6.6], [8.2, 9.6],
  [9.3, 12.6], [9.7, 14.8], [9.3, 16.8], [8.0, 18.4], [5.6, 19.5], [2.9, 20.1], [0, 20.3],
];
const CROWN_PULL = 4;      // m: o kolik lano nadzvedne vrchlík při vztyčování (v první třetině zvedání)
const CROWN_FROM = 0.45;   // od jaké části výšky pláště (0..1) se vrchlík nadzvedává
const SKIRT_ROWS = 3;      // spodní řady pláště tvoří tmavá "plachta" (sukně) u ústí
const SKIRT_COLOR = 0.07;  // jas sukně (násobí se s texturou)
// Ztráta vzduchu: přetlak je největší nahoře (tam se hromadí horký vzduch) a u ústí je nulový, proto se plášť
// sesedá odspodu a ze stran, zužuje se a zplošťuje (víc napříč košem než po jeho délce); vrchlík drží tvar nejdéle.
const SAG_SQUEEZE_X = 0.28;   // zúžení v ose x rigu při plném sesednutí (nejvíc ve spodní polovině)
const SAG_SQUEEZE_Z = 0.5;    // zúžení v ose z (plášť se zplošťuje)
const SAG_FLATTEN = 0.14;     // o kolik klesne celková výška pláště
const SAG_TOP_KEEP = 0.65;    // jak moc je vrchlík ušetřen (0 = stejně jako střed, 1 = vůbec se nezužuje)

// Popáleniny: maska 256 × 128 ve stejných UV jako vzor pláště (R = spálení, G = žhnutí).
// Shader podle R rozlišuje zhnědnutí, zuhelnatění a skutečnou díru (discard); G dodá žhnoucí lem.
const BURN_W = 256, BURN_H = 128;
const BURN_R0 = 1.8, BURN_R1 = 1.9;    // m: poloměr skvrny = R0 + R1 · velikost díry
const EMBER_TAU = 6;                   // s, doznívání žhnutí čerstvé díry
const FIRE_FRONT_MIN = 0.12;           // do jaké výšky (0..1) pláště se oheň nejvýš šíří od vrchlíku
const SMOKE_N = 160;                   // kapacita částic kouře a plamenů
const DRAPE_RADIUS = 45;               // m: okolí koše, ve kterém se vzorkuje terén pro ležící plášť
const DRAPE_STEP = 1.5;                // m: rozestup vzorků terénu
const DRAPE_RECENTER = 18;             // m: o kolik se koš smí posunout, než se terén vzorkuje znovu

export const BASKET_BOTTOM = -3.4;
export const BASKET_TOP = -2.4;
export const BASKET_HX = 0.7;   // polovina šířky koše (osa x rigu)
export const BASKET_HZ = 1.1;   // polovina délky koše (osa z rigu)

const smooth = (x) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };

function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
}

function strut(a, b, radius, mat) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, 5), mat);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return m;
}

export class BalloonView {
  constructor() {
    this.root = new THREE.Group();
    this.rig = new THREE.Group();
    this.root.add(this.rig);

    this.mats = {
      basket: new THREE.MeshLambertMaterial({ color: COLORS.basket }),
      basketDark: new THREE.MeshLambertMaterial({ color: COLORS.basketDark }),
      steel: new THREE.MeshLambertMaterial({ color: COLORS.steel }),
      burner: new THREE.MeshLambertMaterial({ color: COLORS.burner }),
      bottle: new THREE.MeshLambertMaterial({ color: COLORS.bottle }),
      rope: new THREE.MeshLambertMaterial({ color: COLORS.rope }),
    };

    this.buildEnvelope();
    this.buildBasket();
    this.buildFlame();
    this.buildShadow();
    this.buildSmoke();

    this.state = { inflation: -1, upright: -1, unroll: -1, envUpright: -1 };
    this.sag = 0;
    this.terrain = null;    // (x, z) => výška terénu; zapíná „přilepení“ ležícího pláště k terénu
    this.terrainGrid = null;
    this.pose = { x: 0, y: 0, z: 0, h: 0 };
    this.holeSizes = [];    // velikosti děr, které už jsou namalovány v masce
    this.fireLevel = 0;
    this.scorchT = 0;
    this.setShape(1, 1);
  }

  getMesh() { return this.root; }

  // ---------- Plášť ----------
  buildEnvelope() {
    const curve = new THREE.SplineCurve(PROFILE.map(([r, h]) => new THREE.Vector2(r, h)));
    this.profile = curve.getSpacedPoints(RINGS);   // rovnoměrně podle délky oblouku, ať má i vrchlík dost prstenců
    this.profile[this.profile.length - 1].x = 0;

    const quads = RINGS * SEGS;
    this.vRing = new Uint8Array(quads * 6);
    this.vSeg = new Uint8Array(quads * 6);
    const uvs = new Float32Array(quads * 6 * 2);
    const cols = new Float32Array(quads * 6 * 3);

    let v = 0;
    for (let i = 0; i < RINGS; i++) {
      for (let j = 0; j < SEGS; j++) {
        const corners = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j], [i + 1, j + 1], [i, j + 1]];
        for (const [ri, sj] of corners) {
          this.vRing[v] = ri;
          this.vSeg[v] = sj % SEGS;
          uvs[v * 2] = 1 - sj / SEGS;    // u: obvod, obráceně, aby text nebyl zrcadlově (sj může být SEGS = šev)
          uvs[v * 2 + 1] = ri / RINGS;   // v: 0 = ústí, 1 = vrchlík
          const c = i < SKIRT_ROWS ? SKIRT_COLOR : 1;
          cols[v * 3] = c; cols[v * 3 + 1] = c; cols[v * 3 + 2] = c;
          v++;
        }
      }
    }
    this.envGeo = new THREE.BufferGeometry();
    this.envPos = new Float32Array(quads * 6 * 3);
    this.envGeo.setAttribute('position', new THREE.BufferAttribute(this.envPos, 3));
    this.envGeo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    this.envGeo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    this.envMat = new THREE.MeshLambertMaterial({ flatShading: true, side: THREE.DoubleSide, vertexColors: true });
    this.setDesign(designCanvas('checker'));
    this.glow = 0;
    this.glowT = 0;
    this.glowU = { value: 0 };
    this.buildBurnMask();
    this.envMat.onBeforeCompile = (sh, renderer) => {
      THREE.MeshLambertMaterial.prototype.onBeforeCompile?.call(this.envMat, sh, renderer);   // výšková mlha
      sh.uniforms.uGlow = this.glowU;
      sh.uniforms.uGlowColor = { value: new THREE.Vector3(...ENVELOPE_GLOW.color) };
      sh.uniforms.uGlowTop = { value: ENVELOPE_GLOW.topFalloff };
      sh.uniforms.uGlowH = { value: PROFILE[PROFILE.length - 1][1] };
      sh.uniforms.uBurn = this.burnU;
      sh.uniforms.uFlick = this.flickU;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying float vGlowY;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGlowY = position.y;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vGlowY;\nuniform float uGlow, uGlowTop, uGlowH, uFlick;\nuniform vec3 uGlowColor;\nuniform sampler2D uBurn;')
        .replace('#include <map_fragment>',
          `#include <map_fragment>
          vec2 burnMask = texture2D(uBurn, vMapUv).rg;
          float burnB = burnMask.r;
          if (burnB > 0.62) discard;
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.2, 0.11, 0.05), smoothstep(0.1, 0.3, burnB) * 0.85);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.02), smoothstep(0.3, 0.45, burnB));`)
        .replace('#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
          float gk = uGlow * (1.0 - uGlowTop * clamp(vGlowY / uGlowH, 0.0, 1.0));
          totalEmissiveRadiance += diffuseColor.rgb * uGlowColor * gk;
          totalEmissiveRadiance += vec3(1.0, 0.36, 0.06) * burnMask.g * smoothstep(0.28, 0.58, burnB) * uFlick;`);
    };
    const mat = this.envMat;
    this.envelope = new THREE.Mesh(this.envGeo, mat);
    this.envelope.frustumCulled = false;
    this.rig.add(this.envelope);
    this.grid = new Float32Array((RINGS + 1) * SEGS * 3);
  }

  /** Poloha špičky pláště (vrchlíku) v prostoru rigu; zapíše se do `out`. */
  crownPoint(out) {
    const k = (this.grid.length / 3 - SEGS) * 3;   // první vrchol posledního prstence
    return out.set(this.grid[k], this.grid[k + 1], this.grid[k + 2]);
  }

  /** Plášť lze skrýt (např. při zkoušce hořáku, kdy je ještě sbalený ve vaku). */
  setEnvelopeVisible(v) { this.envelope.visible = v; }

  /** Nastaví vzor pláště z canvasu (2:1, dole ústí, nahoře vrchlík). */
  setDesign(canvas) {
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    tex.wrapS = THREE.RepeatWrapping;
    this.envMat.map?.dispose();
    this.envMat.map = tex;
    this.envMat.needsUpdate = true;
  }

  /**
   * Přepočítá tvar pláště.
   * @param {number} inflation 0 = placka, 1 = nafouklý
   * @param {number} upright 0 = leží, 1 = svisle
   * @param {number} unroll 0 = sbalený svazek, 1 = rozložený (výchozí 1)
   */
  setShape(inflation, upright, unroll = 1, envUpright = upright) {
    const st = this.state;
    if (Math.abs(st.inflation - inflation) < 1e-4 && Math.abs(st.upright - upright) < 1e-4
      && Math.abs(st.unroll - unroll) < 1e-4 && Math.abs(st.envUpright - envUpright) < 1e-4) return;
    st.inflation = inflation; st.upright = upright; st.unroll = unroll; st.envUpright = envUpright;

    const e = smooth(inflation);
    const un = smooth(unroll);
    const kt = (0.05 + 0.95 * e) * (0.3 + 0.7 * un);
    // Rozložení: plášť leží hned jako úzký "had" v téměř plné délce a rozložením se jen roztahuje do šířky
    const kw = (1.4 - 0.4 * e) * (0.15 + 0.85 * un);
    const kl = (0.78 + 0.22 * e) * (0.92 + 0.08 * un);

    // Celá sestava (koš, rám) se otáčí kolem spodní hrany koše, která zůstává na zemi.
    // Těžký koš tedy zůstává na místě a plášť se zvedá / padá kolem něj.
    const lying = 1 - smooth(upright);          // 1 = koš leží, 0 = stojí
    const phi = lying * Math.PI / 2;
    const cp = Math.cos(phi), sp = Math.sin(phi);
    const rigX = BASKET_HX - (BASKET_HX * cp + BASKET_BOTTOM * sp);
    const rigY = BASKET_HX * sp - BASKET_BOTTOM * cp;
    this.rig.rotation.z = -phi;
    this.rig.position.set(rigX, rigY, 0);

    // Plášť má vlastní poloha "leží / stojí" (při zkoušce hořáku a pokládání koše leží jako had na zemi,
    // i když koš ještě stojí). Tvar se spočítá pro polohu pláště (index E) a pak se převede do rigu koše.
    const lyingE = 1 - smooth(envUpright);
    const phiE = lyingE * Math.PI / 2;
    const cpE = Math.cos(phiE), spE = Math.sin(phiE);
    const rigXE = BASKET_HX - (BASKET_HX * cpE + BASKET_BOTTOM * spE);
    const rigYE = BASKET_HX * spE - BASKET_BOTTOM * cpE;
    const mismatch = Math.abs(phi - phiE) > 1e-4;
    const dX = rigXE - rigX, dYm = rigYE - rigY;   // rozdíl poloh ústí (plášť leží × skutečná poloha koše)

    // Plášť je poddajná látka: ve vodorovné poloze leží na zemi (spodek pláště se opírá o zem,
    // tělo se nad ní klene), proto každý vrchol upravíme ve světové výšce a vrátíme do prostoru rigu.
    const GROUND = 0.03;
    const sup = lyingE * lyingE;
    const H = PROFILE[PROFILE.length - 1][1];
    const pull = CROWN_PULL * (27 / 4) * lyingE * lyingE * (1 - lyingE);   // maximum při lyingE = 2/3, na konci zvedání zanikne
    const g = this.grid;
    for (let i = 0; i <= RINGS; i++) {
      const r = this.profile[i].x, h = this.profile[i].y;
      const reach = smooth(h / 7);               // u ústí je plášť přichycen ke koši, dál leží na zemi
      const y0 = h * kl * (1 - SAG_FLATTEN * this.sag);
      // Sesedání: u ústí je plášť přichycen, nejvíc se zužuje dole a uprostřed, vrchlík se nejméně
      const frac = h / H;
      const sagW = smooth(frac / 0.15) * (1 - SAG_TOP_KEEP * smooth((frac - 0.45) / 0.55)) * this.sag;
      const sagX = 1 - SAG_SQUEEZE_X * sagW, sagZ = 1 - SAG_SQUEEZE_Z * sagW;
      // Vleže leží střed prstence ve výšce svého poloměru (spodek na zemi), ústí zůstává u koše; špička tedy leží na zemi
      let dY = sup * reach * (r * kt - rigYE);
      // Při vztyčování lano táhne vrchlík vzhůru a ven (nejvíc v polovině zvedání, vzpřímený i ležící plášť je bez vlivu)
      const crown = smooth((h / H - CROWN_FROM) / (1 - CROWN_FROM));
      dY += pull * crown * crown * kt;
      // Zem: celý prstenec se zvedne tak, aby jeho nejnižší bod neprorážel zem (po prstencích, ne po vrcholech,
      // jinak by se špička a boky při vztyčování zamáčkly dovnitř)
      const ringMin = rigYE + y0 * cpE - r * kt * spE + dY;
      if (ringMin < GROUND) dY += GROUND - ringMin;
      for (let j = 0; j < SEGS; j++) {
        const a = (j / SEGS) * Math.PI * 2;
        let x = r * sagX * Math.cos(a) * kt;
        let y = y0;
        const z = r * sagZ * Math.sin(a) * kw;
        // posun o dY svisle ve světě = posun v prostoru rigu o R^-1 (0, dY)
        x += -dY * spE;
        y += dY * cpE;
        if (mismatch) {
          // Plášť zůstává na zemi tam, kde leží; do rigu koše se převede jen jeho poloha (s ústím se spojí, až koš lehne)
          const wx = x * cpE + y * spE + dX;
          const wy = -x * spE + y * cpE + dYm;
          x = wx * cp - wy * sp;
          y = wx * sp + wy * cp;
        }
        const k = (i * SEGS + j) * 3;
        g[k] = x; g[k + 1] = y; g[k + 2] = z;
      }
    }

    this.drape(rigX, rigY, phi, lyingE);

    for (let v = 0; v < this.vRing.length; v++) {
      const k = (this.vRing[v] * SEGS + this.vSeg[v]) * 3;
      this.envPos[v * 3] = g[k]; this.envPos[v * 3 + 1] = g[k + 1]; this.envPos[v * 3 + 2] = g[k + 2];
    }
    this.envGeo.attributes.position.needsUpdate = true;
    this.envGeo.computeBoundingSphere();

  }

  // ---------- Plášť ležící na terénu ----------
  /** Zapne přilepení ležícího pláště k terénu: `fn(x, z)` vrací výšku země (null = vypnuto). */
  setTerrain(fn) {
    this.terrain = fn;
    this.terrainGrid = null;
    this.state.inflation = -1;
  }

  /** Výška terénu v bodě (bilineárně ze sítě kolem koše; síť se vzorkuje jen při potřebě). */
  groundAt(x, z) {
    let g = this.terrainGrid;
    if (!g || Math.hypot(x - g.cx, z - g.cz) > DRAPE_RADIUS - 5 || Math.hypot(this.pose.x - g.cx, this.pose.z - g.cz) > DRAPE_RECENTER) {
      const n = Math.round(2 * DRAPE_RADIUS / DRAPE_STEP) + 1;
      g = { cx: this.pose.x, cz: this.pose.z, n, data: new Float32Array(n * n) };
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) g.data[i * n + j] = this.terrain(g.cx - DRAPE_RADIUS + i * DRAPE_STEP, g.cz - DRAPE_RADIUS + j * DRAPE_STEP);
      this.terrainGrid = g;
    }
    const fx = Math.min(g.n - 1.001, Math.max(0, (x - g.cx + DRAPE_RADIUS) / DRAPE_STEP));
    const fz = Math.min(g.n - 1.001, Math.max(0, (z - g.cz + DRAPE_RADIUS) / DRAPE_STEP));
    const i = Math.floor(fx), j = Math.floor(fz), tx = fx - i, tz = fz - j, n = g.n, d = g.data;
    return (d[i * n + j] * (1 - tz) + d[i * n + j + 1] * tz) * (1 - tx) + (d[(i + 1) * n + j] * (1 - tz) + d[(i + 1) * n + j + 1] * tz) * tx;
  }

  /**
   * Ležící plášť model počítá nad vodorovnou zemí v úrovni koše. Na svahu by pak plášť visel nad terénem nebo se v něm
   * ztratil, proto se každý vrchol posune svisle o rozdíl výšky terénu (v místě vrcholu a u koše). U ústí, kde je plášť
   * přichycen ke koši, je vliv nulový, a vrchol nikdy neleží pod terénem.
   */
  drape(rigX, rigY, phi, lyingE) {
    if (!this.terrain || lyingE < 0.02) return;
    const P = this.pose, g = this.grid;
    const cphi = Math.cos(phi), sphi = Math.sin(phi);   // převod rig -> kořen: rotace o -phi
    const psi = -P.h * Math.PI / 180, cp = Math.cos(psi), sp = Math.sin(psi);   // kořen -> svět (heading)
    const lie = lyingE * lyingE;
    for (let i = 1; i <= RINGS; i++) {
      const reach = smooth(this.profile[i].y / 7);
      if (reach <= 0.01) continue;
      const w = lie * reach;
      for (let j = 0; j < SEGS; j++) {
        const k = (i * SEGS + j) * 3;
        const x = g[k], y = g[k + 1], z = g[k + 2];
        const xr = x * cphi + y * sphi + rigX, yr = -x * sphi + y * cphi + rigY;
        const wx = P.x + xr * cp + z * sp, wz = P.z - xr * sp + z * cp, wy = P.y + yr;
        const gnd = this.groundAt(wx, wz);
        let dY = (gnd - P.y) * w;
        if (wy + dY < gnd + 0.03) dY = gnd + 0.03 - wy;   // látka neprochází terénem
        if (dY !== 0) { g[k] += -dY * sphi; g[k + 1] += dY * cphi; }
      }
    }
  }

  /** Míra sesednutí pláště 0..1 (po dlouhém odvětrání nebo při požáru). */
  setSag(v) {
    if (Math.abs(v - this.sag) < 0.005) return;
    this.sag = v;
    this.state.inflation = -1;   // vynutí přepočet tvaru
  }

  // ---------- Popáleniny ----------
  buildBurnMask() {
    this.burnData = new Uint8Array(BURN_W * BURN_H * 4);
    for (let i = 3; i < this.burnData.length; i += 4) this.burnData[i] = 255;
    const tex = new THREE.DataTexture(this.burnData, BURN_W, BURN_H, THREE.RGBAFormat);
    tex.wrapS = THREE.RepeatWrapping;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    tex.needsUpdate = true;
    this.burnTex = tex;
    this.burnU = { value: tex };
    this.flickU = { value: 1 };
    const n = BURN_W * BURN_H;
    this.holeLayer = new Float32Array(n);    // spálení od děr (trvalé)
    this.emberLayer = new Float32Array(n);   // žhnutí děr (doznívá)
    this.fireLayer = new Float32Array(n);    // spálení od požáru
    this.fireEmber = new Float32Array(n);    // žhnutí čela požáru
    this.noise = null;
    this.emberLive = 0;
    this.emberAcc = 0;
    // délka profilu pláště po oblouku (pro převod metrů na pixely ve směru v)
    let len = 0;
    for (let i = 1; i < this.profile.length; i++) len += this.profile[i].distanceTo(this.profile[i - 1]);
    this.arcLen = len;
  }

  /** Periodický (v ose u) fraktální šum 0..1 pro rozedrané okraje; počítá se až při první potřebě. */
  makeNoise() {
    const out = new Float32Array(BURN_W * BURN_H);
    let seed = 20240611;
    const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    for (const [gx, gy, amp] of [[8, 4, 0.55], [16, 8, 0.3], [32, 16, 0.15]]) {
      const lat = new Float32Array(gx * (gy + 1));
      for (let i = 0; i < lat.length; i++) lat[i] = rnd();
      for (let y = 0; y < BURN_H; y++) {
        const fy = (y / BURN_H) * gy, y0 = Math.floor(fy), ty = smooth(fy - y0);
        for (let x = 0; x < BURN_W; x++) {
          const fx = (x / BURN_W) * gx, x0 = Math.floor(fx), tx = smooth(fx - x0);
          const xa = x0 % gx, xb = (x0 + 1) % gx;
          const a = lat[y0 * gx + xa], b = lat[y0 * gx + xb], c = lat[(y0 + 1) * gx + xa], d = lat[(y0 + 1) * gx + xb];
          out[y * BURN_W + x] += amp * ((a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty);
        }
      }
    }
    this.noise = out;
  }

  /** Namaluje (nebo zvětší) jednu popálenou díru do vrstvy děr. */
  paintHole(h, idx) {
    if (!this.noise) this.makeNoise();
    const ring = Math.min(RINGS, Math.round(h.v * RINGS));
    const rM = BURN_R0 + BURN_R1 * h.size;
    const ru = rM * BURN_W / (2 * Math.PI * Math.max(this.profile[ring].x, 2.5));
    const rv = rM * BURN_H / this.arcLen;
    const cx = h.u * BURN_W, cy = h.v * BURN_H, off = (idx * 53) % BURN_W;
    for (let y = Math.max(0, Math.floor(cy - rv * 1.1)); y <= Math.min(BURN_H - 1, Math.ceil(cy + rv * 1.1)); y++) {
      for (let x = Math.floor(cx - ru * 1.1); x <= Math.ceil(cx + ru * 1.1); x++) {
        const d = Math.hypot((x - cx) / ru, (y - cy) / rv);
        if (d > 1.1) continue;
        const xi = ((x % BURN_W) + BURN_W) % BURN_W, i = y * BURN_W + xi;
        const b = 1 - d + (this.noise[y * BURN_W + (xi + off) % BURN_W] - 0.5) * 0.7;
        if (b > this.holeLayer[i]) this.holeLayer[i] = b;
        if (b > 0.3) this.emberLayer[i] = 1;
      }
    }
  }

  /** Vrstva požáru: čelo se šíří od vrchlíku dolů, za ním je zuhelnatělá látka s rozpadajícími se místy. */
  paintFire(level) {
    if (!this.noise) this.makeNoise();
    const front = 1 - level * (1 - FIRE_FRONT_MIN);
    for (let y = 0; y < BURN_H; y++) {
      const v = y / BURN_H;
      for (let x = 0; x < BURN_W; x++) {
        const i = y * BURN_W + x, n = this.noise[i];
        const depth = v - front + (n - 0.5) * 0.06;
        let f = 0, e = 0;
        if (level > 0 && depth > 0) {
          f = 0.14 + 0.3 * smooth(depth / 0.04) + 0.45 * Math.min(1, Math.max(0, (n - 0.35) * 2.2)) * smooth(depth / 0.2);
          e = Math.max(0, 1 - depth / 0.05);
        }
        this.fireLayer[i] = f; this.fireEmber[i] = e;
      }
    }
  }

  /** Složí vrstvy do textury masky (R = spálení, G = žhnutí). */
  uploadBurn() {
    const d = this.burnData, hl = this.holeLayer, fl = this.fireLayer, el = this.emberLayer, fe = this.fireEmber;
    let live = 0;
    for (let i = 0; i < hl.length; i++) {
      const r = Math.max(hl[i], fl[i]), g = Math.max(el[i], fe[i]);
      d[i * 4] = Math.min(255, Math.max(0, r * 255));
      d[i * 4 + 1] = Math.min(255, g * 255);
      if (el[i] > live) live = el[i];
    }
    this.emberLive = live;
    this.burnTex.needsUpdate = true;
  }

  /**
   * Popáleniny a kouř. Díry se jen přidávají (nebo zvětšují); požár se šíří podle `fire` 0..1.
   * @param {{u:number,v:number,size:number}[]} holes
   * @param {number} time herní čas (s) pro doznívání žhnutí a částice
   */
  setScorch(holes, fire, time = 0) {
    const dt = Math.min(0.1, Math.max(0, time - this.scorchT));
    this.scorchT = time;
    let dirty = false;
    for (let k = 0; k < holes.length; k++) {
      if (this.holeSizes[k] !== holes[k].size) {
        this.paintHole(holes[k], k);
        this.holeSizes[k] = holes[k].size;
        dirty = true;
      }
    }
    const lvl = Math.round(fire * 50) / 50;
    if (lvl !== this.fireLevel) {
      this.fireLevel = lvl;
      this.paintFire(lvl);
      dirty = true;
    }
    if (this.emberLive > 0.01 && dt > 0) {
      const k = Math.exp(-dt / EMBER_TAU);
      for (let i = 0; i < this.emberLayer.length; i++) this.emberLayer[i] *= k;
      this.emberAcc += dt;
      if (this.emberAcc > 0.25) { this.emberAcc = 0; dirty = true; }
    }
    if (dirty) this.uploadBurn();
    this.flickU.value = 0.8 + 0.2 * Math.sin(time * 19) * Math.sin(time * 7.3);
    this.updateSmoke(dt, holes, fire);
  }

  // ---------- Kouř, únik horkého vzduchu a plameny ----------
  buildSmoke() {
    const N = SMOKE_N;
    this.sm = {
      pos: new Float32Array(N * 3), vel: new Float32Array(N * 3), col: new Float32Array(N * 3),
      size: new Float32Array(N), alpha: new Float32Array(N),
      age: new Float32Array(N), life: new Float32Array(N), s0: new Float32Array(N), grow: new Float32Array(N), a0: new Float32Array(N),
      next: 0,
    };
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.sm.pos, 3));
    g.setAttribute('aCol', new THREE.BufferAttribute(this.sm.col, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.sm.size, 1));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(this.sm.alpha, 1));
    this.smokeU = { uRes: { value: 800 } };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.smokeU, transparent: true, depthWrite: false,
      vertexShader: `attribute vec3 aCol; attribute float aSize; attribute float aAlpha; uniform float uRes;
        varying vec3 vC; varying float vA;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = aSize * projectionMatrix[1][1] * uRes * 0.5 / max(0.1, -mv.z);
          vC = aCol; vA = aAlpha;
        }`,
      fragmentShader: `varying vec3 vC; varying float vA;
        void main() {
          vec2 d = gl_PointCoord - 0.5;
          float r = dot(d, d) * 4.0;
          if (r > 1.0) discard;
          float a = (1.0 - r); a *= a;
          gl_FragColor = vec4(vC, a * vA);
        }`,
    });
    this.smoke = new THREE.Points(g, mat);
    this.smoke.frustumCulled = false;
    this.smoke.renderOrder = 2;
    this.smokeAlive = false;
    this.smokeTmp = new THREE.Vector3();
    this.rig.add(this.smoke);
  }

  /** Poloha bodu pláště (u, v) v prostoru rigu podle aktuálně deformované sítě. */
  surfacePoint(u, v, out) {
    const ring = Math.min(RINGS, Math.round(v * RINGS));
    const seg = ((Math.round((1 - u) * SEGS) % SEGS) + SEGS) % SEGS;
    const k = (ring * SEGS + seg) * 3;
    return out.set(this.grid[k], this.grid[k + 1], this.grid[k + 2]);
  }

  emit(p, col, size, grow, alpha, life, up, spread) {
    const s = this.sm, i = s.next;
    s.next = (i + 1) % SMOKE_N;
    s.pos[i * 3] = p.x + (Math.random() - 0.5) * 0.8; s.pos[i * 3 + 1] = p.y; s.pos[i * 3 + 2] = p.z + (Math.random() - 0.5) * 0.8;
    s.vel[i * 3] = (Math.random() - 0.5) * spread; s.vel[i * 3 + 1] = up * (0.7 + Math.random() * 0.6); s.vel[i * 3 + 2] = (Math.random() - 0.5) * spread;
    s.col[i * 3] = col[0]; s.col[i * 3 + 1] = col[1]; s.col[i * 3 + 2] = col[2];
    s.age[i] = 0; s.life[i] = life * (0.8 + Math.random() * 0.4); s.s0[i] = size; s.grow[i] = grow; s.a0[i] = alpha;
  }

  updateSmoke(dt, holes, fire) {
    if (holes.length === 0 && fire <= 0 && !this.smokeAlive) return;
    const s = this.sm, P = this.smokeTmp;
    this.smokeU.uRes.value = window.innerHeight * Math.min(window.devicePixelRatio || 1, 1.5);
    const count = (rate) => { const n = rate * dt; return Math.floor(n) + (Math.random() < n % 1 ? 1 : 0); };
    if (dt > 0) {
      // únik horkého vzduchu z děr: řídký světlý oblak; čerstvá díra navíc kouří
      for (const h of holes) {
        this.surfacePoint(h.u, h.v, P);
        for (let n = count(2 + 3 * h.size); n > 0; n--) this.emit(P, [0.62, 0.62, 0.64], 1.4, 2.2, 0.28, 2.6, 2.4, 0.8);
        if (this.emberLive > 0.15) for (let n = count(4 * this.emberLive); n > 0; n--) this.emit(P, [0.1, 0.09, 0.08], 1.2, 2.5, 0.45, 2.8, 2.8, 0.8);
      }
      if (fire > 0) {
        const front = 1 - fire * (1 - FIRE_FRONT_MIN);
        for (let n = count(26 * fire + 6); n > 0; n--) {
          this.surfacePoint(Math.random(), front + Math.random() * (1 - front), P);
          this.emit(P, [0.1, 0.095, 0.09], 2.2, 2.8, 0.55, 4, 3.2, 1.6);
        }
        for (let n = count(24 * fire); n > 0; n--) {
          this.surfacePoint(Math.random(), front + Math.random() * 0.06, P);
          this.emit(P, [1, 0.5, 0.12], 1.6, -0.6, 0.85, 0.7, 4, 1.2);
        }
      }
    }
    let alive = false;
    for (let i = 0; i < SMOKE_N; i++) {
      if (s.life[i] <= 0) { s.alpha[i] = 0; continue; }
      s.age[i] += dt;
      const t = s.age[i] / s.life[i];
      if (t >= 1) { s.life[i] = 0; s.alpha[i] = 0; continue; }
      alive = true;
      s.pos[i * 3] += s.vel[i * 3] * dt; s.pos[i * 3 + 1] += s.vel[i * 3 + 1] * dt; s.pos[i * 3 + 2] += s.vel[i * 3 + 2] * dt;
      s.size[i] = s.s0[i] * (1 + s.grow[i] * t);
      s.alpha[i] = s.a0[i] * Math.min(1, s.age[i] * 5) * (1 - t) * (1 - t);
    }
    this.smokeAlive = alive;
    const g = this.smoke.geometry.attributes;
    g.position.needsUpdate = g.aSize.needsUpdate = g.aAlpha.needsUpdate = g.aCol.needsUpdate = true;
  }

  // ---------- Koš, rám, hořák ----------
  buildBasket() {
    const m = this.mats;
    const b = new THREE.Group();
    const cy = BASKET_BOTTOM + 0.5;
    const t = 0.08;
    const W = BASKET_HX * 2, L = BASKET_HZ * 2;
    b.add(box(W, t, L, m.basketDark, 0, BASKET_BOTTOM + t / 2, 0));
    b.add(box(W, 1, t, m.basket, 0, cy, BASKET_HZ - t / 2));
    b.add(box(W, 1, t, m.basket, 0, cy, -BASKET_HZ + t / 2));
    b.add(box(t, 1, L, m.basket, BASKET_HX - t / 2, cy, 0));
    b.add(box(t, 1, L, m.basket, -BASKET_HX + t / 2, cy, 0));
    // Horní lem: čtyři tenké pruty, aby koš zůstal shora otevřený
    const rim = 0.1;
    b.add(box(W + rim, 0.06, rim, m.basketDark, 0, BASKET_TOP, BASKET_HZ));
    b.add(box(W + rim, 0.06, rim, m.basketDark, 0, BASKET_TOP, -BASKET_HZ));
    b.add(box(rim, 0.06, L + rim, m.basketDark, BASKET_HX, BASKET_TOP, 0));
    b.add(box(rim, 0.06, L + rim, m.basketDark, -BASKET_HX, BASKET_TOP, 0));
    this.rig.add(b);

    // Láhve na LPG (až 4, viditelné podle plánu)
    this.bottles = [];
    const slots = [[-0.45, 0.85], [0.45, 0.85], [-0.45, -0.85], [0.45, -0.85]]   // nejdřív rohy u pilota, pak protilehlé;
    for (const [x, z] of slots) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.8, 8), m.bottle);
      c.position.set(x, BASKET_BOTTOM + 0.5, z);
      this.rig.add(c);
      this.bottles.push(c);
    }

    // Rám hořáku a nosná lana
    const frameTop = -0.9;
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const bottom = new THREE.Vector3(sx * 0.6, BASKET_TOP, sz * 1.0);
      const top = new THREE.Vector3(sx * 0.6, frameTop, sz * 1.0);
      this.rig.add(strut(bottom, top, 0.03, m.steel));
      const mouth = new THREE.Vector3(sx * 1.4, 0, sz * 1.4);
      this.rig.add(strut(top, mouth, 0.012, m.rope));
    }
    // Horní obdélníkový rám spojuje vršky čtyř sloupků; hořák leží na křížových příčkách uprostřed rámu
    const FX = 0.6, FZ = 1.0, bar = 0.05;
    for (const sz of [-1, 1]) this.rig.add(box(FX * 2 + bar, bar, bar, m.steel, 0, frameTop, sz * FZ));
    for (const sx of [-1, 1]) this.rig.add(box(bar, bar, FZ * 2 + bar, m.steel, sx * FX, frameTop, 0));
    this.rig.add(box(FX * 2, bar, bar, m.steel, 0, frameTop, 0));
    this.rig.add(box(bar, bar, FZ * 2, m.steel, 0, frameTop, 0));
    const burner = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.35, 10), m.burner);
    burner.position.set(0, frameTop + 0.2, 0);
    this.rig.add(burner);
  }

  /** Počet viditelných lahví (1–4). */
  setBottles(n) { this.bottles.forEach((b, i) => { b.visible = i < n; }); }

  /** Plamen: protáhlé kapky s animovaným shaderem (vlnění, pulzování, měkké okraje, barevný přechod). */
  buildFlame() {
    this.flameTime = { value: 0 };
    const vert = `
      uniform float uTime; uniform float uSeed; uniform float uHeight; uniform float uLevel;
      varying float vH; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      float hash(float n) { return fract(sin(n) * 43758.5453); }
      float noise1(float x) { float i = floor(x); float f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(hash(i), hash(i + 1.0), f) * 2.0 - 1.0; }
      void main() {
        vUv = uv;
        vH = clamp(position.y / uHeight, 0.0, 1.0);
        float sway = vH * vH;
        vec3 p = position;
        float t = uTime;
        p.x += noise1(t * 5.0 + uSeed + vH * 2.2) * 0.14 * sway;
        p.z += noise1(t * 6.3 + uSeed * 1.7 + vH * 2.6 + 10.0) * 0.14 * sway;
        float pulse = 1.0 + 0.16 * noise1(t * 13.0 + vH * 6.0 + uSeed) * (0.4 + vH);
        p.xz *= pulse;
        p.y *= 1.0 + 0.08 * noise1(t * 9.0 + uSeed * 3.0);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`;
    const frag = `
      uniform float uTime; uniform float uSeed; uniform float uIntensity; uniform float uBlue;
      varying float vH; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      float hash(float n) { return fract(sin(n) * 43758.5453); }
      float noise1(float x) { float i = floor(x); float f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(hash(i), hash(i + 1.0), f); }
      void main() {
        float h = vH;
        vec3 blue = vec3(0.25, 0.45, 1.0);
        vec3 yellow = vec3(1.0, 0.92, 0.55);
        vec3 orange = vec3(1.0, 0.45, 0.06);
        vec3 red = vec3(0.45, 0.08, 0.0);
        vec3 col = mix(blue, yellow, smoothstep(0.0, 0.22, h));
        col = mix(col, orange, smoothstep(0.25, 0.65, h));
        col = mix(col, red, smoothstep(0.7, 1.0, h));
        col = mix(col, blue * 1.2, uBlue * (1.0 - smoothstep(0.0, 0.5, h)));
        // pohybující se pruhy = živé "jazyky" plamene, stoupající vzhůru
        float streak = noise1(vUv.x * 14.0 + uSeed) * 0.6 + noise1(vUv.x * 31.0 - uTime * 3.0 + h * 9.0 - uTime * 11.0) * 0.4;
        float flick = 0.65 + 0.55 * streak + 0.15 * noise1(uTime * 22.0 + uSeed);
        float rim = pow(abs(dot(normalize(vN), normalize(vV))), 0.75);   // měkké okraje
        float fade = smoothstep(0.0, 0.06, h) * (1.0 - smoothstep(0.55, 1.0, h));
        float a = rim * fade * flick * uIntensity;
        gl_FragColor = vec4(col, a);
      }`;
    const teardrop = (pts, seed, intensity, blue) => {
      const H = pts[pts.length - 1][1];
      const geo = new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(r, h)), 14);
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: this.flameTime, uSeed: { value: seed }, uHeight: { value: H }, uLevel: { value: 1 },
          uIntensity: { value: intensity }, uBlue: { value: blue },
        },
        vertexShader: vert, fragmentShader: frag,
        transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
      });
      return new THREE.Mesh(geo, mat);
    };
    const outerPts = [[0, 0], [0.06, 0.05], [0.15, 0.22], [0.21, 0.55], [0.19, 0.9], [0.11, 1.2], [0.04, 1.42], [0, 1.55]];
    const innerPts = [[0, 0], [0.05, 0.05], [0.1, 0.2], [0.12, 0.45], [0.08, 0.7], [0.03, 0.88], [0, 0.95]];

    this.flame = new THREE.Group();
    this.flame.add(teardrop(outerPts, 1.0, 1.0, 0.0));
    this.flame.add(teardrop(innerPts, 7.3, 1.25, 0.6));
    // Tenké jazyky, které se vlní kolem hlavního plamene
    this.tongues = [0, 1, 2, 3].map((k) => {
      const tg = teardrop(outerPts.map(([r, h]) => [r * 0.42, h * 0.9]), 3.7 * (k + 1), 0.8, 0.0);
      tg.userData.k = k;
      this.flame.add(tg);
      return tg;
    });
    // Kovová cívka hořáku
    const coil = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.03, 6, 14), this.mats.steel);
    coil.rotation.x = Math.PI / 2;
    coil.position.set(0, -0.5, 0);
    this.rig.add(coil);

    this.flame.position.set(0, -0.5, 0);   // základna plamene = vršek hořáku
    this.flame.visible = false;
    this.flameLight = new THREE.PointLight(0xffa24a, 0, 30, 1.6);
    this.flameLight.position.set(0, -0.2, 0);
    this.rig.add(this.flame);
    this.rig.add(this.flameLight);
  }

  /** Plamen: level 0..1, t = čas. Bez zážehu hoří jen malý pilotní plamínek. */
  setBurn(level, t) {
    this.flameTime.value = t;
    const pilot = level < 0.02;
    this.flame.visible = true;
    const flick = 0.9 + Math.sin(t * 37) * 0.06 + Math.sin(t * 23) * 0.05 + Math.sin(t * 61) * 0.03;
    const len = pilot ? 0.14 : (0.6 + 1.9 * level) * flick;
    const wid = pilot ? 0.35 : 0.9 + 0.7 * level;
    this.flame.scale.set(wid, len, wid);
    this.flame.rotation.x = Math.sin(t * 9) * 0.04;
    this.flame.rotation.z = Math.cos(t * 11) * 0.04;
    for (const tg of this.tongues) {
      const k = tg.userData.k;
      const a = t * (6 + k * 2.3) + k * 2.1;
      tg.rotation.set(Math.sin(a) * 0.2, k * 1.57, Math.cos(a * 1.3) * 0.2);
      tg.scale.y = 0.8 + 0.3 * Math.sin(a * 2.1 + k);
      tg.visible = !pilot;
    }
    this.flameLight.intensity = pilot ? 0 : 40 * level * flick;

    // Záře pláště zvenku: rychlý náběh při zážehu, pomalé doznívání
    const dt = Math.min(0.1, Math.max(0, t - this.glowT));
    this.glowT = t;
    const target = pilot ? 0 : level * (0.85 + 0.15 * flick);
    const rate = target > this.glow ? ENVELOPE_GLOW.rise : ENVELOPE_GLOW.decay;
    this.glow += (target - this.glow) * Math.min(1, dt * rate);
    this.glowU.value = this.glow * ENVELOPE_GLOW.intensity;
  }

  // ---------- Falešný stín ----------
  buildShadow() {
    const geo = new THREE.CircleGeometry(1, 24).rotateX(-Math.PI / 2);
    this.shadow = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false }));
    this.shadow.renderOrder = 1;
  }

  /** Pozice stínu: (x,z) pod balonem, groundY = povrch, height = výška koše nad povrchem. */
  setShadow(x, groundY, z, height, fade = 1) {
    const s = (8 + Math.min(height, 400) * 0.01) * (0.55 + 0.45 * fade);   // fade 0..1: stín plynule vyroste a ztmavne
    this.shadow.position.set(x, groundY + 0.25, z);
    this.shadow.scale.set(s, 1, s);
    this.shadow.material.opacity = Math.max(0.08, 0.32 - height * 0.0008) * fade;
  }

  /** Poloha: x,z = střed koše, y = spodek koše (nebo povrch při ležení). */
  setPose(x, y, z, headingDeg) {
    const P = this.pose;
    // ležící plášť závisí na poloze a natočení koše: při změně se tvar přepočítá
    if (this.terrain && (Math.abs(P.x - x) + Math.abs(P.y - y) + Math.abs(P.z - z) > 0.02 || Math.abs(P.h - headingDeg) > 0.2)) this.state.inflation = -1;
    P.x = x; P.y = y; P.z = z; P.h = headingDeg;
    this.root.position.set(x, y, z);
    this.root.rotation.y = -headingDeg * Math.PI / 180;
  }
}
