import { describe, it, expect } from 'vitest';
import { classifyTouchdown, dragDistance, KIND } from '../src/phases/LandingResolver.js';
import { scoreFlight } from '../src/core/Scoring.js';
import { FlightPlan, estimateFlight } from '../src/core/FlightPlan.js';
import { Biomes, BIOME } from '../src/world/Biomes.js';
import { SITES, getSite, createBiomes } from '../src/world/Sites.js';
import { WORLD, HRADEK } from '../src/config/GameConfig.js';
import { titleFor } from '../src/core/Titles.js';
import { readFileSync } from 'node:fs';

const meadow = { type: BIOME.MEADOW, slope: 2 };

describe('LandingResolver', () => {
  it('měkké přistání na louce', () => {
    expect(classifyTouchdown({ vy: 0.8, vxz: 1.5 }, meadow)).toMatchObject({ kind: KIND.SOFT, success: true });
  });
  it('tvrdší přistání při vyšší rychlosti', () => {
    expect(classifyTouchdown({ vy: 1.8, vxz: 1 }, meadow).kind).toBe(KIND.HARD);
    expect(classifyTouchdown({ vy: 0.5, vxz: 4 }, meadow).kind).toBe(KIND.HARD);
  });
  it('havárie při velké rychlosti', () => {
    const r = classifyTouchdown({ vy: 3, vxz: 1 }, meadow);
    expect(r.kind).toBe(KIND.CRASH);
    expect(r.success).toBe(false);
  });
  it('voda, les a skály jsou neúspěch bez ohledu na rychlost', () => {
    for (const [type, kind] of [[BIOME.WATER, KIND.WATER], [BIOME.FOREST, KIND.FOREST], [BIOME.ROCK, KIND.ROCK], [BIOME.TOWN, KIND.TOWN]]) {
      const r = classifyTouchdown({ vy: 0.1, vxz: 0.1 }, { type, slope: 0 });
      expect(r).toMatchObject({ kind, success: false });
    }
  });
  it('pole je úspěch s penalizací', () => {
    expect(classifyTouchdown({ vy: 0.5, vxz: 1 }, { type: BIOME.FIELD, slope: 1 }).field).toBe(true);
  });
  it('délka tažení roste s rychlostí', () => {
    expect(dragDistance(6)).toBeGreaterThan(dragDistance(3));
  });
});

describe('Scoring', () => {
  it('plné skóre za měkké přistání u cíle s plnou nádrží', () => {
    const r = scoreFlight({ kind: KIND.SOFT, field: false, gasFrac: 1, targetDist: 10 });
    expect(r.score).toBe(1000);
    expect(r.tier).toBe(3);
  });
  it('havárie = nula', () => {
    expect(scoreFlight({ kind: KIND.CRASH, field: false, gasFrac: 1, targetDist: 0 }).score).toBe(0);
  });
  it('pole snižuje skóre', () => {
    const a = scoreFlight({ kind: KIND.SOFT, field: false, gasFrac: 0.5, targetDist: 800 });
    const b = scoreFlight({ kind: KIND.SOFT, field: true, gasFrac: 0.5, targetDist: 800 });
    expect(b.score).toBeLessThan(a.score);
  });
});

describe('FlightPlan', () => {
  it('omezuje počet osob a lahví', () => {
    const p = new FlightPlan({ passengers: 3, bottles: 2 });
    p.setPassengers(99); p.setBottles(0);
    expect(p.passengers).toBe(5);
    expect(p.bottles).toBe(1);
  });
  it('plný koš s podvečerním teplem nevzlétne, lehký ano', () => {
    const heavy = new FlightPlan({ passengers: 5, bottles: 4, timeOfDay: 'evening' });
    heavy.masses = [90, 90, 90, 90, 90];
    expect(estimateFlight(heavy).canFly).toBe(false);
    const light = new FlightPlan({ passengers: 1, bottles: 1, timeOfDay: 'morning' });
    expect(estimateFlight(light).canFly).toBe(true);
  });
});

