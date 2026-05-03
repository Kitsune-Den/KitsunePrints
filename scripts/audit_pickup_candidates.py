"""
Audit script for issue #3: surface every wall-mounted / decor block in vanilla
7DTD that *isn't* already pickup-able and isn't already covered by KitsunePrints'
PICKUP_BLOCKS list. Walks the Extends chain to compute effective CanPickup,
flags TileEntity-bearing blocks for exclusion, and groups candidates so a
human can triage them.

Usage:
    python scripts/audit_pickup_candidates.py path/to/Data/Config/blocks.xml > audit.md

Output is markdown so it pastes straight into the GitHub issue.
"""
import re
import sys
from collections import defaultdict
from pathlib import Path
import xml.etree.ElementTree as ET


# Patterns that say "this is the kind of cosmetic wall/surface block we MIGHT
# want to make pickup-able." Intentionally wide ~ we'll filter dangerous ones
# (TileEntities, helpers, etc.) downstream.
INCLUDE_NAME_PATTERNS = [
    r"^sign",          # all signs
    r"^flag",          # flags
    r"^banner",        # banners
    r"^tapestry",
    r"wallClock",
    r"wallMirror",
    r"^dart",          # dart boards
    r"deerMount", r"fishMount", r"buckMount", r"trophyMount",
    r"^bulletin", r"^cork", r"^chalk", r"whiteboard",
    r"wreath",
    r"planter",        # wall/hanging planters
    r"^lightSconce",   # wall sconces (cosmetic ones)
    r"^wallPoster",    # any straggler poster blocks
    r"wallDecor",
    r"wallPhoto",
    r"^framedPhoto",
    r"licensePlate",
    r"^antlerMount",
    r"hangingPlant",
    r"^certificate",
]

# Tags that indicate "this block has a TileEntity / loot container / functional
# behavior" ~ adding CanPickup to these is what blew up POI loads in v0.8.4
# (hidden safes, pictureCanvasRandomHelper). If we see these in a block's
# resolved property set, exclude.
DANGEROUS_PROPS = {
    # Loot containers
    "LootList",
    "DowngradeBlock",  # often points to a *RandomLootHelper
    # Electrical / light TileEntities ~ adding CanPickup to functional lights
    # has historically caused init conflicts similar to the hidden-safe case.
    "LightOpacity",
    "ElectricalNetwork",
    "PassiveEffects",  # power consumers
}
DANGEROUS_VALUE_SUBSTRINGS = [
    "RandomLootHelper",
    "RandomHelper",
    "wallSafe",
    "hiddenSafe",
    "Locker",
    "Cabinet",
    "VendingMachine",
    "Workstation",
    "lightPorch",   # lightPorchWhite parent ~ functional light
    "lightSconce",  # functional sconce
    "lightStreet",
    "lightPole",
]
# Also flag any block whose own name contains these ~ lit signs are electrical.
DANGEROUS_NAME_SUBSTRINGS = [
    "Lit",      # signShopGasLit etc.
    "Trap",     # dartTrap, trapElectric, etc.
    "Light",    # any light block
    "Neon",     # neon = electrical glow
    "Sconce",
    "TrafficLight",
]

