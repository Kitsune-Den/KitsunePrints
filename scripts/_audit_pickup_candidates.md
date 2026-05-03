# Pickup Audit ~ vanilla wall decor candidates

Source: `F:\72D2D-Server\Data\Config\blocks.xml`
Total candidate blocks (sign/flag/decor/etc., not already pickup-able, not already in PICKUP_BLOCKS): **290**

- Safe-to-include candidates: **238**
- Flagged risky (TileEntity/loot/helper lineage, EXCLUDE): **52**

## Bulletin / cork / chalk boards (2)

**Likely include:**

- `signBulletinBoard01` (extends `decoEntityWoodMaster`)
- `signBulletinBoard02` (extends `signBulletinBoard01`)

## Dart boards (1)

**Likely exclude (flagged):**

- `dartTrap` ~ name contains 'Trap' (likely electrical/trap)

## Exit signs (8)

**Likely exclude (flagged):**

- `signExitLight` ~ name contains 'Light' (likely electrical/trap)
- `signExitLightOffset` ~ name contains 'Light' (likely electrical/trap)
- `signExitFrameMount` ~ signExitFrameMount has _extends=lightPorchWhite (matches 'lightPorch')
- `signExitFrameMountHigh` ~ signExitFrameMountHigh has _extends=lightPorchWhite (matches 'lightPorch')
- `signExitFrameMount2mCentered` ~ signExitFrameMount2mCentered has _extends=lightPorchWhite (matches 'lightPorch')
- `signExitFrameMountHigh2mCentered` ~ signExitFrameMountHigh2mCentered has _extends=lightPorchWhite (matches 'lightPorch')
- `signExitWallMount` ~ signExitWallMount has _extends=lightPorchWhite (matches 'lightPorch')
- `signExitWallMountHigh` ~ signExitWallMountHigh has _extends=lightPorchWhite (matches 'lightPorch')

## Flags (38)

**Likely include:**

- `flagPoleWhiteRiver`
- `flagPoleAmerican`
- `flagWallHungUSA`
- `flagWallHungDuke` (extends `flagWallHungUSA`)
- `flagWallHungHonorDuty` (extends `flagWallHungUSA`)
- `flagWallHungValiant` (extends `flagWallHungUSA`)
- `flagWallHungTFP` (extends `flagWallHungUSA`)
- `flagWallHungThick44Black` (extends `flagWallHungUSA`)
- `flagWallHungThick44Purple` (extends `flagWallHungUSA`)
- `flagWallHungGadsdenWhite` (extends `flagWallHungUSA`)
- `flagWallHungGadsdenBrown` (extends `flagWallHungGadsdenWhite`)
- `flagWallHungGadsdenRed` (extends `flagWallHungGadsdenWhite`)
- `flagWallHungGadsdenOrange` (extends `flagWallHungGadsdenWhite`)
- `flagWallHungGadsdenYellow` (extends `flagWallHungGadsdenWhite`)
- `flagWallHungGadsdenGreen` (extends `flagWallHungGadsdenWhite`)
- `flagWallHungGadsdenBlue` (extends `flagWallHungGadsdenWhite`)
- `flagWallHungGadsdenPurple` (extends `flagWallHungGadsdenWhite`)
- `flagWallHungGadsdenGrey` (extends `flagWallHungGadsdenWhite`)
- `flagWallHungGadsdenPink` (extends `flagWallHungGadsdenWhite`)
- `flagWallHungGadsdenArmyGreen` (extends `flagWallHungGadsdenWhite`)
- `flagTopWallHungUSA`
- `flagTopWallHungDuke` (extends `flagTopWallHungUSA`)
- `flagTopWallHungHonorDuty` (extends `flagTopWallHungUSA`)
- `flagTopWallHungValiant` (extends `flagTopWallHungUSA`)
- `flagTopWallHungTFP` (extends `flagTopWallHungUSA`)
- `flagTopWallHungThick44Black` (extends `flagTopWallHungUSA`)
- `flagTopWallHungThick44Purple` (extends `flagTopWallHungUSA`)
- `flagTopWallHungGadsdenWhite` (extends `flagTopWallHungUSA`)
- `flagTopWallHungGadsdenBrown` (extends `flagTopWallHungGadsdenWhite`)
- `flagTopWallHungGadsdenRed` (extends `flagTopWallHungGadsdenWhite`)
- `flagTopWallHungGadsdenOrange` (extends `flagTopWallHungGadsdenWhite`)
- `flagTopWallHungGadsdenYellow` (extends `flagTopWallHungGadsdenWhite`)
- `flagTopWallHungGadsdenGreen` (extends `flagTopWallHungGadsdenWhite`)
- `flagTopWallHungGadsdenBlue` (extends `flagTopWallHungGadsdenWhite`)
- `flagTopWallHungGadsdenPurple` (extends `flagTopWallHungGadsdenWhite`)
- `flagTopWallHungGadsdenGrey` (extends `flagTopWallHungGadsdenWhite`)
- `flagTopWallHungGadsdenPink` (extends `flagTopWallHungGadsdenWhite`)
- `flagTopWallHungGadsdenArmyGreen` (extends `flagTopWallHungGadsdenWhite`)

