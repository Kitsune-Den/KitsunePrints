import { FRAME_PRESETS } from '../types/slots'

interface Props {
  selectedId: string
  onChange: (id: string) => void
}

export function FramePresetPicker({ selectedId, onChange }: Props) {
  return (
    <div>
      <div className="text-xs text-zinc-500 mb-2">Frame</div>
      <div className="grid grid-cols-3 gap-2">
        {FRAME_PRESETS.map(preset => {
          const selected = preset.id === selectedId
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onChange(preset.id)}
              className={`relative rounded overflow-hidden border-2 transition-colors ${
                selected ? 'border-orange-500' : 'border-zinc-800 hover:border-zinc-600'
              }`}
              title={preset.label}
            >
              <img
                src={preset.imagePath}
                alt={preset.label}
                className="w-full h-12 object-cover"
                style={{ objectPosition: 'center' }}
              />
              <div className="absolute inset-x-0 bottom-0 bg-black/70 text-[10px] text-zinc-300 px-1 py-0.5 truncate">
                {preset.label}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
