// Aerostatická fyzika balonu. Bez závislosti na Three.js.
import { PHYSICS as P } from '../config/GameConfig.js';

const M_AIR = 0.028964;
const R_GAS = 8.314;

const clamp01 = (x) => Math.min(1, Math.max(0, x));

/** Malý deterministický generátor (mulberry32), aby šly popáleniny testovat. */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return (((t ^ (t >>> 14)) >>> 0) / 4294967296);
  };
}

export function airDensity(tempC, altitudeMsl) {
  const p = 101325 * Math.exp(-altitudeMsl / 8400);
  return (p * M_AIR) / (R_GAS * (tempC + 273.15));
}

export class PhysicsEngine {
  /**
   * @param {{payloadKg:number, bottles:number, ambientC:number, siteElevation:number}} cfg
   */
  constructor(cfg) {
    this.cfg = cfg;
    this.reset();
  }

  reset() {
    const c = this.cfg;
    this.pos = { x: 0, y: 0, z: 0 };
    this.vel = { x: 0, y: 0, z: 0 };
    this.tempIn = c.ambientC;
    this.gas = c.bottles * P.gasPerBottle;
    this.heading = 0;
    this.burning = 0;
    this.venting = 0;
    this.ventHold = 0;      // s, jak dlouho je paraventil otevřený (klapka se rozevírá)
    this.collapse = 0;      // 0..1, propadnutí vrchlíku po extrémně dlouhém odvětrání
    this.stress = 0;        // K·s nad scorchTemp od poslední díry
    this.holes = [];        // popálená místa: {u: obvod 0..1, v: od ústí 0..1, size}
    this.fireTimer = 0;
    this.fire = 0;          // 0..1, rozsah požáru pláště
    this.rand = rng(c.seed ?? 1);
    this.onGround = true;
    this.flightTime = 0;
    this.maxAlt = 0;
  }

  get ambient() { return this.cfg.ambientC; }

  /** Míra deformace pláště (propadnutí vrchlíku nebo požár), 0..1. */
  get deflation() { return Math.max(this.collapse, this.fire); }

  /** Skutečný objem horkého vzduchu v plášti. */
  get volume() { return P.volume * (1 - P.collapseVolumeLoss * this.deflation); }

  /** Trvalý únik tepla dírami a požárem (1/s). */
  get leak() {
    let k = this.fire * P.fireLeakK;
    for (const h of this.holes) k += h.size * P.holeLeakK;
    return k;
  }

  /** Násobek ventK podle otevření klapky. */
  get ventMul() {
    const open = clamp01(this.ventHold / P.ventRampTime);
    return 1 + (P.ventMaxMul - 1) * open * open;
  }

  get mass() {
    const c = this.cfg;
    return P.envelopeMass + P.basketMass + c.payloadKg + c.bottles * P.bottleEmpty + this.gas;
  }

  /** Vztlak minus tíha v kg (kladné = balon chce stoupat). */
  netLiftKg(y = this.pos.y) {
    const alt = this.cfg.siteElevation + y;
    const rOut = airDensity(this.ambient, alt);
    const rIn = airDensity(this.tempIn, alt);
    return this.volume * (rOut - rIn) - this.mass;
  }

  /** Teplota uvnitř, při které balon visí (netLift = 0). */
  hoverTemp(y = this.pos.y) {
    const alt = this.cfg.siteElevation + y;
    const rOut = airDensity(this.ambient, alt);
    const rInNeeded = rOut - this.mass / this.volume;
    return (rOut * (this.ambient + 273.15)) / rInNeeded - 273.15;
  }

  /** Klapka se při držení rozevírá, po uvolnění rychle zavře; po dlouhém držení se vrchlík propadá. */
  updateVent(dt, vent, burn) {
    if (vent > 0) {
      this.ventHold += vent * dt;
      const over = this.ventHold - P.ventCollapseAfter;
      if (over > 0) this.collapse = Math.min(1, this.collapse + (dt / P.ventCollapseTime) * clamp01(over / 5));
    } else {
      this.ventHold = Math.max(0, this.ventHold - P.ventCloseRate * dt);
      const rate = burn > 0 ? P.collapseRecoverBurn : P.collapseRecover;
      this.collapse = Math.max(0, this.collapse - rate * dt);
    }
  }

