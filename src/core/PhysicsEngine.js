// Aerostatická fyzika balonu. Bez závislosti na Three.js.
import { PHYSICS as P } from '../config/GameConfig.js';

const M_AIR = 0.028964;
const R_GAS = 8.314;

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
    this.onGround = true;
    this.flightTime = 0;
    this.maxAlt = 0;
  }

  get ambient() { return this.cfg.ambientC; }

  get mass() {
    const c = this.cfg;
    return P.envelopeMass + P.basketMass + c.payloadKg + c.bottles * P.bottleEmpty + this.gas;
  }

  /** Vztlak minus tíha v kg (kladné = balon chce stoupat). */
  netLiftKg(y = this.pos.y) {
    const alt = this.cfg.siteElevation + y;
    const rOut = airDensity(this.ambient, alt);
    const rIn = airDensity(this.tempIn, alt);
    return P.volume * (rOut - rIn) - this.mass;
  }

  /** Teplota uvnitř, při které balon visí (netLift = 0). */
  hoverTemp(y = this.pos.y) {
    const alt = this.cfg.siteElevation + y;
    const rOut = airDensity(this.ambient, alt);
    const rInNeeded = rOut - this.mass / P.volume;
    return (rOut * (this.ambient + 273.15)) / rInNeeded - 273.15;
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
    if (this.tempIn >= P.maxEnvelopeTemp) burn = 0;
    this.burning = burn;
    this.gas = Math.max(0, this.gas - P.gasRate * burn * dt);

    const vent = input.vent || 0;
    this.venting = vent;

    const dTamb = this.tempIn - this.ambient;
    const dT = burn * P.burnHeating * (input.heatBoost || 1) - P.coolK * dTamb - vent * P.ventK * dTamb;
    this.tempIn += dT * dt;
    if (this.tempIn < this.ambient) this.tempIn = this.ambient;

    const alt = this.cfg.siteElevation + this.pos.y;
    const rOut = airDensity(this.ambient, alt);
    const rIn = airDensity(this.tempIn, alt);
    const m = this.mass;
    const lift = P.volume * (rOut - rIn) * P.g;
    const drag = 0.5 * rOut * this.vel.y * Math.abs(this.vel.y) * P.Cd * P.area;
    const inertia = m + rIn * P.volume + P.addedMassFactor * rOut * P.volume;
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
