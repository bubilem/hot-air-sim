# 12 – Testování

Program, který nikdo netestuje, funguje jen do první úpravy. V této kapitole se dozvíte, **proč** testovat,
**co** ve hře testujeme, **jak** testy spustit a **jak napsat vlastní**.

## 12.1 Proč testovat

Představte si, že změníte vzorec pro odpor vzduchu. Hra se spustí, balon stoupá… ale **zjistíte až po půl
hodině hraní**, že se přistání vyhodnocuje špatně, protože jste omylem změnili také rychlost při dotyku.
**Automatický test** by chybu našel za zlomek sekundy:

- **odhalí chyby po úpravě** (regrese) – po každé změně spustíte `npm test`,
- **slouží jako dokumentace**: test říká, co má kód dělat,
- **umožňuje odvážné úpravy** – víte, že když testy projdou, nic zásadního se nerozbilo,
- **nutí psát kód v malých, oddělených částech** (což pomáhá architektuře – kapitola 05).

Testovat se **vyplatí hlavně logiku**: fyziku, pravidla, výpočty. Testovat, „jak hra vypadá“, je mnohem
složitější a dělá se ručně (oči hráče).

## 12.2 Spuštění testů

```bash
npm test
```

Vypíše seznam souborů a počet testů:

```
 Test Files  2 passed (2)
      Tests  21 passed (21)
```

Při vývoji se hodí **sledovací režim**, který po každém uložení testy znovu spustí:

```bash
npx vitest
```

Spuštění jediného souboru: `npx vitest run tests/physics.test.js`.

## 12.3 Vitest – základy

Vitest je testovací nástroj kompatibilní s Vite (používá stejné nastavení a stejné `import`). Základní stavební
kameny:

```js
import { describe, it, expect } from 'vitest';

describe('Název skupiny', () => {         // seskupení souvisejících testů
  it('co má kód dělat', () => {           // jeden test
    expect(2 + 2).toBe(4);                // tvrzení (assertion)
  });
});
```

| Funkce | Význam |
| :-- | :-- |
| `describe(jméno, fn)` | skupina testů |
| `it(popis, fn)` (nebo `test`) | jeden test; popis čtěte jako větu „(it) … by měl …“ |
| `expect(hodnota)` | začátek tvrzení |
| `.toBe(x)` | přísná rovnost (`===`) |
| `.toEqual(x)` | rovnost obsahu objektů/polí |
| `.toBeCloseTo(x, číslic)` | rovnost desetinných čísel s tolerancí (**nikdy** `toBe` pro `float`) |
| `.toBeGreaterThan(x)`, `.toBeLessThan(x)` | nerovnosti |
| `.toMatchObject({…})` | objekt obsahuje alespoň zadané vlastnosti |

Test **projde**, pokud kód doběhne a žádné `expect` neselže. Selhání vypíše očekávanou a skutečnou hodnotu
a řádek, kde k tomu došlo.

> **Proč `toBeCloseTo`?** Desetinná čísla se v počítači ukládají přibližně: `0.1 + 0.2` je
> `0.30000000000000004`. Porovnání přesnou rovností by selhávalo. Porovnávejte s tolerancí.

## 12.4 Co testujeme a kde

Testy jsou ve složce `tests/`. Všechny testují **čistou logiku** (bez Three.js a bez prohlížeče) – díky
architektuře z kapitoly 05.

### `tests/physics.test.js`

| Test | Co ověřuje | Proč je to důležité |
| :-- | :-- | :-- |
| stojí na zemi, dokud je studený | po 10 s bez zážehu je `pos.y === 0` | chladný balon nesmí vzlétnout |
| `hoverTemp` dává nulový vztlak | `\|netLiftKg(0)\| < 0.5` při `tempIn = hoverTemp(0)` | konzistence vzorců (kap. 03) |
| po zážehu stoupá a po ventilu klesá | výška po zážehu > 20 m a po ventilu nižší | základní řízení |
| spotřebovává plyn a bez plynu nehoří | `gas` = 0 po dlouhém zážehu | hranice paliva |
| `WindModel` interpoluje mezi vrstvami | uprostřed mezi 2 a 6 m/s je 4 m/s | správnost interpolace |

### `tests/game-rules.test.js`

| Skupina | Co ověřuje |
| :-- | :-- |
| `LandingResolver` | měkké, tvrdé přistání, havárie; voda/les/skála jsou vždy neúspěch; pole = úspěch s penalizací; délka tažení roste s rychlostí |
| `Scoring` | plné skóre za dokonalý let (1 000), havárie = 0, pole skóre snižuje, krátký „hop“ nedává plné body |
| `FlightPlan` | omezení počtu osob (max 5) a lahví (min 1); plný koš večer nevzlétne, lehký ráno ano |
| `Biomes` | determinismus (stejný seed = stejný terén), start je louka, `findMeadow` vrací louku, řeka je voda, skalní masivy, města (rovná zástavba, střechy), kopečky, cíl na louce v každé lokalitě |

