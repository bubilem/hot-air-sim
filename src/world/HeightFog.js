// Výšková mlha (ranní mlha v údolích): všechny MeshLambertMaterial dostanou mlhu, jejíž hustota
// závisí na tom, jak dlouhou část paprsku kamera→fragment vede vrstvou pod hladinou `top`.
// Nad vrstvou je vzduch čistý, takže balon po vzletu "vystoupí z mlhy".
import * as THREE from 'three';

export const heightFog = {
  top: { value: 0 },          // světová výška horní hladiny mlhy (m)
  density: { value: 0 },      // hustota (1/m), 0 = vypnuto
  color: { value: new THREE.Color(0xe6edf0) },
};

let installed = false;

export function installHeightFog() {
  if (installed) return;
  installed = true;
  THREE.MeshLambertMaterial.prototype.onBeforeCompile = function onBeforeCompile(shader) {
    shader.uniforms.uHfTop = heightFog.top;
    shader.uniforms.uHfDensity = heightFog.density;
    shader.uniforms.uHfColor = heightFog.color;

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vHfY;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vec4 hfP = vec4( transformed, 1.0 );
        #ifdef USE_INSTANCING
          hfP = instanceMatrix * hfP;
        #endif
        vHfY = ( modelMatrix * hfP ).y;`);

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vHfY;\nuniform float uHfTop;\nuniform float uHfDensity;\nuniform vec3 uHfColor;')
      .replace('#include <fog_fragment>', `#include <fog_fragment>
        #ifdef USE_FOG
          float hfLo = min( cameraPosition.y, vHfY );
          float hfHi = max( cameraPosition.y, vHfY );
          // podíl paprsku pod hladinou mlhy (bez dělení téměř nulou: v úrovni očí by jinak vznikla tmavá čára)
          float hfFrac = 1.0;
          if ( hfHi > uHfTop ) hfFrac = hfLo >= uHfTop ? 0.0 : ( uHfTop - hfLo ) / ( hfHi - hfLo );
          float hfOd = uHfDensity * vFogDepth * hfFrac;
          gl_FragColor.rgb = mix( gl_FragColor.rgb, uHfColor, 1.0 - exp( -hfOd ) );
        #endif`);
  };
}

export function setHeightFog({ top, density, color }) {
  heightFog.top.value = top;
  heightFog.density.value = density;
  heightFog.color.value.setHex(color);
}