## Gun store signs (10)

**Likely include:**

- `signGunsThinSafety` (extends `signNoParkingHanging`)
- `signGunsThinSafety2` (extends `signNoParkingHanging`)
- `signGunsWideWarning` (extends `signNoParkingHanging`)
- `signGunsWideWarning2` (extends `signNoParkingHanging`)
- `signGunsThinAttention` (extends `signNoParkingHanging`)
- `signGunsThinNo` (extends `signNoParkingHanging`)
- `signGunsThinPermitted` (extends `signNoParkingHanging`)
- `signGunsThinReturn` (extends `signNoParkingHanging`)
- `signGunsThinSmile` (extends `signNoParkingHanging`)
- `signGunsThinSmoke` (extends `signNoParkingHanging`)

## Mirrors (2)

**Likely include:**

- `wallMirror`
- `wallMirrorBroken`

## OPEN / CLOSED signs (4)

**Likely include:**

- `signOpenWallMountChain`
- `signOpenWallMountFrame` (extends `signOpenWallMountChain`)
- `signOpenSideMount` (extends `signOpenWallMountChain`)
- `signOpenCeilingMount` (extends `signOpenWallMountChain`)

## Other signs (62)

**Likely include:**

- `signCamping` (extends `signRoadAZ260eastSpeed65`)
- `signSpillwayLake` (extends `signRoadAZ260eastSpeed65`)
- `signAnselAdamsRiver` (extends `signRoadAZ260eastSpeed65`)
- `signNationalPark`
- `signCampFish` (extends `signCamping`)
- `signInfoCenter` (extends `signCamping`)
- `signNeighborhoodWatch` (extends `signNoParkingHanging`)
- `signPassNGasHanging` (extends `signNoParkingHanging`)
- `signPassNGasHanging2` (extends `signNoParkingHanging`)
- `signPillsLogo`
- `signPillsLogoSmall` (extends `signPillsLogo`)
- `signDinersMenu` (extends `signPosterWantedMissing02`)
- `signDinersMenu2m` (extends `signPosterWantedMissing01`)
- `signDinersMenu2mCentered` (extends `signPosterWantedMissing01`)
- `signBookSaleAd` (extends `signPosterWantedMissing01`)
- `signBread01` (extends `signPosterWantedMissing01`)
- `signBread02` (extends `signPosterWantedMissing01`)
- `signCigaretteAd` (extends `signPosterWantedMissing01`)
- `signLaborDaySaleAd` (extends `signPosterWantedMissing01`)
- `signMegaCrushAd` (extends `signPosterWantedMissing01`)
- `signSale01` (extends `signPosterWantedMissing01`)
- `signSale02` (extends `signPosterWantedMissing01`)
- `signShamwaySale` (extends `signPosterWantedMissing01`)
- `signGas01`
- `signGas02` (extends `signGas01`)
- `signGas03` (extends `signGas01`)
- `signGas04` (extends `signGas01`)
- `signGas05` (extends `signGas01`)
- `signGas06` (extends `signGas01`)
- `signGas07` (extends `signGas01`)
- `signGas08` (extends `signGas01`)
- `signGas09` (extends `signGas01`)
- `signGas10` (extends `signGas01`)
- `signGas11` (extends `signGas01`)
- `signGas12` (extends `signGas01`)
- `signGas13` (extends `signGas01`)
- `signGas14` (extends `signGas01`)
- `signGas15` (extends `signGas01`)
- `signGas16` (extends `signGas01`)
- `signGas17` (extends `signGas01`)
- `signGas18` (extends `signGas01`)
- `signGas19` (extends `signGas01`)
- `signGas20` (extends `signGas01`)
- `signGas21` (extends `signGas01`)
- `signSafetyWorkProtection` (extends `signPosterWantedMissing01`)
- `signAuthorizedPersonnel` (extends `signPosterWantedMissing02`)
- `signStaffOnly` (extends `signPosterWantedMissing02`)
- `signCaution` (extends `signPosterWantedMissing02`)
- `signHardHat` (extends `signPosterWantedMissing02`)
- `signMisc4Lease` (extends `signPosterWantedMissing02`)
- `signMisc4Sale` (extends `signMisc4Lease`)
- `signMisc4SaleSold` (extends `signMisc4Lease`)
- `signMiscAdministration` (extends `signMisc4Lease`)
- `signMiscBewareOfDog` (extends `signMisc4Lease`)
- `signMiscDangerHazard` (extends `signMisc4Lease`)
- `signMiscQuarantineArea` (extends `signMisc4Lease`)
- `signMiscRestrictedArea` (extends `signMisc4Lease`)
- `signMiscSmile` (extends `signMisc4Lease`)
- `signMiscStair` (extends `signMisc4Lease`)
- `signMiscSurveilledArea` (extends `signMisc4Lease`)
- `signMiscWarningQuarantine` (extends `signMisc4Lease`)
- `signMiscQuarantineTape` (extends `signMisc4Lease`)

