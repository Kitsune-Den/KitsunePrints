import type { PackMeta } from '../types/slots'

interface Props {
  meta: PackMeta
  setMeta: React.Dispatch<React.SetStateAction<PackMeta>>
}

export function PackMetaForm({ meta, setMeta }: Props) {
  function updateText(field: 'name' | 'author' | 'version' | 'description', value: string) {
    setMeta(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
        <Field label="Pack name" value={meta.name} onChange={(v) => updateText('name', v)} placeholder="My Picture Pack" />
        <Field label="Author" value={meta.author} onChange={(v) => updateText('author', v)} placeholder="Your name" />
        <Field label="Version" value={meta.version} onChange={(v) => updateText('version', v)} placeholder="0.1.0" />
        <Field label="Description" value={meta.description} onChange={(v) => updateText('description', v)} placeholder="What's in the pack" />
      </div>

      <div className="border-t border-zinc-800 pt-6 max-w-2xl">
        <h3 className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Survival options</h3>
        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={meta.enablePickup}
            onChange={(e) => setMeta(prev => ({ ...prev, enablePickup: e.target.checked }))}
            className="mt-1 w-4 h-4 accent-orange-500 cursor-pointer"
          />
          <div className="flex-1">
            <div className="text-sm font-medium text-zinc-200 group-hover:text-zinc-100">
              Make every painting / poster / canvas pickup-able
            </div>
            <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
              Adds <span className="text-zinc-400">hold-E pickup</span> (bare-handed,
              no tool) <span className="text-zinc-600">+</span>{' '}
              <span className="text-zinc-400">wrench harvest</span> to ~115 vanilla
              blocks (paintings, snack posters, movie posters + theaters, canvases,
              picture frames, and hidden-safe disguises). Either way the block goes
              to your inventory; place it back wherever you want. Off by default ~
              existing POIs stay as-is unless you opt in.
            </p>
          </div>
        </label>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder }: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-zinc-500 uppercase tracking-wider">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-zinc-100 focus:border-zinc-600 outline-none"
      />
    </label>
  )
}
