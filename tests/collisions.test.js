import { describe, it, expect } from 'vitest';
import { probeEnvelope, probeBasket, profileAt, hardnessOf } from '../src/core/Collisions.js';
import { PhysicsEngine } from '../src/core/PhysicsEngine.js';
import { scoreFlight, SCORE } from '../src/core/Scoring.js';
import { BIOME } from '../src/world/Biomes.js';

const flat = () => ({ type: BIOME.MEADOW, ground: 0, surface: 0 });
// zeď (budova) pro x >= 4, výška 15 m
const wall = (x) => (x >= 4 ? { type: BIOME.MEADOW, ground: 0, surface: 15 } : flat());
const cfg = { payloadKg: 230, bottles: 2, ambientC: 12, siteElevation: 220 };

describe('Kolize pláště', () => {
  it('profil pláště: poloměr roste k rovníku', () => {
    expect(profileAt(-1)).toBeNull();
    expect(profileAt(0.01).r).toBeCloseTo(2, 1);
    expect(profileAt(14.8).r).toBeCloseTo(9.7, 1);
    expect(profileAt(30).v).toBe(1);
  });

  it('nad rovným terénem ani koš na zemi plášť nekoliduje', () => {
    expect(probeEnvelope({ x: 0, y: 0, z: 0 }, flat)).toBeNull();
    expect(probeEnvelope({ x: 0, y: 40, z: 0 }, flat)).toBeNull();
  });

  it('zeď u břicha pláště vytlačí balon pryč a trochu nahoru', () => {
    const c = probeEnvelope({ x: 0, y: 5, z: 0 }, wall);
    expect(c).not.toBeNull();
    expect(c.nx).toBeLessThan(-0.5);
    expect(c.ny).toBeGreaterThan(0);
    expect(c.hardness).toBe(1);
  });

  it('daleko od překážky se nic neděje', () => {
    expect(probeEnvelope({ x: -30, y: 5, z: 0 }, wall)).toBeNull();
  });

  it('hardnessOf rozlišuje budovu, les, skálu a louku', () => {
    expect(hardnessOf({ type: BIOME.ROCK, ground: 0, surface: 0 })).toBeGreaterThan(1);
    expect(hardnessOf({ type: BIOME.FOREST, ground: 0, surface: 20 })).toBeLessThan(1);
    expect(hardnessOf({ type: BIOME.TOWN, ground: 0, surface: 8 })).toBe(1);
    expect(hardnessOf({ type: BIOME.MEADOW, ground: 0, surface: 0 })).toBeLessThan(0.5);
  });
});

describe('PhysicsEngine.applyContact', () => {
  const setup = (vx) => {
    const p = new PhysicsEngine(cfg);
    p.pos.y = 5; p.onGround = false; p.vel.x = vx;
    p.flightTime = 10;
    return p;
  };

  it('zastaví pohyb do překážky, vytlačí balon a protrhne plášť', () => {
    const p = setup(3);
    const x0 = p.pos.x;
    const r = p.applyContact(probeEnvelope(p.pos, wall), 0.05);
    expect(r.impact).toBeGreaterThan(1);
    expect(p.vel.x).toBeLessThan(1.5);   // zbytek klouže po břichu pláště
    expect(p.vel.y).toBeGreaterThan(0);
    expect(p.pos.x).toBeLessThan(x0);
    expect(r.tear).toBe(true);
    expect(p.holes[0].kind).toBe('tear');
    expect(p.leak).toBeGreaterThan(0);
  });

  it('druhá trhlina vznikne až po prodlevě', () => {
    const p = setup(3);
    const hit = () => { p.pos.x = 0; p.pos.y = 5; p.vel.x = 3; p.vel.y = 0; return p.applyContact(probeEnvelope(p.pos, wall), 0.05); };
    hit();
    expect(hit().tear).toBe(false);
    p.flightTime += 2;
    const r3 = hit();
    expect(r3.tear).toBe(true);
  });

  it('jemný dotyk plášť nerozseká', () => {
    const p = setup(0.5);
    const r = p.applyContact(probeEnvelope(p.pos, wall), 0.05);
    expect(r.tear).toBe(false);
    expect(r.crash).toBe(false);
  });

  it('rychlý náraz do budovy je havárie', () => {
    const p = setup(12);
    const r = p.applyContact(probeEnvelope(p.pos, wall), 0.05);
    expect(r.crash).toBe(true);
  });
});

