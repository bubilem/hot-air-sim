// Vizuální reprezentace terénu: mřížka s vertexovými barvami, voda, instancované stromy.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { WORLD, GRASS_DETAIL, TERRAIN_SOFT, TOWNS, HRADEK, BEZDEZ, TROSKY } from '../config/GameConfig.js';
import { COLORS } from '../config/Colors.js';
import { BIOME } from './Biomes.js';

const RIVER_EXT = 19000;   // m, délka řeky za okrajem mapy
const tmp = new THREE.Color();
const colA = new THREE.Color(), colB = new THREE.Color();

/** Plynulá změna odstínu louky ve velkých skvrnách (místo šachovnice 70 m). */
function meadowColor(biomes, x, z, hexA, hexB) {
  const t = Math.min(1, Math.max(0, 0.5 + 0.8 * biomes.nVar(x / 240 + 7, z / 240)));
  tmp.lerpColors(colA.setHex(hexA), colB.setHex(hexB), t);
  // jemné suché / svěží skvrny
  tmp.offsetHSL(0.012 * biomes.nVar(x / 110 + 3, z / 110 - 5), 0.02 * biomes.nVar(x / 130 - 9, z / 130 + 1), 0);
}

// Podíl detailní textury trávy podle biomu (0 = bez textury)
const GRASS_AMOUNT = { [BIOME.WATER]: 0, [BIOME.ROCK]: 0, [BIOME.TOWN]: 0, [BIOME.FOREST]: 0.45 };

function biomeColor(biomes, x, z, s) {
  const v = biomes.variation(x, z) * 0.06;
  switch (s.type) {
    case BIOME.WATER: tmp.setHex(COLORS.riverBed); break;
    case BIOME.ROCK: tmp.setHex(COLORS.rock); break;
    case BIOME.TOWN: tmp.setHex(COLORS.town); break;
    case BIOME.FOREST: tmp.setHex(COLORS.forest); break;
    case BIOME.HILL: meadowColor(biomes, x, z, COLORS.hill, COLORS.meadowAlt); break;
    case BIOME.FIELD: {
      const i = biomes.fieldStripe(x, z);
      tmp.setHex(i === 0 ? COLORS.field1 : i === 1 ? COLORS.field2 : i === 2 ? COLORS.field3 : COLORS.meadowAlt);
      break;
    }
    default: meadowColor(biomes, x, z, COLORS.meadow, COLORS.meadowAlt);
  }
  tmp.offsetHSL(0, 0, v);
  return tmp;
}

/** Rozmaže hodnoty uložené po vrcholech pravidelné mřížky (n×n): každý vrchol dostane průměr se 4 sousedy. */
function blurGrid(data, comp, n, passes) {
  let src = data, dst = new Float32Array(data.length);
  for (let pass = 0; pass < passes; pass++) {
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const i = r * n + c;
        const l = r * n + Math.max(0, c - 1), rt = r * n + Math.min(n - 1, c + 1);
        const u = Math.max(0, r - 1) * n + c, d = Math.min(n - 1, r + 1) * n + c;
        for (let k = 0; k < comp; k++) {
          dst[i * comp + k] = src[i * comp + k] * 0.4 + (src[l * comp + k] + src[rt * comp + k] + src[u * comp + k] + src[d * comp + k]) * 0.15;
        }
      }
    }
    [src, dst] = [dst, src];
  }
  if (src !== data) data.set(src);
}

function buildTreeGeometry() {
  const trunk = new THREE.CylinderGeometry(0.35, 0.5, 2.6, 5);
  trunk.translate(0, 1.3, 0);
  const c1 = new THREE.ConeGeometry(2.6, 5.2, 6);
  c1.translate(0, 4.6, 0);
  const c2 = new THREE.ConeGeometry(1.9, 4.4, 6);
  c2.translate(0, 7.4, 0);
  const paint = (geo, hex) => {
    const n = geo.attributes.position.count;
    const col = new Float32Array(n * 3);
    const c = new THREE.Color(hex);
    for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return geo.index ? geo.toNonIndexed() : geo;
  };
  return mergeGeometries([
    paint(trunk, COLORS.trunk),
    paint(c1, COLORS.pine),
    paint(c2, COLORS.pineLight),
  ]);
}

