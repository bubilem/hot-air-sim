// Fáze 3b: Přistání. Vyhodnocení dosednutí, převrácení koše, tažení po trávě, vypouštění pláště.
import * as THREE from 'three';
import { t } from '../i18n/index.js';
import { LANDING, PHYSICS, CHASE } from '../config/GameConfig.js';
import { classifyTouchdown, KIND } from './LandingResolver.js';
import { scoreFlight } from '../core/Scoring.js';
import { ChaseVehicle } from '../entities/ChaseVehicle.js';

import { vecToBearing } from '../core/WindModel.js';

const TRAILER_OFFSET = CHASE.trailerOffset;
const REST_RADIUS = 1.1;   // m: koš (i převrácený na bok) zabírá kolem středu přibližně tuto plochu
const REST_SINK = 0.1;     // m: o kolik se smí koš zabořit do trávy
const RING = Array.from({ length: 8 }, (_, i) => [Math.cos(i * Math.PI / 4) * REST_RADIUS, Math.sin(i * Math.PI / 4) * REST_RADIUS]);
const DEG = Math.PI / 180;
const smooth = (x) => { const k = Math.min(1, Math.max(0, x)); return k * k * (3 - 2 * k); };
const angDiff = (a, b) => ((b - a + 540) % 360) - 180;

const TIMELINE = {
  [KIND.SOFT]: { tipStart: 3.5, tipDur: 6, deflate: 15 },
  [KIND.HARD]: { tipStart: 0.2, tipDur: 2.2, deflate: 12 },
  [KIND.CRASH]: { tipStart: 0, tipDur: 1.4, deflate: 10 },
  other: { tipStart: 0.3, tipDur: 3, deflate: 10 },
};

export class LandingPhase {
  constructor(app) {
    this.app = app;
    this.ui = null;
  }

  enter({ touch }) {
    const app = this.app, b = app.balloon, p = b.physics, w = app.world;
    app.controls.setVisible(false);
    app.controls.enabled = false;
    b.view.setTerrain((x, z) => w.biomes.groundHeight(x, z));   // vyfouklý plášť leží na svahu, ne ve vzduchu ani v kopci

    const biome = app.sample(p.pos.x, p.pos.z);
    this.result = classifyTouchdown(touch, biome);
    this.touch = touch;
    this.kind = this.result.kind;
    this.tl = TIMELINE[this.kind] || TIMELINE.other;
    this.success = this.result.success;
    this.t = 0;
    this.done = false;

    // Směr a rychlost tažení
    let dx = p.vel.x, dz = p.vel.z;
    const sp = Math.hypot(dx, dz);
    if (sp < 0.2) { const wd = w.wind.at(p.pos.y - w.startY); dx = wd.x; dz = wd.z; }
    const n = Math.hypot(dx, dz) || 1;
    this.dir = { x: dx / n, z: dz / n };
    const fixedKinds = [KIND.WATER, KIND.FOREST, KIND.ROCK, KIND.TOWN];
    this.slideV = fixedKinds.includes(this.kind) ? 0 : touch.vxz * (this.kind === KIND.SOFT ? 0.5 : 1);
    this.fallHeading = vecToBearing(this.dir.x, this.dir.z) - 90;
    p.vel.x = p.vel.y = p.vel.z = 0;
    p.burning = 0;
    b.testFlame = 0;

    // Statistiky
    const gasMax = p.cfg.bottles * PHYSICS.gasPerBottle;
    this.stats = {
      flightTime: p.flightTime,
      maxAlt: p.maxAlt,
      gasFrac: p.gas / gasMax,
      targetDist: Math.hypot(w.target.x - p.pos.x, w.target.z - p.pos.z),
    };
    this.score = scoreFlight({ kind: this.kind, field: this.result.field, gasFrac: this.stats.gasFrac, targetDist: this.stats.targetDist, flightTime: this.stats.flightTime, maxAlt: this.stats.maxAlt });
    app.flightResult = { kind: this.kind, touch, ...this.stats, ...this.score, field: this.result.field };

    app.audio.update({});
    app.audio.thud(Math.min(1, touch.vy / 3));
    this.buildUi();

    // Doprovodné auto přijíždí pouze po úspěšném přistání; startovní vybavení (auto, vlek, ventilátor, lidé) se
    // před tím plynule zmenší a zmizí, aby nebyla vidět dvě auta
    this.car = null;
    this.clearing = this.success ? [...app.props.children] : [];
    this.clearT = 0;
    if (this.success) {
      const perp = { x: -this.dir.z, z: this.dir.x };
      this.carTo = new THREE.Vector3(p.pos.x - this.dir.x * 9 + perp.x * 7, 0, p.pos.z - this.dir.z * 9 + perp.z * 7);
      this.car = new ChaseVehicle();
      // Vlek je zavěšený za autem (oj končí u tažného zařízení) a jede s ním
      this.car.car.add(this.car.trailer);
      this.car.trailer.position.set(0, 0, TRAILER_OFFSET);
      this.car.trailer.rotation.set(0, 0, 0);
      this.carFrom = new THREE.Vector3(p.pos.x + perp.x * 160, 0, p.pos.z + perp.z * 160);
      this.carYawFrom = null;
      this.carDelay = 2;
      app.props.add(this.car.getMesh());
      this.carDur = Math.max(CHASE.arriveMin, this.carFrom.distanceTo(this.carTo) / CHASE.arriveSpeed);
      app.landingCar = this.car;
    }
    this.camYaw = app.rig.yaw;
    app.resetUserCamera();
  }

