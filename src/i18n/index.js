import cs from './cs.js';
import en from './en.js';

import wikiCs from './wiki.cs.js';
import wikiEn from './wiki.en.js';

const dicts = { cs, en };
const wikis = { cs: wikiCs, en: wikiEn };
let lang = (typeof navigator !== 'undefined' && navigator.language || 'cs').toLowerCase().startsWith('cs') ? 'cs' : 'en';

export function setLang(l) { if (dicts[l]) lang = l; }
export function getLang() { return lang; }
export function getWiki() { return wikis[lang]; }
export function t(key) { return dicts[lang][key] ?? dicts.cs[key] ?? key; }
