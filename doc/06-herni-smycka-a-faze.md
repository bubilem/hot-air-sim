# 06 – Herní smyčka a herní fáze

Každá hra a každý simulátor má v jádru **smyčku**: stále dokola zjišťuje vstup, posune svět o malý
kousek času a vykreslí obraz. Tato kapitola vysvětluje, jak smyčka funguje v HotAirSim, proč je
fyzika odděleně od kreslení a co se děje v jednotlivých herních fázích.

## 6.1 Co je herní smyčka

Nejjednodušší herní smyčka vypadá takto:

```js
while (true) {
  const vstup = cistVstup();
  posunSvet(vstup);       // fyzika, logika
  vykresli();             // obraz
}
```

V prohlížeči ale nesmíme použít nekonečný `while` – zablokoval by stránku. Místo toho prohlížeče nabízejí
funkci **`requestAnimationFrame(callback)`**: požádá prohlížeč, aby zavolal naši funkci **těsně před
vykreslením dalšího snímku** (obvykle 60× za sekundu, na obrazovkách se 120 Hz až 120× za sekundu).

```js
// src/core/GameApp.js, metoda start()
start() {
  this.sm.change('PLAN');
  this.last = performance.now();
  const loop = (now) => {
    requestAnimationFrame(loop);                    // naplánuj další snímek
    const dt = Math.min(0.1, (now - this.last) / 1000);   // čas od minulého snímku (s)
    this.last = now;
    this.frame(dt);
  };
  requestAnimationFrame(loop);
}
```

Co je důležité:

- `now` je časová značka v milisekundách; `dt` je **doba mezi snímky** v sekundách (např. 0,0167 s).
- `Math.min(0.1, …)` je pojistka: pokud se karta v prohlížeči na chvíli zastaví (uživatel přepne na jinou
  kartu, počítač se zasekne), `dt` by byl obrovský a hra by „skočila“. Omezením na 0,1 s tomu zabráníme.
- Prohlížeč **sám pozastaví** `requestAnimationFrame`, když je karta skrytá – šetří baterii.

## 6.2 Proč „pevný krok fyziky“

**Problém.** Počítače kreslí různě rychle: na rychlém PC 144 FPS, na starém telefonu 25 FPS.
Kdybychom fyziku počítali jednou za snímek s proměnným `dt`, vedly by různé počítače k **různým
výsledkům**:

- numerická integrace je s větším `dt` méně přesná a může být **nestabilní**,
- opakovatelnost (stejný vstup = stejný výsledek) by byla pryč,
- konstanty ve tvaru „× 0,9 v každém kroku“ by závisely na FPS.

**Řešení.** Oddělíme **čas fyziky** od **času kreslení**. Fyzika se počítá v krocích **pevné délky**
`FIXED_DT = 1/60 s`. Kolik kroků proběhne v jednom snímku, závisí na tom, kolik času uplynulo.
Technika se nazývá **akumulátor času** (*fixed timestep with accumulator*):

```js
const FIXED_DT = 1 / 60;

frame(dt) {
  if (this.paused) {                     // encyklopedie otevřená: svět stojí, jen se kreslí
    this.renderer.render(this.scene, this.camera);
    return;
  }
  this.acc += dt;                        // naakumuluj uplynulý čas
  let steps = 0;
  while (this.acc >= FIXED_DT && steps < 6) {
    this.sm.fixedUpdate(FIXED_DT);       // jeden krok fyziky
    this.acc -= FIXED_DT;
    steps++;
  }
  this.sm.update(dt);                    // vizuály a UI: jednou za snímek
  ...
  this.renderer.render(this.scene, this.camera);
}
```

### Jak to funguje na příkladu

| Snímek | `dt` | `acc` před | kroků fyziky | `acc` po |
| :-: | :-: | :-: | :-: | :-: |
| 1 | 16,7 ms | 16,7 | 1 | 0,0 |
| 2 | 20,0 ms | 20,0 | 1 | 3,3 |
| 3 | 16,7 ms | 20,0 | 1 | 3,3 |
| 4 | 50,0 ms (zaškobrtnutí) | 53,3 | 3 | 3,3 |

Rychlé počítače udělají někdy 0 kroků (obraz je rychlejší než fyzika), pomalé několik kroků najednou
(dohánějí). Fyzika **vždy dostane `dt` = 1/60 s**, takže vývoj hry je na všech zařízeních
stejný.

### „Spirála smrti“ a pojistka `steps < 6`

Kdyby byl jeden krok fyziky pomalejší než 1/60 s, akumulátor by narůstal, každý snímek by dělal víc kroků,
což by ho zpomalilo ještě víc… Hra by se **zasekla**. Proto je počet kroků na snímek omezen na 6.
Při velkém zpomalení se hra raději zpomalí (zpomalený čas), než by se zasekla.

