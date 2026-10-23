// Datový model plánu letu + odhad vlastností letu. Bez závislosti na Three.js.
import { PLAN, PHYSICS, TIME_OF_DAY } from '../config/GameConfig.js';
import { PhysicsEngine } from './PhysicsEngine.js';
import { getSite } from '../world/Sites.js';

const randMass = () => Math.round(PLAN.passengerMassMin + Math.random() * (PLAN.passengerMassMax - PLAN.passengerMassMin));

export class FlightPlan {
  constructor({ name = '', honorific = 'm', siteId = 'luzicke', timeOfDay = 'morning', passengers = 2, bottles = 2 } = {}) {
    this.name = name;
    this.honorific = honorific;      // 'm' | 'f' (pro titul na diplomu)
    this.siteId = siteId;
    this.timeOfDay = timeOfDay;
    this.masses = [];
    this.setPassengers(passengers);
    this.bottles = bottles;
    this.envelopeId = 'checker';     // vzor pláště (viz entities/EnvelopeDesigns.js)
    this.envelopeTouched = false;    // hráč už vzor vybral sám (jinak je výchozí první balon z envelopes/ značky)
    this.customCanvas = null;        // vlastní obrázek pláště (jen v paměti prohlížeče)
  }

  get passengers() { return this.masses.length; }
  get site() { return getSite(this.siteId); }
  get ambientC() { return TIME_OF_DAY[this.timeOfDay].ambient; }
  get payloadKg() { return PHYSICS.pilotMass + this.masses.reduce((a, b) => a + b, 0); }

  setPassengers(n) {
    n = Math.min(PLAN.maxPassengers, Math.max(PLAN.minPassengers, n));
    while (this.masses.length < n) this.masses.push(randMass());
    this.masses.length = n;
  }

  setBottles(n) { this.bottles = Math.min(PLAN.maxBottles, Math.max(PLAN.minBottles, n)); }

  physicsConfig() {
    return { payloadKg: this.payloadKg, bottles: this.bottles, ambientC: this.ambientC, siteElevation: this.site.elevation };
  }
}

/** Odhad: teplota pro visení, rezerva vztlaku, doba hoření a zda lze vzlétnout. */
export function estimateFlight(plan) {
  const p = new PhysicsEngine(plan.physicsConfig());
  const hover = p.hoverTemp(0);
  const hoverLoaded = hover;
  const limit = PHYSICS.alarmTemp - 10;
  p.tempIn = limit;
  const reserveKg = p.netLiftKg(0);
  const duty = Math.min(1, (PHYSICS.coolK * Math.max(1, hover - plan.ambientC)) / PHYSICS.burnHeating);
  const burnSeconds = (plan.bottles * PHYSICS.gasPerBottle) / PHYSICS.gasRate;
  const minutes = burnSeconds / duty / 60;
  return {
    hoverTemp: hoverLoaded,
    reserveKg,
    minutes,
    totalMass: p.mass,
    canFly: hover < limit - 5,
    tight: hover >= limit - 20,
  };
}