describe('Biomes', () => {
  it('je deterministický a start je louka', () => {
    const a = new Biomes(1337), b = new Biomes(1337);
    expect(a.sample(300, -200)).toEqual(b.sample(300, -200));
    expect(a.sample(0, 0).type).toBe(BIOME.MEADOW);
  });
  it('findMeadow vrací rovnou louku', () => {
    const w = new Biomes(2024);
    const m = w.findMeadow(320, 1700);
    expect(w.sample(m.x, m.z).type).toBe(BIOME.MEADOW);
  });

  it('krátký hop hned po vzletu nedává skoro plné body', () => {
    const hop = scoreFlight({ kind: KIND.SOFT, field: false, gasFrac: 1, targetDist: 1900, flightTime: 8, maxAlt: 5 });
    const real = scoreFlight({ kind: KIND.SOFT, field: false, gasFrac: 0.6, targetDist: 40, flightTime: 400, maxAlt: 200 });
    expect(hop.score).toBeLessThan(200);
    expect(real.score).toBeGreaterThan(hop.score + 500);
  });

  it('řeka protéká napříč mapou a je to voda, daleko od ní se terén nemění', () => {
    const river = { width: 70, points: [[600, -2000], [650, 0], [600, 2000]] };
    const a = new Biomes(1337, river), b = new Biomes(1337);
    expect(a.sample(650, 0).type).toBe(BIOME.WATER);
    expect(a.sample(620, -1000).type).toBe(BIOME.WATER);
    expect(a.rawHeight(-1200, 400)).toBeCloseTo(b.rawHeight(-1200, 400), 6);   // daleko od řeky beze změny
    expect(a.rawHeight(0, 0)).toBeCloseTo(b.rawHeight(0, 0), 6);               // start se nemění
  });

  it('skalní masivy: jsou zvýšené skály, start zůstává volný, lokalita bez nich je beze skal', () => {
    const raj = new Biomes(4711, null, true), plain = new Biomes(4711);
    let rock = 0, rockPlain = 0;
    for (let x = -2300; x < 2300; x += 100) for (let z = -2300; z < 2300; z += 100) {
      if (raj.sample(x, z).type === BIOME.ROCK) rock++;
      if (plain.sample(x, z).type === BIOME.ROCK) rockPlain++;
    }
    expect(rock).toBeGreaterThan(rockPlain + 50);
    expect(raj.massifAt(0, 0)).toBe(0);
    expect(plain.massifAt(900, 900)).toBe(0);
    const small = new Biomes(2024, null, { threshold: 0.83, height: 40 });
    expect(small.massifAt(0, 0)).toBe(0);
  });
});

