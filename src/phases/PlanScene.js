// Scéna na domovské obrazovce (plánování): u stojícího balonu parkuje auto s vlekem, stojí pilot, pomocníci,
// zákazníci (podle počtu v menu) a na zemi leží láhve s plynem (podle počtu v menu). Obnovuje se při každé změně plánu.
import * as THREE from 'three';
import { COLORS } from '../config/Colors.js';
import { ChaseVehicle } from '../entities/ChaseVehicle.js';
import { createCharacter, isFemalePassenger, waveArms } from '../entities/Character.js';
import { Rope } from '../entities/GroundProps.js';

const CAR_AT = { x: -9.5, z: 6 };        // poloha auta vůči balonu (základ koše je v počátku)
const bottleMat = new THREE.MeshLambertMaterial({ color: COLORS.bottle });
const capMat = new THREE.MeshLambertMaterial({ color: 0x8a8f96 });

function bottle() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.75, 10), bottleMat);
  body.position.y = 0.375;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.14, 8), capMat);
  cap.position.y = 0.82;
  g.add(body, cap);
  return g;
}

export class PlanScene {
  constructor(app) {
    this.app = app;
    this.group = null;
    this.people = [];
    this.t = 0;
  }

  clear() {
    if (this.group) {
      if (this.group.parent) this.app.removeProp(this.group);
      this.group = null;
    }
    this.people = [];
  }

  /** Postaví scénu podle aktuálního plánu (počet zákazníků a láhví, stojící balon už vytváří GameApp). */
  rebuild(plan) {
    const app = this.app, w = app.world;
    this.clear();
    if (!w || !app.balloon) return;
    const g = new THREE.Group();
    const ground = (x, z) => w.biomes.groundHeight(x, z);
    const at = (o, x, z) => { o.position.set(x, ground(x, z), z); return o; };

    // Auto a vlek: zádí k balonu (kam ukazuje tažné zařízení), vlek stojí vedle jako při startu
    const yaw = Math.atan2(CAR_AT.x, CAR_AT.z);   // přídí od balonu
    const car = new ChaseVehicle();
    const root = car.getMesh();
    root.position.set(CAR_AT.x, ground(CAR_AT.x, CAR_AT.z), CAR_AT.z);
    root.rotation.y = yaw;
    g.add(root);
    this.car = car;

    // Bezpečnostní lano od tažného zařízení k koši
    this.rope = new Rope(0x333333);
    g.add(this.rope.mesh);

    // Vektory ve světě: "dozadu" od auta (směrem od balonu) a kolmice
    const away = new THREE.Vector3(CAR_AT.x, 0, CAR_AT.z).normalize();
    const side = new THREE.Vector3(-away.z, 0, away.x);

    // Zákazníci čekají za autem (ne mezi autem a košem) a dívají se na balon
    for (let i = 0; i < plan.passengers; i++) {
      const c = createCharacter('passenger', i * 3 + 1, isFemalePassenger(plan.honorific, i));
      const col = i % 3, row = Math.floor(i / 3);
      const p = new THREE.Vector3(CAR_AT.x, 0, CAR_AT.z).addScaledVector(away, 5 + row * 1.5).addScaledVector(side, 1.3 + col * 1.15 + (row % 2) * 0.5);
      at(c, p.x, p.z);
      c.rotation.y = Math.atan2(-p.x, -p.z);
      g.add(c);
    }

    // Pilot u koše a dva pomocníci: jeden u auta, druhý u pláště
    const pilot = createCharacter('pilot', 0);
    at(pilot, 2.6, -1.8);
    pilot.rotation.y = Math.atan2(-2.6, 1.8);
    const h1 = createCharacter('crew', 0);
    const hp1 = new THREE.Vector3(CAR_AT.x, 0, CAR_AT.z).addScaledVector(away, -2.5).addScaledVector(side, -2.4);
    at(h1, hp1.x, hp1.z);
    h1.rotation.y = Math.atan2(-hp1.x, -hp1.z);
    const h2 = createCharacter('crew', 1);
    at(h2, -2.5, -3.0);
    h2.rotation.y = Math.atan2(2.5, 3.0);
    g.add(pilot, h1, h2);
    this.people = [{ c: pilot, amount: 0 }, { c: h1, amount: 1 }, { c: h2, amount: 0 }];

    // Láhve s plynem u vleku (počet podle menu)
    const trailerAt = new THREE.Vector3(5.2, 0, -5.5).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw).add(root.position);
    for (let i = 0; i < plan.bottles; i++) {
      const b = bottle();
      at(b, trailerAt.x + 2.3 + i * 0.45, trailerAt.z + 1.6 + (i % 2) * 0.3);
      g.add(b);
    }

    app.props.add(g);
    this.group = g;
  }

  update(dt) {
    if (!this.group) return;
    this.t += dt;
    for (const p of this.people) waveArms(p.c, this.t + p.c.id, p.amount);
    const b = this.app.balloon;
    if (this.rope && b) {
      const a = this.car.car.localToWorld(this.car.hitch.clone());
      this.rope.set(a, b.localToWorld(new THREE.Vector3(0, -2.9, 0)));
    }
  }
}
