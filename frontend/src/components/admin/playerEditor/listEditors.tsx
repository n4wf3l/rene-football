import { useRef } from 'react'
import { AnimatePresence, Reorder, motion, useDragControls } from 'framer-motion'
import { DotsSixVertical, Plus, Trash } from '@phosphor-icons/react'
import { ImageUpload, INPUT } from './controls'

/* --------------------------------------------------------------- career */

export interface CareerStep {
  years?: string | null
  club?: string | null
  logo_url?: string | null
}

interface CareerRow extends CareerStep { key: string }

interface CareerEditorProps {
  value: CareerStep[] | null | undefined
  onChange: (value: CareerStep[]) => void
}

let rowSeq = 0
const withKeys = (rows: CareerStep[]): CareerRow[] => rows.map((r) => ({ ...r, key: `c${++rowSeq}` }))

interface CareerItemProps {
  row: CareerRow
  onPatch: (patch: Partial<CareerStep>) => void
  onRemove: () => void
}

function CareerItem({ row, onPatch, onRemove }: CareerItemProps) {
  const controls = useDragControls()
  return (
    <Reorder.Item
      value={row}
      dragListener={false}
      dragControls={controls}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className="grid grid-cols-[auto_5.5rem_1fr_auto] items-center gap-3 rounded-xl border border-stone-200/80 bg-white p-2.5 dark:border-stone-50/10 dark:bg-zinc-900 sm:grid-cols-[auto_8rem_1fr_auto_auto]"
    >
      <button
        type="button"
        onPointerDown={(e) => controls.start(e)}
        aria-label="Déplacer l'étape"
        className="grid h-9 w-6 cursor-grab touch-none place-items-center text-zinc-400 hover:text-zinc-700 active:cursor-grabbing dark:text-stone-500 dark:hover:text-stone-200"
      >
        <DotsSixVertical size={18} weight="bold" />
      </button>
      <input
        value={row.years ?? ''}
        onChange={(e) => onPatch({ years: e.target.value })}
        placeholder="2024-2026"
        aria-label="Années"
        className={`${INPUT} px-2.5 py-2 font-mono text-sm`}
      />
      <input
        value={row.club ?? ''}
        onChange={(e) => onPatch({ club: e.target.value })}
        placeholder="Club"
        aria-label="Club"
        className={`${INPUT} py-2 text-sm`}
      />
      <div className="col-span-4 sm:col-span-1" title="Logo du club">
        <ImageUpload value={row.logo_url} onChange={(url) => onPatch({ logo_url: url })} kind="career" shape="mini" />
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Supprimer l'étape"
        className="grid h-9 w-9 place-items-center rounded-lg text-zinc-400 transition hover:bg-rose-50 hover:text-rose-600 dark:text-stone-500 dark:hover:bg-rose-500/10 dark:hover:text-rose-400 max-sm:col-start-4 max-sm:row-start-1"
      >
        <Trash size={15} />
      </button>
    </Reorder.Item>
  )
}

/**
 * Career as editable rows (years, club, logo), most recent first; drag the
 * handle to reorder. Replaces the old "Années | Club | URL" text box.
 */
export function CareerEditor({ value, onChange }: CareerEditorProps) {
  // Rows need stable keys (animations, drag) while the form stores plain
  // steps: keep the keyed copy as long as it still matches the value.
  const cache = useRef<CareerRow[]>([])
  const steps = value ?? []
  const same = cache.current.length === steps.length && cache.current.every((r, i) =>
    (r.years ?? '') === (steps[i].years ?? '') && (r.club ?? '') === (steps[i].club ?? '') && (r.logo_url ?? null) === (steps[i].logo_url ?? null))
  if (!same) cache.current = withKeys(steps)
  const rows = cache.current

  const emit = (next: CareerRow[]) => {
    cache.current = next
    onChange(next.map(({ key: _key, ...step }) => step))
  }
  const patch = (key: string, p: Partial<CareerStep>) => emit(rows.map((r) => (r.key === key ? { ...r, ...p } : r)))

  return (
    <div className="space-y-2.5">
      <Reorder.Group axis="y" values={rows} onReorder={emit} className="space-y-2.5">
        <AnimatePresence initial={false}>
          {rows.map((row) => (
            <CareerItem
              key={row.key}
              row={row}
              onPatch={(p) => patch(row.key, p)}
              onRemove={() => emit(rows.filter((r) => r.key !== row.key))}
            />
          ))}
        </AnimatePresence>
      </Reorder.Group>
      {rows.length === 0 && (
        <p className="rounded-xl border border-dashed border-stone-300 px-4 py-5 text-center text-sm text-zinc-500 dark:border-stone-50/15 dark:text-stone-400">
          Aucune étape. Ajoutez les clubs du joueur, du plus récent au plus ancien.
        </p>
      )}
      {rows.length < 12 && (
        <motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          onClick={() => emit([{ key: `c${++rowSeq}`, years: '', club: '', logo_url: null }, ...rows])}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-turf-700 hover:bg-turf-50 dark:text-turf-300 dark:hover:bg-turf-900/30"
        >
          <Plus size={14} weight="bold" /> Ajouter une étape
        </motion.button>
      )}
    </div>
  )
}

/* -------------------------------------------------------------- gallery */

interface GalleryEditorProps {
  value: string[] | null | undefined
  onChange: (value: string[]) => void
  max?: number
}

/** Up to six photos, each dropped or uploaded in its own tile. */
export function GalleryEditor({ value, onChange, max = 6 }: GalleryEditorProps) {
  const photos = value ?? []
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <AnimatePresence initial={false}>
        {photos.map((url, i) => (
          <motion.div key={url + i} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
            <ImageUpload
              value={url}
              kind="gallery"
              onChange={(next) => onChange(next ? photos.map((p, j) => (j === i ? next : p)) : photos.filter((_, j) => j !== i))}
            />
          </motion.div>
        ))}
      </AnimatePresence>
      {photos.length < max && (
        <motion.div layout key={`new-${photos.length}`}>
          <ImageUpload value={null} kind="gallery" onChange={(url) => { if (url) onChange([...photos, url].slice(0, max)) }} />
        </motion.div>
      )}
    </div>
  )
}
