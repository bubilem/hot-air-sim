# Tituly na diplomu (`titles.json`)

Titul na diplomu a při křtu sektem závisí na **lokalitě**, **oslovení** (pán / dáma) a **skóre** (4 stupně).
Texty jsou v `public/titles.json`. Stačí je upravit v textovém editoru, kód měnit není nutné.

```json
{
  "default": { "m": { "cs": ["…", "…", "…", "…"], "en": ["…", "…", "…", "…"] }, "f": { } },
  "sites":   { "luzicke": { "m": { }, "f": { } }, "raj": { } }
}
```

- `sites`: klíč je `id` lokality ze `src/world/Sites.js` (`luzicke`, `polabi`, `raj`, `mach`).
- `m` / `f`: pán (mužský tvar) a dáma (ženský tvar); každý má `cs` a `en`.
- Pole má **4 položky od nejnižšího titulu po nejvyšší** (podle skóre: 0 = nejméně, 3 = nejvíc).
- `default` se použije, když lokalita nemá vlastní tituly (např. nová lokalita) nebo chybí položka.
- Chybí-li celý soubor, hra použije vestavěné tituly z `src/i18n/`, diplom vždy vznikne.
- Po úpravě stačí obnovit stránku. Hlídejte čárky a uvozovky (JSON lze zkontrolovat např. na jsonlint.com).
