// Vite preset pro HotAirSim s vyměnitelnou značkou (viz doc/16-znacky-brand.md).
// Jádro ani repo značky nemají vlastní složitou konfiguraci: vite.config.js jen zavolá brandConfig({ brandDir }).
//
// Složka značky obsahuje:
//   index.js              výchozí export = objekt značky (rozhraní: tools/brand-contract.js)
//   theme.css             hodnoty CSS tokenů (importuje ho index.js)
//   brand.head.html       obsah <head>: title, SEO, Open Graph, favicon, písmo, styl načítací obrazovky
//   brand.noscript.html   <noscript> blok
//   public/               soubory značky (favicon, og-image, fonty, web.config, envelopes/ …); přepisují společné public/ jádra
import { readFileSync, existsSync, cpSync, createReadStream, statSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const CORE_DIR = resolve(fileURLToPath(new URL('..', import.meta.url)));

const MIME = {
  '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg',
  '.json': 'application/json', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8',
  '.config': 'application/xml', '.ico': 'image/x-icon',
};

function git(coreDir, cmd) {
  try { return execSync(`git -C "${coreDir}" ${cmd}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { return ''; }
}

/** Skládá index.html jádra a soubory značky (bez záblesku špatných barev: barvy načítací obrazovky jsou přímo v HTML). */
function brandHtml(brandDir) {
  const read = (name) => {
    const p = join(brandDir, name);
    if (!existsSync(p)) throw new Error(`Značka v ${brandDir} nemá povinný soubor ${name}`);
    return readFileSync(p, 'utf8');
  };
  return {
    name: 'hotairsim-brand-html',
    transformIndexHtml: {
      order: 'pre',
      handler: (html) => html
        .replace('<!--brand:head-->', () => read('brand.head.html'))
        .replace('<!--brand:noscript-->', () => read('brand.noscript.html')),
    },
  };
}

/** Společné public/ jádra (hudba, titles.json) + public/ značky (má přednost): dev middleware a kopie do dist/. */
function brandPublic(coreDir, brandDir) {
  const dirs = [join(brandDir, 'public'), join(coreDir, 'public')].filter(existsSync);   // první nalezený vyhrává
  let outDir = '';
  return {
    name: 'hotairsim-brand-public',
    configResolved(c) { outDir = c.build.outDir; },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = decodeURIComponent((req.url || '/').split('?')[0]);
        if (url.includes('..') || url === '/') return next();
        for (const d of dirs) {
          const f = join(d, url);
          if (existsSync(f) && statSync(f).isFile()) {
            res.setHeader('Content-Type', MIME[extname(f).toLowerCase()] || 'application/octet-stream');
            return createReadStream(f).pipe(res);
          }
        }
        next();
      });
    },
    writeBundle() {
      for (const d of [...dirs].reverse()) cpSync(d, outDir, { recursive: true });   // značka přepíše společné
    },
  };
}

/**
 * @param {{ brandDir: string, coreDir?: string, outDir?: string }} opts
 *   brandDir = složka značky (absolutní nebo vůči cwd), coreDir = kořen jádra (výchozí: tento repozitář)
 */
export function brandConfig({ brandDir, coreDir = CORE_DIR, outDir }) {
  const brand = resolve(brandDir);
  const pkg = JSON.parse(readFileSync(join(coreDir, 'package.json'), 'utf8'));
  // Verze hry: číslo z package.json jádra, zkrácený hash a datum posledního commitu jádra (viz src/config/Version.js).
  // Hash má za sebou „+“, když jsou v pracovním stromu jádra necommitnuté změny.
  const hash = git(coreDir, 'rev-parse --short HEAD');
  const dirty = hash && git(coreDir, 'status --porcelain') ? '+' : '';
  return {
    root: coreDir,
    base: './',
    publicDir: false,   // řeší plugin brandPublic (společné + značkové)
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
      __APP_HASH__: JSON.stringify(hash ? hash + dirty : ''),
      __APP_DATE__: JSON.stringify(git(coreDir, 'log -1 --format=%cs')),
    },
    resolve: { alias: { '@brand': join(brand, 'index.js') } },
    server: { fs: { allow: [coreDir, brand] } },
    build: { outDir: outDir ? resolve(outDir) : resolve(process.cwd(), 'dist'), emptyOutDir: true },
    // testy hledá vitest ve složce tests/ tam, odkud se spouští (jádro: core/tests, repo značky: tests/ značky)
    test: { dir: resolve(process.cwd(), 'tests') },
    plugins: [brandHtml(brand), brandPublic(coreDir, brand)],
  };
}
