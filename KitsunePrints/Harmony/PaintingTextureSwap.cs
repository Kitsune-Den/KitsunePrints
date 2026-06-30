using System.Collections.Generic;
using System.IO;
using UnityEngine;

namespace KitsunePrints
{
    /// <summary>
    /// Swaps the canvas Texture2D on each vanilla painting Material with a cat
    /// PNG from this mod's Resources/Textures/ folder. Runs once after the
    /// world is loaded — by then the Addressables system has pulled decor.bundle
    /// into the Unity runtime, so every painting Material is reachable via
    /// Resources.FindObjectsOfTypeAll&lt;Material&gt;().
    ///
    /// The mapping is hard-coded to match the vanilla V2.6 painting catalog:
    ///   6 backer materials -> 6 photographic cat portraits
    ///   4 abstract materials -> 4 painterly cat scenes
    /// Bonus textures (voids, fight, forest-kibby) aren't applied here — they
    /// could be wired through a per-instance MaterialPropertyBlock pass later
    /// if we want the additive paintingCat* blocks to differ from their
    /// vanilla parents.
    /// </summary>
    public static class PaintingTextureSwap
    {
        public static string ModFolder;

        // Adapter layer ~ swappable per game version. See IMaterialSwap.cs and
        // docs/migration-plan.md §3.4. Keep these as static fields so an
        // experimental-branch-targeting build can install a different
        // implementation in InitMod without touching the sweep loop below.
        public static IMaterialSwap Swapper { get; set; } = new DefaultMaterialSwap();
        public static IMaterialFinder Finder { get; set; } = new DefaultMaterialFinder();

        // Map: vanilla Material name -> texture filename in Resources/Textures/
        // Hardcoded defaults serve as fallback when no Config/picture_pack.json
        // is present in the mod folder. Web-tool-generated packs ship their
        // own picture_pack.json that overrides these mappings without needing
        // a DLL rebuild — same DLL serves every pack.
        private static readonly Dictionary<string, string> DefaultTextureMap = new Dictionary<string, string>
        {
            { "painting_ben",        "boss-cat.png" },
            { "painting_lorien",     "orange.png" },
            { "painting_derek",      "tabby-bed.png" },
            { "painting_noah",       "pounce.png" },
            { "painting_duke",       "nose.png" },
            { "painting_ken",        "shark.png" },
            { "paintingsAbstract01", "hearth.png" },
            { "paintingsAbstract02", "blood-moon.png" },
            { "paintingsAbstract03", "loads-of-loafs.png" },
            { "paintingsAbstract04", "butterfly.png" },
        };

        // Resolved at first use:
        //   - picture_pack.json present  -> use ONLY that file's entries.
        //     Slots not listed in the JSON are intentionally left vanilla.
        //   - picture_pack.json absent   -> fall back to bundled defaults
        //     (the dev/test mod case where cat textures ship with the DLL).
        private static Dictionary<string, string> _textureMap;
        private static Dictionary<string, string> TextureMap
        {
            get
            {
                if (_textureMap != null) return _textureMap;

                if (!string.IsNullOrEmpty(ModFolder))
                {
                    var configPath = Path.Combine(ModFolder, "Config", "picture_pack.json");
                    if (File.Exists(configPath))
                    {
                        try
                        {
                            // Minimal JSON parser: { "painting_ben": "my-cat.png", ... }
                            // No external dependency — Newtonsoft isn't in the 7DTD ref set.
                            var raw = File.ReadAllText(configPath);
                            _textureMap = new Dictionary<string, string>();
                            foreach (var pair in ParseFlatJsonObject(raw))
                            {
                                _textureMap[pair.Key] = pair.Value;
                            }
                            Log.Out($"[KitsunePrints] Loaded {_textureMap.Count}-entry texture map from picture_pack.json (unfilled slots stay vanilla)");
                            return _textureMap;
                        }
                        catch (System.Exception ex)
                        {
                            Log.Warning($"[KitsunePrints] Failed to parse picture_pack.json: {ex.Message} — falling back to defaults");
                        }
                    }
                }

                _textureMap = new Dictionary<string, string>(DefaultTextureMap);
                Log.Out($"[KitsunePrints] No picture_pack.json found — using {_textureMap.Count}-entry default texture map");
                return _textureMap;
            }
        }

