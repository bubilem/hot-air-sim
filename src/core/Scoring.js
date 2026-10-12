// Skóre a titul. Bez závislosti na Three.js.
import { KIND } from '../phases/LandingResolver.js';

export const SCORE = {
  soft: 600,
  hard: 350,
  fieldPenalty: 120,
  damagePenalty: 25,   // za každou popáleninu nebo trhlinu pláště
  damageMax: 150,
  fuelMax: 200,
  targetMax: 200,
  targetFullDist: 60,
  targetZeroDist: 1500,
  // Aby krátký "hop" hned po vzletu nedával skoro plné body: přistání a palivo se násobí snahou (délka a výška letu)
  minFlightTime: 90,   // s
  minFlightAlt: 60,    // m
  effortFloor: 0.2,    // podíl bodů za přistání i při nulové snaze
};

/**
 * @param {{kind:string, field:boolean, gasFrac:number, targetDist:number, flightTime?:number, maxAlt?:number, damage?:number}} r
 * @returns {{score:number, stars:number, parts:object, tier:number}}
 */
export function scoreFlight(r) {
  const parts = { landing: 0, fuel: 0, target: 0, penalty: 0 };
  if (r.kind === KIND.SOFT) parts.landing = SCORE.soft;
  else if (r.kind === KIND.HARD) parts.landing = SCORE.hard;
  else return { score: 0, stars: 0, parts, tier: 0 };

  const effort = Math.min(1, (r.flightTime ?? Infinity) / SCORE.minFlightTime) * Math.min(1, (r.maxAlt ?? Infinity) / SCORE.minFlightAlt);
  parts.landing = Math.round(parts.landing * (SCORE.effortFloor + (1 - SCORE.effortFloor) * effort));
  parts.fuel = Math.round(SCORE.fuelMax * Math.min(1, Math.max(0, r.gasFrac)) * effort);
  const f = 1 - (r.targetDist - SCORE.targetFullDist) / (SCORE.targetZeroDist - SCORE.targetFullDist);
  parts.target = Math.round(SCORE.targetMax * Math.min(1, Math.max(0, f)));
  if (r.field) parts.penalty = -SCORE.fieldPenalty;
  if (r.damage) parts.penalty -= Math.min(SCORE.damageMax, r.damage * SCORE.damagePenalty);

  const score = Math.max(0, parts.landing + parts.fuel + parts.target + parts.penalty);
  const tier = score >= 850 ? 3 : score >= 650 ? 2 : score >= 450 ? 1 : 0;
  const stars = tier + 1 > 4 ? 4 : tier + 1;
  return { score, stars, parts, tier };
}
