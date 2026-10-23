// Pozemní rekvizity: ventilátor, vak, kotvicí lano, cílová značka, stolek se sektem.
import * as THREE from 'three';
import brand from '@brand';

const M = (hex) => new THREE.MeshLambertMaterial({ color: hex });

function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
}

/** Nafukovací ventilátor (směr proudění podél +x). */
export function createFan() {
  const g = new THREE.Group();
  const frame = M(0x2f3540), drum = M(0xc9ced6), blade = M(0x20242f);
  g.add(box(0.7, 0.35, 0.9, frame, 0, 0.18, 0));
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.35, 16, 1, true), new THREE.MeshLambertMaterial({ color: 0xc9ced6, side: THREE.DoubleSide }));
  ring.rotation.z = Math.PI / 2;
  ring.position.set(0, 0.95, 0);
  g.add(ring);
  g.add(box(0.1, 0.08, 0.1, frame, 0, 0.35, 0));                       // krátká noha pod bubnem (mimo dráhu lopatek)
  g.add(box(0.1, 0.62, 0.1, frame, -0.1, 0.64, 0));                    // držák osy: od náboje dolů k rámu, za lopatkami (proti proudu)
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.14, 10), frame);   // náboj vrtule
  hub.rotation.z = Math.PI / 2;
  hub.position.set(0, 0.95, 0);
  g.add(hub);
  const prop = new THREE.Group();
  prop.position.set(0, 0.95, 0);
  const b1 = box(0.04, 1.0, 0.1, blade), b2 = box(0.04, 0.1, 1.0, blade);
  prop.add(b1, b2);
  g.add(prop);
  g.userData.prop = prop;
  return g;
}

/** Transportní vak (ležící válec). */
export function createBag() {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.6, 12), M(brand.colors.bag));
  m.rotation.z = Math.PI / 2;
  m.position.y = 0.55;
  const g = new THREE.Group();
  g.add(m);
  return g;
}

/** Tenké "lano" mezi dvěma body, aktualizovatelné. */
export class Rope {
  constructor(color = 0x222222) {
    this.mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 5), new THREE.MeshLambertMaterial({ color }));
    this.mesh.frustumCulled = false;
  }

  set(a, b) {
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    this.mesh.scale.set(1, Math.max(0.01, len), 1);
    this.mesh.position.copy(a).addScaledVector(dir, 0.5);
    this.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  }
}

/** Cílová louka: tyč se dvěma vlajkami (viditelná z dálky). Bez značky na zemi, ta se ve zvlněném terénu ztrácela a překážela by autu a balonu. */
export function createTargetMarker() {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 40, 6), M(0xffffff));
  pole.position.y = 20;
  g.add(pole);

  // Dvě vlajky, které vlají po větru: pivot se natáčí podle větru, plocha se vlní v shaderu
  const uTime = { value: 0 };
  const uAmp = { value: 1 };
  const makeFlag = (w, h, y, color) => {
    const geo = new THREE.PlaneGeometry(w, h, 14, 4).translate(w / 2, 0, 0);   // uchycení u stožáru v x = 0
    const mat = new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide, flatShading: true });
    mat.onBeforeCompile = (sh, renderer) => {
      THREE.MeshLambertMaterial.prototype.onBeforeCompile?.call(mat, sh, renderer);   // výšková mlha
      sh.uniforms.uFlagTime = uTime;
      sh.uniforms.uFlagAmp = uAmp;
      sh.uniforms.uFlagLen = { value: w };
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', `#include <common>
          uniform float uFlagTime, uFlagAmp, uFlagLen;`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          float fk = position.x / uFlagLen;
          transformed.z += sin( position.x * 0.75 - uFlagTime * 4.2 + position.y * 0.3 ) * uFlagAmp * fk;
          transformed.y += sin( position.x * 0.5 - uFlagTime * 3.0 ) * 0.25 * uFlagAmp * fk - fk * fk * 0.6;`);
    };
    const pivot = new THREE.Group();
    pivot.position.y = y;
    pivot.add(new THREE.Mesh(geo, mat));
    g.add(pivot);
    return pivot;
  };
  const pivots = [makeFlag(14, 7, 36, brand.colors.flags[0]), makeFlag(8, 3.5, 29.5, brand.colors.flags[1])];
  let yaw = 0;
  /** t = čas (s), wx/wz = vítr ve výšce vlajky (m/s): vlajky míří po větru a vlají víc při silnějším větru. */
  g.userData.update = (t, wx, wz) => {
    uTime.value = t;
    const sp = Math.hypot(wx, wz);
    uAmp.value = 0.8 + Math.min(2.0, sp * 0.35);
    if (sp > 0.15) {
      const want = Math.atan2(-wz, wx);
      let d = want - yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      yaw += d * 0.03;
    }
    for (const p of pivots) p.rotation.y = yaw;
  };
  return g;
}

/** Stolek se sektem a skleničkami pro oslavu. */
export function createTable() {
  const g = new THREE.Group();
  g.add(box(1.6, 0.06, 0.9, M(0xf4efe6), 0, 0.9, 0));
  for (const [x, z] of [[-0.7, -0.35], [0.7, -0.35], [-0.7, 0.35], [0.7, 0.35]]) g.add(box(0.06, 0.9, 0.06, M(0x333a47), x, 0.45, z));
  const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.36, 8), M(0x1f3b23));
  bottle.position.set(0, 1.14, 0);
  g.add(bottle);
  for (const x of [-0.45, -0.25, 0.25, 0.45]) {
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.03, 0.16, 8), new THREE.MeshLambertMaterial({ color: 0xcfeaf7, transparent: true, opacity: 0.7 }));
    glass.position.set(x, 1.04, 0.1);
    g.add(glass);
  }
  return g;
}