### Co obnáší `update` a co `fixedUpdate`

| Metoda | Frekvence | Co patří dovnitř |
| :-- | :-: | :-- |
| `fixedUpdate(dt)` | pevně 60× za s | fyzika, vstup do fyziky, stav herní logiky |
| `update(dt)` | 1× za snímek (proměnné `dt`) | pohyb kamery, animace postav, HUD, zvuk, vizuál |

Pravidlo: **vše, co ovlivňuje výsledek hry (fyzika), patří do `fixedUpdate`; vše, co jen
zobrazuje, do `update`.**

> **Vylepšení, které hra neřeší:** mezi dvěma kroky fyziky se kreslí poslední známý stav. Při velkém
> rozdílu mezi frekvencí fyziky a displeje by byl pohyb mírně „zrnitý“. Profesionální hry mezi dvěma
> stavy **interpolují**. Pro pomalý balon je to zbytečné; je to ale zajímavý projekt (kap. 14).

## 6.3 Nezávislost na snímkové frekvenci u animací

Ne všechno běží ve fyzice. Plynulý pohyb **kamery** a animace jsou ve `update(dt)` a musí být také
nezávislé na FPS. Podívejte se, jak se kamera „dotahuje“ k cílové poloze (`applyCamera`):

```js
cam.position.lerp(want, 1 - Math.pow(0.002, dt));
```

- `lerp(a, f)` je **lineární interpolace**: posun o část *f* vzdálenosti směrem k cíli.
- Kdybychom napsali pevné `f = 0.1`, kamera by se na rychlém počítači dotahovala rychleji než na pomalém.
- Výraz `1 − 0,002^dt` je **vyjádření exponenciálního tlumení nezávislé na `dt`**: po jedné sekundě
  zbyde z původní vzdálenosti vždy 0,2 %, ať je snímků za sekundu kolik chce.

Stejný princip (jen s jinými konstantami) používají například vlajka nebo plamen.

## 6.4 Co se děje v jednom snímku (úplně)

`GameApp.frame(dt)`:

1. **Pauza?** Je-li otevřená encyklopedie (`paused`), jen se vykreslí a konec.
2. **Pevné kroky** `sm.fixedUpdate(1/60)` podle akumulátoru.
3. **`sm.update(dt)`** – aktuální fáze aktualizuje vizuály, HUD, zvuk, nastaví kameru.
4. **Svět:** animace vlajky na cíli (`marker.userData.update`) podle větru, ptáci (`birds.update`).
5. **Nastavení:** `settings.setMode(...)` – podle fáze se zobrazí/skryjí tlačítka nastavení.
6. **Kamera:** `applyCamera(dt)`.
7. **Obloha:** `sky.update(dt, camera.position)` – kupole sleduje kameru, mraky se posouvají.
8. **Vykreslení:** `renderer.render(scene, camera)`.

## 6.5 Herní fáze

Každá herní fáze je třída v `src/phases/` s metodami `enter`, `exit`, `fixedUpdate`, `update`
(viz odst. 5.5). Fáze mají společný objekt `app` (instance `GameApp`), přes který sahají na svět, balon, HUD…

### Přehled

| Fáze | Soubor | Hlavní náplň | Odchází do |
| :-- | :-- | :-- | :-- |
| `PLAN` | `PlanPhase.js` | výběr plánu, otáčivý pohled na balon | `LAUNCH` (nebo přímo `FLIGHT` s `?skip=1`) |
| `LAUNCH` | `LaunchPhase.js` | 7 kroků přípravy a nafukování | `FLIGHT` |
| `FLIGHT` | `FlightPhase.js` | řízení balonu, HUD, kamery | `LANDING` |
| `LANDING` | `LandingPhase.js` | vyhodnocení, tažení, vyfukování | `CELEBRATION` (úspěch) nebo `LAUNCH`/`PLAN` (neúspěch) |
| `CELEBRATION` | `CelebrationPhase.js` | sekt, titul, osvědčení | `PLAN` (tlačítko „Letět znovu“) |

### 6.5.1 PLAN – plánování

- `enter()`: schová HUD a ovládání, uklidí staré objekty, vytvoří `PlanScreen` (jen jednou), načte svět
  podle plánu (`loadWorld`) a vytvoří balon.
- `onChange(kind)`: UI hlásí, co se změnilo. Při změně lokality nebo denní doby (`'world'`) a při změně
  nákladu (`'load'`) se svět/balon vytvoří znovu; při změně jména nebo oslovení (`'crew'`) se přestaví jen
  dekorace; při změně jazyka (`'lang'`) se přestaví HUD a ovládání.