  exit() {
    this.ui?.remove();
    this.ui = null;
  }

  /**
   * Výška, na které koš odpočívá: nejvyšší povrch pod jeho půdorysem (střed a okruh kolem něj), aby se na svahu
   * převrácený koš nezabořil do kopce. `key`: 'surface' (střechy, koruny) nebo 'ground' (holá země pod stromy).
   */
  supportY(x, z, key) {
    const app = this.app;
    let h = app.sample(x, z)[key];
    for (const [dx, dz] of RING) h = Math.max(h, app.sample(x + dx, z + dz)[key]);
    return h - REST_SINK;
  }

  buildUi() {
    const ok = this.success;
    const detail = `${t('landing.speed')}: ${this.touch.vy.toFixed(1)} m/s ↓ · ${this.touch.vxz.toFixed(1)} m/s →`;
    this.ui = document.createElement('div');
    this.ui.className = `landingui panel interactive ${ok ? 'ok' : 'bad'}`;
    this.ui.innerHTML = `
      <h2>${t(`landing.${this.kind}`)}</h2>
      <p>${detail}</p>
      ${this.result.field ? `<p class="warn mid">${t('landing.field')}</p>` : ''}
      ${ok ? `<p class="deflate">${t('landing.deflating')}</p>` : `
        <div class="lbtns" style="display:none" data-f="btns">
          <button class="btn act" data-a="retry">${t('landing.retry')}</button>
          <button class="btn ghost" data-a="replan">${t('landing.replan')}</button>
        </div>
        <p class="hint" style="display:none" data-f="hint">${t('landing.failed.hint')}</p>`}`;
    this.app.uiRoot.appendChild(this.ui);
    this.ui.addEventListener('click', (e) => {
      const a = e.target.closest('[data-a]')?.dataset.a;
      if (a === 'retry') this.app.go('LAUNCH');
      if (a === 'replan') this.app.go('PLAN');
    });
  }

  fixedUpdate(dt) {
    if (this.slideV <= 0) return;
    const app = this.app, p = app.balloon.physics;
    p.pos.x += this.dir.x * this.slideV * dt;
    p.pos.z += this.dir.z * this.slideV * dt;
    this.slideV = Math.max(0, this.slideV - LANDING.dragFriction * dt);
    p.pos.y = this.supportY(p.pos.x, p.pos.z, 'surface');
  }