# Names already covered by the modlet's existing PICKUP_BLOCKS list. Keep this
# in sync with src/utils/pickupBlocks.ts manually for the audit ~ it's just a
# de-dupe filter, not a source of truth.
ALREADY_COVERED = {
    # paintings
    "paintingBen", "paintingLorien", "paintingDerek", "paintingNoah",
    "paintingDuke", "paintingKen",
    "paintingAbstract01_2x2", "paintingAbstract01_3x2",
    "paintingAbstract02_2x2", "paintingAbstract02_3x2",
    "paintingAbstract03_2x2", "paintingAbstract03_3x2",
    "paintingAbstract04_2x2", "paintingAbstract04_3x2",
    # decor posters
    "posterCalendarPinupWorkingStiff", "posterBlueprintPistol",
    "posterBlueprintRifle", "posterCat", "posterCats", "posterSparky",
    "targetPoster1", "targetPoster2",
    "signPosterWantedMissing01", "signPosterWantedMissing02", "signPosterWantedMissing03",
    # snack posters
    "signSnackPosterAtom", "signSnackPosterBretzels", "signSnackPosterEyeCandy",
    "signSnackPosterFortBites", "signSnackPosterGoblinO", "signSnackPosterHackers",
    "signSnackPosterHealth", "signSnackPosterJailBreakers", "signSnackPosterJerky",
    "signSnackPosterNachos", "signSnackPosterNachosRanch", "signSnackPosterNerd",
    "signSnackPosterOops", "signSnackPosterOopsClassic", "signSnackPosterPrime",
    "signSnackPosterRamen", "signSnackPosterSkullCrusher",
    # movie posters
    "signPosterMovie2159", "signPosterMovieLoneWolf", "signPosterMovieMammasJustice",
    "signPosterMovieSexualTension", "signPosterMovieTheater2159",
    "signPosterMovieTheaterLoneWolf", "signPosterMovieTheaterMammasJustice",
    "signPosterMovieTheaterSexualTension",
    # canvases & frames
    *[f"pictureCanvas_01{c}" for c in "abcdefghij"],
    *[f"pictureFrame_01{c}" for c in "abcdefghijklmnopqrstuvw"],
}


def name_is_candidate(name: str) -> bool:
    return any(re.search(p, name, flags=re.IGNORECASE) for p in INCLUDE_NAME_PATTERNS)


def parse_blocks(xml_path: Path) -> dict[str, dict]:
    """Parse blocks.xml into {name: {prop_name: value, _extends: parent_name | None}}."""
    # blocks.xml uses some weird inline content; use ET.parse with a permissive
    # approach. Each <block name="X"> has child <property name="..." value="..."/>
    text = xml_path.read_text(encoding="utf-8", errors="replace")
    # Strip BOM and any leading XML declaration we don't need.
    root = ET.fromstring(text)

    blocks: dict[str, dict] = {}
    for block in root.findall(".//block"):
        name = block.get("name")
        if not name:
            continue
        props: dict[str, str] = {}
        extends = None
        for child in block:
            if child.tag != "property":
                continue
            pname = child.get("name")
            pvalue = child.get("value", "")
            if pname == "Extends":
                extends = pvalue.split(",", 1)[0].strip()
            elif pname:
                props[pname] = pvalue
        props["_extends"] = extends
        blocks[name] = props
    return blocks


def resolve_prop(blocks: dict[str, dict], name: str, prop: str) -> str | None:
    """Walk the Extends chain to find a property's effective value."""
    seen = set()
    cur = name
    while cur and cur not in seen:
        seen.add(cur)
        b = blocks.get(cur)
        if not b:
            return None
        if prop in b:
            return b[prop]
        cur = b.get("_extends")
    return None


def has_dangerous_lineage(blocks: dict[str, dict], name: str) -> tuple[bool, str]:
    """Walk Extends chain; return (True, reason) if any ancestor flags TileEntity-ish."""
    # Direct name check first ~ "Lit" / "Light" / "Neon" / "Trap" almost always
    # means electrical or trap TileEntity.
    for sub in DANGEROUS_NAME_SUBSTRINGS:
        if sub.lower() in name.lower():
            return True, f"name contains {sub!r} (likely electrical/trap)"
    seen = set()
    cur = name
    while cur and cur not in seen:
        seen.add(cur)
        b = blocks.get(cur)
        if not b:
            break
        for p in DANGEROUS_PROPS:
            if p in b:
                return True, f"{cur} has {p}={b[p]}"
        for p, v in b.items():
            if not isinstance(v, str):
                continue
            for sub in DANGEROUS_VALUE_SUBSTRINGS:
                if sub.lower() in v.lower():
                    return True, f"{cur} has {p}={v} (matches {sub!r})"
        # Also check ancestor name for danger substrings
        for sub in DANGEROUS_NAME_SUBSTRINGS:
            if sub.lower() in cur.lower() and cur != name:
                return True, f"extends {cur} (name contains {sub!r})"
        cur = b.get("_extends")
    return False, ""