- `update(dt)`: balon ve stojící poloze (`setFlightPose`), kamera pomalu obíhá (`yaw: t * 0.12`).
- `start()`: uloží jméno a přejde na `LAUNCH` (s `?skip=1` rovnou na `FLIGHT`).

Dekorace (auto, vlek, posádka, zákazníci, láhve) staví `PlanScene.rebuild(plan)`; počet postav odpovídá plánu.

### 6.5.2 LAUNCH – start

Start je **průvodce kroky**. Pořadí je v poli `STEPS`:

```js
const STEPS = ['test', 'lay', 'unroll', 'cold', 'hot', 'board', 'ready'];
```

| Krok | Co hráč dělá | Co se mění | Hodnota postupu `p` |
| :-- | :-- | :-- | :-- |
| `test` | drží hořák (1,1 s) | `testFlame`, zvuk zapalovače | 0 → 1 po 1,1 s držení |
| `lay` | drží tlačítko | `upright` 1 → 0 (koš se klade na bok) | roste 0,45/s |
| `unroll` | drží tlačítko | `unroll` 0 → 1 (plášť se rozprostírá) | roste 0,28/s |
| `cold` | drží ventilátor | `inflation` 0 → 0,7 | roste 0,15/s |
| `hot` | drží hořák | teplota roste, `inflation` → 1, `upright` 0 → 1 | řízeno **teplotou** |
| `board` | nic (animace) | pasažéři nastupují | čas |
| `ready` | zahřívá, pak „pustit lano“ | teplota na bod visení | – |

Zajímavé je, že u kroků `lay`, `unroll` a `cold` **hráč pohání lineární proměnnou** (`p` roste, dokud drží
tlačítko), zatímco u horkého plnění se postup odvozuje z **fyziky**:

```js
// LaunchPhase.update, krok 'hot'
const hover = p.hoverTemp(0);
const t0 = p.ambient + 3, t1 = hover - 8;
const hp = clamp01((p.tempIn - t0) / (t1 - t0));    // 0..1: jak blízko je teplota k visení
b.inflation = 0.7 + 0.3 * clamp01(hp / 0.5);         // nejdřív plnění
b.upright   = clamp01((hp - 0.5) / 0.5);              // od 50 % se plášť zvedá
```

Pro vizuální úroveň to znamená: **čím je vzduch teplejší, tím víc se balon postaví**; plánovací
rozhodnutí (těžký koš) se tak promítne do doby startu.

Pevný krok fyziky se ve startu volá jen v krocích `hot`, `board` a `ready`: balon je přivázán k autu
(`p.pos` se každý krok vrací do počátku), teplota se ale vyvíjí podle stejných rovnic jako za letu.
V kroku `hot` hra posílá `heatBoost: 2.5`, aby start netrval minuty.

`LaunchPhase` ovládá **choreografii posádky**: v metodě `updateCrew` se každému členovi posádky podle kroku
určí cílová poloha a pohled (`go(c, x, z, fx, fz)`) a plynule se k ní blíží stejnou exponenciální technikou
jako kamera. Lano ke špičce pláště drží člen posádky ve vzdálenosti `LAUNCH_CREW.tipRopeLength` = 30 m
(tak se balon netočí).

Ovládání: tlačítko si pamatuje, zda je drženo (`btnDown`, události `pointerdown`/`pointerup`); mezerník se
čte z `app.controls.keys`. Funkce `holding()` spojuje obojí.

V kroku `ready` hra sleduje čistý vztlak `p.netLiftKg(0)`; jakmile přesáhne 8 kg, tlačítko „PUSTIT LANO“ začne
pulzovat (balon už „tahá za lano“). Tlačítko lze stisknout kdykoli; je-li čistý vztlak ještě záporný, balon
prostě zůstane stát na zemi a hráč musí v letu dál zahřívat.

### 6.5.3 FLIGHT – let

`FlightPhase` je nejkratší z fází, protože většinu práce dělá fyzika a entity.

- `enter(data)`: zobrazí HUD a ovládání, přihlásí funkce kamery a zoomu. Při přímém vstupu
  (`data.fresh`, `?skip=1`) vytvoří balon, posadí posádku, nastaví výšku `alt` a rovnou teplotu na úroveň visení.
- `fixedUpdate(dt)`: fyzika (viz 4.8). Při dotyku s `maxAlt > 3` → `LANDING`.
- `update(dt)`: HUD (`agl` = výška nad terénem, `vy`, `tempIn`, `gasFrac`, vítr, cíl), zvuk (`burn`, `vent`,
  `wind` podle rychlosti) a kamera.

