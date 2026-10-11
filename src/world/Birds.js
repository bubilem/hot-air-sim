// Nenápadné ptactvo: vzdálená hejna a občas jeden větší pták, který přeletí kolem balonu.
// Vše je jeden InstancedMesh (jeden draw call); mávání křídel dělá vertex shader, pohyb se počítá jen pro pár desítek instancí.
import * as THREE from 'three';
import { BIRDS } from '../config/GameConfig.js';
import { COLORS } from '../config/Colors.js';

const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);

/** Pták: tělo + dvě křídla (trojúhelníky), rozpětí ±1 podél x, špička nosu v +z. aWing: 0 = tělo, 1 = špička křídla. */
function buildBirdGeometry() {
  const pos = [
    0, 0, 0.45, -0.1, 0, -0.2, 0.1, 0, -0.2,            // tělo
    0, 0, 0.3, 0, 0, -0.3, -1, 0, -0.12,               // levé křídlo
    0, 0, -0.3, 0, 0, 0.3, 1, 0, -0.12,                // pravé křídlo
  ];
  const wing = [0, 0, 0, 0, 0, 1, 0, 0, 1];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('aWing', new THREE.Float32BufferAttribute(wing, 1));
  geo.computeVertexNormals();
  return geo;
}

export class Birds {
  /** @param {{groundHeight:(x:number,z:number)=>number}} biomes */
  constructor(biomes) {
    this.biomes = biomes;
    this.time = 0;
    this.enabled = BIRDS.enabled;
    this.group = new THREE.Group();
    if (!this.enabled) return;

    this.capacity = BIRDS.flocks * BIRDS.maxSize + 1;     // + 1 návštěvník
    const geo = buildBirdGeometry();
    this.flapAttr = new THREE.InstancedBufferAttribute(new Float32Array(this.capacity * 3), 3);   // fáze, frekvence, amplituda
    geo.setAttribute('aFlap', this.flapAttr);

    this.uTime = { value: 0 };
    const mat = new THREE.MeshLambertMaterial({ color: COLORS.bird, side: THREE.DoubleSide, flatShading: true });
    mat.onBeforeCompile = (sh, renderer) => {
      THREE.MeshLambertMaterial.prototype.onBeforeCompile?.call(mat, sh, renderer);   // výšková mlha
      sh.uniforms.uBirdTime = this.uTime;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', `#include <common>
          attribute float aWing;
          attribute vec3 aFlap;
          uniform float uBirdTime;`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          transformed.y += sin( uBirdTime * aFlap.y + aFlap.x ) * aFlap.z * aWing * 0.6;`);
    };
    this.mesh = new THREE.InstancedMesh(geo, mat, this.capacity);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    this.group.add(this.mesh);

