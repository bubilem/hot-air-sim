// Fáze 2: Start. Zkouška hořáku u stojícího koše, položení koše, rozložení pláště,
// studené a horké plnění, postavení balonu, nástup posádky a uvolnění lana.
import * as THREE from 'three';
import { t } from '../i18n/index.js';
import { ChaseVehicle } from '../entities/ChaseVehicle.js';
import { createCharacter, isFemalePassenger, waveArms, armsForward, armsUp } from '../entities/Character.js';
import { LAUNCH_CREW } from '../config/GameConfig.js';
import { createFan, Rope } from '../entities/GroundProps.js';

const DEG = Math.PI / 180;
const STEPS = ['test', 'lay', 'unroll', 'cold', 'hot', 'board', 'ready'];
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const MOUTH_X = 4.1;   // poloha ústí pláště, když koš leží (viz BalloonView.setShape)

export class LaunchPhase {
  constructor(app) {
    this.app = app;
    this.ui = null;
    this.btnDown = false;
  }

  enter() {
    const app = this.app, plan = app.plan, w = app.world;
    app.clearProps();
    app.hud.setVisible(false);
    app.controls.setVisible(false);
    app.controls.enabled = false;

    const bearing = w.site.wind[0].bearing;
    this.heading = bearing - 90;
    this.wind0 = w.wind.at(0);

    const b = app.createBalloon(plan);
    b.setLaunchPose();
    b.place(0, w.startY, 0, this.heading);
    b.physics.onGround = true;
    this.b = b;

    // Pozemní rám: osa x = po větru, počátek = střed koše
    this.frame = new THREE.Group();
    this.frame.position.set(0, w.startY, 0);
    this.frame.rotation.y = (90 - bearing) * DEG;
    app.props.add(this.frame);
    this.yawBase = -(90 - bearing) * DEG;

    this.vehicle = new ChaseVehicle();
    this.vehicle.root.position.set(-8.5, 0, 0);
    this.vehicle.root.rotation.y = -Math.PI / 2;
    this.frame.add(this.vehicle.getMesh());

    this.fan = createFan();
    this.fan.position.set(2.0, 0, 3.8);
    this.fan.rotation.y = Math.atan2(3.8, MOUTH_X - 2.0);
    this.frame.add(this.fan);

    this.crew = [0, 1].map((i) => {
      const c = createCharacter('crew', i);
      this.frame.add(c);
      return c;
    });
    this.crewSnap = true;

    // Zákazníci čekají na louce za autem (ne mezi autem a košem) a dívají se na koš
    this.pax = [];
    for (let i = 0; i < plan.passengers; i++) {
      const c = createCharacter('passenger', i * 3 + 1, isFemalePassenger(plan.honorific, i));
      const col = i % 3, row = Math.floor(i / 3);
      c.position.set(-13 - row * 1.4, 0, 2.6 + col * 1.15 + (row % 2) * 0.55);
      c.rotation.y = Math.atan2(-c.position.x, -c.position.z);
      this.frame.add(c);
      this.pax.push(c);
    }
    this.frame.updateMatrixWorld(true);

    this.rope = new Rope(0x333333);
    app.props.add(this.rope.mesh);
    this.tipRope = new Rope(0x2a2a2a);
    this.tipRope.mesh.visible = false;
    app.props.add(this.tipRope.mesh);
    this._tip = new THREE.Vector3();

    this.boardT = 0;
    this.clicked = false;
    this.t = 0;
    this.buildUi();
    this.setStep('test');
    app.resetUserCamera();
  }

  exit() {
    this.ui?.remove();
    this.ui = null;
    if (this.rope) { this.app.props.remove(this.rope.mesh); this.rope = null; }
    if (this.tipRope) { this.app.props.remove(this.tipRope.mesh); this.tipRope = null; }
    this.app.audio.update({});
  }

  // ---------- UI ----------
  buildUi() {
    this.ui = document.createElement('div');
    this.ui.className = 'launchui panel interactive';
    this.ui.innerHTML = `
      <div class="steps" data-f="steps"></div>
      <h2 data-f="title"></h2>
      <p data-f="hint"></p>
      <div class="bar"><div data-f="bar"></div></div>
      <div class="lbtns">
        <button class="btn act" data-f="act"></button>
        <button class="btn release" data-f="release" style="display:none"></button>
      </div>`;
    this.app.uiRoot.appendChild(this.ui);
    this.f = {};
    this.ui.querySelectorAll('[data-f]').forEach((n) => { this.f[n.dataset.f] = n; });
    const act = this.f.act;
    const down = (e) => { e.preventDefault(); this.btnDown = true; act.classList.add('active'); this.app.audio.unlock(); try { act.setPointerCapture(e.pointerId); } catch { /* bez capture */ } };
    const up = (e) => { e.preventDefault(); this.btnDown = false; act.classList.remove('active'); };
    act.addEventListener('pointerdown', down);
    act.addEventListener('pointerup', up);
    act.addEventListener('pointercancel', up);
    act.addEventListener('lostpointercapture', up);
    this.f.release.addEventListener('click', () => this.release());
  }