describe('Města a kopečky', () => {
  it('město: zástavba je rovná, střechy jsou překážka, a mimo město nic nezměnilo', () => {
    const town = { x: 800, z: 300, r: 200 };
    const withTown = new Biomes(4711, null, false, { x: 0, z: 0 }, { towns: [town] }), plain = new Biomes(4711);
    const c = withTown.sample(town.x, town.z);
    expect(c.type).toBe(BIOME.TOWN);
    expect(c.surface).toBeCloseTo(c.ground + WORLD.townRoof, 6);
    expect(c.slope).toBeLessThan(3);
    expect(withTown.rawHeight(-1500, -900)).toBeCloseTo(plain.rawHeight(-1500, -900), 6);
    expect(plain.sample(town.x, town.z).type).not.toBe(BIOME.TOWN);
  });

  it('město: kostel, stromy, domky různé výšky bez překrývání; komíny jen kde jsou zadané a jsou překážkou', () => {
    const b = new Biomes(4711, null, false, { x: 0, z: 0 }, { towns: [{ x: 800, z: 300, r: 220, chimneyCount: 2 }, { x: -900, z: -600, r: 180 }] });
    const [a, c] = b.towns;
    expect(a.buildings.length).toBeGreaterThan(40);
    expect(a.trees.length).toBeGreaterThan(5);
    expect(a.chimneys).toHaveLength(2);
    expect(c.chimneys).toHaveLength(0);
    expect(new Set(a.buildings.map((h) => Math.round(h.h))).size).toBeGreaterThan(2);   // různé výšky
    expect(Math.max(...a.buildings.map((h) => h.h)) + 2).toBeLessThanOrEqual(WORLD.townRoof);
    for (const t of b.towns) {
      const k = t.church;
      expect(Math.hypot(k.x - t.x, k.z - t.z)).toBeLessThan(t.r);
      for (const h of t.buildings) expect(Math.hypot(h.x - k.x, h.z - k.z)).toBeGreaterThan(14);   // dům nestojí v kostele
    }
    const ch = a.chimneys[0];
    expect(b.sample(ch.x, ch.z).surface - b.sample(ch.x, ch.z).ground).toBeGreaterThan(40);
  });

  it('Lužické hory: start je na rovné louce posunuté po větru (start na jejím kraji), v přirozené výšce a bez kopečků', () => {
    const b = createBiomes(getSite('luzicke'));
    const wind = getSite('luzicke').wind[0].bearing * Math.PI / 180;
    expect(b.fcx).toBeCloseTo(Math.sin(wind) * 55, 6);   // střed louky leží po větru od startu
    expect(b.fcz).toBeCloseTo(-Math.cos(wind) * 55, 6);
    let maxSlope = 0, minH = Infinity, maxH = -Infinity;
    for (let x = -100; x <= 100; x += 10) for (let z = -100; z <= 100; z += 10) {
      const px = b.fcx + x, pz = b.fcz + z;
      if (Math.hypot(x, z) > 75 || Math.hypot(px, pz) > 100) continue;   // plocha pro vybavení a balon (po větru až ~100 m, proti větru ~25 m)
      const s = b.sample(px, pz);
      maxSlope = Math.max(maxSlope, s.slope); minH = Math.min(minH, s.height); maxH = Math.max(maxH, s.height);
    }
    expect(maxH - minH).toBeLessThan(2);
    expect(maxSlope).toBeLessThan(3);
    expect(b.groundHeight(0, 0)).toBeCloseTo(b.noiseHeight(0, 0), 6);
  });

  it('Lužické hory: Varnsdorf leží v údolí (okolí je vyšší) a ne přímo u startu', () => {
    const site = getSite('luzicke'), b = createBiomes(site), t = b.towns[0];
    let around = 0, n = 0;
    for (let a = 0; a < 360; a += 30) { around += b.rawHeight(t.x + Math.cos(a * Math.PI / 180) * 600, t.z + Math.sin(a * Math.PI / 180) * 600); n++; }
    expect(around / n).toBeGreaterThan(t.h + 20);
    expect(Math.hypot(t.x, t.z) - t.r).toBeGreaterThan(400);   // okraj města je daleko od startu
    expect(Math.hypot(t.x, t.z) - t.r).toBeLessThan(900);      // ale ještě v jeho blízkosti
  });

  it('rybníky: střed je voda, břeh je louka/les, start a cíl nejsou ve vodě, lokalita bez rybníků je beze změny', () => {
    const site = getSite('luzicke'), b = createBiomes(site);
    for (const p of site.ponds) {
      const s = b.sample(p.x, p.z);
      expect(s.type, `${p.x},${p.z}`).toBe(BIOME.WATER);
      expect(s.ground).toBeCloseTo(WORLD.waterLevel, 6);
    }
    expect(b.sample(0, 0).type).not.toBe(BIOME.WATER);
    const plain = new Biomes(4711), withPond = new Biomes(4711, null, false, { x: 0, z: 0 }, { ponds: [{ x: 900, z: 900, r: 80 }] });
    expect(withPond.sample(900, 900).type).toBe(BIOME.WATER);
    expect(withPond.rawHeight(-1500, 100)).toBeCloseTo(plain.rawHeight(-1500, 100), 6);
  });

  it('Polabí – Děčínsko: hory na severu, start na louce, Labe protéká městem, cíl za Labem, severák vane na jih', () => {
    const site = getSite('polabi'), b = createBiomes(site), t = b.towns[0], m = b.findMeadow(site.target.bearing, site.target.dist);
    expect(b.sample(0, 0).type).toBe(BIOME.MEADOW);
    expect(b.rawHeight(0, -1100)).toBeGreaterThan(b.rawHeight(0, 0) + 100);     // hřeben na severu
    expect(b.rawHeight(0, 1500)).toBeLessThan(b.rawHeight(0, 0));              // jih je rovina
    expect(b.riverDistance(0, 0)).toBeGreaterThan(300);                         // Labe je jižně od startu
    expect(b.riverDistance(t.x, t.z)).toBeLessThan(t.r * 0.3);                  // protéká městem
    expect(b.sample(t.x, b.river.path.reduce((a, p) => Math.abs(p[0] - t.x) < Math.abs(a[0] - t.x) ? p : a)[1]).type).toBe(BIOME.WATER);
    const north = t.buildings.filter((h) => h.z < t.z - 100).length, south = t.buildings.filter((h) => h.z > t.z + 100).length;
    expect(Math.min(north, south)).toBeGreaterThan(20);                         // domy na obou březích
    expect(t.buildings.every((h) => b.riverDistance(h.x, h.z) > b.river.half)).toBe(true);   // žádný dům v řece
    expect(b.riverDistance(t.church.x, t.church.z)).toBeGreaterThan(b.river.half + 20);   // kostel nestojí v řece
    expect(m.z).toBeGreaterThan(Math.max(...b.river.path.map((p) => p[1])) + 300);   // cíl leží za řekou
    for (const w of site.wind.filter((l) => l.alt <= 300)) expect(Math.cos(w.bearing * Math.PI / 180)).toBeLessThan(-0.8);   // spodní vrstvy na jih
    expect(site.wind.some((w) => w.alt > 300 && Math.sin(w.bearing * Math.PI / 180) > 0.5)).toBe(true);   // střih větru: vrstva s návratem k východu
  });

  it('Máchův kraj: velké jezero s ostrovem, Doksy u jezera, kopec s hradem, cíl na louce', () => {
    const site = getSite('mach'), b = createBiomes(site), lake = site.ponds[0], [doksy] = b.towns, castle = b.dominants[0];
    expect(b.sample(lake.x - 250, lake.z).type).toBe(BIOME.WATER);
    expect(b.sample(lake.x + lake.r * lake.aspect * 0.5, lake.z).type).toBe(BIOME.WATER);   // jezero je velké
    expect(b.sample(lake.island.x, lake.island.z).type).not.toBe(BIOME.WATER);              // ostrůvek uprostřed
    expect(b.sample(0, 0).type).toBe(BIOME.MEADOW);
    expect(b.towns).toHaveLength(1);                                                        // jen Doksy; Bezděz je dominanta
    expect(Math.hypot(doksy.x - lake.x, doksy.z - lake.z)).toBeLessThan(1000);              // Doksy leží u jezera
    expect(castle.type).toBe('bezdez');
    expect(castle.h).toBeGreaterThan(b.rawHeight(castle.x + 600, castle.z + 600) + 60);     // hrad na kopci
    for (let a = 0; a < 360; a += 45) for (const r of [0, 25, 50]) {                        // rovná plošina bez lesa
      const q = b.sample(castle.x + Math.cos(a * Math.PI / 180) * r, castle.z + Math.sin(a * Math.PI / 180) * r);
      expect(Math.abs(q.height - castle.h)).toBeLessThan(1);
      expect(q.type).not.toBe(BIOME.FOREST);
    }
    const tower = castle.landmarks.reduce((m, l) => (l.h > m.h ? l : m));                   // vysoká kruhová věž
    expect(b.sample(tower.x, tower.z).surface - b.sample(tower.x, tower.z).ground).toBeGreaterThan(36);
  });

  it('Lužické hory: Hrádek na kopci severně od Varnsdorfu, rovná plošina, věže jsou překážka, bez lesa kolem', () => {
    const site = getSite('luzicke'), b = createBiomes(site), c = b.dominants[0], v = b.towns[0];
    expect(c.type).toBe('hradek');
    expect(c.z).toBeLessThan(v.z);                                  // severně (menší z) od Varnsdorfu
    expect(Math.hypot(c.x - v.x, c.z - v.z)).toBeLessThan(600);     // hned vedle
    expect(c.h).toBeGreaterThan(v.h + 40);                          // stojí na kopci
    for (let a = 0; a < 360; a += 45) for (const r of [0, 12, 24]) {
      const s = b.sample(c.x + Math.cos(a * Math.PI / 180) * r, c.z + Math.sin(a * Math.PI / 180) * r);
      expect(Math.abs(s.height - c.h)).toBeLessThan(1);
      expect(s.type).not.toBe(BIOME.FOREST);
    }
    const tallest = c.landmarks.reduce((a, l) => (l.h > a.h ? l : a));   // velká věž s vížkou
    expect(b.sample(tallest.x, tallest.z).surface - b.sample(tallest.x, tallest.z).ground).toBeGreaterThan(35);
    expect(c.landmarks.length).toBe(1 + HRADEK.towers.length + 1);       // hlavní kvádr, tři věže, vížka
    expect(HRADEK.towers).toHaveLength(3);
    expect(new Biomes(8123).dominants).toHaveLength(0);
  });

  it('kopečky zvyšují terén, výchozí terén zůstává stejný', () => {
    const hilly = new Biomes(8123, null, false, { x: 0, z: 0 }, { terrain: { hillAmp: 60 } }), plain = new Biomes(8123);
    let higher = 0, same = 0;
    for (let x = -2000; x <= 2000; x += 200) for (let z = -2000; z <= 2000; z += 200) {
      const d = hilly.rawHeight(x, z) - plain.rawHeight(x, z);
      if (d > 5) higher++;
      if (Math.abs(d) < 1e-9) same++;
    }
    expect(higher).toBeGreaterThan(10);
    expect(same).toBeGreaterThan(10);
  });

  it('lokality: každá má cíl na louce, města jsou v Lužických horách (víc), Českém ráji (jedno), na Děčínsku a v Máchově kraji', () => {
    for (const site of SITES) {
      const b = createBiomes(site);
      const m = b.findMeadow(site.target.bearing, site.target.dist);
      expect(b.sample(m.x, m.z).type, site.id).toBe(BIOME.MEADOW);
    }
    expect(getSite('luzicke').towns.length).toBeGreaterThan(getSite('raj').towns.length);
    expect(getSite('raj').towns).toHaveLength(1);
    expect(getSite('polabi').towns).toHaveLength(1);   // Děčín pod horami
    expect(getSite('raj').massifs.height).toBeLessThan(55);
    expect(SITES.some((s) => s.id === 'podhuri')).toBe(false);
  });
});

