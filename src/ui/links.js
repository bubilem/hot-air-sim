// Marketingové a propagační odkazy značky (brand.links) podle místa ve hře. Jádro nezná žádnou konkrétní URL ani text.
// Do URL nikdy nejde jméno hráče; UTM parametry doplňuje jen značka, která je chce (brand.utm).
import brand from '@brand';
import { t } from '../i18n/index.js';

/** Místa, kde se odkazy zobrazují: obrazovka plánování, diplom, menu v HUD, neúspěšné přistání, encyklopedie. */
export const PLACES = ['plan', 'diploma', 'menu', 'failed', 'wiki'];

/** URL odkazu s UTM parametry (medium = místo, odkud hráč přišel). Bez `brand.utm` nebo s `link.utm === false` beze změny. */
export function linkUrl(link, medium) {
  if (!brand.utm || link.utm === false) return link.href;
  const u = new URL(link.href);
  const p = new URLSearchParams(brand.utm);
  p.set('utm_medium', medium);
  p.forEach((v, k) => u.searchParams.set(k, v));
  return u.toString();
}

/** Odkazy pro dané místo: [{ id, href, label, primary }]. Label je přeložený podle klíče z `link.places[místo]`. */
export function linksFor(place) {
  return (brand.links ?? [])
    .filter((l) => l.places?.[place])
    .map((l) => ({ id: l.id, href: linkUrl(l, place), label: t(l.places[place]), primary: !!l.primary }));
}

/** Tlačítka-odkazy jako HTML (hlavní odkaz `cta`, ostatní `ghost`). Texty a URL jsou z konfigurace značky, ne od hráče. */
export function linksHtml(place) {
  return linksFor(place).map((l) =>
    `<a class="btn ${l.primary ? 'cta' : 'ghost'} link-${l.id}" href="${l.href}" target="_blank" rel="noopener noreferrer">${l.label}</a>`).join('');
}
