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

describe('WindModel', () => {
  it('interpoluje mezi vrstvami', () => {
    const w = new WindModel([{ alt: 0, speed: 2, bearing: 90 }, { alt: 100, speed: 6, bearing: 90 }]);
    const mid = w.base(50);
    expect(mid.x).toBeCloseTo(4, 5);
    expect(Math.abs(mid.z)).toBeLessThan(1e-9);
  });
});