describe('Skóre a poškození', () => {
  it('každá trhlina nebo popálenina snižuje skóre, do stropu', () => {
    const base = { kind: 'soft', field: false, gasFrac: 0.5, targetDist: 100 };
    const a = scoreFlight(base).score;
    expect(scoreFlight({ ...base, damage: 2 }).score).toBe(a - 2 * SCORE.damagePenalty);
    expect(scoreFlight({ ...base, damage: 50 }).score).toBe(a - SCORE.damageMax);
  });
});

describe('Boční kontakt koše', () => {
  const house = (x) => (x >= 10 ? { type: BIOME.TOWN, ground: 0, surface: 8 } : flat());
  const trees = (x) => (x >= 10 ? { type: BIOME.FOREST, ground: 0, surface: 9 } : flat());
  const slope = () => ({ type: BIOME.HILL, ground: 5, surface: 5 });
  const hover = (vx) => {
    const p = new PhysicsEngine(cfg);
    p.pos.y = 2; p.onGround = false; p.vel.x = vx; p.tempIn = p.hoverTemp(2); p.flightTime = 5;
    return p;
  };

  it('na rovině ani u svahu bez překážek není kontakt', () => {
    expect(probeBasket({ x: 0, y: 2, z: 0 }, 0, flat)).toBeNull();
    expect(probeBasket({ x: 0, y: 2, z: 0 }, 0, slope)).toBeNull();   // sklon louky řeší model země
  });

  it('zeď vedle koše odtlačí koš od sebe, vodorovně', () => {
    const c = probeBasket({ x: 9.2, y: 2, z: 0 }, 0, house);
    expect(c).not.toBeNull();
    expect(c.nx).toBeLessThan(-0.5);
    expect(c.kind).toBe('building');
  });

  it('překážka pod úrovní spodku koše se ignoruje', () => {
    expect(probeBasket({ x: 9.2, y: 20, z: 0 }, 0, house)).toBeNull();
  });

  it('vítr tlačící koš do domu ho nevyhodí na střechu: koš zůstane před zdí', () => {
    const p = hover(4);
    for (let i = 1; i <= 60 * 20; i++) {
      p.tempIn = p.hoverTemp(p.pos.y) + 0.3;   // drží se ve vzduchu, aby nesklouzl na zem
      p.step(1 / 60, {}, { x: 4, z: 0 }, 0);
      if (i % 3 === 0) {
        const c = probeBasket(p.pos, p.heading, house);
        if (c) p.applyBasketContact(c, 3 / 60);
      }
    }
    expect(p.pos.x).toBeLessThan(10);
    expect(p.pos.y).toBeLessThan(8);
    expect(p.onGround).toBe(false);
  });

  it('les je tolerantní: pomalý koš jen zbrzdí, rychlý se zachytí v korunách', () => {
    const slow = hover(3);
    slow.pos.x = 9.2;
    const r1 = slow.applyBasketContact(probeBasket(slow.pos, 0, trees), 0.05);
    expect(r1.snag).toBe(false);
    expect(r1.crash).toBe(false);
    expect(slow.vel.x).toBeLessThan(0.5);
    const fast = hover(7);
    fast.pos.x = 9.2;
    expect(fast.applyBasketContact(probeBasket(fast.pos, 0, trees), 0.05).snag).toBe(true);
  });

  it('rychlý náraz do domu je havárie, pomalý jen odraz', () => {
    const soft = hover(2); soft.pos.x = 9.2;
    expect(soft.applyBasketContact(probeBasket(soft.pos, 0, house), 0.05).crash).toBe(false);
    const hard = hover(7); hard.pos.x = 9.2;
    expect(hard.applyBasketContact(probeBasket(hard.pos, 0, house), 0.05).crash).toBe(true);
  });
});
