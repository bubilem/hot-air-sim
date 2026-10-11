// Entita balonu: spojuje fyziku (PhysicsEngine) s vizuálem (BalloonView) a posádkou.
import { PhysicsEngine } from '../core/PhysicsEngine.js';
import { BalloonView, BASKET_BOTTOM } from './BalloonView.js';
import { createCharacter, isFemalePassenger } from './Character.js';

// Pozice a natočení posádky v koši (rig: x = šířka, z = délka; delší strany jsou x = ±0,7).
// Pilot stojí vždy uprostřed za hořákem. Pasažéři jsou rozmístěni přirozeně: u delších stěn, nikoli v mřížce,
// natočení se mírně liší od pravého úhlu. Láhve stojí v rozích (nejdřív u pilota, pak v protilehlých).
const Z_FRONT = 0.85;
const PI2 = Math.PI / 2;
const IN_L = PI2, IN_R = -PI2;   // pohled dovnitř koše z levé (x < 0) a pravé (x > 0) stěny
const PAX_SLOTS = {
  1: [[0.42, -0.1, PI2 + 0.12]],                                           // u delší strany, kouká ven
  2: [[-0.42, -0.2, IN_L - 0.2], [0.42, -0.05, IN_R + 0.15]],              // proti sobě po delších stranách
  3: [[-0.42, -0.2, IN_L - 0.2], [0.42, -0.05, IN_R + 0.15], [0.05, -0.8, 0.12]],   // + u kratší strany
  4: [[-0.42, 0.2, IN_L - 0.15], [0.42, 0.0, IN_R + 0.2], [-0.42, -0.45, -PI2 - 0.2], [0.05, -0.8, -0.1]],
  5: [[-0.42, 0.3, IN_L - 0.1], [0.42, 0.3, IN_R + 0.25], [-0.42, -0.4, -PI2 - 0.2], [0.42, -0.4, IN_R - 0.2], [0, -0.8, 0.1]],
};

/** @returns {number[][]} sloty [x, z, rotY]: index 0 = pilot, dále pasažéři */
export function crewSlots(passengers) {
  const n = Math.min(5, Math.max(1, passengers));
  return [[0, Z_FRONT, Math.PI], ...PAX_SLOTS[n]];
}

// Oči pilota na kraji koše uprostřed mezi dvěma rohovými tyčemi (pilot je v tomto pohledu skrytý)
export const PILOT_EYE_X = 0;
export const PILOT_EYE_Z = Z_FRONT;

export class Balloon {
  /** @param {{payloadKg:number, bottles:number, ambientC:number, siteElevation:number}} cfg */
  constructor(cfg, designCanvas = null) {
    this.physics = new PhysicsEngine(cfg);
    this.view = new BalloonView();
    if (designCanvas) this.view.setDesign(designCanvas);
    this.view.setBottles(cfg.bottles);
    this.inflation = 1;
    this.upright = 1;
    this.unroll = 1;
    this.envUpright = null;   // vlastní poloha pláště (null = stejná jako koš)
    this.testFlame = 0;
    this.time = 0;
    this.crew = [];
  }

  getMesh() { return this.view.getMesh(); }
  getShadow() { return this.view.shadow; }

  /** Nastaví stav "leží sbalený na zemi" (začátek startu). */
  setLaunchPose() {
    this.inflation = 0;
    this.upright = 1;     // koš stojí (zkouška hořáku); plášť leží před ním jako had
    this.envUpright = 0;
    this.unroll = 0;
    this.view.setEnvelopeVisible(true);
  }

  /** Nastaví stav "stojí nafouklý" (volný let). */
  setFlightPose() {
    this.view.setEnvelopeVisible(true);
    this.inflation = 1;
    this.upright = 1;
    this.unroll = 1;
    this.envUpright = null;
  }

  /** Nastoupí pilot a pasažéři. */
  board(passengerCount, honorific = 'm') {
    this.unboard();
    const total = 1 + passengerCount;
    const slots = crewSlots(passengerCount);
    for (let i = 0; i < total; i++) {
      const ch = createCharacter(i === 0 ? 'pilot' : 'passenger', (i - 1) * 3 + 1, i > 0 && isFemalePassenger(honorific, i - 1));
      ch.scale.setScalar(0.8);
      const [x, z, rot] = slots[i];
      ch.position.set(x, BASKET_BOTTOM + 0.08, z);
      ch.rotation.y = rot;
      this.view.rig.add(ch);
      this.crew.push(ch);
    }
  }

  unboard() {
    for (const c of this.crew) this.view.rig.remove(c);
    this.crew = [];
  }

  /** Posune fyzický stav (start na louce, ladění). */
  place(x, y, z, heading = 0) {
    const p = this.physics;
    p.pos.x = x; p.pos.y = y; p.pos.z = z;
    p.heading = heading;
  }

  update(dt, input, wind, groundY) {
    this.time += dt;
    return this.physics.step(dt, input, wind, groundY);
  }

  /** Přenese stav fyziky do vizuálu. */
  syncView(groundY) {
    const p = this.physics;
    const v = this.view;
    v.setShape(this.inflation, this.upright, this.unroll, this.envUpright ?? this.upright);
    v.setPose(p.pos.x, p.pos.y, p.pos.z, p.heading);
    v.setBurn(Math.max(p.burning, this.testFlame), this.time);
    // stín se objevuje plynule se vztyčováním a nafouknutím balonu
    const ramp = (x) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };
    const fade = ramp((this.upright - 0.45) / 0.5) * ramp((this.inflation - 0.4) / 0.4);
    v.setShadow(p.pos.x, groundY, p.pos.z, p.pos.y - groundY, fade);
    v.shadow.visible = fade > 0.005;
  }

  /** Světová poloha bodu v lokálním prostoru rigu (pro lana apod.). */
  localToWorld(vec3) {
    this.view.root.updateMatrixWorld(true);
    return this.view.rig.localToWorld(vec3);
  }
}

export { BASKET_BOTTOM };
