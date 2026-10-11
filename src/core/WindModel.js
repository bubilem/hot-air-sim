// Vrstvy větru podle výšky nad startem. Bez závislosti na Three.js.
// Osy: +x = východ, -z = sever. Směr = kompasový azimut, KAM vítr vane.

const DEG = Math.PI / 180;

export function bearingToVec(bearingDeg, speed) {
  const b = bearingDeg * DEG;
  return { x: Math.sin(b) * speed, z: -Math.cos(b) * speed };
}

export function vecToBearing(x, z) {
  let b = Math.atan2(x, -z) / DEG;
  if (b < 0) b += 360;
  return b;
}

export class WindModel {
  /** @param {{alt:number, speed:number, bearing:number}[]} layers  speed v m/s, seřazeno podle alt */
  constructor(layers, seed = 1) {
    this.layers = layers.map((l) => ({ alt: l.alt, ...bearingToVec(l.bearing, l.speed) }));
    this.seed = seed;
    this.time = 0;
  }

  update(dt) { this.time += dt; }

  /** Základní vítr (bez turbulence) ve výšce alt. */
  base(alt) {
    const L = this.layers;
    if (alt <= L[0].alt) return { x: L[0].x, z: L[0].z };
    const last = L[L.length - 1];
    if (alt >= last.alt) return { x: last.x, z: last.z };
    for (let i = 0; i < L.length - 1; i++) {
      const a = L[i], b = L[i + 1];
      if (alt <= b.alt) {
        const f = (alt - a.alt) / (b.alt - a.alt);
        const s = f * f * (3 - 2 * f);
        return { x: a.x + (b.x - a.x) * s, z: a.z + (b.z - a.z) * s };
      }
    }
    return { x: last.x, z: last.z };
  }

  /** Vítr ve výšce alt včetně jemné turbulence. */
  at(alt) {
    const w = this.base(alt);
    const sp = Math.hypot(w.x, w.z);
    const t = this.time, s = this.seed;
    const amp = 0.08 + sp * 0.05;
    return {
      x: w.x + Math.sin(t * 0.37 + s + alt * 0.021) * amp + Math.sin(t * 0.93 + s * 2) * amp * 0.4,
      z: w.z + Math.cos(t * 0.41 + s * 1.7 + alt * 0.017) * amp + Math.cos(t * 0.87 + s) * amp * 0.4,
    };
  }
}
