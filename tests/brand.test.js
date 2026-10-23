// Značky (brand): každá složka v brands/ splňuje smlouvu jádra a jádro samo nic o konkrétní značce neví.
import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { validateBrand, missingCssTokens } from '../tools/brand-contract.js';
import cs from '../src/i18n/cs.js';
import en from '../src/i18n/en.js';
import { SITES } from '../src/world/Sites.js';
import titles from '../public/titles.json';

const brandIds = readdirSync('brands').filter((n) => existsSync(join('brands', n, 'index.js')));
const coreCss = readFileSync('src/ui/styles.css', 'utf8');

function walk(dir, ext) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p, ext) : ext.some((e) => p.endsWith(e)) ? [p] : [];
  });
}

describe.each(brandIds)('značka %s', (id) => {
  it('splňuje smlouvu jádra (povinné klíče a typy)', async () => {
    const brand = (await import(`../brands/${id}/index.js`)).default;
    expect(validateBrand(brand)).toEqual([]);
    expect(brand.id).toBe(id.replace(/^_/, ''));
  });

  it('má soubory pro index.html a téma, které nastavuje všechny CSS tokeny jádra', () => {
    for (const f of ['brand.head.html', 'brand.noscript.html', 'theme.css']) expect(existsSync(join('brands', id, f)), f).toBe(true);
    const head = readFileSync(join('brands', id, 'brand.head.html'), 'utf8');
    expect(head).toMatch(/<title>[^<]+<\/title>/);
    expect(head).toMatch(/#loading/);   // barvy načítací obrazovky jsou přímo v HTML (bez záblesku)
    expect(missingCssTokens(coreCss, readFileSync(join('brands', id, 'theme.css'), 'utf8'))).toEqual([]);
  });

  it('popisky odkazů a statistik mají texty v cs i en (jádro + značka)', async () => {
    const brand = (await import(`../brands/${id}/index.js`)).default;
    const keys = [
      ...(brand.links ?? []).flatMap((l) => Object.values(l.places)),
      ...(brand.stats ?? []).map((s) => s.labelKey),
      ...Object.values(brand.promo ?? {}),
    ];
    for (const [lang, core] of [['cs', cs], ['en', en]]) {
      const dict = { ...core, ...brand.i18n?.[lang] };
      expect(keys.filter((k) => !(k in dict)), lang).toEqual([]);
    }
  });
});

describe('jádro', () => {
  // Do jádra nepatří žádný název, logo, barva, URL ani text konkrétní značky (viz AGENTS.md).
  const FORBIDDEN = /HotAirSim|HaBalon|skolavdf|Raleway|Nunito|habalon\.cz|VOŠ/;
  const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

  it('v src/ a index.html nejsou řetězce konkrétní značky (mimo komentáře)', () => {
    const offenders = [...walk('src', ['.js', '.css']), 'index.html']
      .filter((f) => FORBIDDEN.test(stripComments(readFileSync(f, 'utf8'))));
    expect(offenders).toEqual([]);
  });

  it('titles.json pokrývá všechny lokality', () => {
    const ids = SITES.map((s) => s.id);
    const covered = Object.keys(titles.sites ?? {});
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) expect(covered, id).toContain(id);
  });
});
