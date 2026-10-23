# 07 – Vykreslování (Three.js)

Tato kapitola vysvětluje, **jak se z čísel (polohy, teplota…) stane obraz** na obrazovce.
Začneme základy 3D grafiky a Three.js, pak ukážeme, jak jsou v HotAirSim postavené jednotlivé
části scény – od kamery přes terén až po deformovatelný plášť balonu a plamen.

> Kdo nezná Three.js, nemusí se bát: potřebných pojmů je málo, a jakmile jim porozumíte, bude kód
> srozumitelný. Oficiální dokumentace: <https://threejs.org/docs/>, příručka <https://threejs.org/manual/>.

## 7.1 Jak funguje 3D grafika v prohlížeči

Prohlížeč nabízí rozhraní **WebGL** – přístup ke grafické kartě (GPU). WebGL je ale nízkoúrovňové; i
jeden trojúhelník vyžaduje desítky řádků kódu. **Three.js** je knihovna, která nad WebGL vytváří
srozumitelné objekty: scéna, kamera, těleso, materiál, světlo.

Vykreslení jednoho snímku funguje v zásadě takto:

```
  Scéna (objekty, světla)  +  Kamera
            │
            ▼
   renderer.render(scene, camera)
            │
            ▼    pro každý objekt:
   ┌──────────────────────────────────────────────┐
   │ vertex shader : každý vrchol 3D → 2D obrazovka│
   │ rasterizace   : trojúhelníky → pixely        │
   │ fragment shader: barva každého pixelu         │
   └──────────────────────────────────────────────┘
            │
            ▼
        <canvas> na stránce
```

Tzv. **shadery** jsou malé programy (v jazyce GLSL) běžící na GPU. Three.js je pro většinu materiálů
generuje za nás; v několika místech je ale upravujeme (odst. 7.9).

## 7.2 Základní pojmy Three.js

| Pojem | Třída | Význam |
| :-- | :-- | :-- |
| **Renderer** | `WebGLRenderer` | kreslí scénu do `<canvas>` |
| **Scéna** | `Scene` | strom všech objektů, které se kreslí |
| **Kamera** | `PerspectiveCamera` | „oko“, které scénu vidí (zorné pole, poměr stran, blízká a daleká rovina) |
| **Objekt** | `Object3D`, `Group` | uzel stromu: má polohu, otočení, měřítko a potomky |
| **Mesh** | `Mesh` | viditelné těleso = **geometrie + materiál** |
| **Geometrie** | `BoxGeometry`, `BufferGeometry`… | tvar (vrcholy, trojúhelníky, UV, barvy) |
| **Materiál** | `MeshLambertMaterial`, `ShaderMaterial` | jak povrch reaguje na světlo (barva, textura) |
| **Textura** | `CanvasTexture` | obrázek natažený na povrch |
| **Světlo** | `HemisphereLight`, `DirectionalLight`, `PointLight` | osvětlení |

### Hierarchie a souřadnice

Každý `Object3D` má `position`, `rotation`, `scale` v **lokálních souřadnicích rodiče**. Přidáme-li auto do
skupiny a skupinu posuneme, posune se celé auto i s koly. Hra to využívá všude: balon je
skupina (`root`) s podskupinou `rig` (koš a plášť), postava je skupina kvádrů, startovní vybavení
je skupina `props`.

Souřadnicový systém Three.js: **+x doprava, +y nahoru, +z k divákovi**. Ve hře: +x = východ, −z = sever
(proto severní azimut 0° znamená směr −z; viz `bearingToVec`).

## 7.3 Inicializace v `GameApp`

```js
this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
this.scene  = new THREE.Scene();
this.camera = new THREE.PerspectiveCamera(CAMERA.fov, 1, CAMERA.near, 8000);
```

- `antialias: true` vyhlazuje hrany.
- `setPixelRatio(min(dpr, 1.5))` – telefony mají „retina“ displeje s poměrem 3×; vykreslovat 9× více pixelů
  by je přetížilo, proto je strop 1,5. To je **kompromis mezi ostrostí a výkonem**.
