// Barvy z design systému VOŠ, SPŠ a SOŠ Varnsdorf (viz doc/09-design-system.md) a barvy materiálů scény.
// Stejné hodnoty jsou v CSS proměnných v src/ui/styles.css (tam jako #rrggbb), tady jako číslo pro Three.js.
export const BRAND = {
  bgTop: 0x003b4b,      // horní barva gradientu pozadí rozhraní
  bgBottom: 0x006783,   // spodní barva gradientu
  yellow1: 0xffd400,
  yellow2: 0xffea80,
  blue1: 0x41d7ff,
  blue2: 0x00c0f3,
  green1: 0xc2dd78,
  green2: 0xa6ce39,
  white: 0xffffff,
  red: 0xb3202e,        // červená do šachovnice pláště (není součástí školní palety)
  cream: 0xf5efe6,      // krémová do šachovnice pláště
};

export const COLORS = {
  sky: 0x8ec9e8,
  skyEvening: 0xf0b98a,

  // biomy
  meadow: 0x85a850,
  meadowAlt: 0x779c46,
  hill: 0x688b3f,
  field1: 0xcdb468,
  field2: 0xb0895a,
  field3: 0x9aaa5c,
  forest: 0x35592e,
  rock: 0x70726e,
  town: 0x4b4e54,           // město: tmavší šedá než skála, aby se obě nezaměnily
  houseWalls: [0xe9e2d0, 0xd9c9a6, 0xe6d9a0, 0xc9d3d6, 0xd8b9a0],
  churchWall: 0xefe9dc,
  churchRoof: 0x4a3a35,
  hradekWall: 0xe6c24a,    // Hrádek: žluté stěny, červená střecha a pásy, kamenný sokl
  hradekRoof: 0xa8392b,
  hradekTrim: 0x8f2f25,
  hradekStone: 0x8c8a85,
  hradekWindow: 0x3b2f2a,
  bezdezWall: 0xd3b06c,    // Bezděz: okrové zdivo, tmavá střecha
  bezdezRoof: 0x4a4540,
  trosky: 0x6f6a62,        // Trosky: tmavá čedičová skála
  troskyStone: 0x9a968d,   // kamenné věže na skalách
  chimney: 0x8d5a46,
  houseRoofs: [0x8a3b2e, 0x6e2f27, 0x3b3f45, 0x5a4636],
  water: 0x2c7fa8,
  waterSurface: 0x3a96c0,
  riverBed: 0x2a5f7a,

  // stromy
  trunk: 0x6b4a2b,
  pine: 0x2b5430,
  pineLight: 0x3d6a3d,

  // balon
  envelopeRed: BRAND.red,
  envelopeWhite: BRAND.cream,
  envelopeBand: BRAND.blue1,
  basket: 0xa0742f,
  basketDark: 0x5c4018,
  rope: 0x2b2b2b,
  steel: 0x9aa0a6,
  burner: 0x3a3d42,
  bottle: 0xc23a2e,
  bird: 0x2b3038,
  flame: 0xffa21a,
  flameCore: 0xfff2a8,
};