## 12.5 Anatomie jednoho testu

```js
it('po zážehu stoupá a po ventilu klesá', () => {
  const p = new PhysicsEngine(cfg);                       // 1) PŘÍPRAVA (Arrange)
  p.tempIn = p.hoverTemp(0) - 2;
  for (let i = 0; i < 60 * 12; i++) p.step(1 / 60, { burn: 1 }, calm, 0);   // 2) AKCE (Act)
  for (let i = 0; i < 60 * 20; i++) p.step(1 / 60, {}, calm, 0);
  expect(p.pos.y).toBeGreaterThan(20);                    // 3) OVĚŘENÍ (Assert)
  const top = p.pos.y;
  for (let i = 0; i < 60 * 15; i++) p.step(1 / 60, { vent: 1 }, calm, 0);
  for (let i = 0; i < 60 * 20; i++) p.step(1 / 60, {}, calm, 0);
  expect(p.pos.y).toBeLessThan(top);
});
```

Vzor **Arrange–Act–Assert** (připrav, proveď, ověř) je vhodný pro většinu testů.
Všimněte si: test **nespouští hru**, jen volá `step` stokrát. Díky pevnému kroku (1/60 s) je výsledek
**deterministický** – stále stejný při každém spuštění.

Testujeme **chování**, ne konkrétní čísla: „po zážehu stoupá“ je pravdivé i po drobném doladění konstant.
Test s přesným číslem (`expect(y).toBe(37.12)`) by se musel přepisovat při každé úpravě.

## 12.6 Jak napsat vlastní test

Úkol: ověřit, že nová funkce `kmhToMs(v)` převádí km/h na m/s.

1. Napište funkci (např. do `src/core/units.js`):

   ```js
   export const kmhToMs = (v) => v / 3.6;
   ```

2. Vytvořte soubor `tests/units.test.js` (soubory musí končit `.test.js`):

   ```js
   import { describe, it, expect } from 'vitest';
   import { kmhToMs } from '../src/core/units.js';

   describe('units', () => {
     it('převádí km/h na m/s', () => {
       expect(kmhToMs(36)).toBeCloseTo(10, 6);
       expect(kmhToMs(0)).toBe(0);
     });
   });
   ```

3. Spusťte `npm test`.

### Doporučený postup „test first“ (TDD)

1. Napište **test** pro funkci, která ještě není (selže – „červená“).
2. Napište **nejjednodušší kód**, aby test prošel („zelená“).
3. Kód **vylepšete** (refaktoring), testy stále procházejí.

### Co testovat při změně fyziky

Používejte **vlastnosti**, které musí platit vždy (*invarianty*):

- víc pasažérů → vyšší teplota pro visení,
- teplejší okolní vzduch → vyšší teplota pro visení,
- při `burn = 0` teplota v plášti **neroste**,
- plyn **neroste**,
- bez větru se vodorovná rychlost **neobjeví**,
- výška nikdy není pod terénem.

## 12.7 Co testy nepokrývají

- **Vzhled** (barvy, rozvržení, 3D scéna) – kontroluje se okem; v prohlížeči ve vývojovém režimu.
- **Dotykové ovládání** – testujte na skutečném telefonu (`npm run dev -- --host`, kap. 02).
- **Výkon** (FPS) – měří se v prohlížeči (`F12` → *Performance*).
- **Zvuk** – poslechem.

Pro tyto věci existují nástroje (*Playwright*, *Cypress*) pro automatické „proklikání“ aplikace v prohlížeči;
v projektu zatím nejsou. Je to zajímavé rozšíření (kap. 14).

## 12.8 Ruční testovací scénáře

Před odevzdáním větších úprav projděte aspoň tyto scénáře (kontrolní seznam):

| # | Scénář | Očekávání |
| :-: | :-- | :-- |
| 1 | načtení hry | scéna plánování se zobrazí, konzole (`F12`) je bez červených chyb |
| 2 | přepnutí CS ↔ EN | všechny texty se přeloží, žádný text není ve formátu `klíč.jako.tento` |
| 3 | start → let → měkké přistání → oslava → osvědčení | celá cesta projde, osvědčení lze stáhnout |
| 4 | přistání do vody | neúspěch, tlačítka *Zkusit znovu* a *Změnit plán* fungují |
| 5 | přetížení balonu (5 osob, 4 lahve, večer) | tlačítko „Vzlétnout“ je zablokované, varování |
| 6 | encyklopedie | hra se při čtení zastaví, po zavření pokračuje |
| 7 | zvuk | ztlumení (`M`) funguje, hlasitost se pamatuje po obnovení stránky |
| 8 | mobilní telefon na výšku i na šířku | tlačítka na dosah palce, nic se nepřekrývá |
| 9 | ladění `?skip=1&alt=200` | vzlétne se rovnou |