## Road / street signs (62)

**Likely include:**

- `signRoadArrowheadApache`
- `signRoadAZ260eastSpeed65` (extends `signRoadArrowheadApache`)
- `signRoadAZ260west` (extends `signRoadAZ260eastSpeed65`)
- `signRoadAZ260westSpeed65` (extends `signRoadAZ260eastSpeed65`)
- `signRoadAZ73north` (extends `signRoadAZ260eastSpeed65`)
- `signRoadAZ73northSpeed65` (extends `signRoadAZ260eastSpeed65`)
- `signRoadAZ73south` (extends `signRoadAZ260eastSpeed65`)
- `signRoadAZ73southSpeed65` (extends `signRoadAZ260eastSpeed65`)
- `signRoadApacheAZ260` (extends `signRoadAZ260eastSpeed65`)
- `signRoadBellLake` (extends `signRoadAZ260eastSpeed65`)
- `signRoadCoronado` (extends `signRoadAZ260eastSpeed65`)
- `signRoadCoronadoCourtland` (extends `signRoadAZ260eastSpeed65`)
- `signRoadCourtlandApache` (extends `signRoadAZ260eastSpeed65`)
- `signRoadCourtlandAZ260Left` (extends `signRoadAZ260eastSpeed65`)
- `signRoadCourtlandAZ260Right` (extends `signRoadAZ260eastSpeed65`)
- `signRoadCourtlandBell` (extends `signRoadAZ260eastSpeed65`)
- `signRoadCourtlandHuenink` (extends `signRoadAZ260eastSpeed65`)
- `signRoadCourtlandMaple` (extends `signRoadAZ260eastSpeed65`)
- `signRoadCourtlandTran` (extends `signRoadAZ260eastSpeed65`)
- `signRoadDavis` (extends `signRoadAZ260eastSpeed65`)
- `signRoadEssig` (extends `signRoadAZ260eastSpeed65`)
- `signRoadLangTran` (extends `signRoadAZ260eastSpeed65`)
- `signRoadTran` (extends `signRoadAZ260eastSpeed65`)
- `signRoadMaple` (extends `signRoadAZ260eastSpeed65`)
- `signRoadDestinationsEast` (extends `signRoadArrowheadApache`)
- `signRoadDestinationsWest` (extends `signRoadArrowheadApache`)
- `signNoHazardousWaste` (extends `signCamping`)
- `signRoadWork` (extends `signCamping`)
- `signRoadRoughSurface` (extends `signCamping`)
- `signSchoolZone` (extends `signCamping`)
- `signRoadSlow` (extends `signCamping`)
- `signRoadSpeed25` (extends `signCamping`)
- `signRoadSpeed25noTrucks` (extends `signCamping`)
- `signRoadSpeed35` (extends `signCamping`)
- `signRoadSpeed45` (extends `signCamping`)
- `signRoadSpeed55` (extends `signCamping`)
- `signRoadSpeed65` (extends `signCamping`)
- `signRoadStop` (extends `signCamping`)
- `signRoadStop4way` (extends `signCamping`)
- `signNoParkingHanging`
- `signCrossWalkYellowHanging` (extends `signNoParkingHanging`)
- `signSlowHanging` (extends `signNoParkingHanging`)
- `signDoNotEnterHanging` (extends `signNoParkingHanging`)
- `signPrivateProperty` (extends `signNoParkingHanging`)
- `signNotice` (extends `signNoParkingHanging`)
- `signGunsThinPrivate` (extends `signNoParkingHanging`)
- `signRoadPrivate` (extends `signRoadAZ260eastSpeed65`)
- `signYardSign01` (extends `signRoadArrowheadApache`)
- `signCrossWalkYellow` (extends `signRoadAZ260eastSpeed65`)
- `signDoNotEnter` (extends `signRoadAZ260eastSpeed65`)
- `signHandicapParking` (extends `signRoadAZ260eastSpeed65`)
- `signNoParking` (extends `signRoadAZ260eastSpeed65`)
- `signTowAway` (extends `signYardSign01`)
- `signNotice01` (extends `signPosterWantedMissing02`)
- `signNotice02` (extends `signPosterWantedMissing02`)
- `signNotice03` (extends `signPosterWantedMissing02`)
- `signNotice04` (extends `signPosterWantedMissing02`)
- `signMiscDoNotEnter` (extends `signMisc4Lease`)
- `signMiscPrivate` (extends `signMisc4Lease`)

