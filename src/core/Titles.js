// Tituly na diplomu podle lokality, oslovení a skóre. Data jsou v public/titles.json (viz public/TITLES-README.md).
// Bez Three.js a bez DOM (jen fetch při načtení); `titleFor` je čistá funkce.

/**
 * Načte public/titles.json. Chybějící nebo vadný soubor = prázdná data (hra použije vestavěné tituly).
 * @returns {Promise<{default?:object, sites?:object}>}
 */
export async function loadTitles(baseUrl = '/') {
  try {
    const res = await fetch(`${baseUrl}titles.json`, { cache: 'no-cache' });
    if (!res.ok) return {};
    const data = await res.json();
    return data && typeof data === 'object' ? data : {};
  } catch {
    return {};
  }
}

/**
 * Titul pro lokalitu: nejdřív `sites[siteId]`, pak `default`; vrací null, když nic nevyhovuje (volající použije vestavěný).
 * @param {object} data       obsah titles.json
 * @param {string} siteId
 * @param {'m'|'f'} honorific
 * @param {number} tier       0..3
 * @param {'cs'|'en'} lang
 */
export function titleFor(data, siteId, honorific, tier, lang) {
  for (const group of [data?.sites?.[siteId], data?.default]) {
    const list = group?.[honorific]?.[lang];
    if (Array.isArray(list) && typeof list[tier] === 'string' && list[tier].trim()) return list[tier].trim();
  }
  return null;
}
