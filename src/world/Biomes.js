// Jediný zdroj pravdy o terénu: výška, sklon a biom (pro vizuál i herní logiku).
// Bez závislosti na Three.js.
import { createNoise2D } from 'simplex-noise';
import { WORLD, MASSIFS, TERRAIN, TOWNS, PONDS, TARGET_CLEARING, DOMINANTS, HRADEK, BEZDEZ, TROSKY } from '../config/GameConfig.js';

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export const BIOME = { WATER: 'water', MEADOW: 'meadow', FIELD: 'field', FOREST: 'forest', ROCK: 'rock', HILL: 'hill', TOWN: 'town' };

/** Catmull-Rom křivka přes body [[x,z],…] jako hustá lomená čára (krok ~step m). */
function splinePath(points, step = 40) {
  const out = [];
  const P = (i) => points[Math.min(points.length - 1, Math.max(0, i))];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    const len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const n = Math.max(2, Math.ceil(len / step));
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

export class Biomes {
  /**
   * @param {number} seed
   * @param {{points:number[][], width:number}|null} river  volitelná řeka (křivka středem koryta, šířka hladiny v m)
   * @param {boolean|object} massifs  skalní masivy: true = výchozí GameConfig.MASSIFS, objekt = přepsání vybraných parametrů
   * @param {{x:number, z:number}} center  střed mapy v souřadnicích se startem v počátku (okraj mapy je ±WORLD.size/2 kolem něj)
   * @param {{terrain?:object, towns?:{x:number, z:number, r:number, angle?:number}[]}} extra
   *        terrain = přepsání GameConfig.TERRAIN (kopečky, les, hranice skály); towns = města (střed v m od startu, poloměr zástavby)
   */
  constructor(seed, river = null, massifs = false, center = { x: 0, z: 0 }, extra = {}) {
    this.cx = center.x;
    this.cz = center.z;
    this.terrainCfg = { ...TERRAIN, ...(extra.terrain || {}) };
    this.seed = seed;
    const rnd = mulberry32(seed);
    this.nBig = createNoise2D(rnd);
    this.nMid = createNoise2D(rnd);
    this.nSmall = createNoise2D(rnd);
    this.nForest = createNoise2D(rnd);
    this.nForest2 = createNoise2D(rnd);
    this.nField = createNoise2D(rnd);
    this.nVar = createNoise2D(rnd);
    this.nRock = createNoise2D(rnd);   // přidáno na konec, aby se šum starších lokalit nezměnil
    this.nHill = createNoise2D(rnd);   // kopečky (také přidáno na konec)
    this.fcx = this.terrainCfg.startCenter?.x ?? 0;   // střed rovné louky (start je v počátku, louka bývá posunutá po větru)
    this.fcz = this.terrainCfg.startCenter?.z ?? 0;
    this.flatR = this.terrainCfg.startFlatRadius ?? WORLD.startFlatRadius;
    this.flatF = this.terrainCfg.startFlatFade ?? WORLD.startFlatFade;
    const sh = this.terrainCfg.startHeight;
    this.startH = sh === 'natural' ? this.noiseHeight(0, 0) : (sh ?? WORLD.startFlatHeight);
    this.massifs = !!massifs;
    this.massifCfg = { ...MASSIFS, ...(typeof massifs === 'object' ? massifs : {}) };
    this.setRiver(river);
    this.ponds = extra.ponds || [];
    this.clearings = [];   // mýtiny v lese kolem cíle (viz findMeadow)
    this.dominants = [];
    this.setTowns(extra.towns || []);
    this.setDominants(extra.dominants || []);
  }

  /** Landmarks kostela (loď + věž) pro kolize: [{ x, z, r, h }]. */
  churchLandmarks(cx, cz, a) {
    const C = TOWNS.church;
    const tz = C.nave[1] / 2 + C.tower / 2;   // věž u konce lodi (lokální osa z)
    return [
      { x: cx, z: cz, r: C.nave[0] / 2 + 2, h: C.naveWall + C.naveRoof },
      { x: cx - Math.sin(a) * tz, z: cz + Math.cos(a) * tz, r: C.tower / 2 + 1, h: C.towerHeight + C.spireHeight },
    ];
  }

  /** Překážky Hrádku (kruhy kolem hmot): [{ x, z, r, h }] ve světových souřadnicích. */
  hradekLandmarks(cx, cz, a) {
    const rot = (lx, lz) => [cx + lx * Math.cos(a) - lz * Math.sin(a), cz + lx * Math.sin(a) + lz * Math.cos(a)];
    const H = HRADEK, base = H.plinth.h;
    const out = [];
    const m = H.main, [mx, mz] = rot(m.x, m.z);
    out.push({ x: mx, z: mz, r: Math.hypot(m.w, m.d) / 2, h: base + m.wall + m.roof });
    for (const t of H.towers) {
      const [x, z] = rot(t.x, t.z);
      out.push({ x, z, r: t.s * 0.75 + 1, h: base + t.h + t.roof });
    }
    const u = H.turret, [ux, uz] = rot(u.x, u.z);
    out.push({ x: ux, z: uz, r: u.s * 0.75 + 1, h: base + u.y + u.h + u.roof });
    return out;
  }

  /** Překážky hradu Bezděz: palác (3 kruhy podél délky), velká věž, hradba (kruhy) a malá věž. */
  bezdezLandmarks(cx, cz, a) {
    const rot = (lx, lz) => [cx + lx * Math.cos(a) - lz * Math.sin(a), cz + lx * Math.sin(a) + lz * Math.cos(a)];
    const B = BEZDEZ, out = [];
    const p = B.palace, hp = p.wall + p.roof, rp = Math.hypot(p.d, p.d) / 2 + 1;
    for (const k of [-1, 0, 1]) { const [x, z] = rot(p.x + k * (p.w / 2 - rp), p.z); out.push({ x, z, r: rp, h: hp }); }
    const t = B.tower, [tx, tz] = rot(t.x, t.z);
    out.push({ x: tx, z: tz, r: t.r + 1, h: t.h + B.merlon.h });
    const w = B.wall;
    for (const k of [-0.33, 0.33]) { const [x, z] = rot(w.x + k * w.len, w.z); out.push({ x, z, r: w.len * 0.3, h: w.h }); }
    const s = B.smallTower, [sx, sz] = rot(s.x, s.z);
    out.push({ x: sx, z: sz, r: s.r + 1, h: s.h + B.merlon.h });
    return out;
  }

  /** Překážky hradu Trosky: každá skála (válec) + kamenná věž na ní, mezi nimi hradba. */
  troskyLandmarks(cx, cz, a) {
    const rot = (lx, lz) => [cx + lx * Math.cos(a) - lz * Math.sin(a), cz + lx * Math.sin(a) + lz * Math.cos(a)];
    const T = TROSKY, out = [];
    for (const k of [T.panna, T.baba]) {
      const [x, z] = rot(k.x, k.z);
      out.push({ x, z, r: k.r * 1.1, h: k.h });                                          // skalní sloup
      out.push({ x, z, r: k.tower.s * 0.75 + 1, h: k.h + k.tower.h + T.merlon.h });      // kamenná věž nahoře
    }
    const p = T.panna, b = T.baba, len = b.x - b.r - (p.x + p.r), mx = (p.x + p.r + b.x - b.r) / 2, mz = (p.z + b.z) / 2;
    for (const f of [-0.3, 0.3]) { const [x, z] = rot(mx + f * len, mz); out.push({ x, z, r: len * 0.3, h: T.wall.h }); }
    return out;
  }

  /** Samostatné dominanty (kostel, Hrádek, Bezděz, Trosky) na kopci: plošina na výšce místa, mýtina v lese a překážky pro kolize. */
  setDominants(list) {
    this.dominants = list.map((c) => ({ type: c.type ?? 'church', x: c.x, z: c.z, a: c.a ?? 0, h: this.heightBeforeTowns(c.x, c.z) }));
    for (const c of this.dominants) {
      const parts = { hradek: this.hradekLandmarks, bezdez: this.bezdezLandmarks, trosky: this.troskyLandmarks }[c.type] ?? this.churchLandmarks;
      c.landmarks = parts.call(this, c.x, c.z, c.a);
      this.clearings.push({ x: c.x, z: c.z, r: DOMINANTS[c.type].clearing });
      c.rockR = DOMINANTS[c.type].rockR;
    }
  }

  /** Výška samostatné dominanty nad terénem v bodě (0 mimo ni). */
  dominantObstacle(x, z) {
    let h = 0;
    for (const c of this.dominants) for (const l of c.landmarks) if (l.h > h && Math.hypot(x - l.x, z - l.z) < l.r) h = l.h;
    return h;
  }

  /** Města: výška vyrovnané plochy se vezme z terénu ve středu (bez vlivu města samotného). */
  setTowns(list) {
    this.towns = list.map((t, i) => ({ ...t, angle: t.angle ?? (i * 0.7 + 0.3), h: 0, buildings: [], trees: [], landmarks: [], chimneys: [] }));
    this.towns.forEach((t, i) => {
      t.h = t.height ?? Math.max(this.heightBeforeTowns(t.x, t.z), WORLD.waterLevel + 4);   // t.height = pevná výška zástavby (např. městečko u jezera níž než okolní planina)
      this.layoutTown(t, mulberry32(this.seed * 31 + i * 977 + 5));
    });
  }

  /**
   * Zástavba města (deterministicky podle seedu): kostel, případně komíny, náhodně rozmístěné a natočené domky různé výšky
   * a stromy. Nic se nesmí překrývat. Landmarks = vysoké stavby (věž kostela, komíny), které se počítají jako překážka.
   */
  layoutTown(t, rnd) {
    const C = TOWNS.church, R = t.r * TOWNS.margin, between = ([a, b]) => a + rnd() * (b - a);
    const placed = [];   // { x, z, rad }: všechny stavby a stromy kvůli překrývání
    const dry = (x, z, rad) => !this.river || this.riverDistance(x, z) > this.river.half + rad + 6;   // stavby ani stromy nestojí v řece
    const free = (x, z, rad) => Math.hypot(x - t.x, z - t.z) + rad <= R && dry(x, z, rad) && placed.every((p) => Math.hypot(p.x - x, p.z - z) >= p.rad + rad + TOWNS.lot);
    const rot = (a, lx, lz) => [lx * Math.cos(a) - lz * Math.sin(a), lx * Math.sin(a) + lz * Math.cos(a)];
    // kostel poblíž středu (ne přesně ve středu)
    const ca0 = rnd() * Math.PI * 2, cAngle = rnd() * Math.PI * 2;
    let cx = 0, cz = 0;
    for (let k = 0; k < 120; k++) {   // kostel mimo koryto řeky: když je u středu řeka, hledá se dál od středu
      const dist = R * C.offset * (1 + k * 0.06), ca = ca0 + k * 0.5;
      cx = t.x + Math.cos(ca) * dist; cz = t.z + Math.sin(ca) * dist;
      if (dist > R * 0.7 || dry(cx, cz, 26)) break;
    }
    t.church = { x: cx, z: cz, a: cAngle };
    placed.push({ x: cx, z: cz, rad: 17 });
    t.landmarks.push(...this.churchLandmarks(cx, cz, cAngle));
    // komíny (Varnsdorf): rozptýlené po městě
    for (let k = 0; k < (t.chimneyCount || 0); k++) {
      for (let tries = 0; tries < 200; tries++) {
        const a = ca0 + Math.PI * (k + 1) / (t.chimneyCount + 1) + (rnd() - 0.5) * 1.2, d = R * (0.35 + rnd() * 0.45);
        const x = t.x + Math.cos(a) * d, z = t.z + Math.sin(a) * d, r = between(TOWNS.chimney.radius);
        if (!free(x, z, r + 3)) continue;
        placed.push({ x, z, rad: r + 3 });
        t.chimneys.push({ x, z, r });
        t.landmarks.push({ x, z, r: r + 1, h: TOWNS.chimney.height });
        break;
      }
    }
    // domky
    const maxHouses = t.houses ?? Math.round(Math.PI * R * R * TOWNS.density);   // t.houses = pevný počet domků (např. hrad)
    for (let tries = 0; tries < maxHouses * 12 && t.buildings.length < maxHouses; tries++) {
      const w = between(TOWNS.houseSize), d = between(TOWNS.houseSize), rad = Math.hypot(w, d) / 2 + 0.6;
      const a = rnd() * Math.PI * 2, dist = Math.sqrt(rnd()) * R;
      const x = t.x + Math.cos(a) * dist, z = t.z + Math.sin(a) * dist;
      if (!free(x, z, rad)) continue;
      const h = TOWNS.wallHeight[0] + Math.pow(rnd(), 1.6) * (TOWNS.wallHeight[1] - TOWNS.wallHeight[0]);
      placed.push({ x, z, rad });
      t.buildings.push({ x, z, w, d, h, a: rnd() * Math.PI, wall: Math.floor(rnd() * 100), roof: Math.floor(rnd() * 100) });
    }
    // stromy v mezerách
    const maxTrees = t.treeCount ?? Math.round(Math.PI * R * R * TOWNS.treeDensity);
    for (let tries = 0; tries < maxTrees * 20 && t.trees.length < maxTrees; tries++) {
      const a = rnd() * Math.PI * 2, dist = Math.sqrt(rnd()) * R;
      const x = t.x + Math.cos(a) * dist, z = t.z + Math.sin(a) * dist;
      if (!free(x, z, 2.5)) continue;
      placed.push({ x, z, rad: 2.5 });
      t.trees.push({ x, z, s: between(TOWNS.treeScale), a: rnd() * Math.PI * 2 });
    }
  }

  /** Výška překážky nad terénem ve městě v bodě: střechy (townRoof), věž kostela a komíny výš. */
  townObstacle(x, z) {
    let h = WORLD.townRoof;
    for (const t of this.towns) {
      if (Math.hypot(x - t.x, z - t.z) > t.r * 1.2) continue;
      for (const l of t.landmarks) if (l.h > h && Math.hypot(x - l.x, z - l.z) < l.r) h = l.h;
    }
    return h;
  }

  /** Nejbližší město: { t, d } nebo null. */
  nearestTown(x, z) {
    let best = null;
    for (const t of this.towns) {
      const d = Math.hypot(x - t.x, z - t.z);
      if (!best || d < best.d) best = { t, d };
    }
    return best;
  }

  /** 0..1: jak moc je bod v zástavbě (1 = uvnitř nepravidelného okraje města). */
  townAt(x, z) {
    for (const t of this.towns) {
      const d = Math.hypot(x - t.x, z - t.z);
      if (d > t.r * (1 + TOWNS.edgeNoise)) continue;
      if (d < t.r * (1 + TOWNS.edgeNoise * this.nVar(x / 190 + t.x, z / 190 - t.z))) return 1;
    }
    return 0;
  }

  /** Vyrovnání terénu pod městem: 1 = zcela rovina, 0 = původní terén. */
  townFlat(t, x, z) {
    return 1 - smooth(t.r * TOWNS.flatFrom, t.r * TOWNS.flatTo, Math.hypot(x - t.x, z - t.z));
  }

  setRiver(river) {
    this.river = null;
    if (!river) return;
    const path = splinePath(river.points);
    const half = river.width / 2;
    const bank = WORLD.riverBank;
    const reach = half + bank;
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const [x, z] of path) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); }
    this.river = { path, half, reach, box: [minX - reach, maxX + reach, minZ - reach, maxZ + reach] };
  }

  /** Vzdálenost od osy řeky (m); Infinity, když řeka není nebo je daleko. */
  riverDistance(x, z) {
    const r = this.river;
    if (!r || x < r.box[0] || x > r.box[1] || z < r.box[2] || z > r.box[3]) return Infinity;
    let best = Infinity;
    const path = r.path;
    for (let i = 0; i < path.length - 1; i++) {
      const ax = path[i][0], az = path[i][1], bx = path[i + 1][0], bz = path[i + 1][1];
      const dx = bx - ax, dz = bz - az;
      const t = Math.min(1, Math.max(0, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
      const d = Math.hypot(x - (ax + dx * t), z - (az + dz * t));
      if (d < best) best = d;
    }
    return best;
  }

  /** Surová výška terénu (m). */
  rawHeight(x, z) {
    let out = this.heightBeforeTowns(x, z);
    // Město: terén se vyrovná na výšku středu města
    for (const t of this.towns) {
      const f = this.townFlat(t, x, z);
      if (f > 0) out += (t.h - out) * f;
    }
    // Samostatná dominanta: rovná plošina pod ní
    for (const c of this.dominants) {
      const pad = DOMINANTS[c.type].padRadius, d = Math.hypot(x - c.x, z - c.z);
      if (d < pad * DOMINANTS.padFade) out += (c.h - out) * (1 - smooth(pad, pad * DOMINANTS.padFade, d));
    }
    return this.carveRiver(out, x, z);   // řeka až po městech, aby mohla protékat městem
  }

  /** Řeka: koryto se vyřízne pod hladinu s pozvolnými břehy; teče až na okraj mapy (za ním pokračuje, viz ProceduralTerrain). */
  carveRiver(out, x, z) {
    if (!this.river) return out;
    const d = this.riverDistance(x, z);
    if (d >= this.river.reach) return out;
    const c = 1 - smooth(this.river.half * WORLD.riverInner, this.river.reach, d);
    return out * (1 - c) + WORLD.riverBed * c;
  }

  /** Základní vlny terénu (velké + střední + malé) bez kopečků, hor a úprav. */
  baseNoise(x, z) {
    const T = this.terrainCfg;
    return T.base + this.nBig(x / 1200, z / 1200) * T.bigAmp + this.nMid(x / 350, z / 350) * T.midAmp + this.nSmall(x / 120, z / 120) * 2;
  }

  /** Výška čistého šumu (bez rovného startu, okraje mapy, masivů, řeky a měst). */
  noiseHeight(x, z) {
    const T = this.terrainCfg;
    let h = T.base
      + this.nBig(x / 1200, z / 1200) * T.bigAmp
      + this.nMid(x / 350, z / 350) * T.midAmp
      + this.nSmall(x / 120, z / 120) * 2;
    if (T.hillAmp > 0) {   // kopečky: kulovitá návrší tam, kde šum překročí práh
      const v = this.nHill(x / T.hillScale + 5, z / T.hillScale - 3) * 0.5 + 0.5;
      h += smooth(T.hillFrom, T.hillTo, v) * T.hillAmp * smooth(T.hillClear, T.hillClear + T.hillFade, Math.hypot(x, z));
    }
    if (T.ridge) h += this.ridgeHeight(x, z);
    for (const p of T.peaks || []) {   // osamělé kopce: plochý vrchol a svahy
      const d = Math.hypot(x - p.x, z - p.z);
      if (d < p.r) {
        if (p.level) h += (this.baseNoise(p.x, p.z) - this.baseNoise(x, z)) * (1 - smooth(p.r * 0.2, p.r * 0.9, d));   // úbočí se vyrovná na výšku podhůří pod vrcholem: kopec je souměrný a vrchol nejvyšší
        h += p.height * (1 - smooth(p.r * 0.25, p.r, d));
      }
    }
    return h;
  }

  /**
   * Horský val (např. Krušné hory na severu): výška roste ze z = `from` (úpatí) do z = `to` (hřeben), dál zůstává nahoře.
   * `scale` = délka vln hřebene podél osy x (m), `rough` = nerovnosti svahů (m). Okraj mapy val sám snižuje (viz edgeFactor).
   */
  ridgeHeight(x, z) {
    const R = this.terrainCfg.ridge;
    const w = smooth(R.from, R.to, z);   // from > to: sever je záporné z
    if (w <= 0) return 0;
    const crest = 0.78 + 0.22 * this.nHill(x / R.scale + 17, 3.7);   // vyšší a nižší úseky hřebene
    return w * (R.height * crest + this.nRock(x / 230 - 6, z / 230 + 9) * R.rough);
  }

  /** Výška terénu bez vyrovnání pod městy a bez řeky (ta se vyřezává až v rawHeight). */
  heightBeforeTowns(x, z) {
    const h = this.noiseHeight(x, z);
    const d = Math.hypot(x - this.fcx, z - this.fcz);
    const f = 1 - smooth(this.flatR, this.flatF, d);
    const base = h + (this.startH - h) * f;
    // Okraj mapy: terén se plynule vyrovná do roviny, která navazuje na okolní podklad
    const e = this.edgeFactor(x, z);
    let out = base + (WORLD.edgeHeight - base) * e;
    // Skalní masiv: zvýšená plošina se strmými svahy (mimo okolí startu, okraj mapy a řeky)
    if (this.massifs) out += this.massifAt(x, z) * (this.massifCfg.height + this.nSmall(x / 70 + 11, z / 70 - 4) * this.massifCfg.topNoise) * (1 - e);
    // Rybníky: okolí se sníží na výšku břehu, uvnitř nepravidelného okraje je dno pod hladinou
    for (const p of this.ponds) {
      const d = this.pondDistance(p, x, z), ft = p.flatTo ?? PONDS.flatTo;
      if (d > p.r * ft * 1.3) continue;
      const ns = p.noiseScale ?? 90;
      const rr = p.r * (1 + (p.edgeNoise ?? PONDS.edgeNoise) * this.nVar(x / ns + p.x, z / ns - p.z));
      const f = 1 - smooth(rr, p.r * ft, d);
      out += (PONDS.shore - out) * f;
      const c = 1 - smooth(rr * PONDS.bedFrom, rr, d);
      out += (PONDS.bed - out) * c;
      if (p.island) {   // ostrov uprostřed vodní plochy
        const di = Math.hypot(x - p.island.x, z - p.island.z);
        if (di < p.island.r) out += (PONDS.islandTop - out) * (1 - smooth(p.island.r * 0.45, p.island.r, di));
      }
    }
    return out;
  }

  /** Vzdálenost od středu rybníka v „kruhových“ jednotkách (u elipsy se osa x zkrátí o `aspect`, takže stačí porovnávat s r). */
  pondDistance(p, x, z) {
    const dx = x - p.x, dz = z - p.z;
    if (!p.aspect) return Math.hypot(dx, dz);
    const a = p.angle || 0, c = Math.cos(a), s = Math.sin(a);
    return Math.hypot((dx * c + dz * s) / p.aspect, -dx * s + dz * c);
  }

  /** Výška skalního masivu v bodě: 0 mimo masiv, 1 uprostřed plošiny (plynulý strmý přechod). */
  massifAt(x, z) {
    if (!this.massifs) return 0;
    const M = this.massifCfg;
    const d = Math.hypot(x, z);
    const f = smooth(M.startClear, M.startClear + M.startFade, d);
    if (f <= 0) return 0;
    if (this.river && this.riverDistance(x, z) < this.river.reach + M.riverClear) return 0;
    const nt = this.nearestTown(x, z);
    if (nt && nt.d < nt.t.r * TOWNS.clearMassif) return 0;
    for (const p of this.terrainCfg.peaks || []) if (Math.hypot(x - p.x, z - p.z) < p.r * 1.15) return 0;   // na osamělém kopci (a těsně pod ním) masivy nejsou: kopec zůstává nejvyšší
    const v = this.nRock(x / M.scale + 40, z / M.scale - 25) * 0.5 + 0.5
      + this.nRock(x / 170 - 8, z / 170 + 13) * M.detail;
    return smooth(M.threshold, M.threshold + M.edge, v) * f;
  }

  /** 0 uprostřed mapy (kolem středu `center`), 1 na okraji (a za ním). */
  edgeFactor(x, z) { return smooth(WORLD.edgeFadeStart, WORLD.edgeFadeEnd, Math.max(Math.abs(x - this.cx), Math.abs(z - this.cz))); }

  /** Výška povrchu, na který lze dosednout (voda = hladina). */
  groundHeight(x, z) { return Math.max(this.rawHeight(x, z), WORLD.waterLevel); }

  /** Sklon ve stupních. */
  slopeDeg(x, z) {
    const e = 8;
    const dx = (this.rawHeight(x + e, z) - this.rawHeight(x - e, z)) / (2 * e);
    const dz = (this.rawHeight(x, z + e) - this.rawHeight(x, z - e)) / (2 * e);
    return Math.atan(Math.hypot(dx, dz)) * 180 / Math.PI;
  }

  forestNoise(x, z) {
    const a = this.nForest(x / 500, z / 500) * 0.5 + 0.5;
    const b = this.nForest2(x / 140, z / 140) * 0.5 + 0.5;
    const d = Math.hypot(x - this.fcx, z - this.fcz);
    const f = 1 - smooth(this.flatR + 30, this.flatF + 60, d);
    let clear = 0;
    for (const c of this.clearings) clear = Math.max(clear, 1 - smooth(c.r, c.r * TARGET_CLEARING.fade, Math.hypot(x - c.x, z - c.z)));
    return a * 0.75 + b * 0.25 + this.terrainCfg.forestBias - f * 1.0 - clear * 1.3 - this.edgeFactor(x, z) * 1.0;
  }

  /** Biom podle výšky a sklonu. */
  terrainType(x, z, height, slope) {
    if (height < WORLD.waterLevel) return BIOME.WATER;
    if (this.towns.length && this.townAt(x, z) > 0) return BIOME.TOWN;
    for (const c of this.dominants) if (c.rockR && Math.hypot(x - c.x, z - c.z) < c.rockR) return BIOME.ROCK;   // holá skála kolem skalních věží
    const T = this.terrainCfg;
    if (slope > WORLD.rockSlopeDeg || height > T.rockLine || (this.massifs && this.massifAt(x, z) > this.massifCfg.rockMin)) return BIOME.ROCK;
    if (height < T.treeLine && this.forestNoise(x, z) >= 0.52 && slope < 26) return BIOME.FOREST;
    if (slope >= WORLD.meadowSlopeDeg) return BIOME.HILL;
    if (this.edgeFactor(x, z) > 0.5) return BIOME.MEADOW;   // u okraje mapy jen louka
    const fn = this.nField(x / 900 + 100, z / 900 - 50);
    const d = Math.hypot(x, z);
    return fn > 0.2 && d > WORLD.startFlatFade ? BIOME.FIELD : BIOME.MEADOW;
  }

  /** Vrací { type, height, ground, surface, slope }. surface = výška včetně koruny stromů. */
  sample(x, z) {
    const height = this.rawHeight(x, z);
    const slope = this.slopeDeg(x, z);
    const type = this.terrainType(x, z, height, slope);
    const ground = Math.max(height, WORLD.waterLevel);
    const surface = type === BIOME.FOREST ? ground + WORLD.forestCanopy : type === BIOME.TOWN ? ground + this.townObstacle(x, z) : ground;
    if (this.dominants.length) {
      const ch = this.dominantObstacle(x, z);
      if (ch > 0) return { type, height, ground, surface: Math.max(surface, ground + ch), slope };
    }
    return { type, height, ground, surface, slope };
  }

  /** Drobná variace jasu (-1..1) pro oživení barev. */
  variation(x, z) { return this.nVar(x / 60, z / 60); }

  /** Index pruhu pole (0..3) pro střídání odstínů. */
  fieldStripe(x, z) {
    return (Math.floor((x + z * 0.35) / 90) + Math.floor((z - x * 0.2) / 160)) & 3;
  }

  /**
   * Najde rovnou louku poblíž zadaného směru a vzdálenosti od startu (0,0). Výsledek se pamatuje.
   * Okolí cíle (celý kruh značky) smí být jen louka nebo les; zbývající les se vyčistí mýtinou (`clearings`),
   * takže značka cíle nikdy neleží mezi stromy. Volat před vytvořením terénu (mýtina mění rozložení lesa).
   * @returns {{x:number, z:number}}
   */
  findMeadow(bearingDeg, dist) {
    const key = `${bearingDeg}:${dist}`;
    if (this.meadowCache?.key === key) return this.meadowCache.value;
    const b = bearingDeg * Math.PI / 180;
    const cx = Math.sin(b) * dist, cz = -Math.cos(b) * dist;
    const R = TARGET_CLEARING;
    const pts = [];
    for (const r of [20, 40, 60, R.check]) for (let a = 0; a < 360; a += 30) pts.push([Math.cos(a * Math.PI / 180) * r, Math.sin(a * Math.PI / 180) * r]);
    // null = nevhodné místo (voda, skála, svah, město…); jinak podíl lesa v kruhu (0 = čistá louka)
    const forestShare = (x, z) => {
      const c = this.sample(x, z);
      if ((c.type !== BIOME.MEADOW && c.type !== BIOME.FOREST) || c.slope >= 7) return null;
      let forest = c.type === BIOME.FOREST ? 1 : 0;
      for (const [dx, dz] of pts) {
        const s = this.sample(x + dx, z + dz);
        if (s.type === BIOME.FOREST) forest++;
        else if ((s.type !== BIOME.MEADOW && s.type !== BIOME.FIELD)) return null;   // okraj značky smí zasahovat do pole
      }
      return forest / (pts.length + 1);
    };
    // Nejdřív hledáme místo ve vzdálenosti blízké požadované (a v blízkém směru): cíl nemá být příliš blízko
    // (balon nestihne nastoupat) ani daleko; les v kruhu cenu zvyšuje (mýtina uprostřed lesa je až nouzové řešení)
    let best = null;
    for (let d = dist * 0.85; d <= dist * 1.3; d += 40) {
      for (let da = -40; da <= 40; da += 4) {
        const br = (bearingDeg + da) * Math.PI / 180;
        const x = Math.sin(br) * d, z = -Math.cos(br) * d;
        if (Math.abs(this.cx - x) > 1900 || Math.abs(this.cz - z) > 1900) continue;
        const f = forestShare(x, z);
        if (f === null) continue;
        const cost = Math.abs(d - dist) / dist + Math.abs(da) / 40 * 0.5 + f * R.forestCost;
        if (!best || cost < best.cost) best = { x, z, f, cost };
      }
    }
    for (let r = 0; !best && r <= 1000; r += 40) {
      const n = r === 0 ? 1 : Math.max(8, Math.round(r / 12));
      for (let i = 0; i < n && !best; i++) {
        const a = (i / n) * Math.PI * 2;
        const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
        if (Math.abs(x) < 2200 && Math.abs(z) < 2200) {
          const f = forestShare(x, z);
          if (f !== null) best = { x, z, f };
        }
      }
    }
    const value = best ? { x: best.x, z: best.z } : { x: cx, z: cz };
    if (best && best.f > 0) this.clearings.push({ ...value, r: R.radius });   // mýtina: značka cíle nebude mezi stromy
    this.meadowCache = { key, value };
    return value;
  }
}