**Likely exclude (flagged):**

- `signTrafficLight` ~ name contains 'Light' (likely electrical/trap)
- `signTrafficLightOffset` ~ name contains 'Light' (likely electrical/trap)
- `signCrosswalk` ~ signTrafficLight has _extends=lightPorchWhite (matches 'lightPorch')

## Storefront / shop signs (74)

**Likely include:**

- `signShopOpen`
- `signShopGas`
- `signShopGasWall` (extends `signShopGas`)
- `signShopGasLarge` (extends `signShopGas`)
- `signShopGasLargeWall` (extends `signShopGasLarge`)
- `signShopGunStore`
- `signShopGunStoreWall` (extends `signShopGunStore`)
- `signShopGunStoreLarge` (extends `signShopGunStore`)
- `signShopGunStoreLargeWall` (extends `signShopGunStoreLarge`)
- `signShopBookStore`
- `signShopBookStoreWall` (extends `signShopBookStore`)
- `signShopBookStoreLarge` (extends `signShopBookStore`)
- `signShopBookStoreLargeWall` (extends `signShopBookStoreLarge`)
- `signShopPharmacy`
- `signShopPharmacyWall` (extends `signShopPharmacy`)
- `signShopPharmacyLarge` (extends `signShopPharmacy`)
- `signShopPharmacyLargeWall` (extends `signShopPharmacyLarge`)
- `signShopToolStore`
- `signShopToolStoreWall` (extends `signShopToolStore`)
- `signShopToolStoreLarge` (extends `signShopToolStore`)
- `signShopToolStoreLargeWall` (extends `signShopToolStoreLarge`)
- `signShopGrocery`
- `signShopGroceryWall` (extends `signShopGrocery`)
- `signShopGroceryLarge` (extends `signShopGrocery`)
- `signShopGroceryLargeWall` (extends `signShopGroceryLarge`)
- `signShopSavageCountry` (extends `signShopToolStore`)
- `signShopSavageCountryWall` (extends `signShopSavageCountry`)
- `signShopSavageCountryLarge` (extends `signShopSavageCountry`)
- `signShopSavageCountryLargeWall` (extends `signShopSavageCountryLarge`)
- `signShopMoPowerElectronics` (extends `signShopToolStore`)
- `signShopMoPowerElectronicsWall` (extends `signShopMoPowerElectronics`)
- `signShopMoPowerElectronicsLarge` (extends `signShopMoPowerElectronics`)
- `signShopMoPowerElectronicsLargeWall` (extends `signShopMoPowerElectronicsLarge`)
- `signShopPostOfficeSign` (extends `signShopToolStore`)
- `signShopPostOfficeSignWall` (extends `signShopPostOfficeSign`)
- `signShopPostOfficeSignLarge` (extends `signShopPostOfficeSign`)
- `signShopPostOfficeSignLargeWall` (extends `signShopPostOfficeSignLarge`)

**Likely exclude (flagged):**

