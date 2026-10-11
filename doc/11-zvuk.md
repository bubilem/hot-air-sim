# 11 – Zvuk

Hra obsahuje dva druhy zvuku:

1. **syntetické zvuky** (hořák, vítr, paraventil, ventilátor, zapalovač, korek, dopad, cinkání) – **žádné
   zvukové soubory**, všechno se vytváří v kódu pomocí **WebAudio API**,
2. **hudbu na pozadí** – jeden soubor `public/music/theme-organic-house.mp3`, přehrávaný ve smyčce.

Obojí jde zvlášť ztlumit a nastavit jeho hlasitost (ikona nastavení; klávesa `M` ztlumí vše).

## 11.1 Proč syntéza místo souborů

- **Velikost.** Zvukový soubor by zvětšil stahovanou aplikaci; syntéza zabere pár stovek bajtů kódu.
- **Dynamika.** Hořák může znít tišeji i hlasitěji **plynule** podle výkonu (zde je zážeh 0 nebo 1, ale
  princip platí) a jeho barva zvuku se mění; s nahrávkou by to bylo složité.
- **Výuka.** Syntéza zvuku ukazuje základy zpracování signálu: šum, filtry, zesílení, obálka.

## 11.2 Základy WebAudio

WebAudio funguje jako **zapojení modulárního syntezátoru**: vytvoříte „uzly“ a propojíte je kabely.

```
 [zdroj zvuku] ──► [filtr] ──► [zesilovač (gain)] ──► [hlavní hlasitost] ──► [reproduktory]
```

| Uzel | Třída | Význam |
| :-- | :-- | :-- |
| kontext | `AudioContext` | „zvukový engine“; vše se vytváří z něj |
| zdroj | `AudioBufferSourceNode` | přehrává pole vzorků (my šum), umí smyčku |
| oscilátor | `OscillatorNode` | generuje tón (sinus, čtverec…) |
| filtr | `BiquadFilterNode` | propouští jen část frekvencí (`lowpass`, `highpass`, `bandpass`) |
| zesilovač | `GainNode` | násobí hlasitost |
| cíl | `context.destination` | výstup do reproduktorů |

Spojení: `uzelA.connect(uzelB)`.

### Pravidlo prohlížečů: zvuk až po interakci

Prohlížeče **zakazují automatické spuštění zvuku**, dokud uživatel na stránku neklikne nebo nestiskne klávesu
(ochrana proti obtěžujícím reklamám). Proto:

- `AudioContext` se vytváří až v `unlock()`, které se volá z uživatelské události,
- `GameApp` registruje jednorázové posluchače `pointerdown` a `keydown` (`{ once: true }`), které zavolají
  `audio.unlock()` a `music.start()`,
- opakované `unlock()` jen zavolá `ctx.resume()`.

> **Častá chyba:** vytvořit `AudioContext` při načtení stránky. Prohlížeč ho vytvoří ve stavu `suspended` a nic
> neuslyšíte, dokud ho neprobudíte.

## 11.3 Syntéza šumu

Hořák, vítr, paraventil i ventilátor jsou **filtrovaný šum**. Šum je signál s náhodnými vzorky; vytvoříme ho
do bufferu:

```js
function noiseBuffer(ctx, seconds = 2, color = 'white') {
  const len = ctx.sampleRate * seconds;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;        // bílý šum: rovnoměrně náhodné číslo −1…1
    ...
    d[i] = ...;
  }
  return buf;
}
```

- **Vzorkovací frekvence** (`ctx.sampleRate`, typicky 44 100 nebo 48 000 Hz) – kolik hodnot signálu je za sekundu.
  Buffer na několik hodin by měl stovky milionů čísel; proto vytvoříme jen **3 sekundy** (při 44 100 Hz asi 130 000 vzorků) a přehráváme je **ve smyčce** (`src.loop = true`).
- **Bílý šum** má stejnou energii ve všech frekvencích (syčení). **Růžový šum** (`'pink'`) má víc energie
  v hlubokých tónech a zní „přirozeněji“; vyrábí se z bílého filtrem (koeficienty Paula Kelleta).

### Barva zvuku určuje filtr

| Zvuk | Zdroj | Filtry | Efekt |
| :-- | :-- | :-- | :-- |
| hořák | bílý šum | `lowpass` 900 Hz, `highpass` 70 Hz | burácení bez vysokého syčení a bez dunění |
| vítr | růžový šum | `bandpass` 500 Hz (Q 0,5) | hučení |
| paraventil | bílý šum | `bandpass` 900 Hz + `lowpass` 1 800 Hz | nižší, měkčí syčení |
| ventilátor | bílý šum | `bandpass` 220 Hz (Q 0,8) | hluboké hučení motoru |

```js
this.burner = mkLoop('white', () => [filter('lowpass', 900), filter('highpass', 70)]);
this.wind   = mkLoop('pink',  () => [filter('bandpass', 500, 0.5)]);
```

Funkce `mkLoop` vytvoří zdroj se smyčkou, protáhne ho řetězcem filtrů a zapojí přes `GainNode` (hlasitost
této smyčky, počáteční 0) do hlavního zesilovače `master`. Všechny čtyři smyčky **běží stále**; mění se jen jejich
hlasitost.

