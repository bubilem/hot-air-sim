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
const ARCH_TIP = 1.8;      // m: minimální vyklenutí špičky pláště při ležení
const ARCH_TIP_R = 3;      // m: do jakého poloměru prstence se doplňuje
const SKIRT_ROWS = 3;      // spodní řady pláště tvoří tmavá "plachta" (sukně) u ústí
const SKIRT_COLOR = 0.07;  // jas sukně (násobí se s texturou)

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

    this.state = { inflation: -1, upright: -1, unroll: -1, envUpright: -1 };
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
    this.envMat.onBeforeCompile = (sh, renderer) => {
      THREE.MeshLambertMaterial.prototype.onBeforeCompile?.call(this.envMat, sh, renderer);   // výšková mlha
      sh.uniforms.uGlow = this.glowU;
      sh.uniforms.uGlowColor = { value: new THREE.Vector3(...ENVELOPE_GLOW.color) };
      sh.uniforms.uGlowTop = { value: ENVELOPE_GLOW.topFalloff };
      sh.uniforms.uGlowH = { value: PROFILE[PROFILE.length - 1][1] };
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying float vGlowY;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGlowY = position.y;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vGlowY;\nuniform float uGlow, uGlowTop, uGlowH;\nuniform vec3 uGlowColor;')
        .replace('#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
          float gk = uGlow * (1.0 - uGlowTop * clamp(vGlowY / uGlowH, 0.0, 1.0));
          totalEmissiveRadiance += diffuseColor.rgb * uGlowColor * gk;`);
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
    const g = this.grid;
    for (let i = 0; i <= RINGS; i++) {
      const r = this.profile[i].x, h = this.profile[i].y;
      const reach = smooth(h / 7);               // u ústí je plášť přichycen ke koši, dál se klene
      const y0 = h * kl;
      // vyklenutí nad zem a klesnutí tenké látky na zem (ústí zůstává ve výšce koše, zbytek leží)
      const sag = lyingE * smooth(h / 3) * Math.max(0, rigYE - r * kt);
      const archR = r + ARCH_TIP * (1 - smooth(r / ARCH_TIP_R));   // u špičky vrchlíku se vyklenutí nesráží k nule (jinak se špička zamáčkne)
      let dY = sup * reach * archR * kt - sag;
      // Zem: celý prstenec se zvedne tak, aby jeho nejnižší bod neprorážel zem (po prstencích, ne po vrcholech,
      // jinak by se špička a boky při vztyčování zamáčkly dovnitř)
      const ringMin = rigYE + y0 * cpE - r * kt * spE + dY;
      if (ringMin < GROUND) dY += GROUND - ringMin;
      for (let j = 0; j < SEGS; j++) {
        const a = (j / SEGS) * Math.PI * 2;
        let x = r * Math.cos(a) * kt;
        let y = y0;
        const z = r * Math.sin(a) * kw;
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

    for (let v = 0; v < this.vRing.length; v++) {
      const k = (this.vRing[v] * SEGS + this.vSeg[v]) * 3;
      this.envPos[v * 3] = g[k]; this.envPos[v * 3 + 1] = g[k + 1]; this.envPos[v * 3 + 2] = g[k + 2];
    }
    this.envGeo.attributes.position.needsUpdate = true;
    this.envGeo.computeBoundingSphere();

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
    this.root.position.set(x, y, z);
    this.root.rotation.y = -headingDeg * Math.PI / 180;
  }
}
