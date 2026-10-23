import { defineConfig } from 'vite';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

/** Výstup příkazu gitu, nebo prázdný řetězec (bez gitu, mimo repozitář). */
function git(cmd) {
  try { return execSync(`git ${cmd}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { return ''; }
}

// Verze hry: číslo z package.json (zdroj pravdy), zkrácený hash a datum posledního commitu (viz src/config/Version.js).
// Hash má za sebou „+“, když jsou v pracovním stromu necommitnuté změny.
const hash = git('rev-parse --short HEAD');
const dirty = hash && git('status --porcelain') ? '+' : '';

// Relativní základ: build funguje v libovolné podsložce (např. https://skola.example/hot-air-sim/).
export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_HASH__: JSON.stringify(hash ? hash + dirty : ''),
    __APP_DATE__: JSON.stringify(git('log -1 --format=%cs')),
  },
});
