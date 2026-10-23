// Odkazy značky: umístění, UTM a to, že značka bez odkazů nezobrazí nic.
import { describe, it, expect, vi } from 'vitest';

vi.mock('@brand', () => ({
  default: {
    utm: 'utm_source=game&utm_campaign=sim',
    links: [
      { id: 'order', href: 'https://example.test/lety', primary: true, places: { diploma: 'result.again', menu: 'result.again', failed: 'result.again' } },
      { id: 'plain', href: 'https://example.test/x?a=1', utm: false, places: { wiki: 'result.again' } },
    ],
  },
}));

const { linksFor, linksHtml } = await import('../src/ui/links.js');

describe('brand.links', () => {
  it('vrací odkazy jen pro dané místo', () => {
    expect(linksFor('diploma').map((l) => l.id)).toEqual(['order']);
    expect(linksFor('plan')).toEqual([]);
    expect(linksHtml('plan')).toBe('');
  });

  it('přidá UTM a medium podle místa, jméno hráče v URL není', () => {
    const u = new URL(linksFor('menu')[0].href);
    expect(u.searchParams.get('utm_source')).toBe('game');
    expect(u.searchParams.get('utm_medium')).toBe('menu');
    expect(u.search).not.toMatch(/name|jmeno/i);
  });

  it('odkaz s utm:false zůstane beze změny', () => {
    expect(linksFor('wiki')[0].href).toBe('https://example.test/x?a=1');
  });

  it('hlavní odkaz je cta, ostatní ghost, s rel noopener', () => {
    expect(linksHtml('diploma')).toMatch(/class="btn cta link-order".*rel="noopener noreferrer"/);
  });
});
