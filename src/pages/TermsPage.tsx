export default function TermsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <a href="/" className="text-xs text-zinc-600 hover:text-orange-400 transition-colors mb-8 inline-block">
          &larr; Back to KitsunePrints
        </a>

        <h1 className="text-2xl font-bold text-zinc-100 mb-8">Terms of Use & Privacy</h1>

        <div className="space-y-8 text-sm leading-relaxed">
          <section>
            <h2 className="text-base font-semibold text-zinc-200 mb-2">What KitsunePrints Does</h2>
            <p>
              KitsunePrints is a free tool that lets you create custom picture/painting
              modpacks for 7 Days to Die V2.6. You upload images, drop them into vanilla
              painting slots, and download a ready-to-install modlet that re-skins every
              painting in every POI with your art. That&apos;s it.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-200 mb-2">Your Data</h2>
            <ul className="list-disc list-inside space-y-1 text-zinc-400">
              <li>We do <strong className="text-zinc-200">not</strong> collect personal information</li>
              <li>We do <strong className="text-zinc-200">not</strong> use third-party trackers (no Google Analytics, no Meta pixels, no ads)</li>
              <li>We do <strong className="text-zinc-200">not</strong> require accounts or logins</li>
              <li>We do <strong className="text-zinc-200">not</strong> sell, share, or monetize your data</li>
              <li>We do <strong className="text-zinc-200">not</strong> store your full IP address (last two octets are anonymized before storage)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-200 mb-2">Your Uploaded Images</h2>
            <p>
              <strong className="text-zinc-200">Your images never leave your browser.</strong>{' '}
              KitsunePrints composes textures, generates icons, and packages the modlet
              entirely client-side using your computer&apos;s own canvas and zip libraries.
              Nothing about the images you upload ~ not the file content, not the
              filenames, not even the dimensions ~ is sent to our server.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-200 mb-2">Analytics</h2>
            <p>
              We use{' '}
              <a href="https://matomo.org/" target="_blank" rel="noopener noreferrer"
                className="text-orange-400 hover:text-orange-300 transition-colors">
                Matomo
              </a>
              , a privacy-respecting open-source analytics platform, to understand which
              features people use. <strong className="text-zinc-200">Matomo runs on our
              own infrastructure at <code className="text-orange-400">analytics.kitsuneden.net</code></strong> ~
              your data is never sent to Google, Meta, or any third-party tracker.
            </p>
            <p className="mt-3">
              <strong className="text-zinc-200">What we collect:</strong> pages you visit,
              time on page, the site that referred you, general device info (browser, OS,
              screen size), your approximate country, and a partially anonymized IP
              address.
            </p>
            <p className="mt-3">
              <strong className="text-zinc-200">What we don&apos;t collect:</strong> your name,
              email, cross-site browsing, or anything at all when your browser sends
              &ldquo;Do Not Track&rdquo; ~ we honor DNT.
            </p>
            <p className="mt-3">
              <strong className="text-zinc-200">Retention:</strong> visitor logs are
              automatically deleted after 12 months.
            </p>
            <p className="mt-3">
              <strong className="text-zinc-200">Opt out:</strong> enable &ldquo;Do Not
              Track&rdquo; in your browser, or use our{' '}
              <a href="https://analytics.kitsuneden.net/index.php?module=CoreAdminHome&action=optOut" target="_blank" rel="noopener noreferrer"
                className="text-orange-400 hover:text-orange-300 transition-colors">
                Matomo opt-out tool
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-200 mb-2">Your Modpacks</h2>
            <p>
              You own what you create. Modpacks you build with KitsunePrints are yours
              to use, share, or distribute however you like. We claim no rights over
              your images or the modpacks generated from them.
            </p>
            <p className="mt-3">
              The shared <code className="text-orange-400">KitsunePrints.dll</code> Harmony
              patch that ships inside every generated modlet is open source and licensed
              for redistribution. See the GitHub repo for the license terms.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-200 mb-2">Acceptable Use</h2>
            <p>
              Don&apos;t use KitsunePrints to process, distribute, or create content that
              is illegal, infringing, or harmful. This includes but is not limited to
              copyrighted material you don&apos;t have rights to, illegal imagery, or
              content that violates the 7 Days to Die EULA. We reserve the right to
              block access to anyone misusing the service.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-200 mb-2">Open Source</h2>
            <p>
              KitsunePrints is open source. You can review exactly what the code does
              at{' '}
              <a href="https://github.com/Kitsune-Den/KitsunePrints" target="_blank" rel="noopener noreferrer"
                className="text-orange-400 hover:text-orange-300 transition-colors">
                github.com/Kitsune-Den/KitsunePrints
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-200 mb-2">Contact</h2>
            <p>
              Questions or concerns? Open an issue on{' '}
              <a href="https://github.com/Kitsune-Den/KitsunePrints/issues" target="_blank" rel="noopener noreferrer"
                className="text-orange-400 hover:text-orange-300 transition-colors">
                GitHub
              </a>.
            </p>
          </section>

          <p className="text-xs text-zinc-700 pt-4 border-t border-zinc-800/40">
            Last updated: April 28, 2026
          </p>
        </div>
      </div>
    </div>
  )
}
