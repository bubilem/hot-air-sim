// Fáze 3a: Let. Hořák, paraventil, rotace, vítr po vrstvách, kamery z třetí osoby a z koše.
import * as THREE from 'three';
import { CAMERA, PHYSICS, COLLISION } from '../config/GameConfig.js';
import { probeEnvelope, probeBasket } from '../core/Collisions.js';
import { KIND } from './LandingResolver.js';
import { PILOT_EYE_X, PILOT_EYE_Z } from '../entities/Balloon.js';

const DEG = Math.PI / 180;
const EDGE = 2350;

export class FlightPhase {
  constructor(app) {
    this.app = app;
    this.mode = 'chase';
  }

  enter(data = {}) {
    const app = this.app, w = app.world;
    app.hud.setVisible(true);
    app.controls.setVisible(true);
    app.controls.enabled = true;
    app.controls.onZoom = (dir) => app.zoomBy(dir * CAMERA.zoomStep);
    app.controls.onCamera = () => {
      this.mode = this.mode === 'chase' ? 'cockpit' : 'chase';
      app.controls.setCamMode(this.mode);
      app.resetUserCamera();
      if (this.mode === 'cockpit') app.user.pitch = 0.45;   // výchozí pohled mírně vzhůru k hořáku a plamenům
    };

    if (!app.balloon || data.fresh) {
      // Přímý vstup (ladění): balon se vytvoří a pustí do vzduchu
      const b = app.createBalloon(app.plan);
      b.board(app.plan.passengers, app.plan.honorific);
      const p = b.physics;
      b.place(0, w.startY + (data.alt || 0), 0, w.site.wind[0].bearing - 90);
      p.onGround = !(data.alt > 0);
      p.tempIn = p.hoverTemp(p.pos.y) - (data.alt > 0 ? 0 : 3);
    }
    const b = app.balloon;
    b.setFlightPose();
    b.testFlame = 0;
    this.touchLock = 0;
    this.mode = 'chase';
    app.controls.setCamMode('chase');
    app.resetUserCamera();
    this.stats = { edge: false };
    this.tick = 0;
  }

  exit() {
    this.app.audio.update({});
  }

  fixedUpdate(dt) {
    const app = this.app, b = app.balloon, p = b.physics, w = app.world;
    w.wind.update(dt);
    const input = app.controls.read();
    const surface = app.sample(p.pos.x, p.pos.z).surface;
    const wind = w.wind.at(p.pos.y - w.startY);
    const out = b.update(dt, input, wind, surface);
    if (++this.tick % COLLISION.interval === 0) {
      const sample = (x, z) => app.sample(x, z);
      const touch = () => ({ vy: Math.max(0, -p.vel.y), vxz: Math.hypot(p.vel.x, p.vel.z) });
      const bc = probeBasket(p.pos, p.heading, sample);
      if (bc) {
        const r = p.applyBasketContact(bc, dt * COLLISION.interval);
        if (r.impact > 0.5) app.audio.thud(Math.min(0.7, r.impact / 8));
        if (r.crash) {
          app.go('LANDING', { touch: touch(), collision: { speed: r.impact } });
          return;
        }
        if (r.snag) {   // rychlý boční náraz do lesa: zachycení v korunách
          app.go('LANDING', { touch: touch(), kind: KIND.FOREST });
          return;
        }
      }
      const c = probeEnvelope(p.pos, sample);
      if (c) {
        const r = p.applyContact(c, dt * COLLISION.interval);
        if (r.impact > 0.5) app.audio.thud(Math.min(0.7, r.impact / 8));
        if (r.crash) {
          app.go('LANDING', { touch: { vy: Math.max(0, -p.vel.y), vxz: Math.hypot(p.vel.x, p.vel.z) }, collision: { speed: r.impact } });
          return;
        }
      }
    }
    if (out.touchdown && p.maxAlt > 3) {
      app.go('LANDING', { touch: out.touchdown });
    }
  }

  update(dt) {
    const app = this.app, b = app.balloon, p = b.physics, w = app.world;
    const s = app.sample(p.pos.x, p.pos.z);
    b.syncView(s.ground);

    const wind = w.wind.at(p.pos.y - w.startY);
    const gasMax = p.cfg.bottles * PHYSICS.gasPerBottle;
    const dx = w.target.x - p.pos.x, dz = w.target.z - p.pos.z;
    const edge = Math.max(Math.abs(p.pos.x), Math.abs(p.pos.z)) > EDGE;
    app.hud.update({
      agl: p.pos.y - s.surface,
      vy: p.vel.y,
      tempIn: p.tempIn,
      gasFrac: p.gas / gasMax,
      wind,
      cameraYaw: (this.mode === 'chase' ? p.heading : p.heading) + app.user.yaw / DEG,
      target: { dist: Math.hypot(dx, dz), bearing: (Math.atan2(dx, -dz) / DEG + 360) % 360 },
      edge,
      layers: w.wind.layers,
      altStart: p.pos.y - w.startY,
      fire: p.fire,
      holes: p.holes.length,
    });
    app.audio.update({
      burn: p.burning,
      vent: p.venting,
      wind: Math.min(1, Math.hypot(p.vel.x, p.vel.z) * 0.08 + Math.abs(p.vel.y) * 0.12),
    });

    const head = p.heading * DEG;
    if (b.crew[0]) b.crew[0].visible = this.mode !== 'cockpit';
    if (this.mode === 'chase') {
      app.setRig({
        target: { x: p.pos.x, y: p.pos.y + 10, z: p.pos.z },
        yaw: head,
        pitch: 0.28,
        dist: CAMERA.distance,
      });
    } else {
      // Oči pilota: vedle hořáku (ne přímo pod ním), aby šly vidět plameny nad hlavou
      const eye = new THREE.Vector3(PILOT_EYE_X, CAMERA.cockpitEye, PILOT_EYE_Z).applyAxisAngle(new THREE.Vector3(0, 1, 0), -head);
      app.setRig({
        cockpit: new THREE.Vector3(p.pos.x + eye.x, p.pos.y + eye.y, p.pos.z + eye.z),
        yaw: head,
      });
    }
  }
}