        private static IEnumerable<KeyValuePair<string, string>> ParseFlatJsonObject(string raw)
        {
            // Tolerant parser for a flat string→string JSON object. Doesn't try
            // to be a full JSON parser — just enough for the picture_pack
            // config schema. Strips // line comments and handles escaped
            // quotes minimally.
            var sb = new System.Text.StringBuilder();
            bool inLineComment = false;
            for (int i = 0; i < raw.Length; i++)
            {
                if (inLineComment)
                {
                    if (raw[i] == '\n') inLineComment = false;
                    continue;
                }
                if (i + 1 < raw.Length && raw[i] == '/' && raw[i + 1] == '/')
                {
                    inLineComment = true;
                    i++;
                    continue;
                }
                sb.Append(raw[i]);
            }
            var text = sb.ToString();

            int idx = 0;
            while (idx < text.Length)
            {
                int k1 = text.IndexOf('"', idx);
                if (k1 < 0) yield break;
                int k2 = text.IndexOf('"', k1 + 1);
                if (k2 < 0) yield break;
                var key = text.Substring(k1 + 1, k2 - k1 - 1);

                int colon = text.IndexOf(':', k2);
                if (colon < 0) yield break;

                int v1 = text.IndexOf('"', colon);
                if (v1 < 0) yield break;
                int v2 = text.IndexOf('"', v1 + 1);
                if (v2 < 0) yield break;
                var val = text.Substring(v1 + 1, v2 - v1 - 1);

                yield return new KeyValuePair<string, string>(key, val);
                idx = v2 + 1;
            }
        }

        private static bool _swapped;

        public static void OnWorldLoaded()
        {
            if (_swapped) return;
            _swapped = true;

            if (string.IsNullOrEmpty(ModFolder))
            {
                Log.Warning("[KitsunePrints] ModFolder not set — cannot resolve texture paths");
                return;
            }

            int matched = 0;
            int swapped = 0;
            int missingFiles = 0;

            // Cache loaded PNGs so we don't re-read for both the 2x2 and 3x2
            // abstract Materials (they share names, but Unity may load them
            // as separate Material instances — same PNG, swap each).
            var textureCache = new Dictionary<string, Texture2D>();

            foreach (var mat in Finder.FindAll())
            {
                if (mat == null) continue;
                var name = mat.name ?? "";
                if (!TextureMap.TryGetValue(name, out var fileName)) continue;

                matched++;

                if (!textureCache.TryGetValue(fileName, out var tex))
                {
                    var path = Path.Combine(ModFolder, "Resources", "Textures", fileName);
                    if (!File.Exists(path))
                    {
                        Log.Warning($"[KitsunePrints] Texture missing: {path}");
                        missingFiles++;
                        textureCache[fileName] = null;
                        continue;
                    }

                    var bytes = File.ReadAllBytes(path);
                    // mipChain=true so the swapped texture has mips for distance
                    // rendering; markNonReadable=false so we keep the option to
                    // re-swap if needed later.
                    tex = new Texture2D(2, 2, TextureFormat.RGBA32, mipChain: true);
                    tex.LoadImage(bytes, markNonReadable: false);
                    tex.wrapMode = TextureWrapMode.Clamp;
                    tex.filterMode = FilterMode.Bilinear;
                    tex.Apply(updateMipmaps: true, makeNoLongerReadable: false);
                    textureCache[fileName] = tex;
                    Log.Out($"[KitsunePrints] Loaded {fileName} as Texture2D ({tex.width}x{tex.height})");
                }

                if (tex == null) continue; // file was missing, already logged

                // Routed through the swappable IMaterialSwap adapter. Default
                // impl handles _MainTex (built-in) + _BaseMap (URP) and
                // resets UV transforms. See IMaterialSwap.cs.
                Swapper.Swap(mat, tex);
                swapped++;
            }

            Log.Out($"[KitsunePrints] Painting swap complete: {matched} materials matched, {swapped} swapped, {missingFiles} files missing");
        }
    }
}
