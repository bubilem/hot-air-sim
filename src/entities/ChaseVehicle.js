// Doprovodná souprava: černý terénní vůz (styl Land Rover Defender) + přívěsný vlek.
// Lokální osy: délka podél +z (přední část vozu míří do +z).
import * as THREE from 'three';
import { BRAND } from '../config/Colors.js';
import { labelPlane } from './SchoolMark.js';

const M = (hex) => new THREE.MeshLambertMaterial({ color: hex });

function box(w, h, d, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
}

/** Kolo s osou podél x. */
function wheel(x, y, z, r, w, tire, hub) {
  const g = new THREE.Group();
  const t = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 16), tire);
  t.rotation.z = Math.PI / 2;
  const h = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.55, w + 0.02, 10), hub);
  h.rotation.z = Math.PI / 2;
  g.add(t, h);
  g.position.set(x, y, z);
  return g;
}

export class ChaseVehicle {
  constructor() {
    this.root = new THREE.Group();
    this.car = this.buildCar();
    this.trailer = this.buildTrailer();
    this.trailer.position.set(5.2, 0, -5.5);
    this.root.add(this.car, this.trailer);
    this.hitch = new THREE.Vector3(0, 0.7, -2.6); // tažné zařízení vzadu (lokálně)
  }

  getMesh() { return this.root; }

  /** Boxy terénní vůz: rovná kapota, vysoká kabina, střešní nosič, rezerva vzadu. */
  buildCar() {
    const g = new THREE.Group();
    const body = M(0x15171a), trim = M(0x2b2e33), glass = M(0x2a3642), grey = M(0x6f757d);
    const tire = M(0x0d0d0d), hub = M(0x8a8f96);
    const lamp = new THREE.MeshBasicMaterial({ color: 0xfff1b8 });
    const red = new THREE.MeshBasicMaterial({ color: 0xd8262d });

    g.add(box(1.8, 0.75, 4.3, body, 0, 0.8, 0));                  // spodní karoserie
    g.add(box(1.7, 0.42, 1.3, body, 0, 1.38, 1.45));              // rovná kapota
    g.add(box(1.76, 0.95, 2.95, body, 0, 1.65, -0.675));          // vysoká kabina (navazuje na kapotu a sahá až k zádi)
    g.add(box(1.8, 0.08, 3.0, trim, 0, 2.165, -0.675));           // střecha
    g.add(box(1.78, 0.5, 2.53, glass, 0, 1.8, -0.485));             // boční okna
    g.add(box(1.5, 0.55, 0.07, glass, 0, 1.78, 0.82));             // čelní sklo
    // přední maska, nárazník, kulaté světlomety
    g.add(box(1.0, 0.36, 0.06, trim, 0, 1.0, 2.17));
    g.add(box(1.9, 0.22, 0.2, grey, 0, 0.5, 2.2));
    for (const s of [-1, 1]) {
      const l = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.1, 12), lamp);
      l.rotation.x = Math.PI / 2;
      l.position.set(s * 0.68, 1.05, 2.17);
      g.add(l);
      g.add(box(0.2, 0.12, 0.06, red, s * 0.72, 0.95, -2.17));    // zadní světla
      // zpětná zrcátka
      g.add(box(0.16, 0.2, 0.2, trim, s * 0.94, 1.65, 0.62));
    }
    // střešní nosič
    for (const s of [-1, 1]) g.add(box(0.05, 0.05, 2.4, grey, s * 0.72, 2.28, -0.85));
    for (const z of [-1.9, -1.0, -0.1]) g.add(box(1.5, 0.05, 0.05, grey, 0, 2.28, z));
    // rezerva na zadních dveřích
    const spare = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.24, 16), tire);
    spare.rotation.x = Math.PI / 2;
    spare.position.set(0, 1.35, -2.27);   // zadní plocha kola těsně na dveřích (-2,15)
    const spareHub = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.26, 10), hub);
    spareHub.rotation.x = Math.PI / 2;
    spareHub.position.copy(spare.position);
    g.add(spare, spareHub);
    // tažné zařízení: tyč od zádě karoserie s kulovou hlavou (sem se zavěšuje lano i vlek)
    g.add(box(0.12, 0.12, 0.55, trim, 0, 0.56, -2.425));
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), grey);
    ball.position.set(0, 0.66, -2.6);
    g.add(ball);
    // kola
    for (const [x, z] of [[-1.0, 1.4], [1.0, 1.4], [-1.0, -1.4], [1.0, -1.4]]) g.add(wheel(x, 0.5, z, 0.5, 0.34, tire, hub));
    // polep školy (symbol + název) na obou bocích
    for (const s of [-1, 1]) {
      const l = labelPlane(2.4, 0.56, '#ffffff');
      l.position.set(s * 0.905, 0.9, s > 0 ? -0.3 : 0.25);   // s = +1 je levý bok vozu (pohled po směru jízdy), s = -1 pravý; pravý je zrcadlově otočený, proto se posouvá dopředu
      l.rotation.y = s * Math.PI / 2;
      g.add(l);
    }
    return g;
  }

  /** Přívěs s tmavou plachtou a azurovým polepem školy. */
  buildTrailer() {
    const g = new THREE.Group();
    const bed = M(0x2b2e33), tarp = M(BRAND.bgTop), tire = M(0x0d0d0d), hub = M(0x8a8f96);
    g.add(box(1.9, 0.18, 3.2, bed, 0, 0.55, 0));
    g.add(box(1.8, 1.1, 3.0, tarp, 0, 1.19, 0));
    g.add(wheel(-1.0, 0.4, -0.2, 0.4, 0.28, tire, hub), wheel(1.0, 0.4, -0.2, 0.4, 0.28, tire, hub));
    g.add(box(0.1, 0.1, 1.6, bed, 0, 0.55, 2.4));                   // oj
    for (const s of [-1, 1]) {
      const l = labelPlane(2.6, 0.7, '#41d7ff');
      l.position.set(s * 0.912, 1.2, 0);
      l.rotation.y = s * Math.PI / 2;
      g.add(l);
    }
    return g;
  }

  /** Nastaví polohu a natočení vozu (yaw v radiánech; přední část míří do směru yaw). */
  setCarPose(x, y, z, yaw) {
    this.car.position.set(x, y, z);
    this.car.rotation.y = yaw;
  }
}
