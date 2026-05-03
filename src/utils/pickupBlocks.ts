// Vanilla 7DTD V2.6 blocks that get the optional press-E pickup treatment.
//
// Two opt-in tiers:
//
//   PICKUP_BLOCKS              ~ paintings, posters, canvases, frames.
//                                Toggled by PackMeta.enablePickup (default ON).
//   EXTENDED_DECOR_PICKUP_BLOCKS ~ flags, road signs, shop signs, mirrors,
//                                clocks, bulletin boards, planters, bathroom
//                                signs, etc. (~224 blocks).
//                                Toggled by PackMeta.enableExtendedDecorPickup
//                                (default ON, separate checkbox).
//
// buildModlet flattens whichever lists are enabled and emits one <append>
// xpath patch per block name into Config/blocks.xml at build time.

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

// ===========================================================================
// EXTENDED_DECOR_PICKUP_BLOCKS ~ v0.9.0 (issue #3)
//
// Vanilla wall decor that isn't a picture/poster/canvas: flags, road signs,
// shop signs, gun store signs, OPEN/CLOSED, mirrors, clocks, bulletin boards,
// planters, bathroom signs, ad signs, gas station signs, etc.
//
// Surfaced via scripts/audit_pickup_candidates.py against vanilla blocks.xml.
// Audit found 290 cosmetic wall/decor blocks not currently pickup-able. 238
// had clean (non-electrical, non-TileEntity) lineage. We ship 224 here.
//
// Deliberately EXCLUDED:
// - Trader signage (15) ~ user call: don't steal from traders. Includes
//   signTraderJen/Joel/Hugh/Bob/Rekt + flagPoleTrader + signNoticeTrader.
// - Lit / electrical signs (52) ~ user call: "we won't take the lit signs due
//   to risk to electric shock." Anything with Lit/Light/Neon/Trap/Sconce in
//   the name or extending lightPorchWhite ~ auto-flagged by the audit script.
//   These are functional electrical blocks and adding CanPickup risks the
//   same init NREs that hidden safes triggered.
// ===========================================================================

