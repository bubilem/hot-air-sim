import { describe, it, expect } from 'vitest';
import { PhysicsEngine } from '../src/core/PhysicsEngine.js';
import { WindModel } from '../src/core/WindModel.js';

const cfg = { payloadKg: 230, bottles: 2, ambientC: 12, siteElevation: 220 };
const calm = { x: 0, z: 0 };

describe('PhysicsEngine', () => {
  it('stojí na zemi, dokud je studený', () => {
    const p = new PhysicsEngine(cfg);
    for (let i = 0; i < 600; i++) p.step(1 / 60, {}, calm, 0);
    expect(p.pos.y).toBe(0);
  });

  it('hoverTemp dává nulový vztlak', () => {
    const p = new PhysicsEngine(cfg);
    p.tempIn = p.hoverTemp(0);
    expect(Math.abs(p.netLiftKg(0))).toBeLessThan(0.5);
    expect(p.tempIn).toBeGreaterThan(55);
    expect(p.tempIn).toBeLessThan(100);
  });

  it('po zážehu stoupá a po ventilu klesá', () => {
    const p = new PhysicsEngine(cfg);
    p.tempIn = p.hoverTemp(0) - 2;
    for (let i = 0; i < 60 * 12; i++) p.step(1 / 60, { burn: 1 }, calm, 0);
    for (let i = 0; i < 60 * 20; i++) p.step(1 / 60, {}, calm, 0);
    expect(p.pos.y).toBeGreaterThan(20);
    const top = p.pos.y;
    for (let i = 0; i < 60 * 15; i++) p.step(1 / 60, { vent: 1 }, calm, 0);
    for (let i = 0; i < 60 * 20; i++) p.step(1 / 60, {}, calm, 0);
    expect(p.pos.y).toBeLessThan(top);
  });

  it('spotřebovává plyn a bez plynu nehoří', () => {
    const p = new PhysicsEngine({ ...cfg, bottles: 1 });
    p.tempIn = 60;
    for (let i = 0; i < 60 * 400; i++) p.step(1 / 60, { burn: 1 }, calm, 0);
    expect(p.gas).toBe(0);
  });
});

describe('Paraventil a přehřátí', () => {
  const hot = () => { const p = new PhysicsEngine(cfg); p.tempIn = 90; return p; };
  const run = (p, input, sec) => { for (let i = 0; i < 60 * sec; i++) p.step(1 / 60, input, calm, 0); };

  it('dlouho držený paraventil chladí čím dál víc', () => {
    const a = hot(); run(a, { vent: 1 }, 4);
    const drop1 = 90 - a.tempIn;
    const t1 = a.tempIn; run(a, { vent: 1 }, 4);
    const drop2 = t1 - a.tempIn;
    expect(a.ventMul).toBeGreaterThan(1.5);
    // druhé čtyři vteřiny jsou při stejné teplotě rychlejší než první (klapka je víc otevřená)
    const b = hot(); b.tempIn = t1; run(b, { vent: 1 }, 4);
    expect(drop2).toBeGreaterThan(t1 - b.tempIn - 0.01);
    expect(drop1).toBeGreaterThan(0);
  });

  it('klapka se po uvolnění rychle zavře, krátké stisky se nezesilují', () => {
    const p = hot(); run(p, { vent: 1 }, 10);
    run(p, {}, 3);
    expect(p.ventMul).toBeCloseTo(1, 1);
  });

  it('extrémně dlouhé odvětrání propadne vrchlík a sníží objem', () => {
    const p = hot();
    run(p, { vent: 1 }, 15);
    expect(p.collapse).toBe(0);
    run(p, { vent: 1 }, 60);
    expect(p.collapse).toBeGreaterThan(0.9);
    expect(p.volume).toBeLessThan(3000 * 0.6);
    run(p, {}, 200);
    expect(p.collapse).toBeLessThan(0.1);   // po uvolnění se vzpřímí
  });

  it('přehřátí vypálí trvalé díry, které zvyšují ochlazování', () => {
    const p = new PhysicsEngine(cfg);
    p.tempIn = 120;
    run(p, { burn: 1 }, 40);
    expect(p.tempIn).toBeGreaterThan(122);   // balon při tom stoupá a okolní vzduch chladne
    expect(p.holes.length).toBeGreaterThan(0);
    const leak = p.leak;
    expect(leak).toBeGreaterThan(0);
    run(p, {}, 600);
    expect(p.leak).toBe(leak);   // nevratné
  });

  it('dlouho nad fireTemp plášť vzplane a balon ztratí vztlak', () => {
    const p = new PhysicsEngine({ ...cfg, bottles: 4 });
    p.tempIn = 140;
    run(p, { burn: 1 }, 25);
    expect(p.fire).toBeGreaterThan(0);
    run(p, {}, 30);
    expect(p.fire).toBe(1);
    expect(p.netLiftKg()).toBeLessThan(0);
  });

  it('bez přehřátí žádné díry', () => {
    const p = new PhysicsEngine(cfg);
    p.tempIn = p.hoverTemp(0);
    run(p, { burn: 0.3 }, 60);
    expect(p.holes.length).toBe(0);
    expect(p.fire).toBe(0);
  });
});

