// Skóre a titul. Bez závislosti na Three.js.
import { KIND } from '../phases/LandingResolver.js';

export const SCORE = {
  // Cíl hry je přežít a dostat se k cíli, proto nejvíc bodů dává postup k cíli (ne přistání samo o sobě)
  targetMax: 500,        // body za postup: podíl zkrácené vzdálenosti k cíli (0 = jako na startu, 1 = v kruhu cíle)
  targetFullDist: 60,    // m od cíle, kde je postup 100 % (kruh značky)
  targetBonus: 150,      // navíc za přistání přímo v kruhu cíle
  soft: 250,
  hard: 150,
  fuelMax: 100,
  fieldPenalty: 120,
  damagePenalty: 25,     // za každou popáleninu nebo trhlinu pláště
  damageMax: 150,
  // Přistání a palivo se počítají jen úměrně postupu: "hop" hned po startu bez postupu k cíli dá jen zlomek
  gateProgress: 0.5,     // postup, od kterého se přistání a palivo počítají naplno
  gateFloor: 0.1,        // podíl bodů za přistání při nulovém postupu
  defaultStartDist: 1500, // m, vzdálenost startu od cíle, když ji volající nezná
  tiers: [300, 600, 850], // hranice skóre pro 2., 3. a 4. hvězdu (1 hvězda = přežil a přistál)
};

/**
 * Postup k cíli 0..1 z počáteční a konečné vzdálenosti od cíle.
 * @param {number} startDist
 * @param {number} dist
 */
export function targetProgress(startDist, dist) {
  const span = Math.max(1, startDist - SCORE.targetFullDist);
  return Math.min(1, Math.max(0, (startDist - dist) / span));
}

/**
 * @param {{kind:string, field:boolean, gasFrac:number, targetDist:number, startDist?:number, damage?:number}} r
 * @returns {{score:number, stars:number, parts:object, tier:number, progress:number}}
 */
export function scoreFlight(r) {
  const parts = { landing: 0, fuel: 0, target: 0, bonus: 0, penalty: 0 };
  if (r.kind !== KIND.SOFT && r.kind !== KIND.HARD) return { score: 0, stars: 0, parts, tier: 0, progress: 0 };

  const progress = targetProgress(r.startDist ?? SCORE.defaultStartDist, r.targetDist);
  const gate = SCORE.gateFloor + (1 - SCORE.gateFloor) * Math.min(1, progress / SCORE.gateProgress);
  parts.target = Math.round(SCORE.targetMax * progress);
  parts.landing = Math.round((r.kind === KIND.SOFT ? SCORE.soft : SCORE.hard) * gate);
  parts.fuel = Math.round(SCORE.fuelMax * Math.min(1, Math.max(0, r.gasFrac)) * gate);
  if (r.targetDist <= SCORE.targetFullDist) parts.bonus = SCORE.targetBonus;
  if (r.field) parts.penalty = -SCORE.fieldPenalty;
  if (r.damage) parts.penalty -= Math.min(SCORE.damageMax, r.damage * SCORE.damagePenalty);

  const score = Math.max(0, parts.landing + parts.fuel + parts.target + parts.bonus + parts.penalty);
  const tier = SCORE.tiers.filter((v) => score >= v).length;
  const stars = tier + 1;
  return { score, stars, parts, tier, progress };
}
