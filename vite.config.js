import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { brandConfig, CORE_DIR } from './vite/brand.js';

// Značka se vybírá režimem Vite: `vite --mode habalon` → brands/habalon, jinak (dev, build, test) brands/school.
// Vlastní repo značky používá stejný preset s brandDir ukazujícím na sebe (viz doc/16-znacky-brand.md).
export default defineConfig(({ mode }) => {
  const dir = resolve(CORE_DIR, 'brands', mode);
  return brandConfig({ brandDir: existsSync(resolve(dir, 'index.js')) ? dir : resolve(CORE_DIR, 'brands/school') });
});
