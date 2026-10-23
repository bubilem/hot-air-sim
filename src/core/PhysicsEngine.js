// Aerostatická fyzika balonu. Bez závislosti na Three.js.
import { PHYSICS as P, COLLISION as C } from '../config/GameConfig.js';

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
    this.refY = this.refY ?? 0;   // světová výška startu (y = 0 u lokality)
    this.tempIn = c.ambientC;
    this.gas = c.bottles * P.gasPerBottle;
    this.heading = 0;
    this.hypoxia = 0;       // 0..1, nedostatek kyslíku u pilota
    this.unconscious = false;
    this.burning = 0;
    this.venting = 0;
    this.ventHold = 0;      // s, jak dlouho je paraventil otevřený (klapka se rozevírá)
    this.collapse = 0;      // 0..1, propadnutí vrchlíku po extrémně dlouhém odvětrání
    this.stress = 0;        // K·s nad scorchTemp od poslední díry
    this.holes = [];        // popálená místa: {u: obvod 0..1, v: od ústí 0..1, size}
    this.lastTear = -Infinity;   // flightTime poslední trhliny
    this.scrape = 0;        // m tření po povrchu od poslední trhliny (× tvrdost)
    this.contactTime = -Infinity;   // flightTime posledního dotyku pláště s překážkou
    this.fireTimer = 0;
    this.fireHoleT = 0;     // s od poslední díry prožrané ohněm
    this.holeSag = 0;       // 0..1, ztráta objemu způsobená dírami
    this.fire = 0;          // 0..1, rozsah požáru pláště
    this.rand = rng(c.seed ?? 1);
    this.onGround = true;
    this.flightTime = 0;
    this.maxAlt = 0;
  }

  /** Výška n. m. pro světovou výšku y. */
  altMsl(y = this.pos.y) { return this.cfg.siteElevation + y - this.refY; }

  /** Okolní teplota ve výšce y: klesá s výškou nad startem (`lapseRate`). */
  ambientAt(y = this.pos.y) { return this.cfg.ambientC - P.lapseRate * (y - this.refY); }

  get ambient() { return this.ambientAt(); }

  /** Míra deformace pláště (propadnutí vrchlíku nebo požár), 0..1. */
  get deflation() { return Math.max(this.collapse, this.fire, this.holeSag); }

  /** Celková plocha děr v plášti (m²). */
  get holeArea() {
    let a = 0;
    for (const h of this.holes) a += h.size;
    return a;
  }

  /** Skutečný objem horkého vzduchu v plášti (propadnutí vrchlíku, díry a požár se násobí). */
  get volume() {
    return P.volume * (1 - P.collapseVolumeLoss * this.collapse)
      * (1 - P.holeVolumeLoss * this.holeSag) * (1 - P.fireVolumeLoss * this.fire);
  }

  /** Trvalý únik tepla dírami a požárem (1/s); díra výš v plášti (větší v) pouští víc vzduchu. */
  get leak() {
    let k = this.fire * P.fireLeakK;
    for (const h of this.holes) k += h.size * P.holeLeakK * (0.5 + h.v);
    return k;
  }

  /** Větší plocha děr: plášť se nestačí plnit a sesedá k cílovému objemu (nevratně, látka je protržená). */
  updateHoles(dt) {
    const x = clamp01((this.holeArea - P.holeSagFrom) / (P.holeSagFull - P.holeSagFrom));
    const target = x * x * (3 - 2 * x);
    if (target > this.holeSag) this.holeSag = Math.min(target, this.holeSag + (dt / P.holeSagTime) * Math.max(0.25, x));
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
    const alt = this.altMsl(y);
    const rOut = airDensity(this.ambientAt(y), alt);
    const rIn = airDensity(this.tempIn, alt);
    return this.volume * (rOut - rIn) - this.mass;
  }

  /** Teplota uvnitř, při které balon visí (netLift = 0). */
  hoverTemp(y = this.pos.y) {
    const alt = this.altMsl(y);
    const amb = this.ambientAt(y);
    const rOut = airDensity(amb, alt);
    const rInNeeded = rOut - this.mass / this.volume;
    return (rOut * (amb + 273.15)) / rInNeeded - 273.15;
  }

  /** Nad `oxygenAlt` roste nedostatek kyslíku; při plné úrovni pilot omdlí a probere se až po poklesu pod `hypoxiaWake`. */
  updateHypoxia(dt) {
    const over = (this.altMsl() - P.oxygenAlt) / 1000;
    if (over > 0) this.hypoxia = Math.min(1, this.hypoxia + (over / P.hypoxiaTime) * dt);
    else this.hypoxia = Math.max(0, this.hypoxia - P.hypoxiaRecover * dt);
    if (this.hypoxia >= 1) this.unconscious = true;
    else if (this.hypoxia < P.hypoxiaWake) this.unconscious = false;
  }

  /** Balon na stropu: ve své výšce by k visení potřeboval teplotu blízkou přehřátí. */
  get atCeiling() { return this.hoverTemp() >= P.alarmTemp - P.ceilingMargin; }

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
    if (this.fire > 0 || this.fireTimer >= P.fireDelay) {
      this.fire = Math.min(1, this.fire + dt / P.fireSpread);
      this.fireHoleT += dt;   // oheň za čelem prožírá látku: další a další díry
      while (this.fireHoleT >= P.fireHoleEvery) {
        this.fireHoleT -= P.fireHoleEvery;
        this.addHole(P.fireHoleSize, Math.max(0.3, 1 - this.fire));
      }
    }
    this.updateHoles(dt);
  }

  /** Nová popálená díra: nejčastěji ve vrchní části pláště, kde je nejhorkější vzduch (`vMin` posouvá ji níž při požáru). */
  addHole(range = P.burnHoleSize, vMin = 0.55) {
    const r = this.rand;
    const size = range[0] + (range[1] - range[0]) * r();
    const u = r();
    const v = vMin + (1 - vMin) * r();
    this.pushHole({ u, v, size, kind: 'burn' });
  }

  /** Přidá díru (popáleninu nebo trhlinu); při plném počtu zvětší některou z existujících. */
  pushHole(h) {
    if (this.holes.length < P.holeMax) this.holes.push(h);
    else this.holes[Math.floor(this.rand() * this.holes.length)].size += 0.25;
  }

  /**
   * Zásah pláště do překážky (výsledek `probeEnvelope`): vytlačí balon po normále, odrazí rychlost
   * a podle rychlosti nárazu a tvrdosti povrchu protrhne plášť nebo ho zničí.
   * @param {{depth:number,nx:number,ny:number,nz:number,hardness:number,angle:number,v:number}} c
   * @param {number} dt  čas od posledního vyhodnocení kolize
   * @returns {{impact:number, tear:boolean, crash:boolean}}
   */
  applyContact(c, dt) {
    this.pos.x += c.nx * c.depth; this.pos.y += c.ny * c.depth; this.pos.z += c.nz * c.depth;
    const vn = this.vel.x * c.nx + this.vel.y * c.ny + this.vel.z * c.nz;
    let impact = 0;
    if (vn < 0) {
      impact = -vn;
      const k = (1 + C.restitution) * vn;
      this.vel.x -= k * c.nx; this.vel.y -= k * c.ny; this.vel.z -= k * c.nz;
    }
    const vt = Math.hypot(this.vel.x - vn * c.nx, this.vel.y - vn * c.ny, this.vel.z - vn * c.nz);
    this.contactTime = this.flightTime;

    const out = { impact, tear: false, crash: false };
    const energy = impact * c.hardness;
    if (energy > C.crashEnergy) out.crash = true;
    if (vt > C.scrapeMinSpeed) this.scrape += vt * c.hardness * dt;
    const ready = this.flightTime - this.lastTear >= C.tearCooldown;
    if (ready && (energy > C.tearEnergy || this.scrape > C.scrapeDist)) {
      const size = Math.min(1.4, Math.max(0.4, 0.4 + 0.15 * energy));
      // směr ve světě -> souřadnice u pláště (rotace koše: heading)
      const a = c.angle - this.heading * Math.PI / 180;
      const u = (((1 - a / (2 * Math.PI)) % 1) + 1) % 1;
      this.pushHole({ u, v: c.v, size, kind: 'tear' });
      this.lastTear = this.flightTime;
      this.scrape = 0;
      out.tear = true;
    }
    return out;
  }

  /**
   * Boční dotyk koše s překážkou (výsledek `probeBasket`): koš se odtlačí a zbrzdí. Les je tolerantní, pomalý koš o větve
   * jen přibrzdí a zůstane přitlačený, dokud pilot nestoupne; rychlý náraz je zachycení v korunách. Stavba a skála
   * se odrážejí a při velké energii nárazu je to havárie.
   * @param {{nx:number,nz:number,depth:number,hardness:number,kind:string}} c
   * @param {number} dt
   * @returns {{impact:number, snag:boolean, crash:boolean}}
   */
  applyBasketContact(c, dt) {
    this.pos.x += c.nx * c.depth; this.pos.z += c.nz * c.depth;
    const vn = this.vel.x * c.nx + this.vel.z * c.nz;
    const forest = c.kind === 'forest';
    let impact = 0;
    if (vn < 0) {
      impact = -vn;
      const k = (1 + (forest ? 0 : C.basketRestitution)) * vn;
      this.vel.x -= k * c.nx; this.vel.z -= k * c.nz;
    }
    if (forest) {   // větve brzdí i pohyb podél okraje lesa
      const f = Math.exp(-C.forestDrag * dt);
      this.vel.x *= f; this.vel.z *= f;
    }
    this.contactTime = this.flightTime;
    return {
      impact,
      snag: forest && impact > C.forestSnagSpeed,
      crash: !forest && impact * c.hardness > C.crashEnergy,
    };
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

    this.updateHypoxia(dt);
    if (this.unconscious) input = { burn: 0, vent: 0, rotate: 0 };   // pilot bez vědomí nic neovládá

    let burn = input.burn || 0;
    if (this.gas <= 0) burn = 0;
    this.burning = burn;
    this.gas = Math.max(0, this.gas - P.gasRate * burn * dt);

    const vent = input.vent || 0;
    this.venting = vent;
    this.updateVent(dt, vent, burn);

    const amb = this.ambientAt();
    const dTamb = this.tempIn - amb;
    const dT = burn * P.burnHeating * (input.heatBoost || 1)
      - (P.coolK + this.leak) * dTamb - vent * P.ventK * this.ventMul * dTamb;
    this.tempIn += dT * dt;
    if (this.tempIn < amb) this.tempIn = amb;
    this.updateOverheat(dt);

    const alt = this.altMsl();
    const rOut = airDensity(amb, alt);
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
