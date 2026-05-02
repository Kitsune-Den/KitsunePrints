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

  // --- Picture canvases A-J (10) ~ pictureCanvasRandomHelper deliberately
  //     excluded; it's an internal placeholder block POIs reference via
  //     extends, and CanPickup on it triggered NRE floods during POI load
  //     (diner_02/03, rest_area_03/04, skyscraper_02). Helpers are not
  //     meant to be player-pickup-able. ---
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

  // --- Picture frames A-W (23) ---
  'pictureFrame_01a', 'pictureFrame_01b', 'pictureFrame_01c', 'pictureFrame_01d',
  'pictureFrame_01e', 'pictureFrame_01f', 'pictureFrame_01g', 'pictureFrame_01h',
  'pictureFrame_01i', 'pictureFrame_01j', 'pictureFrame_01k', 'pictureFrame_01l',
  'pictureFrame_01m', 'pictureFrame_01n', 'pictureFrame_01o', 'pictureFrame_01p',
  'pictureFrame_01q', 'pictureFrame_01r', 'pictureFrame_01s', 'pictureFrame_01t',
  'pictureFrame_01u', 'pictureFrame_01v', 'pictureFrame_01w',

  // --- Hidden-safe disguises EXCLUDED ~ they're loot-container TileEntities
  //     under the hood (extend paintings/frames but spawn random loot via
  //     DowngradeBlock=cntWallSafeRandomLootHelper). Adding CanPickup conflicted
  //     with their init flow and caused "Object reference not set to an
  //     instance of an object / Skipping loading of active block data" NREs
  //     during POI load (skyscraper_02, diner_02/03, rest_area_03/04 reported).
  //     Visual swap still applies since they extend their non-safe twin and
  //     inherit material via Extends ~ users still see their custom art on
  //     hidden-safe walls; they just can't press E to pick the safe up. ---
]

/** XML harvest-tag the wrench/disassemble tool matches against to pick a block up. */
export const HARVEST_TAG = 'oreWoodHarvest'
