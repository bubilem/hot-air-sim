// Vyhodnocení dosednutí koše. Bez závislosti na Three.js.
import { LANDING } from '../config/GameConfig.js';
import { BIOME } from '../world/Biomes.js';

export const KIND = {
  SOFT: 'soft',
  HARD: 'hard',
  CRASH: 'crash',
  WATER: 'water',
  FOREST: 'forest',
  ROCK: 'rock',
  TOWN: 'town',
  COLLISION: 'collision',   // plášť narazil do překážky za letu
};

/**
 * @param {{vy:number, vxz:number}} touch  rychlosti při dotyku (vy kladné = klesání)
 * @param {{type:string, slope:number}} biome  výsledek Biomes.sample()
 * @returns {{kind:string, success:boolean, field:boolean}}
 */
export function classifyTouchdown(touch, biome) {
  const { vy, vxz } = touch;
  if (biome.type === BIOME.WATER) return { kind: KIND.WATER, success: false, field: false };
  if (biome.type === BIOME.FOREST) return { kind: KIND.FOREST, success: false, field: false };
  if (biome.type === BIOME.ROCK) return { kind: KIND.ROCK, success: false, field: false };
  if (biome.type === BIOME.TOWN) return { kind: KIND.TOWN, success: false, field: false };
  if (vy > LANDING.hardVy || vxz > LANDING.hardVxz) return { kind: KIND.CRASH, success: false, field: false };

  let kind = vy >= LANDING.softVy || vxz >= LANDING.softVxz ? KIND.HARD : KIND.SOFT;
  if (biome.type === BIOME.HILL && kind === KIND.SOFT) kind = KIND.HARD;
  return { kind, success: true, field: biome.type === BIOME.FIELD };
}

/** Délka tažení koše po trávě (m) při dané vodorovné rychlosti. */
export function dragDistance(vxz) {
  return (vxz * vxz) / (2 * LANDING.dragFriction);
}