  setStep(s) {
    const b = this.b;
    this.step = s;
    this.p = 0;
    this.btnDown = false;
    const f = this.f;
    f.steps.innerHTML = STEPS.map((x) => `<i class="${x === s ? 'cur' : STEPS.indexOf(x) < STEPS.indexOf(s) ? 'done' : ''}"></i>`).join('');
    f.title.textContent = t(`launch.${s}`);
    f.hint.textContent = t(`launch.${s}.hint`);
    const hasAct = ['test', 'lay', 'unroll', 'cold', 'hot', 'ready'].includes(s);
    f.act.style.display = hasAct ? '' : 'none';
    f.act.textContent = s === 'ready' ? t('launch.hot.btn') : hasAct ? t(`launch.${s}.btn`) : '';
    f.release.style.display = s === 'ready' ? '' : 'none';
    f.release.textContent = t('launch.ready.btn');
    f.bar.parentElement.style.display = s === 'board' || s === 'ready' ? 'none' : '';

    // Plášť leží od začátku na zemi jako úzký had; po položení koše se rozprostírá do šířky
    b.view.setEnvelopeVisible(true);
    if (STEPS.indexOf(s) >= STEPS.indexOf('unroll')) b.envUpright = null;
    if (s === 'unroll') { b.upright = 0; b.unroll = 0; b.inflation = 0; }
    if (s === 'test' || s === 'lay') b.envUpright = 0;
    if (s === 'board') this.boarded = false;   // zákazníci nejdřív dojdou ke koši, pak nastoupí (viz update)
  }

  release() {
    this.app.go('FLIGHT');
  }

  // ---------- Fyzika (pevný krok) ----------
  fixedUpdate(dt) {
    const s = this.step;
    if (s !== 'hot' && s !== 'board' && s !== 'ready') return;
    const b = this.b, p = b.physics, w = this.app.world;
    const hold = this.holding() && s !== 'board';
    p.step(dt, { burn: hold ? 1 : 0, heatBoost: s === 'hot' ? 2.5 : 1 }, this.wind0, w.startY);
    // Balon je uvázaný k autu
    p.pos.x = 0; p.pos.y = w.startY; p.pos.z = 0;
    p.vel.x = p.vel.y = p.vel.z = 0;
    p.onGround = true;
  }

  holding() { return this.btnDown || this.app.controls.keys.has('Space'); }