- Kamera: zorné pole `fov` 60°, blízká rovina `near` 0,5 m, daleká 8 000 m.
- `resize()` při změně velikosti okna nastaví velikost rendereru a poměr stran kamery (`updateProjectionMatrix`).

### Světla

```js
this.hemi = new THREE.HemisphereLight(0xdff1ff, 0x6b7a4a, 1.05);   // nebe nahoře, tráva dole
this.sun  = new THREE.DirectionalLight(0xfff0d0, 1.35);            // slunce
```

`HemisphereLight` osvětluje shora modravě (obloha) a zdola nazelenale (odraz od trávy), čímž dodá „měkké“
okolní světlo. `DirectionalLight` je rovnoběžné světlo (slunce). Při načtení světa se barvy a směr
upraví podle denní doby (`loadWorld`).

**Žádné stíny v reálném čase.** `renderer.shadowMap` je vypnutý: stíny jsou drahé. Balon vrhá **falešný
stín** – černý kruh na zemi, jehož velikost a průhlednost závisí na výšce (`BalloonView.setShadow`).
Mobilní zařízení tak mají o hodně vyšší výkon.

### Materiály

Většina objektů používá `MeshLambertMaterial` – jednoduchý model difúzního osvětlení počítaný po vrcholech
(laciný). Materiály se **sdílejí** (postavy a stromy mají stejný materiál pro stejnou barvu), čímž klesá počet
**draw calls** (jednotlivých volání kreslení; každé stojí výkon).

## 7.4 Kamera: `rig` a `applyCamera`

Fáze nenastavují kameru přímo. Pouze popíší, **na co se dívat**, a `GameApp` ji plynule dotahuje:

```js
// fáze:
app.setRig({ target: { x, y, z }, yaw: head, pitch: 0.28, dist: CAMERA.distance });
// GameApp.applyCamera(dt): kamera = cíl + posun podle yaw, pitch a vzdálenosti
const want = new THREE.Vector3(
  r.target.x - Math.sin(a) * Math.cos(pitch) * dist,
  r.target.y + Math.sin(pitch) * dist,
  r.target.z + Math.cos(a) * Math.cos(pitch) * dist);
cam.position.lerp(want, 1 - Math.pow(0.002, dt));   // plynulé dotahování
cam.lookAt(r.target.x, r.target.y, r.target.z);
```

To je tzv. **orbitální kamera**: poloha se počítá ze **sférických souřadnic** (úhly *yaw*, *pitch*,
vzdálenost) kolem cílového bodu. Uživatelské tažení myší přičítá k úhlům `user.yaw` a `user.pitch`,
kolečko mění `user.dist`.

Další zajímavosti:

- **Kamera nesmí pod zem:** `if (want.y < floor) want.y = floor;` – nad povrchem terénu se vždy drží alespoň 2,5 m.
- **Pohled z koše** (`cockpit`): kamera je přímo v bodě `r.cockpit` a `lookAt` míří podle yaw a pitch.
- **Adaptivní blízká rovina** (`adaptNearPlane`): hloubkový buffer má omezenou přesnost. Pokud je
  rozsah `near`…`far` příliš velký, vzdálené plochy „blikají“ (*z-fighting*). Proto `near` roste s výškou
  nad terénem (0,06 m na metr výšky, nejvýš 8 m). Z koše zůstává malá (0,15 m), aby se neořezávaly tyče
  kolem pilota.

Ovládání kamery vstupy z canvasu (tažení, kolečko, štípnutí) je v `GameApp.setupPointer()`:
udržuje mapu aktivních dotyků (`touches`) a při dvou prstech počítá změnu vzdálenosti = zoom.

## 7.5 Obloha a atmosféra

### Mlha (`THREE.Fog`)

```js
this.scene.fog = new THREE.Fog(horizon, tod.fogNear, tod.fogFar);
```

