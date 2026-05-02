import { useState, useEffect } from 'react'

declare const __APP_VERSION__: string

const catStyles = `
  @keyframes kcat-breathe { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-2px)} }
  @keyframes kcat-tail { 0%,100%{transform:rotate(0deg);transform-origin:bottom right} 25%{transform:rotate(8deg)} 75%{transform:rotate(-12deg)} }
  @keyframes kcat-blink { 0%,90%,100%{transform:scaleY(1)} 95%{transform:scaleY(0.1)} }
  .kcat-body{animation:kcat-breathe 2.4s ease-in-out infinite}
  .kcat-tail{animation:kcat-tail 2.4s ease-in-out infinite}
  .kcat-blink{animation:kcat-blink 4s ease-in-out infinite}
  .cta-btn {
    background: linear-gradient(135deg, #fb923c 0%, #ea580c 50%, #9a3412 100%);
    box-shadow: 0 0 0 1px rgba(251,146,60,0.3), 0 2px 20px rgba(234,88,12,0.5), inset 0 1px 0 rgba(255,255,255,0.15);
    transition: all 0.2s ease;
  }
  .cta-btn:hover {
    background: linear-gradient(135deg, #fdba74 0%, #fb923c 50%, #c2410c 100%);
    box-shadow: 0 0 0 1px rgba(251,146,60,0.55), 0 4px 40px rgba(251,146,60,0.7), inset 0 1px 0 rgba(255,255,255,0.2);
    transform: translateY(-1px);
  }
  .cta-btn:active { transform: translateY(0px); }
`

function PixelCat({ size = 64 }: { size?: number }) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: catStyles }} />
      <svg width={size} height={Math.round(size * 1.0)} viewBox="0 0 80 80" style={{ imageRendering: 'pixelated' }}>
        {/* tail */}
        <g className="kcat-tail">
          <rect x="58" y="40" width="6" height="14" rx="1" fill="#a16207"/>
          <rect x="60" y="34" width="6" height="10" rx="1" fill="#a16207"/>
          <rect x="62" y="28" width="6" height="10" rx="1" fill="#a16207"/>
        </g>
        {/* body */}
        <g className="kcat-body">
          {/* torso */}
          <rect x="20" y="40" width="36" height="22" rx="3" fill="#a16207"/>
          <rect x="22" y="46" width="32" height="14" rx="2" fill="#ca8a04"/>
          {/* legs */}
          <rect x="22" y="58" width="8" height="10" rx="1" fill="#a16207"/>
          <rect x="46" y="58" width="8" height="10" rx="1" fill="#a16207"/>
          {/* head */}
          <rect x="20" y="20" width="36" height="26" rx="4" fill="#a16207"/>
          <rect x="24" y="28" width="28" height="14" rx="2" fill="#fde68a"/>
          {/* ears */}
          <polygon points="22,24 22,12 32,22" fill="#a16207"/>
          <polygon points="54,24 54,12 44,22" fill="#a16207"/>
          <polygon points="25,22 25,16 30,22" fill="#fda4af"/>
          <polygon points="51,22 51,16 46,22" fill="#fda4af"/>
          {/* eyes */}
          <rect x="26" y="30" width="6" height="6" rx="1" fill="#1c1917"/>
          <rect x="44" y="30" width="6" height="6" rx="1" fill="#1c1917"/>
          <rect x="27" y="31" width="4" height="4" rx="0.5" fill="#fbbf24"/>
          <rect x="45" y="31" width="4" height="4" rx="0.5" fill="#fbbf24"/>
          <rect x="28" y="32" width="2" height="2" fill="#ffffff"/>
          <rect x="46" y="32" width="2" height="2" fill="#ffffff"/>
          <g className="kcat-blink">
            <rect x="26" y="30" width="6" height="3" fill="#1c1917"/>
            <rect x="44" y="30" width="6" height="3" fill="#1c1917"/>
          </g>
          {/* nose + mouth */}
          <rect x="37" y="38" width="6" height="3" rx="1" fill="#fda4af"/>
          <rect x="34" y="40" width="12" height="2" fill="#78350f"/>
          {/* whiskers */}
          <rect x="14" y="34" width="8" height="1" fill="#fde68a"/>
          <rect x="58" y="34" width="8" height="1" fill="#fde68a"/>
          <rect x="14" y="38" width="8" height="1" fill="#fde68a"/>
          <rect x="58" y="38" width="8" height="1" fill="#fde68a"/>
        </g>
      </svg>
    </>
  )
}

