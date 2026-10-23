// Obloha: gradientní kupole, slunce a řídké mraky (sprity). Sleduje kameru.
import * as THREE from 'three';
import { heightFog } from './HeightFog.js';
import { CLOUD_LAYER } from '../config/GameConfig.js';
// sunDir [x, výška, z]: +x = východ, +z = jih (sever je -z, stejně jako mapa v plánování). Ráno slunce na východě, večer na západě.

const PRESETS = {
  morning: { horizon: 0xdfe4e8, zenith: 0x4a76b0, sunDir: [0.7, 0.1, 0.55], sunColor: '255,205,150', sunGlow: 0.85, clouds: 0xf4eae4 },
  evening: { horizon: 0xffb88a, zenith: 0x4c6cb4, sunDir: [-0.75, 0.2, 0.45], sunColor: '255,190,120', sunGlow: 1, clouds: 0xffd9bd },
};

function glowTexture(rgb) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, `rgba(${rgb},1)`);
  gr.addColorStop(0.12, `rgba(${rgb},0.95)`);
  gr.addColorStop(0.3, `rgba(${rgb},0.25)`);
  gr.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

function cloudTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const g = c.getContext('2d');
  for (let i = 0; i < 9; i++) {
    const x = 40 + Math.random() * 176, y = 52 + Math.random() * 30, r = 22 + Math.random() * 26;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(255,255,255,0.9)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
  return new THREE.CanvasTexture(c);
}

/**
 * Podíl oblohy ve směru s výškovým úhlem `sinE` zakrytý oblačnou vrstvou (ta samá vrstva jako v HeightFog.js).
 * Zespodu se paprsek k vrstvě dostane po `d` metrech (vzdálená část vrstvy se ztrácí v dálce, `reach`), uvnitř vrstvy je zakryto vše.
 */
export function cloudCover(camY, sinE, lo, hi, density, reach) {
  if (density <= 0 || camY >= hi) return 0;
  if (camY >= lo) return 1;
  if (sinE <= 0) return 0;
  const s = Math.max(sinE, 0.02);
  return (1 - Math.exp(-density * (hi - lo) / s)) * Math.exp(-((lo - camY) / s) / reach);
}

export class Sky {
  constructor() {
    this.group = new THREE.Group();

    const geo = new THREE.SphereGeometry(6000, 24, 16);
    const n = geo.attributes.position.count;
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    const mat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false });
    this.camY = { value: 0 };
    this.cloudReach = { value: CLOUD_LAYER.reach };
    // oblačná vrstva zakrývá oblohu zespodu (stejný vzorec jako `cloudCover`)
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uCamY = this.camY;
      shader.uniforms.uCloudReach = this.cloudReach;
      shader.uniforms.uCloudLo = heightFog.cloudLo;
      shader.uniforms.uCloudHi = heightFog.cloudHi;
      shader.uniforms.uCloudDensity = heightFog.cloudDensity;
      shader.uniforms.uCloudColor = heightFog.cloudColor;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying float vSkyS;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSkyS = normalize( position ).y;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vSkyS;\nuniform float uCamY;\nuniform float uCloudReach;\nuniform float uCloudLo;\nuniform float uCloudHi;\nuniform float uCloudDensity;\nuniform vec3 uCloudColor;')
        .replace('#include <dithering_fragment>', `#include <dithering_fragment>
          if ( uCloudDensity > 0.0 && uCamY < uCloudHi ) {
            float f = 1.0;
            vec3 cc = uCloudColor;
            if ( uCamY < uCloudLo ) {
              float s = max( vSkyS, 0.02 );
              f = vSkyS <= 0.0 ? 0.0 : ( 1.0 - exp( -uCloudDensity * ( uCloudHi - uCloudLo ) / s ) ) * exp( -( ( uCloudLo - uCamY ) / s ) / uCloudReach );
              cc *= 0.82;   // spodek vrstvy je ve stínu
            }
            gl_FragColor.rgb = mix( gl_FragColor.rgb, cc, f );
          }`);
    };
    this.dome = new THREE.Mesh(geo, mat);
    this.dome.renderOrder = -10;
    this.group.add(this.dome);

    this.sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('255,236,190'), blending: THREE.AdditiveBlending, fog: false, depthWrite: false, transparent: true }));
    this.sun.scale.set(1100, 1100, 1);
    this.sun.renderOrder = -9;
    this.group.add(this.sun);

    this.clouds = [];
    const tex = cloudTexture();
    for (let i = 0; i < 26; i++) {
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.85, fog: false, depthWrite: false });
      const s = new THREE.Sprite(mat);
      const a = Math.random() * Math.PI * 2, r = 900 + Math.random() * 3800;
      s.position.set(Math.cos(a) * r, 520 + Math.random() * 420, Math.sin(a) * r);
      const w = 500 + Math.random() * 700;
      s.scale.set(w, w * 0.4, 1);
      s.renderOrder = -8;
      this.group.add(s);
      this.clouds.push(s);
    }
    this.preset = PRESETS.morning;
  }

  getMesh() { return this.group; }

  /** Barva horizontu (pro mlhu a pozadí). */
  get horizonColor() { return this.preset.horizon; }
  get sunDirection() { return new THREE.Vector3(...this.preset.sunDir).normalize(); }

  setTimeOfDay(tod) {
    const p = PRESETS[tod] || PRESETS.morning;
    this.preset = p;
    const pos = this.dome.geometry.attributes.position;
    const col = this.dome.geometry.attributes.color;
    const h = new THREE.Color(p.horizon), z = new THREE.Color(p.zenith), c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const y = Math.max(0, pos.getY(i) / 6000);
      c.copy(h).lerp(z, Math.pow(y, 0.55));
      col.setXYZ(i, c.r, c.g, c.b);
    }
    col.needsUpdate = true;
    this.sun.material.map.dispose();
    this.sun.material.map = glowTexture(p.sunColor);
    this.sun.material.opacity = p.sunGlow;
    this.sun.material.needsUpdate = true;
    this.sun.position.copy(this.sunDirection).multiplyScalar(5500);
    this.clouds.forEach((s) => s.material.color.setHex(p.clouds));
  }

  update(dt, cameraPos) {
    this.group.position.copy(cameraPos);
    this.camY.value = cameraPos.y;
    // slunce a sprity mraků jsou zakryté tam, kde je nad námi souvislá vrstva
    const hf = heightFog;
    const cover = (sinE) => cloudCover(cameraPos.y, sinE, hf.cloudLo.value, hf.cloudHi.value, hf.cloudDensity.value, CLOUD_LAYER.reach);
    this.sun.material.opacity = this.preset.sunGlow * (1 - cover(this.sunDirection.y));
    for (const s of this.clouds) s.material.opacity = 0.85 * (1 - cover(s.position.y / Math.hypot(s.position.x, s.position.y, s.position.z)));
    for (const s of this.clouds) {
      s.position.x += dt * 3;
      if (s.position.x > 4800) s.position.x = -4800;
    }
  }
}
