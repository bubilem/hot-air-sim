// Texty: každý použitý klíč existuje v češtině i angličtině po sloučení jádra a značky; cs a en mají stejné klíče.
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import brand from '@brand';
import cs from '../src/i18n/cs.js';
import en from '../src/i18n/en.js';
import { t, setLang, getWiki } from '../src/i18n/index.js';

function files(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? files(p) : p.endsWith('.js') ? [p] : [];
  });
}

/** Klíče z volání t('…') ve zdrojích jádra a značky (dynamické klíče s ${} se přeskakují). */
function usedKeys() {
  const keys = new Set();
  for (const f of [...files('src'), ...files('brands')]) {
    for (const m of readFileSync(f, 'utf8').matchAll(/\bt\(\s*['"]([\w.]+)['"]\s*\)/g)) keys.add(m[1]);
  }
  // klíče předané jako data značky
  for (const l of brand.links ?? []) Object.values(l.places ?? {}).forEach((k) => keys.add(k));
  for (const s of brand.stats ?? []) keys.add(s.labelKey);
  Object.values(brand.promo ?? {}).forEach((k) => keys.add(k));
  return [...keys];
}

describe('i18n', () => {
  it.each(['cs', 'en'])('všechny použité klíče existují (%s)', (lang) => {
    setLang(lang);
    expect(usedKeys().length).toBeGreaterThan(50);   // regex opravdu nachází klíče
    const missing = usedKeys().filter((k) => t(k) === k);
    expect(missing).toEqual([]);
  });

  it('cs a en mají po sloučení se značkou stejné klíče', () => {
    const c = Object.keys({ ...cs, ...brand.i18n?.cs }).sort();
    const e = Object.keys({ ...en, ...brand.i18n?.en }).sort();
    expect(c).toEqual(e);
  });

  it('kategorie encyklopedie značky mají v cs i en stejná id a unikátní id', () => {
    setLang('cs');
    const idsCs = getWiki().map((x) => x.id);
    setLang('en');
    const idsEn = getWiki().map((x) => x.id);
    expect(idsCs).toEqual(idsEn);
    expect(new Set(idsCs).size).toBe(idsCs.length);
  });
});