Dva kamerové režimy (`C`):

| Režim | Kamera |
| :-- | :-- |
| `chase` | za a nad balonem; výchozí vzdálenost 55 m (kolečkem nebo štípnutím zhruba 22–175 m), úhel se dá měnit tažením |
| `cockpit` | z koše, z místa pilota u hořáku; tažením se rozhlížíte (i vzhůru k plameni) |

HUD zobrazuje vítr a směr k cíli **relativně k pohledu kamery** (`cameraYaw`): šipka nahoře ukazuje „dopředu
podle pohledu“. Při přepnutí kamery nebo otočení koše tak šipka přirozeně sleduje změnu.

Při opuštění mapy (|x| nebo |z| > 2 350 m) HUD zobrazí varování „Opouštíte mapu – vraťte se!“.

### 6.5.4 LANDING – přistání

`enter({ touch })`:

1. `classifyTouchdown(touch, biome)` rozhodne o druhu dopadu (kap. 04).
2. Z rychlosti se určí **směr a rychlost tažení** (`slideV`): pro měkké přistání polovina vodorovné rychlosti,
   pro vodu, les a skálu nula.
3. Fyzikální rychlosti se vynulují; hořák se zhasne.
4. Spočítá se **skóre** (`scoreFlight`) a výsledek se uloží do `app.flightResult`.
5. Postaví se panel s textem. Při **úspěšném** přistání se startovní vybavení zmenší a zmizí
   a přijede doprovodné auto (`ChaseVehicle`); při **neúspěšném** se objeví tlačítka *Zkusit znovu*
   (zpět na `LAUNCH`) a *Změnit plán* (`PLAN`) a krátká rada.

`fixedUpdate`: koš se posouvá po zemi s tlumením; `update`: plášť se pokládá a vyfukuje podle `TIMELINE`
(`tipStart`, `tipDur`, `deflate`), koš se u tvrdého přistání převrací, kamera pomalu obíhá.
Po dokončení vyfukování (u úspěšného přistání) přejde hra do `CELEBRATION`.

### 6.5.5 CELEBRATION – oslava

- Kolem stolku (za košem, na opačné straně, než kam padl plášť) se postaví pilot, pasažéři a dva pomocníci.
- Tlačítko „Otevřít sekt“ vystřelí korek (kulička s balistickou dráhou) a spustí **částice** (sekt, konfety).
  Částice jsou `THREE.Points` s polem rychlostí; každý snímek se jim přičítá gravitace a při dopadu
  na zem se zastaví.
- Po chvíli se ukáže titul podle `tier` a tlačítko „Převzít diplom“, které vytvoří `ResultScreen`.
- `ResultScreen` kreslí osvědčení do `<canvas>` o rozměrech 1400 × 990 (obraz si lze stáhnout jako PNG),
  s tlačítky *Stáhnout diplom* a *Letět znovu* (→ `PLAN`).

## 6.6 Předávání dat mezi fázemi

Fáze nesdílejí globální proměnné. Data si předávají třemi způsoby:

1. **Parametr `enter(data)`** – např. `app.go('LANDING', { touch })`.
2. **Společný objekt `app`** – `app.plan`, `app.world`, `app.balloon`, `app.flightResult`.
3. **UI callbacky** – `PlanScreen` volá `cb.onStart()`.

Doporučení: preferujte 1; společný stav (2) jen pro data, která opravdu přežívají přechody fází.

## 6.7 Chování při skrytí karty a při pauze

- Skrytou kartu pozastaví prohlížeč (neposílá snímky). Při návratu `dt` omezí pojistka `0,1 s`.
- `SynthAudio` navíc při `visibilitychange` zastaví audio kontext, aby hořák „nehrál“ na pozadí.
- **Pauza encyklopedie:** `Encyclopedia` volá callback `onToggle(open)`; `GameApp` nastaví `paused`
  a `frame()` pak jen kreslí. Fyzika i čas se zastaví.

## 6.8 Ladicí tipy

```js
game.sm.name                    // aktuální fáze
game.sm.current                 // objekt fáze (můžete volat jeho metody)
game.go('FLIGHT', { fresh: true, alt: 300 })   // skok do letu
game.acc                        // aktuální stav akumulátoru času
```

> **Zkuste to:** v `GameApp.js` změňte `FIXED_DT` na `1 / 10` a porovnejte chování s původním krokem
> (např. čas do vzletu, rychlost stoupání, tlumení rychlosti na zemi). Zapište si rozdíly a zkuste je
> vysvětlit; potom hodnotu vraťte na `1 / 60`.