Lineární mlha mezi `fogNear` a `fogFar`: vzdálené objekty se mísí s barvou horizontu. Vedlejší
efekt: skryje okraj mapy, aniž by bylo vidět, že svět končí.

### Výšková mlha (`world/HeightFog.js`)

Ranní mlha leží **v údolích** a nad určitou výškou je vzduch čistý. To standardní `Fog` neumí. Soubor
`HeightFog.js` proto **upraví shader** všech `MeshLambertMaterial`: v `onBeforeCompile` vloží vlastní
GLSL kód, který spočítá, jak velká část paprsku „kamera → fragment“ prochází vrstvou pod hladinou mlhy:

```glsl
float hfLo = min(cameraPosition.y, vHfY);   // nižší z výšek kamery a fragmentu
float hfHi = max(cameraPosition.y, vHfY);
float hfFrac = 1.0;
if (hfHi > uHfTop) hfFrac = hfLo >= uHfTop ? 0.0 : (uHfTop - hfLo) / (hfHi - hfLo);
float hfOd = uHfDensity * vFogDepth * hfFrac;      // optická hloubka
gl_FragColor.rgb = mix(gl_FragColor.rgb, uHfColor, 1.0 - exp(-hfOd));
```

Fyzikální smysl: útlum světla v mlze řídí **Beer–Lambertův zákon** (*exp(−hustota · dráha)*). Dráha je
vzdálenost, kterou paprsek urazí **pod hladinou mlhy**. Proto balon po vzletu „vystoupí z mlhy“. Parametry
(`above`, `density`, `color`) jsou v `TIME_OF_DAY[...].fog`.

**Oblačná vrstva (inverze).** Stejným shaderem se kreslí druhá mlha: vodorovný **pás** mezi `uCloudLo` a
`uCloudHi` s hustotou `uCloudDensity`. Místo „podílu pod hladinou“ se počítá **délka průniku** paprsku
s pásem (`min(hfHi, hi) − max(hfLo, lo)`) a ta se dělí délkou paprsku. Nad pásem i pod ním je vzduch čistý,
uvnitř je vidět jen asi `1 / density` = 33 m a z výšky vypadá vrstva jako moře mraků nad údolím. Lokalita ji zapne
vlastností `cloudLayer: { morning: { base, top, density? } }` (výšky nad startem, ve `Sites.js`; zatím Polabí ráno,
350–480 m, takže uvnitř leží i střih větru ve 450 m); společné hodnoty jsou v `CLOUD_LAYER` (`GameConfig.js`).
Zespodu vrstvu vidíme i na **obloze**: shader kupole (`Sky.js`) pro směr s výškovým úhlem `sinE` spočítá zakrytí
`(1 − exp(−density · tloušťka / sinE)) · exp(−d / reach)`, kde `d = (lo − výška kamery) / sinE` je vzdálenost k vrstvě.
Téměř celá obloha je tedy šedá (spodek vrstvy je ztmavený), jen u horizontu vrstva zmizí v dálce (`CLOUD_LAYER.reach`).
Uvnitř vrstvy je zakryto vše, nad ní je obloha čistá. Slunce a sprity mraků se zakrytím ztlumí (`cloudCover`).

### Obloha (`world/Sky.js`)

- **Kupole**: koule (`SphereGeometry`, poloměr 6 000) vykreslená zevnitř (`side: BackSide`) s **barvami ve
  vrcholech**: gradient od horizontu k zenitu (`c.copy(h).lerp(z, Math.pow(y, 0.55))`).
- **Slunce**: `Sprite` (vždy otočený ke kameře) s texturou záře kreslenou do canvasu (radiální gradient),
  sčítací míchání (`AdditiveBlending`).
- **Mraky**: 26 spritů s texturou z několika překrývajících se měkkých koulí.
- Kupole se **přesouvá spolu s kamerou** (`group.position.copy(cameraPos)`), takže je vždy nekonečně daleko.
- Barvy pro ráno a večer jsou v `PRESETS`.