  /** Nad scorchTemp vznikají nevratně popálená místa, dlouho nad fireTemp plášť vzplane. */
  updateOverheat(dt) {
    const over = this.tempIn - P.scorchTemp;
    if (over > 0 && this.fire === 0) {
      this.stress += over * dt;
      while (this.stress >= P.scorchStep) {
        this.stress -= P.scorchStep;
        this.addHole();
      }
    }
    if (this.tempIn >= P.fireTemp) this.fireTimer += dt;
    else this.fireTimer = Math.max(0, this.fireTimer - dt);
    if (this.fire > 0 || this.fireTimer >= P.fireDelay) this.fire = Math.min(1, this.fire + dt / P.fireSpread);
  }

  /** Nová díra: nejčastěji ve vrchní části pláště, kde je nejhorkější vzduch. */
  addHole() {
    const r = this.rand;
    const size = 0.5 + 0.5 * r();
    const u = r();
    const v = 0.55 + 0.45 * r();
    if (this.holes.length < P.holeMax) this.holes.push({ u, v, size });
    else this.holes[Math.floor(r() * this.holes.length)].size += 0.25;
  }

  /**
   * Jeden krok fyziky.
   * @param {number} dt
   * @param {{burn:number, vent:number, rotate:number}} input  burn/vent 0..1, rotate -1..1
   * @param {{x:number,z:number}} wind  vítr v aktuální výšce (m/s)
   * @param {number} groundY  výška povrchu pod košem
   * @returns {{touchdown?:{vy:number, vxz:number}}}
   */
  step(dt, input, wind, groundY) {
    const out = {};
    this.flightTime += dt;

    let burn = input.burn || 0;
    if (this.gas <= 0) burn = 0;
    this.burning = burn;
    this.gas = Math.max(0, this.gas - P.gasRate * burn * dt);

    const vent = input.vent || 0;
    this.venting = vent;
    this.updateVent(dt, vent, burn);

    const dTamb = this.tempIn - this.ambient;
    const dT = burn * P.burnHeating * (input.heatBoost || 1)
      - (P.coolK + this.leak) * dTamb - vent * P.ventK * this.ventMul * dTamb;
    this.tempIn += dT * dt;
    if (this.tempIn < this.ambient) this.tempIn = this.ambient;
    this.updateOverheat(dt);

    const alt = this.cfg.siteElevation + this.pos.y;
    const rOut = airDensity(this.ambient, alt);
    const rIn = airDensity(this.tempIn, alt);
    const m = this.mass;
    const lift = this.volume * (rOut - rIn) * P.g;
    const drag = 0.5 * rOut * this.vel.y * Math.abs(this.vel.y) * P.Cd * P.area;
    const inertia = m + rIn * this.volume + P.addedMassFactor * rOut * this.volume;
    const fy = lift - m * P.g - drag;

    if (this.onGround && fy <= 0) {
      this.vel.y = 0;
      this.vel.x *= 0.9;
      this.vel.z *= 0.9;
    } else {
      this.onGround = false;
      this.vel.y += (fy / inertia) * dt;
      const k = Math.min(1, dt / P.windTau);
      this.vel.x += (wind.x - this.vel.x) * k;
      this.vel.z += (wind.z - this.vel.z) * k;
    }

    this.heading = (this.heading + (input.rotate || 0) * P.rotateRate * dt + 360) % 360;

    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
    this.pos.y += this.vel.y * dt;

    if (this.pos.y <= groundY) {
      if (!this.onGround && this.vel.y < -0.05) {
        out.touchdown = { vy: -this.vel.y, vxz: Math.hypot(this.vel.x, this.vel.z) };
      }
      this.pos.y = groundY;
      this.vel.y = 0;
      this.onGround = true;
    }

    if (this.pos.y > this.maxAlt) this.maxAlt = this.pos.y;
    return out;
  }
}