### Plynulá změna hlasitosti

Kdybychom hlasitost přepnuli skokem (`gain.value = 0 → 1`), uslyšeli bychom **lupnutí**. Proto:

```js
const set = (ch, v) => ch.gain.gain.setTargetAtTime(v, t, 0.06);
set(this.burner, burn * 0.5);
set(this.vent,   vent * 0.14);
set(this.wind,   Math.min(1, wind) * 0.12);
```

`setTargetAtTime(cíl, čas, τ)` přibližuje hodnotu k cíli **exponenciálně** s časovou konstantou τ = 0,06 s – stejný
princip jako zpožděné přibližování větru ve fyzice. Hořák navíc mění „jas“ zvuku: `lowpass` frekvence se zvyšuje
s výkonem (500 + 700 · burn Hz).

Hlasitost vítru odvozuje `FlightPhase` z rychlosti: `min(1, vxz · 0,08 + |vy| · 0,12)`: čím rychleji se
balon pohybuje, tím hlasitěji „fouká“.

## 11.4 Jednorázové zvuky

Krátké efekty se vytvářejí **na požádání** z oscilátoru nebo šumu s **obálkou** (průběhem hlasitosti):

```js
click() {                                     // piezo zapalovač
  const o = c.createOscillator(); o.type = 'square'; o.frequency.value = 2600;
  const g = c.createGain();
  g.gain.setValueAtTime(0.25, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);   // rychlý pokles = „klik“
  o.connect(g).connect(this.master); o.start(t); o.stop(t + 0.06);
}
```

| Zvuk | Postup |
| :-- | :-- |
| `click()` | čtvercový tón 2 600 Hz, 50 ms, exponenciální doznění |
| `pop()` | sinusový tón klesající z 520 na 90 Hz za 0,12 s + krátký šumový „třesk“ (korek) |
| `thud(síla)` | šum přes `lowpass` 300–800 Hz s doznívající obálkou (dopad koše; síla podle rychlosti) |
| `clink()` | dva čisté tóny 2 200 a 3 300 Hz s dlouhým doznívajícím tónem (sklenice) |

Volající fáze zvuk jen spustí (`app.audio.thud(0.5)`); nestará se, jak vzniká.

**Obálka** (*envelope*) popisuje, jak se hlasitost mění v čase: u „kliknutí“ prudký náběh a rychlý pokles.
Exponenciální pokles zní přirozeně, protože lidské ucho vnímá hlasitost logaritmicky. (Pozor: exponenciální
rampa neumí dosáhnout nuly, proto končí na 0,0001.)

## 11.5 Hlasitost, ztlumení a ukládání

- `master` (`GainNode`) je hlavní hlasitost zvuků; `applyGain()` nastaví buď 0 (ztlumeno), nebo `volume`.
- `setVolume` a `setMuted` ukládají hodnotu do `localStorage` (odst. 10.7).
- Při skrytí karty (`visibilitychange`) se kontext zastaví (`ctx.suspend()`), aby hořák neznělo dál na pozadí.

## 11.6 Hudba (`MusicPlayer`)

Hudba je běžný soubor přehrávaný přes HTML prvek `Audio`:

```js
const el = new Audio(`${import.meta.env.BASE_URL}${MUSIC.src}`);
el.loop = true;
...
const ctx = this.audio.ctx;
this.gain = ctx.createGain();
ctx.createMediaElementSource(el).connect(this.gain);   // prvek Audio → WebAudio graf
this.gain.connect(ctx.destination);
```

Proč přes WebAudio `GainNode` a ne přímo `el.volume`? **iOS ignoruje `HTMLMediaElement.volume`**, ale
`GainNode` funguje na všech zařízeních. Hudba má proto nezávislou hlasitost, uloženou jako `hotairsim.musicVolume`.

Cesta k souboru je v `GameConfig.MUSIC.src`; `import.meta.env.BASE_URL` zajišťuje správnou cestu i při nasazení
do podsložky.

Pokud soubor chybí nebo prohlížeč přehrávání zablokuje, `el.play()` selže (je to `Promise`) – chyba se tiše zachytí a
příští interakce to zkusí znovu. Hra tedy funguje i bez hudby.

> **Licence hudby.** Zkontrolujte licenci souboru `theme-organic-house.mp3` před zveřejněním hry mimo školu. Pro
> vlastní nasazení ji klidně vyměňte (stačí přepsat soubor nebo změnit `MUSIC.src`).

## 11.7 Cvičení k zvuku

1. **Snadné:** změňte frekvenci `bandpass` větru na 300 Hz. Jak se změní zvuk?
2. **Střední:** vytvořte nový zvuk `ding()` (dva tóny, doznívání) a přehrajte ho při úspěšném přistání.
3. **Těžší:** přidejte zvuk plamene, jehož výška tónu roste s teplotou v plášti.
4. **Projekt:** zobrazte v rohu obrazovky **analyzér spektra** (`AnalyserNode` + canvas) a sledujte, jak se
   mění frekvenční obsah při zážehu.