describe('Výška a teplota', () => {
  const run = (p, input, sec) => { for (let i = 0; i < 60 * sec; i++) p.step(1 / 60, input, calm, 0); };

  it('okolní teplota klesá s výškou o 6,5 K/km vůči startu', () => {
    const p = new PhysicsEngine(cfg);
    p.refY = 50;
    expect(p.ambientAt(50)).toBeCloseTo(12, 5);
    expect(p.ambientAt(1050)).toBeCloseTo(12 - 6.5, 5);
    expect(p.altMsl(1050)).toBe(220 + 1000);
  });

  it('hoverTemp dává nulový vztlak i ve výšce', () => {
    const p = new PhysicsEngine(cfg);
    for (const y of [0, 800, 2500]) {
      p.tempIn = p.hoverTemp(y);
      expect(Math.abs(p.netLiftKg(y))).toBeLessThan(0.5);
    }
  });

  it('chladný vzduch nahoře zrychluje chladnutí pláště', () => {
    const lo = new PhysicsEngine(cfg), hi = new PhysicsEngine(cfg);
    lo.tempIn = hi.tempIn = 70;
    hi.pos.y = 2000; hi.onGround = false;
    run(lo, {}, 1); run(hi, {}, 1);
    expect(70 - hi.tempIn).toBeGreaterThan(70 - lo.tempIn);
  });

  it('nad 3 000 m pilot po čase omdlí a ovládání ignoruje; po poklesu se probere', () => {
    const p = new PhysicsEngine(cfg);
    p.pos.y = 4000; p.onGround = false; p.tempIn = p.hoverTemp(4000);
    run(p, {}, 5);
    expect(p.hypoxia).toBeGreaterThan(0);
    expect(p.unconscious).toBe(false);
    run(p, {}, 60);
    expect(p.unconscious).toBe(true);
    const gas = p.gas;
    run(p, { burn: 1 }, 5);
    expect(p.gas).toBe(gas);   // bez vědomí nehoří
    p.pos.y = 500; p.vel.y = 0;
    run(p, {}, 60);
    expect(p.unconscious).toBe(false);
  });

  it('těžký balon má strop: ve své výšce visí jen blízko přehřátí', () => {
    const heavy = new PhysicsEngine({ payloadKg: 400, bottles: 4, ambientC: 12, siteElevation: 300 });
    expect(heavy.atCeiling).toBe(false);
    heavy.pos.y = 3200; heavy.onGround = false;
    expect(heavy.atCeiling).toBe(true);
    const light = new PhysicsEngine({ payloadKg: 155, bottles: 1, ambientC: 12, siteElevation: 300 });
    light.pos.y = 3200;
    expect(light.atCeiling).toBe(false);
  });
});

describe('WindModel', () => {
  it('interpoluje mezi vrstvami', () => {
    const w = new WindModel([{ alt: 0, speed: 2, bearing: 90 }, { alt: 100, speed: 6, bearing: 90 }]);
    const mid = w.base(50);
    expect(mid.x).toBeCloseTo(4, 5);
    expect(Math.abs(mid.z)).toBeLessThan(1e-9);
  });
});