  update(dt) {
    const app = this.app, b = app.balloon, p = b.physics, w = app.world;
    this.t += dt;
    const tl = this.tl;

    const tip = 1 - smooth((this.t - tl.tipStart) / tl.tipDur);
    // Měkké přistání: koš stojí rovně, jen plášť se vyfukuje a pokládá; jinak se převrací celá sestava
    if (this.kind === KIND.SOFT) { b.upright = 1; b.envUpright = tip; } else { b.upright = tip; b.envUpright = null; }
    b.inflation = 1 - 0.95 * smooth((this.t - 1) / tl.deflate);
    b.unroll = 1;
    if (this.t > 2 && this.slideV > 0.2 && b.inflation > 0.2) { /* tažený plášť se stále vleče */ }

    // Natáčení koše tak, aby plášť padal po směru pohybu
    const dh = angDiff(p.heading, this.fallHeading);
    p.heading += dh * Math.min(1, dt * 1.5);

    const s = app.sample(p.pos.x, p.pos.z);
    // Koš padá (z korun stromů, po nárazu pláště) nebo se po dosednutí zvedne na vrch svahu, aby se nezabořil
    if (this.kind === KIND.COLLISION) p.pos.y = Math.max(this.supportY(p.pos.x, p.pos.z, 'surface'), p.pos.y - LANDING.collisionFallSpeed * dt);   // zničený balon padá
    else if (this.kind === KIND.FOREST) p.pos.y = Math.max(this.supportY(p.pos.x, p.pos.z, 'ground'), p.pos.y - LANDING.treeFallSpeed * dt);   // balon se z korun propadne na zem
    else if (this.slideV <= 0) {
      const rest = this.supportY(p.pos.x, p.pos.z, 'surface');
      p.pos.y += (rest - p.pos.y) * Math.min(1, dt * 8);
    }
    b.syncView(s.ground);

    // Startovní vybavení mizí (zmenšení)
    if (this.clearing.length) {
      this.clearT += dt;
      const k = Math.min(1, this.clearT / CHASE.clearTime);
      for (const o of this.clearing) o.scale.setScalar(Math.max(0.001, 1 - k * k * (3 - 2 * k)));
      if (k >= 1) {
        for (const o of this.clearing) app.removeProp(o);
        this.clearing = [];
      }
    }

    // Auto přijíždí
    if (this.car) {
      const k = Math.min(1, Math.max(0, (this.t - this.carDelay) / this.carDur));   // rovnoměrná jízda
      const x = this.carFrom.x + (this.carTo.x - this.carFrom.x) * k;
      const z = this.carFrom.z + (this.carTo.z - this.carFrom.z) * k;
      const y = w.biomes.groundHeight(x, z);
      let yaw = Math.atan2(this.carTo.x - this.carFrom.x, this.carTo.z - this.carFrom.z);
      if (this.carYawFrom !== null) {   // převzaté vozidlo se plynule natočí do směru jízdy
        const d = Math.atan2(Math.sin(yaw - this.carYawFrom), Math.cos(yaw - this.carYawFrom));
        const e = Math.min(1, Math.max(0, (this.t - this.carDelay) / 1.5));
        yaw = this.carYawFrom + d * e * e * (3 - 2 * e);
      }
      this.car.setCarPose(x, y, z, yaw);
      // vlek sleduje terén pod sebou
      const tx = x + Math.sin(yaw) * TRAILER_OFFSET, tz = z + Math.cos(yaw) * TRAILER_OFFSET;
      this.car.trailer.position.y = w.biomes.groundHeight(tx, tz) - y;
    }

    app.hud.update({
      agl: 0, vy: 0, tempIn: p.tempIn, gasFrac: this.stats.gasFrac, wind: w.wind.at(0), cameraYaw: p.heading,
      target: { dist: this.stats.targetDist, bearing: 0 }, edge: false,
    });

    this.camYaw += dt * 0.08;
    app.setRig({ target: { x: p.pos.x, y: p.pos.y + 4, z: p.pos.z }, yaw: this.camYaw, pitch: 0.25, dist: 38 });

    if (!this.success && this.t > 2.5) {
      this.ui.querySelector('[data-f="btns"]').style.display = '';
      this.ui.querySelector('[data-f="hint"]').style.display = '';
    }
    if (this.success && !this.done && this.t > tl.tipStart + tl.deflate - 2) {
      this.done = true;
      app.go('CELEBRATION');
    }
  }
}