  // ---------- Vizuál (každý snímek) ----------
  update(dt) {
    const app = this.app, b = this.b, w = app.world, p = b.physics;
    this.t += dt;
    b.time += dt;   // animace plamene (Balloon.update se při startu nevolá)
    const hold = this.holding();
    let burnLevel = 0, fanLevel = 0;

    switch (this.step) {
      case 'test':
        // Koš stojí, plášť je ještě ve vaku
        b.upright = 1;
        if (hold) {
          if (!this.clicked) { app.audio.click(); this.clicked = true; }
          this.p += dt / 1.1;
          b.testFlame = 1;
          burnLevel = 0.7;
        } else {
          this.p = Math.max(0, this.p - dt * 1.5);
          this.clicked = false;
          b.testFlame = 0;
        }
        if (this.p >= 1) { b.testFlame = 0; this.setStep('lay'); }
        break;

      case 'lay':
        // Posádka překlopí koš na bok (otáčí se kolem spodní hrany)
        if (hold) this.p = Math.min(1, this.p + dt * 0.45);
        b.upright = 1 - this.p;
        if (this.p >= 1) { b.upright = 0; app.audio.thud(0.3); this.setStep('unroll'); }
        break;

      case 'unroll':
        b.upright = 0;
        if (hold) this.p = Math.min(1, this.p + dt * 0.28);
        b.unroll = this.p;
        if (this.p >= 1) this.setStep('cold');
        break;

      case 'cold':
        b.upright = 0; b.unroll = 1;
        if (hold) { this.p = Math.min(1, this.p + dt * 0.15); fanLevel = 1; }
        b.inflation = 0.7 * this.p;
        this.fan.userData.prop.rotation.x += dt * (hold ? 40 : 0);
        if (this.p >= 1) this.setStep('hot');
        break;

      case 'hot': {
        burnLevel = p.burning;
        const hover = p.hoverTemp(0);
        const t0 = p.ambient + 3, t1 = hover - 8;
        const hp = clamp01((p.tempIn - t0) / (t1 - t0));
        this.p = hp;
        b.unroll = 1;
        // Nejdřív se plášť naplní vleže, od cca 50 % začne zvedat a koš se pomalu staví
        b.inflation = 0.7 + 0.3 * clamp01(hp / 0.5);
        b.upright = clamp01((hp - 0.5) / 0.5);
        if (hp >= 1) { b.inflation = 1; b.upright = 1; this.setStep('board'); }
        break;
      }

      case 'board':
        this.boardT += dt;
        b.inflation = 1; b.upright = 1; b.unroll = 1;
        this.moveCrewAway(dt);
        this.walkPassengers(dt);
        if (!this.boarded && this.boardT > 2) {
          this.boarded = true;
          this.pax.forEach((c) => { c.visible = false; });
          b.board(this.app.plan.passengers, this.app.plan.honorific);
          this.app.audio.clink();
        }
        if (this.boardT > 3.2) this.setStep('ready');
        break;

      case 'ready':
        burnLevel = p.burning;
        b.inflation = 1; b.upright = 1; b.unroll = 1;
        this.moveCrewAway(dt);
        break;
    }

    if (this.step === 'hot' || this.step === 'ready') burnLevel = p.burning;
    if (!['board', 'ready'].includes(this.step)) this.updateCrew(dt);

    b.syncView(w.startY);
    this.updateRope();
    this.updateTipRope();
    this.updateUi();
    app.audio.update({ burn: burnLevel, fan: fanLevel, wind: 0.05 });

    // Kamera sleduje to, co se právě děje
    const cams = {
      test: [1, 1.5, 14], lay: [3, 1.5, 17], unroll: [11, 2, 38], cold: [24, 3, 62],
      hot: [18, 8, 64], board: [0, 9, 50], ready: [0, 9, 50],
    };
    const [ax, ay, dist] = cams[this.step];
    const aim = this.frame.localToWorld(new THREE.Vector3(ax, ay, 0));
    app.setRig({ target: aim, yaw: this.yawBase + 0.15, pitch: 0.2, dist });
  }

  /**
   * Posádka (2 lidé) podle kroku: zkouška hořáku (jeden v koši, druhý u pláště), pokládání koše (jeden
   * zezadu koš překlápí), rozkládání (oba u nejširšího místa pláště), plnění (u ústí), horké plnění
   * (jeden u hořáku).
   */
  updateCrew(dt) {
    const [c0, c1] = this.crew;
    const b = this.b, p = this.p, burning = b.physics.burning;
    const ease = this.crewSnap ? 1 : Math.min(1, dt * 2.5);
    this.crewSnap = false;
    const go = (c, x, z, fx, fz, y = 0) => {
      c.position.x += (x - c.position.x) * ease;
      c.position.z += (z - c.position.z) * ease;
      c.position.y += (y - c.position.y) * ease;
      const want = Math.atan2(fx - c.position.x, fz - c.position.z);
      let d = want - c.rotation.y;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      c.rotation.y += d * Math.min(1, ease * 2);
    };
    const MX = MOUTH_X;
    switch (this.step) {
      case 'test':
        go(c0, 0, 0, 9, 0, 0.08);                   // v koši pod hořákem
        go(c1, MX + 3.5, 1.5, MX + 3.5, 0);         // u pláště
        armsUp(c0, this.btnDown ? 1 : 0);
        armsForward(c1, this.t, 0);
        break;
      case 'lay':
        go(c0, -1.3 + 0.7 * p, 0, 5, 0);             // zezadu překlápí koš
        go(c1, MX + 3.5, 1.5, MX + 3.5, 0);
        armsForward(c0, this.t, 0.9 * Math.min(1, p * 4));
        armsForward(c1, this.t, 0);
        break;
      case 'unroll': {
        // u nejširšího místa pláště; ten se rozkládá do šířky
        const un = b.unroll * b.unroll * (3 - 2 * b.unroll);
        const half = 9.7 * 1.4 * (0.15 + 0.85 * un) + 2.2;
        const wx = MX + 14.8 * 0.78 * (0.92 + 0.08 * un);
        go(c0, wx, -half, wx, 0);
        go(c1, wx, half, wx, 0);
        armsForward(c0, this.t, this.btnDown ? 0.7 : 0);
        armsForward(c1, this.t + 1, this.btnDown ? 0.7 : 0);
        break;
      }
      case 'cold': {
        // c0 drží lanem špičku pláště (daleko za balonem), c1 obsluhuje ventilátor
        const t = this.tipFrame();
        const hold = this.tipHolderSpot(t);
        go(c0, hold.x, hold.z, t.x, t.z);
        armsForward(c0, this.t, 0.85);
        go(c1, 1.3, 5.1, MX, 0);                     // za ventilátorem
        armsForward(c1, this.t, 0.6);
        break;
      }
      case 'hot': {
        // c0 stále drží špičku (balon se nestáčí a rovně se zvedá), c1 u hořáku
        const t = this.tipFrame();
        const hold = this.tipHolderSpot(t);
        go(c0, hold.x, hold.z, t.x, t.z);
        armsForward(c0, this.t, 0.85);
        go(c1, 0.9, 1.6, 0.9, 0);                    // u hořáku
        armsForward(c1, this.t, 0.9 * burning);
        break;
      }
      default: break;
    }
  }