## 7.6 Terén (`ProceduralTerrain`)

Terén je **mřížka** `PlaneGeometry(5000, 5000, 160, 160)` natočená do vodorovné polohy. Každý z 161 × 161
vrcholů dostane:

1. **výšku** z `Biomes.sample(x, z).height`,
2. **barvu** podle biomu (`biomeColor`) – uloženou jako **vertexovou barvu**.

Hodnoty se vypočítají ve smyčce přes všechny vrcholy (≈ 26 000 vzorků při startu). Je to jednorázová
investice; proto `loadWorld` svět kešuje.

### Změkčení přechodů

Ostré přechody barev na hranici biomů (louka–les) by vypadaly „pixelově“. Funkce `blurGrid` zprůměruje
hodnoty vrcholů se čtyřmi sousedy (parametr `TERRAIN_SOFT.passes` = 2):

```js
dst[i] = src[i] * 0.4 + (src[vlevo] + src[vpravo] + src[nahoře] + src[dole]) * 0.15;
```

Je to jednoduchý **konvoluční filtr** (rozostření) na mřížce – stejná operace, jakou znáte z úpravy obrázků.
Normály se pak spočítají jako hladké (`computeVertexNormals`, `smoothShading`).

### Detail trávy ve shaderu

Aby louka zblízka nevypadala jako plochá barva, materiál terénu používá **texturu trávy** (stébla a
skvrny kreslené do `canvasu` 256 × 256) mapovanou podle **světových souřadnic** (xz) ve dvou měřítcích
(4,5 m a 27 m; kombinace dvou měřítek zabrání viditelnému opakování). Detail se s rostoucí vzdáleností
od kamery vytrácí (`fadeNear` 90 m → `fadeFar` 380 m). Atribut `aGrass` určuje, kde se tráva používá
(ne ve vodě a na skále).

### Voda

Průhledná plocha (`opacity: 0.82`) ve výšce `WORLD.waterLevel`. Dvě drobnosti:

- `depthWrite: false` – průhledné objekty by neměly zapisovat do hloubkového bufferu;
- `polygonOffset` – posune vodu v hloubkovém bufferu, aby se nehádala s terénem na břehu (*z-fighting*).

### Podklad za mapou

Mapa je čtverec 5 × 5 km. Za jejím okrajem je velká rovná plocha, kterou ale nelze dát **pod** celý terén
(zakrývala by údolí). Proto je to **rám s dírou**: `THREE.Shape` s vnitřním otvorem (`shape.holes`).
Tam, kde řeka opouští mapu, má otvor výřez a v něm vodní pruh – řeka pokračuje do mlhy.

### Stromy: instancování

Les tvoří tisíce stromů. Samostatný `Mesh` pro každý by znamenal tisíce draw calls.
**Instancování** (`InstancedMesh`) vykreslí **jednu geometrii mnohokrát jedním voláním**, každá instance
má vlastní matici (poloha, otočení, měřítko) a barvu:

```js
const mesh = new THREE.InstancedMesh(geo, mat, spots.length);
spots.forEach((p, i) => {
  q.setFromAxisAngle(up, p[4]);                    // náhodné otočení
  scale.set(p[3], p[3] * (0.9 + (i % 3) * 0.1), p[3]);
  m.compose(new THREE.Vector3(p[0], p[1], p[2]), q, scale);
  mesh.setMatrixAt(i, m);                          // matice instance
  mesh.setColorAt(i, col);                         // drobná změna jasu
});
```

Geometrie jednoho stromu (kmen, dvě kuželové koruny) je složena pomocí `mergeGeometries` z válce a dvou
kuželů a obarvena po vrcholech. Stromy se rozmisťují po mřížce s krokem 30 m s náhodným posunem (generátor
náhodných čísel se stálým seedem 12345), přičemž se sází jen tam, kde `Biomes.sample` vrací `FOREST`.
Výška kořene stromu se bere z `meshHeight()` – výšky **vykreslené sítě** (interpolace v trojúhelníku),
aby stromy nelevitovaly na svazích.

