import { useState } from 'react'
import { Check, Plus, X } from '@phosphor-icons/react'
import { PLAYER_TAG_PRESETS } from '../types/player'

export interface TagPickerProps {
  value: string[]
  onChange: (next: string[]) => void
  /** Cap on simultaneous tags. */
  max?: number
}

/* Multi-select tag picker - preset chips + free-text input.
   Adding the same string twice is a no-op. Removing happens via the X on each chip. */
export default function TagPicker({ value, onChange, max = 8 }: TagPickerProps) {
  const [draft, setDraft] = useState('')
  const set = new Set(value)

  const toggle = (tag: string) => {
    if (set.has(tag)) {
      onChange(value.filter((t) => t !== tag))
    } else if (value.length < max) {
      onChange([...value, tag])
    }
  }

  const add = () => {
    const t = draft.trim()
    if (!t) return
    if (set.has(t)) { setDraft(''); return }
    if (value.length >= max) return
    onChange([...value, t])
    setDraft('')
  }

  return (
    <div className="space-y-3">
      {/* Selected tags */}
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <li key={tag}>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-turf-800 text-stone-50 dark:bg-turf-700">
                {tag}
                <button
                  type="button"
                  onClick={() => onChange(value.filter((t) => t !== tag))}
                  aria-label={`Retirer ${tag}`}
                  className="opacity-70 hover:opacity-100"
                >
                  <X size={11} weight="bold" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Preset suggestions */}
      <div className="flex flex-wrap gap-1.5">
        {PLAYER_TAG_PRESETS.map((preset) => {
          const active = set.has(preset)
          return (
            <button
              key={preset}
              type="button"
              onClick={() => toggle(preset)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.7rem] font-medium border transition-colors ${
                active
                  ? 'bg-zinc-950 text-stone-50 border-zinc-950 dark:bg-stone-50 dark:text-zinc-950 dark:border-stone-50'
                  : 'bg-white text-zinc-700 border-stone-300 hover:border-zinc-500 dark:bg-zinc-900 dark:text-stone-300 dark:border-stone-50/15 dark:hover:border-stone-50/30'
              }`}
            >
              {active && <Check size={10} weight="bold" />}
              {preset}
            </button>
          )
        })}
      </div>

      {/* Free-text add */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder="Ajouter un tag personnalisé…"
          maxLength={40}
          className="flex-1 rounded-lg border border-stone-300 bg-white text-zinc-900 placeholder:text-zinc-400 dark:border-stone-50/15 dark:bg-zinc-900 dark:text-stone-50 dark:placeholder:text-stone-500 px-3 py-1.5 text-xs focus:outline-none focus:border-zinc-900 dark:focus:border-stone-50/30"
          disabled={value.length >= max}
        />
        <button
          type="button"
          onClick={add}
          disabled={!draft.trim() || value.length >= max}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs border border-stone-300 dark:border-stone-50/15 text-zinc-700 dark:text-stone-300 hover:border-zinc-900 dark:hover:border-stone-50/30 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          <Plus size={11} weight="bold" />
          Ajouter
        </button>
      </div>

      <p className="text-[0.65rem] text-zinc-500 dark:text-stone-500">
        {value.length}/{max} tags
      </p>
    </div>
  )
}
