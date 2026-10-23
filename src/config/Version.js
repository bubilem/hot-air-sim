// Verze hry. Číslo je v package.json (zdroj pravdy), hash a datum posledního commitu doplní Vite při buildu (vite.config.js).
// Při vývoji (`npm run dev`) se za číslem zobrazí „-dev“.

/* global __APP_VERSION__, __APP_HASH__, __APP_DATE__ */
export const VERSION = {
  number: typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0.0',
  hash: typeof __APP_HASH__ === 'string' ? __APP_HASH__ : '',
  date: typeof __APP_DATE__ === 'string' ? __APP_DATE__ : '',
  dev: Boolean(import.meta.env?.DEV),
};

/** Text pro úvodní obrazovku: `v0.2.0 · b2fbccf · 2026-10-23` (ve vývoji `v0.2.0-dev · …`). */
export function versionText(v = VERSION) {
  return [`v${v.number}${v.dev ? '-dev' : ''}`, v.hash, v.date].filter(Boolean).join(' · ');
}
