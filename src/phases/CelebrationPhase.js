// Fáze 4: Oslava. Posádka u stolečku, sekt, balonářský křest a předání diplomu.
import * as THREE from 'three';
import { t, getLang } from '../i18n/index.js';
import { titleFor } from '../core/Titles.js';
import brand from '@brand';
import { createCharacter, isFemalePassenger, waveArms } from '../entities/Character.js';
import { createTable } from '../entities/GroundProps.js';
import { CELEBRATION } from '../config/GameConfig.js';
import { ResultScreen } from '../ui/ResultScreen.js';

const CONFETTI = brand.colors.confetti;

export class CelebrationPhase {
  constructor(app) {
    this.app = app;
    this.ui = null;
    this.result = null;
  }

  enter() {
    const app = this.app, b = app.balloon, w = app.world, r = app.flightResult;
    app.hud.setVisible(false);
    app.controls.setVisible(false);
    app.audio.update({});
    b.unboard();

    this.t = 0;
    this.popped = false;
    this.celebrate = 0;
    this.particles = [];
    this.cork = null;

    // Základna oslavy: za košem, na opačné straně, než kam leží plášť (stůl i lidé stojí mimo plášť na louce)
    const basket = b.localToWorld(new THREE.Vector3(0, -2.9, 0));
    b.view.root.updateMatrixWorld(true);
    const envPos = b.view.envGeo.attributes.position, envM = b.view.envelope.matrixWorld;
    const tmp = new THREE.Vector3(), sum = new THREE.Vector2();
    for (let i = 0; i < envPos.count; i += 3) {
      tmp.fromBufferAttribute(envPos, i).applyMatrix4(envM);
      sum.x += tmp.x; sum.y += tmp.z;
    }
    sum.multiplyScalar(3 / envPos.count);                       // těžiště pláště v rovině xz
    const away = new THREE.Vector3(basket.x - sum.x, 0, basket.z - sum.y);
    if (away.lengthSq() < 1e-4) away.set(0, 0, 1);
    away.normalize();
    this.center = basket.clone().addScaledVector(away, CELEBRATION.distance);
    this.center.y = w.biomes.groundHeight(this.center.x, this.center.z);

    this.group = new THREE.Group();
    app.props.add(this.group);

    const table = createTable();
    table.position.copy(this.center);
    this.group.add(table);
    this.bottleTop = new THREE.Vector3(this.center.x, this.center.y + 1.35, this.center.z);

    // Postavy kolem stolku (pilot, pasažéři, 2 členové pozemního týmu)
    const people = [createCharacter('pilot', 0)];
    for (let i = 0; i < app.plan.passengers; i++) people.push(createCharacter('passenger', i * 3 + 1, isFemalePassenger(app.plan.honorific, i)));
    people.push(createCharacter('crew', 0), createCharacter('crew', 1));
    this.people = people;
    people.forEach((c, i) => {
      const a = (i / people.length) * Math.PI * 2 + 0.4;
      const rad = 2.2;
      const x = this.center.x + Math.cos(a) * rad, z = this.center.z + Math.sin(a) * rad;
      c.position.set(x, w.biomes.groundHeight(x, z), z);
      c.rotation.y = Math.atan2(this.center.x - x, this.center.z - z);
      this.group.add(c);
    });

    // Finální poloha auta (už dojelo v LandingPhase)
    this.camYaw = app.rig.yaw;
    this.buildUi(r);
    app.resetUserCamera();
  }

  exit() {
    this.ui?.remove();
    this.result?.destroy();
    this.ui = null;
    this.result = null;
  }