def categorize(name: str) -> str:
    n = name.lower()
    if "trader" in n:
        return "Trader signage"
    if "neon" in n or "openshop" in n or "shopopen" in n or n.startswith("signshop") or "shopgas" in n or "shopbookstore" in n or "shoppharmacy" in n or "shopgunstore" in n or "shoptoolstore" in n:
        return "Storefront / shop signs"
    if "openwall" in n or n.startswith("signopen"):
        return "OPEN / CLOSED signs"
    if "road" in n or "traffic" in n or "crosswalk" in n or "stop" in n or "speed" in n or "parking" in n or "yardsign" in n or "private" in n or "notice" in n or "hazardous" in n or "schoolzone" in n or "donotenter" in n or "slowhanging" in n or "noparking" in n or "towaway" in n:
        return "Road / street signs"
    if "guns" in n:
        return "Gun store signs"
    if "exit" in n:
        return "Exit signs"
    if "flag" in n:
        return "Flags"
    if "banner" in n:
        return "Banners"
    if "tapestry" in n:
        return "Tapestries"
    if "clock" in n:
        return "Wall clocks"
    if "mirror" in n:
        return "Mirrors"
    if "dart" in n:
        return "Dart boards"
    if "mount" in n:
        return "Trophy mounts"
    if "bulletin" in n or "cork" in n or "chalk" in n or "whiteboard" in n:
        return "Bulletin / cork / chalk boards"
    if "wreath" in n:
        return "Wreaths"
    if "planter" in n or "hangingplant" in n:
        return "Wall planters / hanging plants"
    if "sconce" in n:
        return "Wall sconces"
    if "licenseplate" in n:
        return "License plates"
    if n.startswith("sign"):
        return "Other signs"
    return "Misc"


def main():
    if len(sys.argv) < 2:
        print(__doc__, file=sys.stderr)
        sys.exit(1)
    xml_path = Path(sys.argv[1])
    blocks = parse_blocks(xml_path)

    candidates = []
    for name, props in blocks.items():
        if not name_is_candidate(name):
            continue
        if name in ALREADY_COVERED:
            continue
        # Skip blocks that are themselves placeholder/helper
        if "Helper" in name or "RandomHelper" in name or "RandomLootHelper" in name:
            continue
        can_pickup = resolve_prop(blocks, name, "CanPickup")
        if can_pickup and can_pickup.lower() == "true":
            continue  # already pickup-able, no work needed
        dangerous, reason = has_dangerous_lineage(blocks, name)
        candidates.append({
            "name": name,
            "category": categorize(name),
            "extends": props.get("_extends"),
            "dangerous": dangerous,
            "danger_reason": reason,
        })

    # Group by category
    by_cat: dict[str, list[dict]] = defaultdict(list)
    for c in candidates:
        by_cat[c["category"]].append(c)

    # Print markdown report
    print("# Pickup Audit ~ vanilla wall decor candidates")
    print()
    print(f"Source: `{xml_path}`")
    print(f"Total candidate blocks (sign/flag/decor/etc., not already pickup-able, not already in PICKUP_BLOCKS): **{len(candidates)}**")
    print()
    safe = [c for c in candidates if not c["dangerous"]]
    risky = [c for c in candidates if c["dangerous"]]
    print(f"- Safe-to-include candidates: **{len(safe)}**")
    print(f"- Flagged risky (TileEntity/loot/helper lineage, EXCLUDE): **{len(risky)}**")
    print()

    for cat in sorted(by_cat.keys()):
        items = by_cat[cat]
        safe_in = [c for c in items if not c["dangerous"]]
        risky_in = [c for c in items if c["dangerous"]]
        print(f"## {cat} ({len(items)})")
        print()
        if safe_in:
            print("**Likely include:**")
            print()
            for c in safe_in:
                ext = f" (extends `{c['extends']}`)" if c["extends"] else ""
                print(f"- `{c['name']}`{ext}")
            print()
        if risky_in:
            print("**Likely exclude (flagged):**")
            print()
            for c in risky_in:
                print(f"- `{c['name']}` ~ {c['danger_reason']}")
            print()


if __name__ == "__main__":
    main()
