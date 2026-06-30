using HarmonyLib;
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using UnityEngine;

// KitsunePrints — Harmony entry point.
//
// The original goal was to ship custom painting prefabs in a mod-side
// .unity3d bundle. Two confirmed dead ends established that route doesn't
// work for this game version (V2.6, Unity 2022.3 LTS):
//
//   1. UnityPy can't reproduce a Unity-Editor-blessed bundle structure;
//      modified bundles are rejected at load with "not compatible with this
//      newer version of the Unity runtime."
//   2. Cloning vanilla decor.bundle and shifting path_ids triggers the
//      same rejection — Unity validates internal structure beyond what
//      UnityPy can rebuild.
//
// This mod takes the runtime route instead: at game load, we find the
// vanilla painting Materials (already loaded into Unity by the Addressables
// system) and replace each one's _MainTex with a cat PNG read from disk.
// Every POI that places a vanilla painting now renders the cat — true
// "replace mode" without touching the prefab pipeline at all.

namespace KitsunePrints
{
    public class KitsunePrintsMod : IModApi
    {
        public void InitMod(Mod modInstance)
        {
            PaintingTextureSwap.ModFolder = modInstance.Path;

            var harmony = new Harmony("com.adainthelab.kitsuneprints");

            // Hook World.LoadWorld postfix — by this point the Addressables
            // system has loaded decor.bundle's Materials/Textures into the
            // Unity runtime, so Resources.FindObjectsOfTypeAll<Material>()
            // can find them by name.
            var loadWorld = AccessTools.Method(typeof(World), "LoadWorld");
            if (loadWorld != null)
            {
                harmony.Patch(loadWorld,
                    postfix: new HarmonyMethod(
                        AccessTools.Method(typeof(PaintingTextureSwap), nameof(PaintingTextureSwap.OnWorldLoaded))));
                Log.Out("[KitsunePrints] World.LoadWorld postfix registered for painting texture swap");
            }
            else
            {
                Log.Warning("[KitsunePrints] World.LoadWorld not found — painting swap disabled");
            }

            Log.Out("[KitsunePrints] Loaded - vanilla painting blocks will be re-skinned with cat textures on world load.");
        }
    }
}