## 7.7 Balon (`BalloonView`)

### Plášť jako deformovatelná geometrie

Plášť je jediná `BufferGeometry` sestavená z **profilu** – křivky poloměr–výška:

```js
const PROFILE = [ [2.0, 0], [2.6, 1.4], [4.2, 3.6], [6.4, 6.6], [8.2, 9.6],
                  [9.3, 12.6], [9.7, 14.8], [9.3, 16.8], [8.0, 18.4], [5.6, 19.5], [2.9, 20.1], [0, 20.3] ];
```

Profil se vyhladí křivkou (`SplineCurve`), rozdělí na **28 prstenců** a každý prstenec na **32 výsečí**
(`SEGS`; tak se šijí skutečné balony: výseč = *gore*). Vzniká síť 28 × 32 čtyřúhelníků = 1 792 trojúhelníků.

Podobná rotační tělesa jde vytvořit pomocí `LatheGeometry`; my si ale geometrii tvoříme sami, protože
potřebujeme **každý vrchol přesouvat**.

### Nafukování = interpolace tvarů

Tvar se nepočítá ze složité simulace látky. Pro každý vrchol platí jednoduché mapování (`setShape`):

| Parametr | Efekt |
| :-- | :-- |
| `inflation` 0…1 | od placky (užší, delší, plošší) k plnému tvaru: `kt` (průřez), `kw` (šířka) a `kl` (délka) |
| `unroll` 0…1 | od svazku („hada“) k rozložení do šířky |
| `upright` 0…1 | otočení celé sestavy kolem **spodní hrany koše** (koš leží ↔ stojí) |
| `envUpright` | totéž pro plášť, když se liší od koše |

Základní vzorec polohy vrcholu (zjednodušeně):

```js
x = r * Math.cos(a) * kt;          // r = poloměr prstence z profilu, a = úhel výseče
y = h * kl;                        // h = výška prstence z profilu
z = r * Math.sin(a) * kw;
```

kde `kt`, `kw`, `kl` jsou **funkce** `inflation` a `unroll`. K tomu přibývá:

- **Vyklenutí ležícího pláště** nad zem (`archR`, `sup`) a **„klesnutí“ látky na zem** (`sag`), aby plášť
  ležel na trávě a ne ve vzduchu ani pod zemí.
- **Plášť na svahu (`drape`)**: model ležícího pláště předpokládá vodorovnou zem v úrovni koše. Při přistání dostane
  `BalloonView` funkci výšky terénu (`setTerrain`, síť 1,5 m kolem koše, bilineárně) a každý vrchol posune svisle o rozdíl
  výšky terénu proti úrovni koše. U ústí je vliv nulový (plášť drží u koše), vrchol nikdy neleží pod terénem.
- **Ořez pod zem**: prstenec se zvedne, aby jeho nejnižší bod neprorazil povrch (`ringMin < GROUND`).
- **Rotace celého rigu** kolem hrany koše (matice 2D rotace v rovině xy, `phi`).

Změní-li se `inflation`/`upright`/`unroll`, přepočítá se pole `grid` a zapíše do `envPos`
(`position.needsUpdate = true`). Pokud se parametry **nezměnily** (rozdíl < 1e-4), `setShape` se hned vrátí:
**neprovádí zbytečnou práci**. Takovéto „dirty check“ jsou důležité pro výkon.

> **Proč to tak je?** Alternativou jsou *shape keys / morph targets* z 3D modelu; ty přijdou až s
> hotovými modely. Procedurální deformace nepotřebuje žádný soubor a dobře se učí.

### Textura pláště

Vzor se kreslí do `canvas` 1024 × 512 pixelů (`EnvelopeDesigns.js`): osa **x = obvod** (32 výsečí), osa **y =
od ústí k vrchlíku**. Z canvasu vznikne `THREE.CanvasTexture`. UV souřadnice vrcholů (`uvs`) určují,
kterou část obrázku daný trojúhelník dostane.

