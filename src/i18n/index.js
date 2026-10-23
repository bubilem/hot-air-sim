import brand from '@brand';
import cs from './cs.js';
import en from './en.js';

import wikiCs from './wiki.cs.js';
import wikiEn from './wiki.en.js';

/** Značka přepisuje neutrální texty jádra (brand.i18n) a přidává vlastní kategorie encyklopedie (brand.wiki; stejné id kategorii jádra nahradí). */
const dicts = { cs: { ...cs, ...brand.i18n?.cs }, en: { ...en, ...brand.i18n?.en } };
const mergeWiki = (core, own = []) => [...core.filter((c) => !own.some((o) => o.id === c.id)), ...own];
const wikis = { cs: mergeWiki(wikiCs, brand.wiki?.cs), en: mergeWiki(wikiEn, brand.wiki?.en) };
let lang = (typeof navigator !== 'undefined' && navigator.language || 'cs').toLowerCase().startsWith('cs') ? 'cs' : 'en';

export function setLang(l) { if (dicts[l]) lang = l; }
export function getLang() { return lang; }
export function getWiki() { return wikis[lang]; }
/** Existuje text pro klíč (v jazyce nebo čeština)? Pro volitelné texty značky. */
export function hasKey(key) { return key in dicts[lang] || key in dicts.cs; }
export function t(key) { return dicts[lang][key] ?? dicts.cs[key] ?? key; }
