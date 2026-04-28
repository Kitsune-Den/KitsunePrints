import type { PackMeta } from '../types/slots'

interface Props {
  meta: PackMeta
  setMeta: React.Dispatch<React.SetStateAction<PackMeta>>
}

export function PackMetaForm({ meta, setMeta }: Props) {
  function update(field: keyof PackMeta, value: string) {
    setMeta(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
      <Field label="Pack name" value={meta.name} onChange={(v) => update('name', v)} placeholder="My Picture Pack" />
      <Field label="Author" value={meta.author} onChange={(v) => update('author', v)} placeholder="Your name" />
      <Field label="Version" value={meta.version} onChange={(v) => update('version', v)} placeholder="0.1.0" />
      <Field label="Description" value={meta.description} onChange={(v) => update('description', v)} placeholder="What's in the pack" />
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