describe('Tituly na diplomu (public/titles.json)', () => {
  const data = JSON.parse(readFileSync(new URL('../public/titles.json', import.meta.url), 'utf-8'));

  it('titul podle lokality, oslovení, jazyka a skóre; neznámá lokalita dostane výchozí', () => {
    expect(titleFor(data, 'luzicke', 'm', 2, 'cs')).toBe('Baron Lužických hor');
    expect(titleFor(data, 'raj', 'm', 3, 'cs')).toBe('Kníže Českého ráje');
    expect(titleFor(data, 'luzicke', 'f', 2, 'cs')).toBe('Baronka Lužických hor');
    expect(titleFor(data, 'luzicke', 'm', 2, 'en')).toBe('Baron of the Lusatian Mountains');
    expect(titleFor(data, 'nova-lokalita', 'm', 0, 'cs')).toBe(data.default.m.cs[0]);
    expect(titleFor({}, 'luzicke', 'm', 0, 'cs')).toBeNull();   // bez souboru použije hra vestavěný titul
    expect(titleFor(data, 'luzicke', 'm', 9, 'cs')).toBeNull();
  });

  it('každá lokalita má 4 tituly pro všechna oslovení a jazyky', () => {
    for (const id of SITES.map((s) => s.id)) {
      for (const h of ['m', 'f']) for (const l of ['cs', 'en']) {
        expect(data.sites[id][h][l], `${id}.${h}.${l}`).toHaveLength(4);
      }
    }
  });
});

describe('Cíl', () => {
  it('značka cíle (poloměr 60 m) neleží mezi stromy v žádné lokalitě', () => {
    for (const site of SITES) {
      const b = createBiomes(site), t = b.findMeadow(site.target.bearing, site.target.dist);
      for (const r of [0, 20, 40, 60]) for (let a = 0; a < 360; a += 30) {
        const s = b.sample(t.x + Math.cos(a * Math.PI / 180) * r, t.z + Math.sin(a * Math.PI / 180) * r);
        expect(s.type, `${site.id} r=${r}`).not.toBe(BIOME.FOREST);
      }
    }
  });
});