- `signNeonColdBeer` ~ name contains 'Neon' (likely electrical/trap)
- `signShopGasLit` ~ name contains 'Lit' (likely electrical/trap)
- `signShopGasWallLit` ~ name contains 'Lit' (likely electrical/trap)
- `signShopGasLargeLit` ~ name contains 'Lit' (likely electrical/trap)
- `signShopGasLargeWallLit` ~ name contains 'Lit' (likely electrical/trap)
- `signShopGunStoreLit` ~ name contains 'Lit' (likely electrical/trap)
- `signShopGunStoreWallLit` ~ name contains 'Lit' (likely electrical/trap)
- `signShopGunStoreLargeLit` ~ name contains 'Lit' (likely electrical/trap)
- `signShopGunStoreLargeWallLit` ~ name contains 'Lit' (likely electrical/trap)
- `signShopBookStoreLit` ~ name contains 'Lit' (likely electrical/trap)
- `signShopBookStoreWallLit` ~ name contains 'Lit' (likely electrical/trap)
- `signShopBookStoreLargeLit` ~ name contains 'Lit' (likely electrical/trap)
- `signShopBookStoreLargeWallLit` ~ name contains 'Lit' (likely electrical/trap)
- `signShopPharmacyLit` ~ name contains 'Lit' (likely electrical/trap)
- `signShopPharmacyWallLit` ~ name contains 'Lit' (likely electrical/trap)
- `signShopPharmacyLargeLit` ~ name contains 'Lit' (likely electrical/trap)
- `signShopPharmacyLargeWallLit` ~ name contains 'Lit' (likely electrical/trap)
- `signShopToolStoreLit` ~ name contains 'Lit' (likely electrical/trap)
- `signShopToolStoreWallLit` ~ name contains 'Lit' (likely electrical/trap)
- `signShopToolStoreLargeLit` ~ name contains 'Lit' (likely electrical/trap)
- `signShopToolStoreLargeWallLit` ~ name contains 'Lit' (likely electrical/trap)
- `signShopGroceryLit` ~ name contains 'Lit' (likely electrical/trap)
- `signShopGroceryWallLit` ~ name contains 'Lit' (likely electrical/trap)
- `signShopGroceryLargeLit` ~ name contains 'Lit' (likely electrical/trap)
- `signShopGroceryLargeWallLit` ~ name contains 'Lit' (likely electrical/trap)
- `signShopSavageCountryLit` ~ name contains 'Lit' (likely electrical/trap)
- `signShopSavageCountryWallLit` ~ name contains 'Lit' (likely electrical/trap)
- `signShopSavageCountryLargeLit` ~ name contains 'Lit' (likely electrical/trap)
- `signShopSavageCountryLargeWallLit` ~ name contains 'Lit' (likely electrical/trap)
- `signShopMoPowerElectronicsLit` ~ name contains 'Lit' (likely electrical/trap)
- `signShopMoPowerElectronicsWallLit` ~ name contains 'Lit' (likely electrical/trap)
- `signShopMoPowerElectronicsLargeLit` ~ name contains 'Lit' (likely electrical/trap)
- `signShopMoPowerElectronicsLargeWallLit` ~ name contains 'Lit' (likely electrical/trap)
- `signShopPostOfficeSignLit` ~ name contains 'Lit' (likely electrical/trap)
- `signShopPostOfficeSignWallLit` ~ name contains 'Lit' (likely electrical/trap)
- `signShopPostOfficeSignLargeLit` ~ name contains 'Lit' (likely electrical/trap)
- `signShopPostOfficeSignLargeWallLit` ~ name contains 'Lit' (likely electrical/trap)

## Trader signage (15)

**Likely include:**

- `signNoticeTrader` (extends `signNoParkingHanging`)
- `signTraderJenInterior`
- `signTraderJenExterior`
- `signTraderJoelExteriorSmall`
- `signTraderJoelExteriorLarge`
- `signTraderHughExterior`
- `signTraderHughInterior`
- `signTraderBobExterior`
- `signTraderBobExteriorLarge`
- `signTraderBobExteriorBig`
- `signTraderBobInterior`
- `signTraderRektExteriorSmall`
- `signTraderRektExteriorLarge`
- `flagPoleTrader`

**Likely exclude (flagged):**

- `signTraderBobInteriorNoLights` ~ name contains 'Light' (likely electrical/trap)

## Trophy mounts (6)

**Likely include:**

- `signBathroomSignUnisexWallMount` (extends `decoEntityMetalMaster`)
- `signBathroomSignUnisexCeilingMount` (extends `signBathroomSignUnisexWallMount`)
- `signBathroomSignWomenWallMount` (extends `signBathroomSignUnisexWallMount`)
- `signBathroomSignWomenCeilingMount` (extends `signBathroomSignUnisexWallMount`)
- `signBathroomSignMenWallMount` (extends `signBathroomSignUnisexWallMount`)
- `signBathroomSignMenCeilingMount` (extends `signBathroomSignUnisexWallMount`)

## Wall clocks (2)

**Likely include:**

- `wallClock` (extends `decoEntityMetalMaster`)
- `wallClockBroken` (extends `wallClock`)

## Wall planters / hanging plants (2)

**Likely include:**

- `birdBathPlanter`
- `planter` (extends `birdBathPlanter`)

## Wall sconces (2)

**Likely exclude (flagged):**

- `lightSconce` ~ name contains 'Light' (likely electrical/trap)
- `lightSconce_2x1` ~ name contains 'Light' (likely electrical/trap)