export default function IntroPage() {
  const [mounted, setMounted] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [buildCount, setBuildCount] = useState<number | null>(null)

  useEffect(() => {
    setMounted(true)
    const handle = (e: MouseEvent) => {
      setMousePos({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight })
    }
    window.addEventListener('mousemove', handle)
    fetch('/api/stats')
      .then(r => r.json())
      .then(d => setBuildCount(typeof d.totalBuilds === 'number' ? d.totalBuilds : null))
      .catch(() => {})
    return () => window.removeEventListener('mousemove', handle)
  }, [])

  const glowX = mousePos.x * 100
  const glowY = mousePos.y * 100

  return (
    <div className="relative min-h-screen bg-zinc-950 overflow-hidden font-sans text-zinc-100">
      {/* mouse-tracked glow */}
      <div
        className="pointer-events-none fixed inset-0 opacity-30 transition-opacity duration-300"
        style={{ background: `radial-gradient(600px circle at ${glowX}% ${glowY}%, rgba(251,146,60,0.15), transparent 60%)` }}
      />
      {/* faint grid */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(251,146,60,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(251,146,60,0.5) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      <nav className="relative z-10 flex items-center justify-between px-8 py-6 border-b border-zinc-800/50">
        <div className="flex items-center gap-2">
          <span className="text-xl">🐱</span>
          <span className="text-sm font-semibold tracking-widest text-zinc-400 uppercase">
            KitsunePrints <span className="text-zinc-600 font-normal">v{__APP_VERSION__}</span>
          </span>
        </div>
        <div className="flex items-center gap-6 text-xs text-zinc-500 tracking-wider uppercase">
          <a href="https://paint.kitsuneden.net" target="_blank" rel="noopener noreferrer" className="hover:text-orange-400 transition-colors">
            KitsunePaint
          </a>
          <a href="https://github.com/Kitsune-Den/KitsunePrints" target="_blank" rel="noopener noreferrer" className="hover:text-orange-400 transition-colors">
            GitHub
          </a>
        </div>
      </nav>

      <main className="relative z-10 flex flex-col items-center justify-center min-h-[85vh] px-6 text-center">
        <div
          className={`mb-6 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          style={{ filter: 'drop-shadow(0 0 60px rgba(251,146,60,0.35))' }}
        >
          <img
            src="/kitsuneprints-hero.png"
            alt="KitsunePrints"
            className="w-64 h-64 md:w-80 md:h-80 object-contain"
          />
        </div>

        <div className={`transition-all duration-1000 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <span className="text-xs tracking-[0.3em] uppercase text-orange-400 font-medium">
            7 Days to Die V2.6 · Custom Picture Pack Tool
          </span>
        </div>

        <h1 className={`mt-4 text-5xl md:text-7xl font-black tracking-tight leading-none max-w-4xl transition-all duration-1000 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          Hang your art<br />
          <span className="text-orange-400">in every POI.</span>
        </h1>

        <p className={`mt-8 text-lg text-zinc-400 max-w-xl leading-relaxed transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          The 7DTD community asked for custom paintings for years. Custom prefab bundles
          don&apos;t survive Unity&apos;s loader. We figured out a runtime Harmony swap that
          replaces every vanilla painting&apos;s canvas at world load ~ your photos, every
          POI in the game, no Unity, no asset bundles, no nonsense.
        </p>

        <div className={`mt-10 flex flex-col sm:flex-row items-center gap-4 transition-all duration-1000 delay-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <a href="/app" className="group cta-btn px-10 py-5 text-zinc-50 text-sm font-black tracking-widest uppercase rounded-lg">
            Build a Pack
            <span className="ml-2 group-hover:translate-x-1 inline-block transition-transform">→</span>
          </a>
          <a
            href="/KitsunePrints-DIY-Kit.zip"
            className="px-8 py-4 border border-zinc-700 hover:border-orange-500 hover:text-orange-300 text-zinc-400 text-sm font-medium tracking-widest uppercase rounded-lg transition-all duration-200"
            title="Offline kit ~ Python script + DLL + frame textures, build packs locally"
          >
            DIY Kit (offline)
          </a>
          <a
            href="https://github.com/Kitsune-Den/KitsunePrints"
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-4 border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-zinc-200 text-sm font-medium tracking-widest uppercase rounded-lg transition-all duration-200"
          >
            View Source
          </a>
        </div>

        <p className={`mt-6 text-xs text-zinc-600 transition-all duration-1000 delay-700 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          7DTD V2.6 · EAC must be off · ships with the Harmony patch baked in
        </p>
      </main>

      {/* Hero in-game screenshot */}
      <section className={`relative z-10 py-16 px-6 transition-all duration-1000 delay-600 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
        <div className="max-w-5xl mx-auto flex flex-col gap-4">
          <p className="text-center text-xs tracking-[0.3em] uppercase text-zinc-500 font-medium">In a real V2.6 POI</p>
          <div className="rounded-xl overflow-hidden border border-zinc-800 shadow-[0_0_60px_rgba(251,146,60,0.15)]">
            <img
              src="/screenshots/hero_kitsune_paintings.jpg"
              alt="Two custom Kitsune paintings rendered on a wall in a 7 Days to Die V2.6 POI"
              className="w-full object-cover"
            />
          </div>
          <p className="text-xs text-zinc-600 text-center">
            1×1 portrait + 3×2 wide abstract, both with vanilla&apos;s 3D wooden frame mesh wrapping the user art.
          </p>
        </div>
      </section>

      {/* Tool screenshots */}
      <section className={`relative z-10 py-12 px-6 transition-all duration-1000 delay-700 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
        <div className="max-w-5xl mx-auto flex flex-col gap-6">
          <p className="text-center text-xs tracking-[0.3em] uppercase text-zinc-500 font-medium">The tool</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <div className="rounded-xl overflow-hidden border border-zinc-800 shadow-[0_0_40px_rgba(0,0,0,0.6)]">
                <img src="/screenshots/screenshot_slots.png" alt="Slot grid with 6 backer portrait slots, three filled with Kitsune art" className="w-full object-cover" />
              </div>
              <p className="text-xs text-zinc-600 text-center">Per-slot title, frame texture, drag-and-drop image</p>
            </div>
            <div className="flex flex-col gap-2">
              <div className="rounded-xl overflow-hidden border border-zinc-800 shadow-[0_0_40px_rgba(0,0,0,0.6)]">
                <img src="/screenshots/screenshot_cropper.png" alt="Cropper dialog locked to 3:4 portrait aspect" className="w-full object-cover" />
              </div>
              <p className="text-xs text-zinc-600 text-center">Cropper locks to 3:4 portrait or 1:1 square per slot</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className={`relative z-10 border-t border-zinc-800/60 transition-all duration-1000 delay-700 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
        <div className="max-w-5xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="flex flex-col gap-3">
            <div className="text-2xl">🖼️</div>
            <h3 className="text-sm font-bold tracking-widest uppercase text-zinc-200">Slot-Based Upload</h3>
            <p className="text-sm text-zinc-500 leading-relaxed">
              Fourteen vanilla wall-art slots ~ six 1×1 backer portraits, four abstract scenes (each driving both 2×2 and 3×2 frames),
              and four movie posters (theater variants ride along). Drop an image into any slot. Skipped slots stay vanilla.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <div className="text-2xl">✂️</div>
            <h3 className="text-sm font-bold tracking-widest uppercase text-zinc-200">Cropping Tool</h3>
            <p className="text-sm text-zinc-500 leading-relaxed">
              Aspect-locked crop frame matched to each slot ~ 3:4 for portraits, 1:1 for abstracts.
              Drag, zoom, lock the cat&apos;s face exactly where you want it on the canvas.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <div className="text-2xl">🎨</div>
            <h3 className="text-sm font-bold tracking-widest uppercase text-zinc-200">Frame Color Per Slot</h3>
            <p className="text-sm text-zinc-500 leading-relaxed">
              Vanilla&apos;s 3D wooden frame mesh wraps a UV slice from your texture. Pick the wood color per portrait ~ gold gilt, dark walnut,
              light pine, anything you want.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <div className="text-2xl">📦</div>
            <h3 className="text-sm font-bold tracking-widest uppercase text-zinc-200">One-Click Modlet</h3>
            <p className="text-sm text-zinc-500 leading-relaxed">
              Hit download. Drop the zip into <code className="font-mono text-zinc-400">&lt;7DTD&gt;/Mods/</code>. Restart. Every painting in
              every POI now wears your art. No Unity, no DLL editing, no asset bundles.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <div className="text-2xl">🤝</div>
            <h3 className="text-sm font-bold tracking-widest uppercase text-zinc-200">Coexists With Other Mods</h3>
            <p className="text-sm text-zinc-500 leading-relaxed">
              Different packs can claim different slots ~ Pack A for backers, Pack B for abstracts. Last loaded wins on overlapping
              materials. Plays nicely alongside <a href="https://paint.kitsuneden.net" className="text-orange-400 hover:text-orange-300 transition-colors">KitsunePaint</a>.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <div className="text-2xl">🔧</div>
            <h3 className="text-sm font-bold tracking-widest uppercase text-zinc-200">Shared Harmony Runtime</h3>
            <p className="text-sm text-zinc-500 leading-relaxed">
              Every pack ships with the same <code className="font-mono text-zinc-400">KitsunePrints.dll</code> ~ a Harmony patch that
              swaps vanilla material textures at <code className="font-mono text-zinc-400">World.LoadWorld</code>. One DLL, infinite packs.
            </p>
          </div>
          <div className="flex flex-col gap-3 md:col-span-3 border border-orange-500/30 bg-orange-500/[0.04] rounded-lg p-6">
            <div className="flex items-center gap-3">
              <div className="text-2xl">🪝</div>
              <span className="text-[10px] tracking-[0.3em] uppercase text-orange-400 font-bold">New in v0.5</span>
            </div>
            <h3 className="text-sm font-bold tracking-widest uppercase text-zinc-200">Pick Up + Place Anywhere</h3>
            <p className="text-sm text-zinc-500 leading-relaxed">
              On by default ~ every pack ships with a one-line patch that adds <span className="text-zinc-300 font-medium">hold-E pickup</span> and{' '}
              <span className="text-zinc-300 font-medium">wrench harvest</span> to every vanilla painting, poster, canvas, picture frame, and
              hidden-safe disguise in the game (~115 blocks).
              Find one in a POI, grab it, hang it back at base. Your custom blocks get the same treatment, so wrenching one of yours returns
              <em>yours</em>, not the vanilla parent. Toggle off in Pack Info if you'd rather leave POIs intact.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className={`relative z-10 border-t border-zinc-800/60 transition-all duration-1000 delay-800 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
        <div className="max-w-3xl mx-auto px-6 py-16 flex flex-col gap-8">
          <p className="text-center text-xs tracking-[0.3em] uppercase text-zinc-500 font-medium">Frequently Asked Questions</p>
          <div className="flex flex-col gap-3">
            {[
              {
                q: 'What 7DTD version does this need?',
                a: 'V2.6. The vanilla painting material names and atlas layout we patch are V2.6-specific. Earlier versions had different conventions, and future versions may shift again.',
              },
              {
                q: 'Does this make every painting in the game pickup-able?',
                a: "By default, yes ~ packs ship with a Config/pickup.xml patch that adds CanPickup=true and a wrench Harvest drop to ~115 vanilla wall-art blocks (paintings, snack posters, movie posters and theaters, canvases, picture frames, and hidden-safe disguises). Hold E or wrench to grab any of them, place from inventory wherever. There's a checkbox in the Pack Info tab to disable if you'd rather POIs stayed undismantleable.",
              },
              {
                q: 'Does it conflict with other mods?',
                a: 'Different KitsunePrints packs can each claim different slots without conflict. If two packs both override the same vanilla material, the last-loaded mod wins. EAC must be off (same as any DLL-shipping mod).',
              },
              {
                q: 'Why does my abstract image look squished on the 2×2 painting?',
                a: 'Vanilla 2×2 and 3×2 abstract painting blocks share one Material per design ~ same texture drives both. Wide images look great on 3×2, get a mild horizontal squish on 2×2. Compose at ~1:1 if you care more about 2×2.',
              },
              {
                q: 'Why is the left side of my portrait painted with a solid color?',
                a: "Vanilla's painting prefab UV-maps the left 25% of the texture to wrap the 3D wooden frame mesh. The right 75% is the visible canvas. The tool composes that automatically ~ your image goes on the right, your picked frame color fills the left.",
              },
              {
                q: 'Can I use any image size?',
                a: "Yes ~ the tool resizes/crops everything to standard dimensions (1024×1024 portraits, 1024×1024 abstracts). Higher source resolution is fine. Extreme aspect ratios (super wide, super tall) get center-cropped during composition unless you use the crop tool.",
              },
              {
                q: 'Does this need OCBCustomTextures or KitsunePaintUnlocked?',
                a: "No. KitsunePrints is a self-contained Harmony patch ~ different from KitsunePaint (which uses OCBCustomTextures' atlas system). They can coexist but neither requires the other.",
              },
            ].map(({ q, a }) => (
              <details key={q} className="group border border-zinc-800 rounded-lg overflow-hidden">
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer text-sm font-medium text-zinc-200 hover:text-orange-400 transition-colors select-none">
                  {q}
                  <span className="text-zinc-600 group-open:rotate-45 transition-transform text-lg ml-4">+</span>
                </summary>
                <div className="px-5 pb-4 text-sm text-zinc-500 leading-relaxed">{a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {buildCount !== null && buildCount > 0 && (
        <div className="relative z-10 border-t border-zinc-800/40 px-8 py-3 text-center">
          <span className="text-[11px] text-zinc-600">
            {buildCount.toLocaleString()} pack{buildCount !== 1 ? 's' : ''} created since April 28, 2026
          </span>
        </div>
      )}

      <footer className="relative z-10 border-t border-zinc-800/40 px-8 py-6 flex items-center justify-between flex-wrap gap-4">
        <span className="text-xs text-zinc-600">
          Part of the <a href="https://kitsuneden.net" className="hover:text-orange-400 transition-colors">Kitsune ecosystem</a> · Built by Ada
        </span>
        <div className="flex items-center gap-2">
          <PixelCat size={32} />
          <span className="text-xs text-zinc-600 tracking-widest uppercase">
            Powered by <span className="text-orange-500/70 hover:text-orange-400 transition-colors cursor-default">the Skulk</span>
          </span>
        </div>
        <span className="text-xs text-zinc-700">
          <a href="/terms" className="hover:text-orange-400 transition-colors">Terms & Privacy</a>
          {' · '}
          prints.kitsuneden.net
        </span>
      </footer>
    </div>
  )
}