Hráč může nahrát vlastní obrázek (PNG/WebP/JPEG do 8 MB); funkce `imageToCanvas` ho **ořízne do poměru
2:1**, takže se na plášť vždy správně napne. Obrázek se **nikam neodesílá**, zpracuje se jen v prohlížeči
(`URL.createObjectURL`, `Image`, `canvas.drawImage`).

### Vertexové barvy sukně

Spodní tři řady plášť má jako tmavou „sukni“ kolem plamene (vertexové barvy 0,07 násobí texturu).

### Záře pláště při zážehu

Při hoření plášť **prosvítá** (emisivní záře nejsilnější u ústí). Je to další úprava shaderu:
v `onBeforeCompile` se přidá `uniform uGlow` a do fragment shaderu:

```glsl
float gk = uGlow * (1.0 - uGlowTop * clamp(vGlowY / uGlowH, 0.0, 1.0));
totalEmissiveRadiance += diffuseColor.rgb * uGlowColor * gk;
```

Hodnota `uGlow` rychle naběhne při zážehu a pomalu doznívá (`ENVELOPE_GLOW.rise`/`decay`).

### Koš, láhve, rám

Koš je složen z kvádrů (`BoxGeometry`), nosné tyče z válečků (`strut()` – válec natočený mezi dvěma body
pomocí `quaternion.setFromUnitVectors`), láhve z válců. Počet viditelných lahví řídí `setBottles(n)`.

### Plamen

Plamen je **sada „kapek“** (`LatheGeometry` ze zjednodušeného profilu) s vlastním `ShaderMaterial`.
Jeho **vertex shader** vlní vrcholy pomocí jednoduchého 1D šumu a pulzuje šířku a délku, **fragment shader**
barví podle výšky (modrá → žlutá → oranžová → rudá), přidává „jazyky“ (pruhy šumu pohybující se vzhůru) a
průhlednost podle `dot(normal, view)` (měkké okraje).

```js
transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
```

Sčítací míchání zajišťuje, že se překrývající plameny sčítají jako světlo. Navíc plamen přidává
`PointLight` (intenzita 40 · úroveň zážehu), který rozsvítí okolí koše. `setBurn(level, t)` ho v každém
snímku škáluje a rozkmitává; bez zážehu hoří jen malý **pilotní plamínek**.

### Falešný stín

`CircleGeometry` s poloprůhledným černým materiálem; velikost a průhlednost v `setShadow` závisí na výšce
nad zemí a na „fade“ (stín se objevuje spolu se vztyčováním balonu).

## 7.8 Postavy, auto a rekvizity

- **Postavy** (`Character.js`): „voxelové“ panáčci z kvádrů (`part(w, h, d, color, x, y, z)`), výška ≈ 1,8 m.
  Barvu pleti, vlasů a trička vybírá `variant`. Role `pilot`, `crew` a `passenger` mají různé oblečení.
  Paže jsou v **pivotech** (skupina v rameni), takže se otáčejí kolem ramene: funkce `waveArms`, `armsForward`,
  `armsUp` jim nastavují úhel.
- **Auto a vlek** (`ChaseVehicle.js`): kvádry, válce (kola) a krychle; tažné zařízení je na konci auta (`hitch`),
  odtud vede lano k balonu. Auto a přívěs nesou polep školy (`SchoolMark.js`: symbol a nápis nakreslené do canvasu a nalepené na plochu `PlaneGeometry`).
- **Rekvizity** (`GroundProps.js`): ventilátor s otáčející se vrtulí, vak, lano (`Rope` – válec natažený mezi
  dvěma body), vlajky na cíli (vlají ve vertex shaderu podle větru), stolek se sektem.
