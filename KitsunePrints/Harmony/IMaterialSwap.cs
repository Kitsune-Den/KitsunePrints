using System.Collections.Generic;
using UnityEngine;

namespace KitsunePrints
{
    /// <summary>
    /// Abstraction over the per-material texture swap operation. The default
    /// implementation calls <c>SetTexture</c> + <c>SetTextureScale</c> +
    /// <c>SetTextureOffset</c> on <c>_MainTex</c> (vanilla painting shader)
    /// and <c>_BaseMap</c> (URP variant) and is sufficient for V2.6.
    ///
    /// Wrapped behind an interface so future game versions ~ render-pipeline
    /// migrations to URP/HDRP, or shader property renames in v3.0/v4.0 ~
    /// can be handled by swapping in a different implementation without
    /// touching the discovery sweep in <see cref="PaintingTextureSwap.OnWorldLoaded"/>.
    /// See docs/migration-plan.md §3.4 for the broader context.
    /// </summary>
    public interface IMaterialSwap
    {
        /// <summary>
        /// Replace the canvas-bearing texture slot on <paramref name="mat"/>
        /// with <paramref name="tex"/> and reset its UV scale/offset to
        /// identity so the new texture fills the whole canvas regardless of
        /// the material's vanilla atlas-tile transform.
        /// </summary>
        void Swap(Material mat, Texture2D tex);
    }

    /// <summary>
    /// Default implementation: swaps <c>_MainTex</c> (built-in shader) and
    /// <c>_BaseMap</c> (URP shader) when present. Resets UV transforms to
    /// identity. Anything else on the material (normal, RMOM, emission) is
    /// left alone so frame relief and lighting stay vanilla.
    /// </summary>
    public class DefaultMaterialSwap : IMaterialSwap
    {
        private static readonly string[] SwapProperties = { "_MainTex", "_BaseMap" };

        public void Swap(Material mat, Texture2D tex)
        {
            if (mat == null || tex == null) return;
            foreach (var prop in SwapProperties)
            {
                if (!mat.HasProperty(prop)) continue;
                mat.SetTexture(prop, tex);
                // Abstract paintings sample only a small tile of a shared atlas
                // (signsMisc_d) via UV scale=(0.30, 0.32) + per-painting offset.
                // When we swap to a per-cat full texture those UV settings still
                // apply and crop to a tile of OUR cat ~ tiny crop, big stretch,
                // looks bad. Reset to identity so the full swapped texture fills
                // the canvas. No-op for 1x1 backer paintings (already 1,1 / 0,0).
                mat.SetTextureScale(prop, Vector2.one);
                mat.SetTextureOffset(prop, Vector2.zero);
            }
        }
    }

    /// <summary>
    /// Abstraction over the material discovery mechanism. Default uses
    /// <c>Resources.FindObjectsOfTypeAll&lt;Material&gt;()</c>; if v3.0+
    /// changes Addressables behavior such that lazy-loaded materials no
    /// longer surface here, swap in an Addressables-aware enumerator.
    /// </summary>
    public interface IMaterialFinder
    {
        IEnumerable<Material> FindAll();
    }

    public class DefaultMaterialFinder : IMaterialFinder
    {
        public IEnumerable<Material> FindAll()
        {
            return Resources.FindObjectsOfTypeAll<Material>();
        }
    }
}