    this.flocks = [];
    for (let i = 0; i < BIRDS.flocks; i++) {
      const n = Math.round(rand(BIRDS.minSize, BIRDS.maxSize));
      this.flocks.push({ n, x: 0, z: 0, alt: 0, heading: 0, speed: 0, seed: Math.random() * 100, fresh: true, members: this.makeMembers(n) });
    }
    this.visitor = { active: false, wait: rand(...BIRDS.visitorEvery) * 0.4, x: 0, z: 0, dy: 0, curY: 0, heading: 0, t: 0 };
    this.m = new THREE.Matrix4();
    this.q = new THREE.Quaternion();
    this.p = new THREE.Vector3();
    this.s = new THREE.Vector3();
    this.up = new THREE.Vector3(0, 1, 0);
  }

  getMesh() { return this.group; }

  makeMembers(n) {
    // volné "V": člen j stojí vedle a za vůdcem, s náhodnou odchylkou
    const members = [];
    for (let j = 0; j < n; j++) {
      const k = Math.ceil(j / 2), side = j % 2 ? 1 : -1;
      members.push({
        ox: side * k * rand(4, 7) + rand(-1.5, 1.5),
        oz: -k * rand(3, 6) + rand(-1.5, 1.5),
        oy: rand(-2, 2),
        phase: rand(0, TAU),
        rate: rand(7, 10),
        scale: BIRDS.birdSize * rand(0.85, 1.15),
      });
    }
    return members;
  }

  respawnFlock(f, cam) {
    const a = rand(0, TAU), d = rand(BIRDS.minDist, BIRDS.maxDist);
    f.x = cam.x + Math.cos(a) * d;
    f.z = cam.z + Math.sin(a) * d;
    f.alt = rand(BIRDS.minAlt, BIRDS.maxAlt);
    f.heading = rand(0, TAU);
    f.speed = rand(...BIRDS.speed);
    f.fresh = false;
  }

  spawnVisitor(cam) {
    const v = this.visitor;
    const a = rand(0, TAU), start = BIRDS.visitorStartDist;
    v.x = cam.x + Math.cos(a) * start;
    v.z = cam.z + Math.sin(a) * start;
    // míří kolem balonu s bočním odstupem
    const off = rand(BIRDS.visitorPass[0], BIRDS.visitorPass[1]) * (Math.random() < 0.5 ? -1 : 1);
    const tx = cam.x + Math.cos(a + Math.PI / 2) * off, tz = cam.z + Math.sin(a + Math.PI / 2) * off;
    v.heading = Math.atan2(tx - v.x, tz - v.z);
    v.dy = rand(-12, 22);   // výška vůči balonu
    v.t = 0;
    v.active = true;
  }

  /** @param {number} dt @param {THREE.Vector3} cam poloha kamery (balonu) */
  update(dt, cam) {
    if (!this.enabled) return;
    this.time += dt;
    this.uTime.value = this.time;
    const { m, q, p, s, up } = this;
    let idx = 0;
    const put = (x, y, z, heading, scale, phase, rate, amp, bank = 0) => {
      q.setFromAxisAngle(up, heading);
      if (bank) q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), bank));
      p.set(x, y, z);
      s.setScalar(scale);
      m.compose(p, q, s);
      this.mesh.setMatrixAt(idx, m);
      this.flapAttr.setXYZ(idx, phase, rate, amp);
      idx++;
    };

    for (const f of this.flocks) {
      const dx = f.x - cam.x, dz = f.z - cam.z, dist = Math.hypot(dx, dz);
      if (f.fresh || dist > BIRDS.maxDist * 1.15 || dist < BIRDS.minDist * 0.6) this.respawnFlock(f, cam);
      f.heading += Math.sin(this.time * 0.07 + f.seed) * 0.05 * dt;
      f.x += Math.sin(f.heading) * f.speed * dt;
      f.z += Math.cos(f.heading) * f.speed * dt;
      const sh = Math.sin(f.heading), ch = Math.cos(f.heading);
      for (let j = 0; j < f.n; j++) {
        const b = f.members[j];
        const x = f.x + b.ox * ch + b.oz * sh;
        const z = f.z - b.ox * sh + b.oz * ch;
        const y = this.biomes.groundHeight(x, z) + f.alt + b.oy + Math.sin(this.time * 0.6 + b.phase) * 1.2;
        put(x, y, z, f.heading, b.scale, b.phase, b.rate, 0.55);
      }
    }

    // občasný větší pták, který kolem balonu přeletí a kluzem se vznáší
    const v = this.visitor;
    if (v.active) {
      v.t += dt;
      v.heading += Math.sin(v.t * 0.5) * 0.04 * dt;
      v.x += Math.sin(v.heading) * BIRDS.visitorSpeed * dt;
      v.z += Math.cos(v.heading) * BIRDS.visitorSpeed * dt;
      const away = Math.hypot(v.x - cam.x, v.z - cam.z);
      if (v.t > 8 && away > BIRDS.visitorStartDist * 1.1) { v.active = false; v.wait = rand(...BIRDS.visitorEvery); }
      const y = Math.max(cam.y + v.dy + Math.sin(v.t * 0.4) * 3, this.biomes.groundHeight(v.x, v.z) + 15);
      v.curY = y;
      const flapping = Math.sin(v.t * 0.35) > 0.2;       // střídá mávání a plachtění
      put(v.x, y, v.z, v.heading, BIRDS.visitorSize, 0, flapping ? 3.2 : 0.8, flapping ? 0.5 : 0.12, Math.sin(v.t * 0.4) * 0.25);
    } else {
      v.wait -= dt;
      if (v.wait <= 0) this.spawnVisitor(cam);
    }

    this.mesh.count = idx;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.flapAttr.needsUpdate = true;
  }

  dispose() {
    if (!this.enabled) return;
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.mesh.dispose();
  }
}