- **Cíl**: tyč s vlajkami a světle modrý kruh (`RingGeometry`) o poloměru 46–60 m.
- **Ptáci** (`Birds.js`): **jeden `InstancedMesh`** (= jedno volání kreslení), tvořený trojúhelníky těla a křídel;
  mávání křídel dělá **vertex shader** (atribut `aWing`, fáze a frekvence v `InstancedBufferAttribute`).
  Poloha ptáků se počítá jen pro několik desítek instancí.

## 7.9 Úprava shaderů: `onBeforeCompile`

Materiály Three.js mají hotové shadery. Chceme-li přidat vlastní chování (výšková mlha, tráva, záře pláště),
nemusíme psát celý shader. Stačí **do vygenerovaného kódu vložit vlastní řádky**:

```js
material.onBeforeCompile = (shader) => {
  shader.uniforms.uMojeHodnota = { value: 1.0 };
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nvarying float vY;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvY = position.y;');
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', '#include <common>\nvarying float vY;\nuniform float uMojeHodnota;')
    .replace('#include <fog_fragment>', '#include <fog_fragment>\n/* vlastní GLSL */');
};
```

- `#include <…>` jsou „kusy“ standardních shaderů Three.js; vlastní kód vkládáme **za** ně.
- `uniform` je hodnota předaná z JavaScriptu do shaderu (`uniform float`), `varying` hodnota předaná z vertex
  shaderu do fragment shaderu (interpolovaná mezi vrcholy).
- `HeightFog.js` instaluje takovou úpravu **na prototyp** `MeshLambertMaterial`, takže ji dostane **každý**
  takový materiál. Materiály s vlastní úpravou (terén, plášť) volají tuto základní verzi ručně
  (`THREE.MeshLambertMaterial.prototype.onBeforeCompile?.call(...)`), aby se úpravy **sčítaly**.

## 7.10 Výkon: co a proč jsme zvolili

| Opatření | Kde | Důvod |
| :-- | :-- | :-- |
| `pixelRatio ≤ 1,5` | `GameApp` | telefon nemá počítat 9× pixelů |
| `MeshLambertMaterial` | všude | nejlevnější osvětlení |
| sdílené materiály | `Character.js`, `matCache` | méně přepínání stavu GPU |
| `InstancedMesh` | stromy, ptáci | tisíce objektů v jednom volání |
| žádné reálné stíny | – | drahé; falešný stín stačí |
| `mergeGeometries` | strom | jedna geometrie místo tří |
| cache světa | `loadWorld` | generování terénu je drahé |
| dirty-check tvaru | `setShape` | nepřepočítat plášť, když se nezměnil |
| `dispose` | `disposeTree` | uvolnění paměti GPU |
| adaptivní `near` | `adaptNearPlane` | přesnost hloubkového bufferu |
| `frustumCulled = false` u deformovaných objektů | plášť, lana | ořezové koule se nepřepočítávají každý snímek |

Cíl byl ≥ 30 FPS na průměrném telefonu. Hodnoty konstant (hustota stromů `treeSpacing`, rozlišení terénu
`segments`, `BIRDS.enabled`) lze snížit, pokud by hra na slabém zařízení zpomalovala.

## 7.11 Ladění vykreslování

- **Černá obrazovka:** zkontrolujte konzoli; typicky chyba shaderu (v textu chyby je číslo řádku GLSL).
- **Objekt je neviditelný:** je za kamerou, mimo `near`/`far`, má nulové měřítko, nebo je skrytý
  (`visible = false`)? V konzoli: `game.scene.children`.
- **Prosvítající nebo blikající plochy:** *z-fighting* (dvě plochy ve stejné výšce); upravte výšku o malou hodnotu
  nebo použijte `polygonOffset`.
- **Pomalé vykreslování:** v konzoli zjistíte počet draw calls: `game.renderer.info.render.calls`
  a počet trojúhelníků `game.renderer.info.render.triangles`.

> **Zkuste to:** v konzoli napište `game.renderer.info.render` a pozorujte, jak se čísla mění mezi plánováním,
> letem a oslavou.