  buildUi(r) {
    this.ui = document.createElement('div');
    this.ui.className = 'celebui panel interactive';
    const plan = this.app.plan;
    this.titleText = titleFor(this.app.titles, plan.siteId, plan.honorific, r.tier, getLang()) ?? t(`title.${plan.honorific}.${r.tier}`);   // titul podle lokality, jinak vestavěný
    this.ui.innerHTML = `
      <h2>${t('celebrate.title')}</h2>
      <p data-f="hint">${t('celebrate.hint')}</p>
      <div class="knight" data-f="knight" style="display:none">
        <small>${t('celebrate.knight')}</small>
        <b>${this.titleText}</b>
      </div>
      <div class="lbtns"><button class="btn act" data-f="btn">${t('celebrate.open')}</button></div>`;
    this.app.uiRoot.appendChild(this.ui);
    const btn = this.ui.querySelector('[data-f="btn"]');
    btn.addEventListener('click', () => {
      if (!this.popped) {
        this.pop();
        btn.style.display = 'none';
        setTimeout(() => {
          this.ui.querySelector('[data-f="hint"]').style.display = 'none';
          this.ui.querySelector('[data-f="knight"]').style.display = '';
          btn.textContent = t('celebrate.diploma');
          btn.style.display = '';
          this.app.audio.clink();
        }, 1600);
      } else {
        this.showResult();
      }
    });
  }

  pop() {
    this.popped = true;
    this.celebrate = 1;
    const app = this.app;
    app.audio.unlock();
    app.audio.pop();

    // Korek
    this.cork = {
      mesh: new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), new THREE.MeshLambertMaterial({ color: 0xd9b27c })),
      v: new THREE.Vector3(1.2, 7, 0.8),
    };
    this.cork.mesh.position.copy(this.bottleTop);
    this.group.add(this.cork.mesh);

    // Stříkající sekt + konfety
    this.addParticles(160, this.bottleTop, 0xfff6c8, 0.12, (v) => v.set((Math.random() - 0.5) * 1.8, 3 + Math.random() * 5, (Math.random() - 0.5) * 1.8), 2.2);
    this.addParticles(220, new THREE.Vector3(this.center.x, this.center.y + 3, this.center.z), null, 0.22,
      (v) => v.set((Math.random() - 0.5) * 7, 2 + Math.random() * 6, (Math.random() - 0.5) * 7), 5);
  }

  addParticles(n, origin, color, size, init, life) {
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    const vel = [];
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      pos[i * 3] = origin.x; pos[i * 3 + 1] = origin.y; pos[i * 3 + 2] = origin.z;
      const v = new THREE.Vector3(); init(v); vel.push(v);
      c.setHex(color ?? CONFETTI[i % CONFETTI.length]);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size, vertexColors: true, transparent: true, depthWrite: false }));
    pts.frustumCulled = false;
    this.group.add(pts);
    this.particles.push({ pts, vel, life, age: 0, floor: this.center.y });
  }

  showResult() {
    if (this.result) return;
    this.ui.style.display = 'none';
    this.result = new ResultScreen(this.app, this.titleText);
  }

  update(dt) {
    const app = this.app, b = app.balloon;
    this.t += dt;
    b.syncView(app.sample(b.physics.pos.x, b.physics.pos.z).ground);

    this.people.forEach((c, i) => waveArms(c, this.t + i * 0.7, this.celebrate * (i % 2 ? 1 : 0.7)));

    // Částice
    for (const P of this.particles) {
      P.age += dt;
      const arr = P.pts.geometry.attributes.position;
      for (let i = 0; i < P.vel.length; i++) {
        const v = P.vel[i];
        v.y -= 9.8 * dt;
        let y = arr.getY(i) + v.y * dt;
        if (y < P.floor) { y = P.floor; v.set(0, 0, 0); }
        arr.setXYZ(i, arr.getX(i) + v.x * dt, y, arr.getZ(i) + v.z * dt);
      }
      arr.needsUpdate = true;
      P.pts.material.opacity = Math.max(0, 1 - Math.max(0, P.age - P.life + 1.5) / 1.5);
    }
    if (this.cork) {
      this.cork.v.y -= 9.8 * dt;
      this.cork.mesh.position.addScaledVector(this.cork.v, dt);
      if (this.cork.mesh.position.y < this.center.y) { this.cork.mesh.visible = false; }
    }

    this.camYaw += dt * 0.12;
    app.setRig({ target: { x: this.center.x, y: this.center.y + 1.4, z: this.center.z }, yaw: this.camYaw, pitch: 0.38, dist: 11 });
  }
}
