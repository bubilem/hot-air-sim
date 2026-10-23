// Smlouva mezi jádrem a značkou (contract 1): kontrola objektu značky a CSS témat. Bez DOM a bez Three.js, použitelné z testů
// i z repa značky (`import { validateBrand } from './core/tools/brand-contract.js'`). Popis rozhraní: doc/16-znacky-brand.md.

export const CONTRACT = 1;
export const PLACES = ['plan', 'diploma', 'menu', 'failed', 'wiki'];

const isStr = (v) => typeof v === 'string' && v.length > 0;
const isFn = (v) => typeof v === 'function';
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isColorNum = (v) => Number.isInteger(v) && v >= 0 && v <= 0xffffff;
const isCss = (v) => isStr(v);

/** Vrací seznam problémů (prázdný = značka splňuje smlouvu). */
export function validateBrand(b) {
  const p = [];
  const need = (cond, msg) => { if (!cond) p.push(msg); };
  if (!b || typeof b !== 'object') return ['značka není objekt'];

  need(b.contract === CONTRACT, `contract musí být ${CONTRACT} (je ${b.contract})`);
  need(/^[a-z][a-z0-9-]*$/.test(b.id ?? ''), 'id: malá písmena, číslice a pomlčky');
  need(isStr(b.name), 'name');
  need(/^[a-z][a-z0-9]*$/.test(b.storagePrefix ?? ''), 'storagePrefix: malá písmena a číslice');
  need(isStr(b.font?.family) && isStr(b.font?.loadSpec), 'font.family a font.loadSpec');

  const c = b.colors ?? {};
  for (const k of ['primary', 'accent', 'bag', 'trailerTarp', 'envelopeRed', 'envelopeWhite', 'envelopeBand']) need(isColorNum(c[k]), `colors.${k} (číslo 0xRRGGBB)`);
  for (const role of ['pilot', 'crew']) {
    need(isColorNum(c[role]?.shirt), `colors.${role}.shirt`);
    need(c[role]?.sleeve == null || isColorNum(c[role]?.sleeve), `colors.${role}.sleeve (číslo nebo null: pak má rukáv barvu trika)`);
    need(c[role]?.vest === null || isColorNum(c[role]?.vest), `colors.${role}.vest (číslo nebo null)`);
  }
  need(Array.isArray(c.flags) && c.flags.length >= 2 && c.flags.every(isColorNum), 'colors.flags: aspoň 2 barvy');
  need(Array.isArray(c.confetti) && c.confetti.length >= 1 && c.confetti.every(isColorNum), 'colors.confetti: aspoň 1 barva');

  for (const k of ['primary', 'accent', 'light', 'warn']) need(isCss(b.canvas?.[k]), `canvas.${k} (CSS barva)`);
  need(isStr(b.logoHtml), 'logoHtml');
  need(isFn(b.drawLogo), 'drawLogo(g, x, y, w)');

  const d = b.diploma ?? {};
  need(isNum(d.height) && d.height >= 700, 'diploma.height (px, aspoň 700)');
  need(isNum(d.headerHeight) && d.headerHeight > 0 && d.headerHeight <= (d.height ?? 0) - 640, 'diploma.headerHeight: pod záhlavím musí zbýt aspoň 640 px');
  for (const k of ['bgTop', 'bgBottom', 'text', 'muted', 'title', 'statBg', 'badge', 'badgeText', 'star', 'starOff']) need(isCss(d.colors?.[k]), `diploma.colors.${k}`);
  need(isFn(d.header), 'diploma.header(g, ctx)');

  // volitelné části
  if (b.character) need(isFn(b.character.decorate), 'character.decorate');
  if (b.vehicle) need(isFn(b.vehicle.decorateCar) && isFn(b.vehicle.decorateTrailer), 'vehicle.decorateCar a .decorateTrailer');
  for (const des of b.envelope?.designs ?? []) need(isStr(des.id) && isStr(des.name?.cs) && isStr(des.name?.en) && isFn(des.paint), `envelope.designs[${des.id}]: id, name.cs, name.en, paint`);
  for (const s of b.stats ?? []) need(s.value != null && isStr(s.labelKey), 'stats[]: value a labelKey');

  const ids = new Set();
  for (const l of b.links ?? []) {
    need(isStr(l.id) && !ids.has(l.id), `links: id "${l.id}" chybí nebo se opakuje`);
    ids.add(l.id);
    need(/^https:\/\//.test(l.href ?? ''), `links[${l.id}].href musí být https URL`);
    const places = Object.keys(l.places ?? {});
    need(places.length > 0 && places.every((k) => PLACES.includes(k)), `links[${l.id}].places: klíče z ${PLACES.join(', ')}`);
    need(Object.values(l.places ?? {}).every(isStr), `links[${l.id}].places: hodnoty jsou klíče i18n`);
  }
  const placed = (place) => (b.links ?? []).some((l) => l.places?.[place]);
  if (placed('menu')) need(isStr(b.promo?.titleKey) && isStr(b.promo?.textKey), 'odkazy v menu vyžadují promo.titleKey a promo.textKey');
  if (placed('failed')) need(isStr(b.promo?.failedTextKey), 'odkazy po neúspěchu vyžadují promo.failedTextKey');
  if (b.utm != null) need(isStr(b.utm) && !/name|jmeno/i.test(b.utm), 'utm: řetězec parametrů bez jména hráče');
  return p;
}

/** Názvy CSS proměnných použité přes var(--x) v textu CSS. */
export function usedCssTokens(css) {
  return new Set([...css.matchAll(/var\(\s*(--[\w-]+)/g)].map((m) => m[1]));
}

/** Názvy CSS proměnných nastavené deklarací --x: … v textu CSS. */
export function definedCssTokens(css) {
  return new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));
}

/** Tokeny, které jádro nastavuje samo za běhu přes JavaScript (style.setProperty), takže je téma dodávat nemusí. */
const RUNTIME_TOKENS = ['--ttl'];

/** Tokeny, které strukturální CSS jádra potřebuje, ale téma značky je nenastavuje (a jádro je samo nedefinuje). */
export function missingCssTokens(coreCss, themeCss) {
  const have = new Set([...definedCssTokens(coreCss), ...definedCssTokens(themeCss), ...RUNTIME_TOKENS]);
  return [...usedCssTokens(coreCss)].filter((t) => !have.has(t)).sort();
}