/** Dlaždicová textura (256², bezešvá): jemné stébla a skvrny; hodnoty kolem 1, násobí barvu terénu. */
function createGrassTexture() {
  const N = 256;
  const c = document.createElement('canvas');
  c.width = c.height = N;
  const g = c.getContext('2d');
  let seed = 4242;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  g.fillStyle = 'rgb(205,205,205)';
  g.fillRect(0, 0, N, N);
  const wrap = (fn) => { for (const ox of [-N, 0, N]) for (const oy of [-N, 0, N]) fn(ox, oy); };
  for (let i = 0; i < 90; i++) {            // měkké skvrny
    const x = rnd() * N, y = rnd() * N, r = 14 + rnd() * 26, l = 175 + rnd() * 60;
    wrap((ox, oy) => {
      const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
      gr.addColorStop(0, `rgba(${l},${l + 4},${l - 8},0.5)`);
      gr.addColorStop(1, `rgba(${l},${l + 4},${l - 8},0)`);
      g.fillStyle = gr; g.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
    });
  }
  g.lineCap = 'round';
  for (let i = 0; i < 2600; i++) {          // stébla
    const x = rnd() * N, y = rnd() * N, len = 4 + rnd() * 9, a = -Math.PI / 2 + (rnd() - 0.5) * 1.1;
    const dark = rnd() < 0.5;
    const l = dark ? 120 + rnd() * 50 : 215 + rnd() * 40;
    g.strokeStyle = `rgba(${l - 6},${l},${l - 22},${0.35 + rnd() * 0.35})`;
    g.lineWidth = 1 + rnd() * 1.3;
    wrap((ox, oy) => {
      g.beginPath();
      g.moveTo(x + ox, y + oy);
      g.lineTo(x + ox + Math.cos(a) * len, y + oy + Math.sin(a) * len);
      g.stroke();
    });
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

export class ProceduralTerrain {
  constructor(biomes) {
    this.biomes = biomes;
    this.group = new THREE.Group();
    this.buildGround();
    this.buildWater();
    this.buildTrees();
    this.buildTowns();
    this.buildDominants();
  }

  getMesh() { return this.group; }

  buildGround() {
    const { size, segments } = WORLD;
    const geo = new THREE.PlaneGeometry(size, size, segments, segments);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const grass = new Float32Array(pos.count);
    this.heights = new Float32Array(pos.count);   // výšky vrcholů mřížky (pro meshHeight)
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) + this.biomes.cx, z = pos.getZ(i) + this.biomes.cz;   // mapa je vystředěná na střed mapy, ne na start
      const s = this.biomes.sample(x, z);
      pos.setXYZ(i, x, s.height, z);
      this.heights[i] = s.height;
      const c = biomeColor(this.biomes, x, z, s);
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
      grass[i] = GRASS_AMOUNT[s.type] ?? 1;
    }
    // Změkčení přechodů mezi biomy: barvy (a podíl trávy) se zprůměrují se sousedy v mřížce
    const n1 = segments + 1;
    blurGrid(colors, 3, n1, TERRAIN_SOFT.passes);
    blurGrid(grass, 1, n1, TERRAIN_SOFT.passes);
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('aGrass', new THREE.BufferAttribute(grass, 1));
    geo.computeVertexNormals();
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: !TERRAIN_SOFT.smoothShading });
    this.grassTex = createGrassTexture();
    // Detail trávy: textura ve světových souřadnicích XZ ve dvou měřítcích (proti opakování), jen v okolí kamery
    mat.onBeforeCompile = (sh, renderer) => {
      THREE.MeshLambertMaterial.prototype.onBeforeCompile?.call(mat, sh, renderer);   // výšková mlha
      sh.uniforms.uGrassTex = { value: this.grassTex };
      sh.uniforms.uGrassFine = { value: GRASS_DETAIL.fineScale };
      sh.uniforms.uGrassCoarse = { value: GRASS_DETAIL.coarseScale };
      sh.uniforms.uGrassFade = { value: new THREE.Vector2(GRASS_DETAIL.fadeNear, GRASS_DETAIL.fadeFar) };
      sh.uniforms.uGrassStrength = { value: GRASS_DETAIL.strength };
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', `#include <common>
attribute float aGrass;
varying float vGrass;
varying vec2 vGrassXZ;`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>
vGrass = aGrass;
vGrassXZ = ( modelMatrix * vec4( transformed, 1.0 ) ).xz;`);
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>
varying float vGrass;
varying vec2 vGrassXZ;
uniform sampler2D uGrassTex;
uniform float uGrassFine, uGrassCoarse, uGrassStrength;
uniform vec2 uGrassFade;`)
        .replace('#include <color_fragment>', `#include <color_fragment>
          float grFade = 1.0 - smoothstep( uGrassFade.x, uGrassFade.y, length( vViewPosition ) );
          float grAmt = vGrass * grFade * uGrassStrength;
          if ( grAmt > 0.001 ) {
            vec3 grF = texture2D( uGrassTex, vGrassXZ / uGrassFine ).rgb;
            vec3 grC = texture2D( uGrassTex, vGrassXZ / uGrassCoarse + 0.37 ).rgb;
            vec3 grD = ( grF * grC ) / 0.62;   // střed textur ~0,78 → součin ~0,6, takže průměrná jasnost zůstane
            diffuseColor.rgb *= mix( vec3( 1.0 ), grD, grAmt );
          }`);
    };
    this.ground = new THREE.Mesh(geo, mat);
    this.group.add(this.ground);

    // Nekonečně vypadající podklad za okrajem mapy
    // Jde o rám s dírou uprostřed: pod terénem nesmí být žádná plocha, jinak by zakrývala údolí
    // a vše, co leží níž než ona (start, louky, voda).
    const shape = new THREE.Shape();
    shape.moveTo(-20000, -20000); shape.lineTo(20000, -20000); shape.lineTo(20000, 20000); shape.lineTo(-20000, 20000); shape.closePath();
    const h = size / 2 - 20;   // díra je o 20 m menší než terén, aby se překrývaly
    const notches = this.riverExits(h);
    const hole = new THREE.Path();
    // obrys díry = čtverec terénu; tam, kde řeka opouští mapu, má výřez (zde je vidět řeka pokračující za okraj)
    const corners = [[-h, -h], [h, -h], [h, h], [-h, h]];
    let first = true;
    corners.forEach((p0, i) => {
      const p1 = corners[(i + 1) % 4];
      const u = [(p1[0] - p0[0]) / (2 * h), (p1[1] - p0[1]) / (2 * h)];
      const pts = [p0];
      for (const nt of notches.filter((q) => q.side === i).sort((a, b) => a.s - b.s)) {
        const a0 = [p0[0] + u[0] * (nt.s - nt.w / 2), p0[1] + u[1] * (nt.s - nt.w / 2)];
        const b0 = [p0[0] + u[0] * (nt.s + nt.w / 2), p0[1] + u[1] * (nt.s + nt.w / 2)];
        pts.push(a0, [a0[0] + nt.n[0] * RIVER_EXT, a0[1] + nt.n[1] * RIVER_EXT], [b0[0] + nt.n[0] * RIVER_EXT, b0[1] + nt.n[1] * RIVER_EXT], b0);
      }
      for (const [x, z] of pts) {
        if (first) { hole.moveTo(x, -z); first = false; } else hole.lineTo(x, -z);   // tvar leží v rovině XY, y = -z
      }
    });
    hole.closePath();
    shape.holes.push(hole);
    const far = new THREE.Mesh(
      new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2),
      new THREE.MeshLambertMaterial({ color: 0x7da34b }),   // střední odstín louky, navazuje na okraj terénu
    );
    far.position.set(this.biomes.cx, WORLD.edgeHeight - 0.4, this.biomes.cz);   // těsně pod okrajem terénu (bez z-fightingu)
    this.group.add(far);
    // Řeka pokračuje za okraj mapy: pruh hladiny ve výřezu podkladu
    for (const nt of notches) {
      const geo = new THREE.PlaneGeometry(nt.w, RIVER_EXT).rotateX(-Math.PI / 2);
      if (nt.n[0] !== 0) geo.rotateY(Math.PI / 2);
      const strip = new THREE.Mesh(geo, this.waterMaterial());
      strip.position.set(this.biomes.cx + nt.x + nt.n[0] * (RIVER_EXT / 2 - 30), WORLD.waterLevel, this.biomes.cz + nt.z + nt.n[1] * (RIVER_EXT / 2 - 30));
      this.group.add(strip);
    }
  }

  /** Místa, kde řeka opouští čtvercovou mapu (poloviční hrana h): strana 0..3 (-z, +x, +z, -x), poloha podél ní, šířka výřezu. */
  riverExits(h) {
    const river = this.biomes.river;
    if (!river) return [];
    const path = river.path.map(([x, z]) => [x - this.biomes.cx, z - this.biomes.cz]), out = [];   // v souřadnicích se středem mapy v počátku
    const sides = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    for (const [end, prev] of [[path[path.length - 1], path[Math.max(0, path.length - 5)]], [path[0], path[Math.min(path.length - 1, 4)]]]) {
      // průsečík polopřímky od 'prev' přes 'end' s hranicí čtverce
      const dx = end[0] - prev[0], dz = end[1] - prev[1];
      let best = null;
      sides.forEach((n, side) => {
        const dn = dx * n[0] + dz * n[1];
        if (dn <= 0) return;
        const tt = (h - (prev[0] * n[0] + prev[1] * n[1])) / dn;
        if (tt < 0) return;
        const x = prev[0] + dx * tt, z = prev[1] + dz * tt;
        if (Math.abs(x) > h || Math.abs(z) > h) return;
        if (!best || tt < best.tt) best = { tt, side, n, x, z };
      });
      if (!best) continue;
      const p0 = [[-h, -h], [h, -h], [h, h], [-h, h]][best.side];
      const s = Math.hypot(best.x - p0[0], best.z - p0[1]);
      out.push({ side: best.side, s, w: river.half * 2 * 1.4, n: best.n, x: best.x, z: best.z });
    }
    return out;
  }

  waterMaterial() {
    // polygonOffset odsune hladinu v hloubkovém bufferu: kde je terén ve stejné výšce jako voda, vyhrává stabilně terén (jinak kmitá)
    this.waterMat ??= new THREE.MeshLambertMaterial({ color: COLORS.waterSurface, transparent: true, opacity: 0.82, depthWrite: false, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 8 });
    return this.waterMat;
  }

  /**
   * Výška vykresleného terénu v bodě (x,z): interpolace po trojúhelnících mřížky stejně jako ve vykreslené síti.
   * Na rozdíl od `Biomes.rawHeight` se nerozchází s mřížkou na svazích a hrbolech (stromy pak nelevitují).
   */
  meshHeight(x, z) {
    const { size, segments } = WORLD;
    const n1 = segments + 1, cell = size / segments;
    const fx = (x - (this.biomes.cx - size / 2)) / cell, fz = (z - (this.biomes.cz - size / 2)) / cell;
    const ix = Math.min(segments - 1, Math.max(0, Math.floor(fx))), iz = Math.min(segments - 1, Math.max(0, Math.floor(fz)));
    const u = Math.min(1, Math.max(0, fx - ix)), v = Math.min(1, Math.max(0, fz - iz));
    const H = this.heights, i = iz * n1 + ix;
    const ha = H[i], hd = H[i + 1], hb = H[i + n1], hc = H[i + n1 + 1];   // a=(0,0) d=(1,0) b=(0,1) c=(1,1); úhlopříčka b–d
    return u + v <= 1 ? ha + u * (hd - ha) + v * (hb - ha) : hc + (1 - u) * (hb - hc) + (1 - v) * (hd - hc);
  }

  buildWater() {
    const geo = new THREE.PlaneGeometry(WORLD.size, WORLD.size).rotateX(-Math.PI / 2);
    const mat = this.waterMaterial();
    const water = new THREE.Mesh(geo, mat);
    water.position.set(this.biomes.cx, WORLD.waterLevel, this.biomes.cz);
    this.group.add(water);
  }

  /** Zástavba měst podle `Biomes.towns`: domky (kvádr + sedlová střecha), kostel a komíny. Stromy ve městě viz buildTrees. */
  buildTowns() {
    const towns = this.biomes.towns;
    this.houseCount = 0;
    if (!towns.length) return;
    const pick = (list, n) => list[n % list.length];
    const houses = towns.flatMap((t) => t.buildings);
    this.houseCount = houses.length;
    if (houses.length) {
      const wallGeo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
      const prism = new THREE.Shape();
      prism.moveTo(-0.5, 0); prism.lineTo(0.5, 0); prism.lineTo(0, 1); prism.closePath();
      const roofGeo = new THREE.ExtrudeGeometry(prism, { depth: 1, bevelEnabled: false }).translate(0, 0, -0.5);   // hřeben podél osy z
      const walls = new THREE.InstancedMesh(wallGeo, new THREE.MeshLambertMaterial({ flatShading: true }), houses.length);
      const roofs = new THREE.InstancedMesh(roofGeo, new THREE.MeshLambertMaterial({ flatShading: true }), houses.length);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), pos = new THREE.Vector3(), sc = new THREE.Vector3();
      houses.forEach((h, i) => {
        const y = this.meshHeight(h.x, h.z) - 0.2;
        q.setFromAxisAngle(up, h.a);
        m.compose(pos.set(h.x, y, h.z), q, sc.set(h.w, h.h, h.d));
        walls.setMatrixAt(i, m);
        walls.setColorAt(i, tmp.setHex(pick(COLORS.houseWalls, h.wall)));
        m.compose(pos.set(h.x, y + h.h, h.z), q, sc.set(h.w + 1, TOWNS.roofHeight, h.d + 1));
        roofs.setMatrixAt(i, m);
        roofs.setColorAt(i, tmp.setHex(pick(COLORS.houseRoofs, h.roof)));
      });
      for (const mesh of [walls, roofs]) {
        mesh.instanceMatrix.needsUpdate = true;
        mesh.instanceColor.needsUpdate = true;
        this.group.add(mesh);
      }
      this.houses = { walls, roofs };
    }
    for (const t of towns) {
      this.group.add(this.buildChurch(t.church));
      for (const c of t.chimneys) this.group.add(this.buildChimney(c));
    }
  }

  /** Samostatné dominanty mimo města (Biomes.dominants), např. na kopci. */
  buildDominants() {
    for (const c of this.biomes.dominants) this.group.add({ hradek: this.buildHradek, bezdez: this.buildBezdez, trosky: this.buildTrosky }[c.type]?.call(this, c) ?? this.buildChurch(c));
  }

  /**
   * Hrádek: kamenný sokl, hlavní kvádr se sedlovou červenou střechou, tři věže s jehlanovými střechami a vížka přistavěná
   * k velké věži. Stěny žluté, střecha a pásy červené, okna tmavá (jen na průčelí = +z).
   */
  buildHradek(c) {
    const H = HRADEK, g = new THREE.Group();
    const box = (w, h, d, x, y, z, hex) => {
      const m = this.buildPart(new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0), hex);
      m.position.set(x, y, z);
      g.add(m);
    };
    const pyramid = (s, h, x, y, z, hex) => {   // čtyřboký jehlan nad čtvercovým půdorysem o straně s (+ přesah)
      const m = this.buildPart(new THREE.ConeGeometry((s + 1) / Math.SQRT2, h, 4).rotateY(Math.PI / 4).translate(0, h / 2, 0), hex);
      m.position.set(x, y, z);
      g.add(m);
    };
    const windows = (x, y, z, n, step) => {   // n oken v řadě na průčelí
      for (let i = 0; i < n; i++) box(H.window.w, H.window.h, 0.3, x + (i - (n - 1) / 2) * step, y, z, COLORS.hradekWindow);
    };
    const base = H.plinth.h;
    box(H.plinth.w, base, H.plinth.d, 0, 0, 0, COLORS.hradekStone);
    // hlavní kvádr s červenou sedlovou střechou (hřeben podél průčelí) a pásem pod střechou
    const m = H.main;
    box(m.w, m.wall, m.d, m.x, base, m.z, COLORS.hradekWall);
    box(m.w + 0.6, H.trim, m.d + 0.6, m.x, base + m.wall - H.trim, m.z, COLORS.hradekTrim);
    const prism = new THREE.Shape();
    prism.moveTo(-0.5, 0); prism.lineTo(0.5, 0); prism.lineTo(0, 1); prism.closePath();
    const roof = new THREE.ExtrudeGeometry(prism, { depth: 1, bevelEnabled: false }).translate(0, 0, -0.5).rotateY(Math.PI / 2).scale(m.w + 1.6, m.roof, m.d + 1.6);
    const rm = this.buildPart(roof, COLORS.hradekRoof);
    rm.position.set(m.x, base + m.wall, m.z);
    g.add(rm);
    windows(m.x - 1, base + 3, m.z + m.d / 2 + 0.1, 5, 4.2);
    // věže: tělo, pás, jehlanová střecha, okna
    for (const t of H.towers) {
      box(t.s, t.h, t.s, t.x, base, t.z, COLORS.hradekWall);
      box(t.s + 0.8, H.trim, t.s + 0.8, t.x, base + t.h - H.trim, t.z, COLORS.hradekTrim);
      pyramid(t.s, t.roof, t.x, base + t.h, t.z, COLORS.hradekRoof);
      windows(t.x, base + Math.min(5, t.h * 0.35), t.z + t.s / 2 + 0.1, 1, 0);
      if (t.h > 12) windows(t.x, base + t.h - 6, t.z + t.s / 2 + 0.1, 1, 0);
    }
    // vížka (přístavek) na velké věži
    const u = H.turret;
    box(u.s, u.h, u.s, u.x, base + u.y, u.z, COLORS.hradekWall);
    box(u.s + 0.6, H.trim, u.s + 0.6, u.x, base + u.y + u.h - H.trim, u.z, COLORS.hradekTrim);
    pyramid(u.s, u.roof, u.x, base + u.y + u.h, u.z, COLORS.hradekRoof);
    g.position.set(c.x, this.meshHeight(c.x, c.z) - 0.2, c.z);
    g.rotation.y = -c.a;
    return g;
  }

  /**
   * Hrad Bezděz: dlouhý kvádr paláce s tmavou sedlovou střechou (okrové zdivo), vysoká kruhová věž bez střechy (cimbuří),
   * nízká hradba a malá kruhová věž na jejím konci.
   */
  buildBezdez(c) {
    const B = BEZDEZ, g = new THREE.Group();
    const add = (geo, hex, x, y, z) => { const m = this.buildPart(geo, hex); m.position.set(x, y, z); g.add(m); return m; };
    const box = (w, h, d, x, y, z, hex) => add(new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0), hex, x, y, z);
    const round = (r, h, x, z) => {   // kruhová věž bez střechy: plochý vrch s tmavým pásem a cimbuřím
      add(new THREE.CylinderGeometry(r, r * 1.08, h, 18).translate(0, h / 2, 0), COLORS.bezdezWall, x, 0, z);
      add(new THREE.CylinderGeometry(r + 0.5, r + 0.5, 0.8, 18).translate(0, 0.4, 0), COLORS.bezdezRoof, x, h - 0.8, z);
      const M = B.merlon, n = Math.max(8, Math.round(r * 2));
      for (let i = 0; i < n; i++) {
        if (i % 2) continue;   // zuby střídají mezery
        const a = (i / n) * Math.PI * 2;
        const m = add(new THREE.BoxGeometry(M.size, M.h, M.size).translate(0, M.h / 2, 0), COLORS.bezdezWall, x + Math.cos(a) * (r - 0.1), h, z + Math.sin(a) * (r - 0.1));
        m.rotation.y = -a;
      }
    };
    const p = B.palace;
    box(p.w, p.wall, p.d, p.x, 0, p.z, COLORS.bezdezWall);
    const prism = new THREE.Shape();
    prism.moveTo(-0.5, 0); prism.lineTo(0.5, 0); prism.lineTo(0, 1); prism.closePath();
    const roof = new THREE.ExtrudeGeometry(prism, { depth: 1, bevelEnabled: false }).translate(0, 0, -0.5).rotateY(Math.PI / 2).scale(p.w + 1.2, p.roof, p.d + 1.2);
    add(roof, COLORS.bezdezRoof, p.x, p.wall, p.z);
    const W = B.windows;
    for (let i = 0; i < W.count; i++) box(W.w, W.h, 0.3, p.x + (i - (W.count - 1) / 2) * W.step, 4, p.z + p.d / 2 + 0.1, COLORS.hradekWindow);
    round(B.tower.r, B.tower.h, B.tower.x, B.tower.z);
    const w = B.wall;
    box(w.len, w.h, w.thick, w.x, 0, w.z, COLORS.bezdezWall);
    box(w.len, 0.6, w.thick + 0.5, w.x, w.h, w.z, COLORS.bezdezRoof);   // tmavé zakončení hradby
    round(B.smallTower.r, B.smallTower.h, B.smallTower.x, B.smallTower.z);
    g.position.set(c.x, this.meshHeight(c.x, c.z) - 0.2, c.z);
    g.rotation.y = -c.a;
    return g;
  }

  /**
   * Hrad Trosky: dvě skalní věže (nepravidelné zužující se sloupy se zubatým povrchem) s kamennými věžemi na vrcholech,
   * dole je spojuje hradba. Skály jsou z modelu, protože výšková mřížka terénu je na ně příliš hrubá.
   */
  buildTrosky(c) {
    const T = TROSKY, g = new THREE.Group();
    const add = (geo, hex, x, y, z) => { const m = this.buildPart(geo, hex); m.position.set(x, y, z); g.add(m); return m; };
    const hash = (a, b) => Math.abs(Math.sin(a * 127.1 + b * 311.7) * 43758.5453) % 1;
    const rock = (k, seed) => {   // zužující se sloup; posun vrcholů závisí jen na poloze, takže spoj válce zůstane celistvý
      const geo = new THREE.CylinderGeometry(k.r * T.rockTop, k.r * 1.3, k.h, 12, 7);
      geo.translate(0, k.h / 2, 0);
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        const bucket = ((Math.round(Math.atan2(z, x) / (Math.PI * 2) * 12) % 12) + 12) % 12;
        const f = 1 + (hash(bucket + seed, Math.round(y / (k.h / 7))) - 0.5) * 2 * T.rockJitter;
        pos.setXYZ(i, x * f, y, z * f);
      }
      geo.computeVertexNormals();
      return geo;
    };
    const stoneTower = (k) => {   // kamenná věž na vrcholu skály: hranol, plochý vrch a cimbuří
      const t = k.tower, M = T.merlon;
      add(new THREE.BoxGeometry(t.s, t.h, t.s).translate(0, t.h / 2, 0), COLORS.troskyStone, k.x, k.h, k.z);
      add(new THREE.BoxGeometry(t.s + 1, 0.8, t.s + 1).translate(0, 0.4, 0), COLORS.troskyStone, k.x, k.h + t.h, k.z);
      for (let i = 0; i < 8; i++) {   // zuby cimbuří kolem okraje
        const a = (i / 8) * Math.PI * 2, e = (t.s + 1) / 2 - M.size / 2;
        const dx = Math.max(-e, Math.min(e, Math.cos(a) * e * 1.5)), dz = Math.max(-e, Math.min(e, Math.sin(a) * e * 1.5));
        add(new THREE.BoxGeometry(M.size, M.h, M.size).translate(0, M.h / 2, 0), COLORS.troskyStone, k.x + dx, k.h + t.h + 0.8, k.z + dz);
      }
    };
    [[T.panna, 1], [T.baba, 7]].forEach(([k, seed]) => {
      add(rock(k, seed), COLORS.trosky, k.x, 0, k.z);
      stoneTower(k);
    });
    const p = T.panna, b = T.baba;   // hradba mezi patami skal
    const x0 = p.x + p.r * 1.1, x1 = b.x - b.r * 1.1, len = x1 - x0;
    const w = add(new THREE.BoxGeometry(len, T.wall.h, T.wall.thick).translate(0, T.wall.h / 2, 0), COLORS.troskyStone, (x0 + x1) / 2, 0, (p.z + b.z) / 2);
    w.rotation.y = -Math.atan2(b.z - p.z, x1 - x0);
    g.position.set(c.x, this.meshHeight(c.x, c.z) - 0.2, c.z);
    g.rotation.y = -c.a;
    return g;
  }

  /** Kostel: loď se sedlovou střechou, na konci čtvercová věž s jehlanovou střechou (lokální osa z = osa lodi). */
  buildPart(geo, hex) {
    return new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: hex, flatShading: true }));
  }

  buildChurch(c) {
    const C = TOWNS.church, [nw, nd] = C.nave;
    const g = new THREE.Group();
    const add = (geo, hex, x, y, z) => { const mesh = this.buildPart(geo, hex); mesh.position.set(x, y, z); g.add(mesh); };
    add(new THREE.BoxGeometry(nw, C.naveWall, nd).translate(0, C.naveWall / 2, 0), COLORS.churchWall, 0, 0, 0);
    const prism = new THREE.Shape();
    prism.moveTo(-0.5, 0); prism.lineTo(0.5, 0); prism.lineTo(0, 1); prism.closePath();
    const roof = new THREE.ExtrudeGeometry(prism, { depth: 1, bevelEnabled: false }).translate(0, 0, -0.5).scale(nw + 1, C.naveRoof, nd + 1);
    add(roof, COLORS.churchRoof, 0, C.naveWall, 0);
    const tz = nd / 2 + C.tower / 2;
    add(new THREE.BoxGeometry(C.tower, C.towerHeight, C.tower).translate(0, C.towerHeight / 2, 0), COLORS.churchWall, 0, 0, tz);
    add(new THREE.ConeGeometry(C.tower * 0.75, C.spireHeight, 4).rotateY(Math.PI / 4).translate(0, C.spireHeight / 2, 0), COLORS.churchRoof, 0, C.towerHeight, tz);
    g.position.set(c.x, this.meshHeight(c.x, c.z) - 0.2, c.z);
    g.rotation.y = -c.a;
    return g;
  }

  /** Továrenský komín: štíhlý komolý kužel z cihel. */
  buildChimney(c) {
    const h = TOWNS.chimney.height;
    const mesh = this.buildPart(new THREE.CylinderGeometry(c.r * 0.7, c.r, h, 10).translate(0, h / 2, 0), COLORS.chimney);
    mesh.position.set(c.x, this.meshHeight(c.x, c.z) - 0.2, c.z);
    return mesh;
  }

  buildTrees() {
    const geo = buildTreeGeometry();
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
    const half = WORLD.size / 2 - 40;
    const step = WORLD.treeSpacing;
    const spots = [];
    let seed = 12345;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    for (let gx = -half; gx < half; gx += step) {
      for (let gz = -half; gz < half; gz += step) {
        const x = this.biomes.cx + gx + (rnd() - 0.5) * step * 0.9;
        const z = this.biomes.cz + gz + (rnd() - 0.5) * step * 0.9;
        const s = this.biomes.sample(x, z);
        if (s.type !== BIOME.FOREST) continue;
        spots.push([x, this.meshHeight(x, z) - 0.1, z, 0.8 + rnd() * 0.6, rnd() * Math.PI * 2]);
      }
    }
    for (const t of this.biomes.towns) {   // stromy mezi domky
      for (const tr of t.trees) spots.push([tr.x, this.meshHeight(tr.x, tr.z) - 0.1, tr.z, tr.s, tr.a]);
    }
    const mesh = new THREE.InstancedMesh(geo, mat, spots.length);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const scale = new THREE.Vector3();
    const col = new THREE.Color();
    spots.forEach((p, i) => {
      q.setFromAxisAngle(up, p[4]);
      scale.set(p[3], p[3] * (0.9 + (i % 3) * 0.1), p[3]);
      m.compose(new THREE.Vector3(p[0], p[1], p[2]), q, scale);
      mesh.setMatrixAt(i, m);
      col.setScalar(0.85 + ((i * 37) % 100) / 100 * 0.3);
      mesh.setColorAt(i, col);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    this.trees = mesh;
    this.treeCount = spots.length;
    this.group.add(mesh);
  }
}
