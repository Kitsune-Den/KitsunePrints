// All vanilla 7DTD V2.6 picture/poster/canvas blocks that get the optional
// "wrench-pickup + place from inventory" treatment when a pack opts in via
// PackMeta.enablePickup. The XPath patch adds a Harvest drop returning the
// block as itself, making `wrench → inventory → place` the survival flow.
//
// The list is grouped only for readability; buildModlet flattens it.

export const PICKUP_BLOCKS: string[] = [
  // --- Backer portraits (6) ---
  'paintingBen',
  'paintingLorien',
  'paintingDerek',
  'paintingNoah',
  'paintingDuke',
  'paintingKen',

  // --- Abstract paintings (8 ~ 4 designs × 2 sizes) ---
  'paintingAbstract01_2x2', 'paintingAbstract01_3x2',
  'paintingAbstract02_2x2', 'paintingAbstract02_3x2',
  'paintingAbstract03_2x2', 'paintingAbstract03_3x2',
  'paintingAbstract04_2x2', 'paintingAbstract04_3x2',

  // --- Misc decor posters (12) ---
  'posterCalendarPinupWorkingStiff',
  'posterBlueprintPistol',
  'posterBlueprintRifle',
  'posterCat',
  'posterCats',
  'posterSparky',
  'targetPoster1',
  'targetPoster2',
  'signPosterWantedMissing01',
  'signPosterWantedMissing02',
  'signPosterWantedMissing03',

  // --- Snack posters (17) ---
  'signSnackPosterAtom',
  'signSnackPosterBretzels',
  'signSnackPosterEyeCandy',
  'signSnackPosterFortBites',
  'signSnackPosterGoblinO',
  'signSnackPosterHackers',
  'signSnackPosterHealth',
  'signSnackPosterJailBreakers',
  'signSnackPosterJerky',
  'signSnackPosterNachos',
  'signSnackPosterNachosRanch',
  'signSnackPosterNerd',
  'signSnackPosterOops',
  'signSnackPosterOopsClassic',
  'signSnackPosterPrime',
  'signSnackPosterRamen',
  'signSnackPosterSkullCrusher',

  // --- Movie posters + theater variants (8) ---
  'signPosterMovie2159',
  'signPosterMovieLoneWolf',
  'signPosterMovieMammasJustice',
  'signPosterMovieSexualTension',
  'signPosterMovieTheater2159',
  'signPosterMovieTheaterLoneWolf',
  'signPosterMovieTheaterMammasJustice',
  'signPosterMovieTheaterSexualTension',

  // --- Picture canvases A-J + helper (11) ---
  'pictureCanvas_01a',
  'pictureCanvas_01b',
  'pictureCanvas_01c',
  'pictureCanvas_01d',
  'pictureCanvas_01e',
  'pictureCanvas_01f',
  'pictureCanvas_01g',
  'pictureCanvas_01h',
  'pictureCanvas_01i',
  'pictureCanvas_01j',
  'pictureCanvasRandomHelper',

  // --- Picture frames A-W (23) ---
  'pictureFrame_01a', 'pictureFrame_01b', 'pictureFrame_01c', 'pictureFrame_01d',
  'pictureFrame_01e', 'pictureFrame_01f', 'pictureFrame_01g', 'pictureFrame_01h',
  'pictureFrame_01i', 'pictureFrame_01j', 'pictureFrame_01k', 'pictureFrame_01l',
  'pictureFrame_01m', 'pictureFrame_01n', 'pictureFrame_01o', 'pictureFrame_01p',
  'pictureFrame_01q', 'pictureFrame_01r', 'pictureFrame_01s', 'pictureFrame_01t',
  'pictureFrame_01u', 'pictureFrame_01v', 'pictureFrame_01w',

  // --- Hidden-safe disguises (16) ---
  'hiddenSafePictureFrame_01a',
  'hiddenSafePictureFrame_01c',
  'hiddenSafePictureFrame_01d',
  'hiddenSafePictureFrame_01e',
  'hiddenSafePictureFrame_01f',
  'hiddenSafePictureFrame_01h',
  'hiddenSafePictureFrame_01j',
  'hiddenSafePictureFrame_01l',
  'hiddenSafePictureFrame_01m',
  'hiddenSafePictureFrame_01o',
  'hiddenSafePictureFrame_01p',
  'hiddenSafePictureFrame_01q',
  'hiddenSafePictureFrame_01r',
  'hiddenSafePictureFrame_01s',
  'hiddenSafePictureFrame_01t',
  'hiddenSafePictureFrame_01u',
]

/** XML harvest-tag the wrench/disassemble tool matches against to pick a block up. */
export const HARVEST_TAG = 'oreWoodHarvest'