export const EXTENDED_DECOR_PICKUP_BLOCKS: string[] = [
  // --- Flags ~ wall-hung + top-mount + Gadsden colors (38) ---
  'flagPoleWhiteRiver',
  'flagPoleAmerican',
  'flagWallHungUSA',
  'flagWallHungDuke',
  'flagWallHungHonorDuty',
  'flagWallHungValiant',
  'flagWallHungTFP',
  'flagWallHungThick44Black',
  'flagWallHungThick44Purple',
  'flagWallHungGadsdenWhite',
  'flagWallHungGadsdenBrown',
  'flagWallHungGadsdenRed',
  'flagWallHungGadsdenOrange',
  'flagWallHungGadsdenYellow',
  'flagWallHungGadsdenGreen',
  'flagWallHungGadsdenBlue',
  'flagWallHungGadsdenPurple',
  'flagWallHungGadsdenGrey',
  'flagWallHungGadsdenPink',
  'flagWallHungGadsdenArmyGreen',
  'flagTopWallHungUSA',
  'flagTopWallHungDuke',
  'flagTopWallHungHonorDuty',
  'flagTopWallHungValiant',
  'flagTopWallHungTFP',
  'flagTopWallHungThick44Black',
  'flagTopWallHungThick44Purple',
  'flagTopWallHungGadsdenWhite',
  'flagTopWallHungGadsdenBrown',
  'flagTopWallHungGadsdenRed',
  'flagTopWallHungGadsdenOrange',
  'flagTopWallHungGadsdenYellow',
  'flagTopWallHungGadsdenGreen',
  'flagTopWallHungGadsdenBlue',
  'flagTopWallHungGadsdenPurple',
  'flagTopWallHungGadsdenGrey',
  'flagTopWallHungGadsdenPink',
  'flagTopWallHungGadsdenArmyGreen',

  // --- OPEN / CLOSED storefront mounts (4) ~ user's original ask ---
  'signOpenWallMountChain',
  'signOpenWallMountFrame',
  'signOpenSideMount',
  'signOpenCeilingMount',

  // --- Storefront / shop signs ~ unlit base variants only (37).
  //     Lit / WallLit / LargeLit variants intentionally excluded ~ they extend
  //     light blocks and would risk electrical-init NREs. ---
  'signShopOpen',
  'signShopGas',
  'signShopGasWall',
  'signShopGasLarge',
  'signShopGasLargeWall',
  'signShopGunStore',
  'signShopGunStoreWall',
  'signShopGunStoreLarge',
  'signShopGunStoreLargeWall',
  'signShopBookStore',
  'signShopBookStoreWall',
  'signShopBookStoreLarge',
  'signShopBookStoreLargeWall',
  'signShopPharmacy',
  'signShopPharmacyWall',
  'signShopPharmacyLarge',
  'signShopPharmacyLargeWall',
  'signShopToolStore',
  'signShopToolStoreWall',
  'signShopToolStoreLarge',
  'signShopToolStoreLargeWall',
  'signShopGrocery',
  'signShopGroceryWall',
  'signShopGroceryLarge',
  'signShopGroceryLargeWall',
  'signShopSavageCountry',
  'signShopSavageCountryWall',
  'signShopSavageCountryLarge',
  'signShopSavageCountryLargeWall',
  'signShopMoPowerElectronics',
  'signShopMoPowerElectronicsWall',
  'signShopMoPowerElectronicsLarge',
  'signShopMoPowerElectronicsLargeWall',
  'signShopPostOfficeSign',
  'signShopPostOfficeSignWall',
  'signShopPostOfficeSignLarge',
  'signShopPostOfficeSignLargeWall',

  // --- Gun store signs ~ all extend signNoParkingHanging (10) ---
  'signGunsThinSafety',
  'signGunsThinSafety2',
  'signGunsWideWarning',
  'signGunsWideWarning2',
  'signGunsThinAttention',
  'signGunsThinNo',
  'signGunsThinPermitted',
  'signGunsThinReturn',
  'signGunsThinSmile',
  'signGunsThinSmoke',

  // --- Road / street / traffic signs (59) ~ hanging + post-mount.
  //     signTrafficLight / signTrafficLightOffset / signCrosswalk excluded ~
  //     they extend lightPorchWhite and are functional traffic lights. ---
  'signRoadArrowheadApache',
  'signRoadAZ260eastSpeed65',
  'signRoadAZ260west',
  'signRoadAZ260westSpeed65',
  'signRoadAZ73north',
  'signRoadAZ73northSpeed65',
  'signRoadAZ73south',
  'signRoadAZ73southSpeed65',
  'signRoadApacheAZ260',
  'signRoadBellLake',
  'signRoadCoronado',
  'signRoadCoronadoCourtland',
  'signRoadCourtlandApache',
  'signRoadCourtlandAZ260Left',
  'signRoadCourtlandAZ260Right',
  'signRoadCourtlandBell',
  'signRoadCourtlandHuenink',
  'signRoadCourtlandMaple',
  'signRoadCourtlandTran',
  'signRoadDavis',
  'signRoadEssig',
  'signRoadLangTran',
  'signRoadTran',
  'signRoadMaple',
  'signRoadDestinationsEast',
  'signRoadDestinationsWest',
  'signNoHazardousWaste',
  'signRoadWork',
  'signRoadRoughSurface',
  'signSchoolZone',
  'signRoadSlow',
  'signRoadSpeed25',
  'signRoadSpeed25noTrucks',
  'signRoadSpeed35',
  'signRoadSpeed45',
  'signRoadSpeed55',
  'signRoadSpeed65',
  'signRoadStop',
  'signRoadStop4way',
  'signNoParkingHanging',
  'signCrossWalkYellowHanging',
  'signSlowHanging',
  'signDoNotEnterHanging',
  'signPrivateProperty',
  'signNotice',
  'signGunsThinPrivate',
  'signRoadPrivate',
  'signYardSign01',
  'signCrossWalkYellow',
  'signDoNotEnter',
  'signHandicapParking',
  'signNoParking',
  'signTowAway',
  'signNotice01',
  'signNotice02',
  'signNotice03',
  'signNotice04',
  'signMiscDoNotEnter',
  'signMiscPrivate',

  // --- Misc shop / diner / gas / safety signs (62) ~ wall ad signs ---
  'signCamping',
  'signSpillwayLake',
  'signAnselAdamsRiver',
  'signNationalPark',
  'signCampFish',
  'signInfoCenter',
  'signNeighborhoodWatch',
  'signPassNGasHanging',
  'signPassNGasHanging2',
  'signPillsLogo',
  'signPillsLogoSmall',
  'signDinersMenu',
  'signDinersMenu2m',
  'signDinersMenu2mCentered',
  'signBookSaleAd',
  'signBread01',
  'signBread02',
  'signCigaretteAd',
  'signLaborDaySaleAd',
  'signMegaCrushAd',
  'signSale01',
  'signSale02',
  'signShamwaySale',
  'signGas01', 'signGas02', 'signGas03', 'signGas04', 'signGas05',
  'signGas06', 'signGas07', 'signGas08', 'signGas09', 'signGas10',
  'signGas11', 'signGas12', 'signGas13', 'signGas14', 'signGas15',
  'signGas16', 'signGas17', 'signGas18', 'signGas19', 'signGas20',
  'signGas21',
  'signSafetyWorkProtection',
  'signAuthorizedPersonnel',
  'signStaffOnly',
  'signCaution',
  'signHardHat',
  'signMisc4Lease',
  'signMisc4Sale',
  'signMisc4SaleSold',
  'signMiscAdministration',
  'signMiscBewareOfDog',
  'signMiscDangerHazard',
  'signMiscQuarantineArea',
  'signMiscRestrictedArea',
  'signMiscSmile',
  'signMiscStair',
  'signMiscSurveilledArea',
  'signMiscWarningQuarantine',
  'signMiscQuarantineTape',

  // --- Bathroom signs ~ wall + ceiling mount (6) ---
  'signBathroomSignUnisexWallMount',
  'signBathroomSignUnisexCeilingMount',
  'signBathroomSignWomenWallMount',
  'signBathroomSignWomenCeilingMount',
  'signBathroomSignMenWallMount',
  'signBathroomSignMenCeilingMount',

  // --- Wall clocks (2) ---
  'wallClock',
  'wallClockBroken',

  // --- Mirrors (2) ---
  'wallMirror',
  'wallMirrorBroken',

  // --- Bulletin / cork / chalk boards (2) ---
  'signBulletinBoard01',
  'signBulletinBoard02',

  // --- Planters (2) ---
  'birdBathPlanter',
  'planter',
]

/** XML harvest-tag the wrench/disassemble tool matches against to pick a block up. */
export const HARVEST_TAG = 'oreWoodHarvest'