  /** Špička pláště v souřadnicích pozemního rámu (x = po větru). */
  tipFrame() {
    const b = this.b;
    b.view.crownPoint(this._tip);
    return this.frame.worldToLocal(b.localToWorld(this._tip.clone()));
  }

  /** Kde stojí držitel lana: LAUNCH_CREW.tipRopeLength od špičky, za ní po ose pláště (lano zůstává napnuté). */
  tipHolderSpot(tip) {
    const up = Math.max(0, tip.y);
    const horiz = Math.sqrt(Math.max(0, LAUNCH_CREW.tipRopeLength ** 2 - up * up));
    return { x: tip.x + Math.max(horiz, LAUNCH_CREW.tipMinBehind), z: tip.z };
  }

  /** Lano od špičky pláště k rukám držitele (jen při plnění a zahřívání). */
  updateTipRope() {
    const show = this.step === 'cold' || this.step === 'hot';
    this.tipRope.mesh.visible = show;
    if (!show) return;
    const b = this.b, c0 = this.crew[0];
    b.view.crownPoint(this._tip);
    const tipW = b.localToWorld(this._tip.clone());
    this.tipRope.set(tipW, c0.localToWorld(new THREE.Vector3(0, 1.1, 0.45)));
  }

  /** Zákazníci jdou ke koši (nástup). */
  walkPassengers(dt) {
    const k = Math.min(1, dt * 0.9);
    this.pax.forEach((c, i) => {
      const tx = 1.6, tz = (i - (this.pax.length - 1) / 2) * 0.25;
      const dx = tx - c.position.x, dz = tz - c.position.z;
      c.position.x += dx * k;
      c.position.z += dz * k;
      c.position.y = Math.abs(Math.sin(this.t * 9 + i)) * 0.06;    // kroky
      c.rotation.y = Math.atan2(dx, dz);
    });
  }

  moveCrewAway(dt) {
    const k = Math.min(1, dt * 1.2);
    this.crew.forEach((c, i) => {
      const s = i === 0 ? -1 : 1;
      c.position.x += (-6.5 - c.position.x) * k;
      c.position.z += (s * 4.5 - c.position.z) * k;
      // otočení ke koši a vzlétajícímu balonu
      const want = Math.atan2(-c.position.x, -c.position.z);
      c.rotation.y += Math.atan2(Math.sin(want - c.rotation.y), Math.cos(want - c.rotation.y)) * Math.min(1, dt * 3);
      waveArms(c, this.t + i, 1);
    });
  }

  updateRope() {
    const a = this.vehicle.car.localToWorld(this.vehicle.hitch.clone());
    const bb = this.b.localToWorld(new THREE.Vector3(0, -2.9, 0));
    this.rope.set(a, bb);
  }

  updateUi() {
    const f = this.f, p = this.b.physics;
    f.act.classList.toggle('active', this.holding() && this.step !== 'board');   // stisk myší i Mezerníku vypadá stejně
    f.bar.style.width = `${Math.round(this.p * 100)}%`;
    if (this.step === 'ready') {
      const lift = p.netLiftKg(0);
      f.hint.textContent = lift > 8 ? t('launch.lift') : t('launch.ready.hint');
      f.hint.classList.toggle('good', lift > 8);
      f.release.classList.toggle('pulse', lift > 8);
    }
  }
}
