import { createContext, useContext, useId, useRef, useState } from 'react'
import type { DragEvent, InputHTMLAttributes, KeyboardEvent, ReactNode, TextareaHTMLAttributes } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ImageSquare, LinkSimple, Trash, UploadSimple, X as XIcon } from '@phosphor-icons/react'
import { api, ApiError } from '../../../api/client'
import { useToast } from '../../ToastProvider'
import type { EditorErrors } from './model'

/* ------------------------------------------------------------------ errors */

/** Server validation errors, read by every <Field> under the editor. */
export const EditorErrorsContext = createContext<EditorErrors>({})

/* ------------------------------------------------------------------- field */

interface FieldProps {
  /** Form key: anchor for completeness shortcuts and server errors. */
  field?: string
  label: string
  hint?: string
  className?: string
  children: ReactNode
}

/** Label above, control, then hint or error below. */
export function Field({ field, label, hint, className = '', children }: FieldProps) {
  const errors = useContext(EditorErrorsContext)
  const error = field ? errors[field] : undefined
  return (
    <div data-field={field} className={`scroll-mt-32 rounded-xl transition-shadow ${className}`}>
      <label className="block">
        <span className="mb-1.5 block text-[0.8rem] font-medium text-zinc-700 dark:text-stone-300">{label}</span>
        {children}
      </label>
      {error ? (
        <p className="mt-1.5 text-[0.75rem] text-rose-600 dark:text-rose-400">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-[0.75rem] text-zinc-500 dark:text-stone-500">{hint}</p>
      ) : null}
    </div>
  )
}

export const INPUT =
  'w-full rounded-xl border border-stone-300/90 bg-white px-3.5 py-2.5 text-[0.95rem] text-zinc-900 placeholder:text-zinc-400 shadow-[inset_0_1px_0_rgba(0,0,0,0.02)] transition focus:border-turf-600 focus:outline-none focus:ring-4 focus:ring-turf-600/10 dark:border-stone-50/12 dark:bg-zinc-900 dark:text-stone-50 dark:placeholder:text-stone-500 dark:focus:border-turf-300 dark:focus:ring-turf-300/10'

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${INPUT} ${props.className ?? ''}`} />
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${INPUT} min-h-[6rem] resize-y leading-relaxed ${props.className ?? ''}`} />
}

/* --------------------------------------------------------------- sections */

interface SectionProps {
  title: string
  description?: string
  children: ReactNode
}

/** A titled group of fields inside a tab. */
export function Section({ title, description, children }: SectionProps) {
  return (
    <section className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-[0_15px_35px_-24px_rgba(28,25,23,0.18)] dark:border-stone-50/[0.07] dark:bg-zinc-900/60 lg:p-7">
      <header className="mb-5">
        <h2 className="font-display text-lg font-semibold tracking-tight text-zinc-950 dark:text-stone-50">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-zinc-500 dark:text-stone-400">{description}</p>}
      </header>
      {children}
    </section>
  )
}

/* --------------------------------------------------------------- segmented */

interface SegmentedProps {
  value: string | null | undefined
  options: { value: string; label: string }[]
  onChange: (value: string) => void
  ariaLabel: string
}

/** A short list of choices shown as buttons, with a sliding highlight. */
export function Segmented({ value, options, onChange, ariaLabel }: SegmentedProps) {
  const id = useId()
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="inline-flex w-full flex-wrap gap-1 rounded-xl border border-stone-300/90 bg-stone-100/70 p-1 dark:border-stone-50/12 dark:bg-zinc-950/60">
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={`relative flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors active:scale-[0.98] ${
              active ? 'text-zinc-950 dark:text-stone-50' : 'text-zinc-500 hover:text-zinc-800 dark:text-stone-400 dark:hover:text-stone-200'
            }`}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                className="absolute inset-0 rounded-lg bg-white shadow-sm ring-1 ring-stone-200 dark:bg-zinc-800 dark:ring-stone-50/10"
              />
            )}
            <span className="relative">{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ switch */

interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description?: string
}

export function Switch({ checked, onChange, label, description }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-6 rounded-xl border border-stone-200/80 bg-stone-50/60 px-4 py-3.5 text-left transition hover:border-stone-300 dark:border-stone-50/10 dark:bg-zinc-950/40 dark:hover:border-stone-50/20"
    >
      <span>
        <span className="block text-sm font-medium text-zinc-900 dark:text-stone-100">{label}</span>
        {description && <span className="mt-0.5 block text-[0.8rem] text-zinc-500 dark:text-stone-400">{description}</span>}
      </span>
      <span className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${checked ? 'bg-turf-600 dark:bg-turf-400' : 'bg-stone-300 dark:bg-stone-50/20'}`}>
        <motion.span
          className="absolute top-1 h-5 w-5 rounded-full bg-white shadow"
          animate={{ x: checked ? 24 : 4 }}
          transition={{ type: 'spring', stiffness: 500, damping: 34 }}
        />
      </span>
    </button>
  )
}

/* ------------------------------------------------------------------- chips */

interface ChipsInputProps {
  value: string[] | null | undefined
  onChange: (value: string[]) => void
  placeholder?: string
  max?: number
}

/** Type a word, press Entrée (or a comma) to add it; click × to remove. */
export function ChipsInput({ value, onChange, placeholder, max = 12 }: ChipsInputProps) {
  const items = value ?? []
  const [draft, setDraft] = useState('')

  const add = (raw: string) => {
    const word = raw.trim().replace(/,$/, '').trim()
    if (!word || items.length >= max) return
    if (!items.some((i) => i.toLowerCase() === word.toLowerCase())) onChange([...items, word])
    setDraft('')
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      add(draft)
    } else if (e.key === 'Backspace' && draft === '' && items.length > 0) {
      onChange(items.slice(0, -1))
    }
  }

  return (
    <div className={`${INPUT} flex flex-wrap items-center gap-1.5 py-2`}>
      <AnimatePresence initial={false}>
        {items.map((item) => (
          <motion.span
            key={item}
            layout
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            className="inline-flex items-center gap-1 rounded-lg bg-turf-50 py-1 pl-2.5 pr-1 text-sm text-turf-900 ring-1 ring-turf-200/80 dark:bg-turf-900/30 dark:text-turf-100 dark:ring-turf-400/20"
          >
            {item}
            <button
              type="button"
              onClick={() => onChange(items.filter((i) => i !== item))}
              aria-label={`Retirer ${item}`}
              className="grid h-5 w-5 place-items-center rounded-md text-turf-700 hover:bg-turf-100 dark:text-turf-200 dark:hover:bg-turf-800/50"
            >
              <XIcon size={11} weight="bold" />
            </button>
          </motion.span>
        ))}
      </AnimatePresence>
      <input
        value={draft}
        onChange={(e) => {
          // Pasted or typed commas split into several chips at once.
          const parts = e.target.value.split(',')
          if (parts.length > 1) {
            const fresh = parts.slice(0, -1).map((w) => w.trim()).filter(Boolean)
              .filter((w, i, all) => all.findIndex((x) => x.toLowerCase() === w.toLowerCase()) === i)
              .filter((w) => !items.some((i) => i.toLowerCase() === w.toLowerCase()))
            if (fresh.length) onChange([...items, ...fresh].slice(0, max))
            setDraft(parts[parts.length - 1].trimStart())
          } else {
            setDraft(e.target.value)
          }
        }}
        onKeyDown={onKeyDown}
        onBlur={() => add(draft)}
        placeholder={items.length === 0 ? placeholder : 'Ajouter…'}
        className="min-w-[8rem] flex-1 bg-transparent py-0.5 text-[0.95rem] text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-stone-50 dark:placeholder:text-stone-500"
      />
    </div>
  )
}

/* ------------------------------------------------------------- stat input */

interface StatInputProps {
  field?: string
  label: string
  value: number | null | undefined
  onChange: (value: number | null) => void
  step?: number | string
  max?: number
  unit?: string
}

/** One statistic: label above, large tabular number. */
export function StatInput({ field, label, value, onChange, step = 1, max, unit }: StatInputProps) {
  const errors = useContext(EditorErrorsContext)
  const error = field ? errors[field] : undefined
  return (
    <label data-field={field} className={`group block scroll-mt-32 rounded-xl border bg-stone-50/70 px-3.5 py-3 transition focus-within:border-turf-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-turf-600/10 dark:bg-zinc-950/40 dark:focus-within:border-turf-300 dark:focus-within:bg-zinc-900 ${
      error ? 'border-rose-400' : 'border-stone-200/80 dark:border-stone-50/10'
    }`}>
      <span className="block text-[0.72rem] font-medium uppercase tracking-[0.08em] text-zinc-500 dark:text-stone-400">{label}</span>
      <span className="mt-1 flex items-baseline gap-1">
        <input
          type="number"
          inputMode="decimal"
          min={0}
          max={max}
          step={step}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
          className="w-full bg-transparent font-mono text-2xl tabular-nums text-zinc-950 focus:outline-none dark:text-stone-50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          placeholder="0"
        />
        {unit && <span className="text-sm text-zinc-400 dark:text-stone-500">{unit}</span>}
      </span>
      {error && <span className="mt-1 block text-[0.72rem] text-rose-600 dark:text-rose-400">{error}</span>}
    </label>
  )
}

/* ------------------------------------------------------------ image drops */

const ACCEPT = 'image/jpeg,image/png,image/webp'

/** Shared drag-and-drop behaviour for image zones. */
export function useImageDrop(onFile: (file: File) => void) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [over, setOver] = useState(false)
  const pick = () => inputRef.current?.click()
  const handlers = {
    onDragOver: (e: DragEvent<HTMLElement>) => { e.preventDefault(); setOver(true) },
    onDragLeave: () => setOver(false),
    onDrop: (e: DragEvent<HTMLElement>) => {
      e.preventDefault()
      setOver(false)
      const file = e.dataTransfer.files?.[0]
      if (file && file.type.startsWith('image/')) onFile(file)
    },
  }
  const input = (
    <input
      ref={inputRef}
      type="file"
      accept={ACCEPT}
      className="hidden"
      onChange={(e) => {
        const file = e.target.files?.[0]
        if (file) onFile(file)
        e.target.value = ''
      }}
    />
  )
  return { over, pick, handlers, input }
}

interface ImageUploadProps {
  value: string | null | undefined
  onChange: (url: string | null) => void
  kind: 'logo' | 'portrait' | 'gallery' | 'career'
  /** Shape of the zone: square with help text (logos), small square alone
   *  (career rows) or a tall tile (photos). */
  shape?: 'logo' | 'mini' | 'tile'
  label?: string
}

/**
 * Drop an image (or click) and it is uploaded right away to
 * /admin/players/assets; the returned URL becomes the field value. An
 * external link can still be pasted instead.
 */
export function ImageUpload({ value, onChange, kind, shape = 'tile', label }: ImageUploadProps) {
  const toast = useToast()
  const [uploading, setUploading] = useState(false)
  const [linkOpen, setLinkOpen] = useState(false)

  const upload = async (file: File) => {
    if (file.size > 6 * 1024 * 1024) { toast.error('Image trop lourde (6 Mo maximum).'); return }
    const fd = new FormData()
    fd.append('image', file)
    fd.append('kind', kind)
    setUploading(true)
    try {
      const res = await api.post<{ url: string }>('/admin/players/assets', fd, { auth: true })
      onChange(res.url)
      toast.success('Image ajoutée. Pensez à enregistrer.')
    } catch (err: unknown) {
      const data = err instanceof ApiError ? (err.data as { errors?: Record<string, string[]> } | null) : null
      toast.error(data?.errors?.image?.[0] ?? (err instanceof Error ? err.message : 'Envoi de l’image impossible.'))
    } finally {
      setUploading(false)
    }
  }
  const { over, pick, handlers, input } = useImageDrop(upload)

  const box = shape === 'logo' ? 'h-20 w-20 rounded-2xl' : shape === 'mini' ? 'h-11 w-11 rounded-xl' : 'aspect-[4/5] w-full rounded-2xl'
  const contain = shape !== 'tile'

  return (
    <div className={shape === 'logo' ? 'flex flex-wrap items-center gap-4' : ''}>
      <div
        {...handlers}
        onClick={value || uploading ? undefined : pick}
        className={`group relative shrink-0 overflow-hidden border transition ${box} ${
          over
            ? 'border-turf-500 bg-turf-50 ring-4 ring-turf-500/15 dark:bg-turf-900/30'
            : value
              ? 'border-stone-200 bg-stone-100 dark:border-stone-50/10 dark:bg-zinc-950'
              : 'cursor-pointer border-dashed border-stone-300 bg-stone-50 hover:border-turf-500 hover:bg-turf-50/40 dark:border-stone-50/15 dark:bg-zinc-950/40 dark:hover:border-turf-300'
        }`}
      >
        {input}
        {value ? (
          <>
            <img src={value} alt="" className={`absolute inset-0 h-full w-full ${contain ? 'object-contain p-1.5' : 'object-cover'}`} />
            <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-zinc-950/55 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
              <button type="button" onClick={pick} aria-label="Remplacer l'image" title="Remplacer"
                className={`grid place-items-center rounded-full bg-white/90 text-zinc-900 hover:bg-white ${shape === 'mini' ? 'hidden' : 'h-8 w-8'}`}>
                <UploadSimple size={14} weight="bold" />
              </button>
              <button type="button" onClick={() => onChange(null)} aria-label="Retirer l'image" title="Retirer"
                className={`grid place-items-center rounded-full bg-white/90 text-rose-600 hover:bg-white ${shape === 'mini' ? 'h-6 w-6' : 'h-8 w-8'}`}>
                <Trash size={14} weight="bold" />
              </button>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-2 text-center text-zinc-400 dark:text-stone-500">
            <ImageSquare size={shape === 'tile' ? 26 : shape === 'logo' ? 20 : 16} weight="duotone" />
            {shape === 'tile' && <span className="text-[0.75rem] leading-tight">Glisser une image<br />ou cliquer</span>}
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 grid place-items-center bg-white/70 dark:bg-zinc-950/70">
            <span className="h-1 w-2/3 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-50/10">
              <motion.span className="block h-full w-1/3 rounded-full bg-turf-600"
                animate={{ x: ['-100%', '300%'] }} transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }} />
            </span>
          </div>
        )}
      </div>

      {shape === 'logo' && (
        <div className="min-w-0 flex-1 space-y-1">
          {label && <p className="text-[0.8rem] font-medium text-zinc-700 dark:text-stone-300">{label}</p>}
          <p className="text-[0.75rem] text-zinc-500 dark:text-stone-500">Glisser une image, ou</p>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[0.8rem]">
            <button type="button" onClick={pick} className="font-medium text-turf-700 hover:underline dark:text-turf-300">choisir un fichier</button>
            <button type="button" onClick={() => setLinkOpen((v) => !v)} className="inline-flex items-center gap-1 text-zinc-500 hover:text-zinc-900 dark:text-stone-400 dark:hover:text-stone-100">
              <LinkSimple size={12} /> coller un lien
            </button>
          </div>
        </div>
      )}
      {shape === 'tile' && !value && (
        <button type="button" onClick={() => setLinkOpen((v) => !v)} className="mt-2 inline-flex items-center gap-1 text-[0.75rem] text-zinc-500 hover:text-zinc-900 dark:text-stone-400 dark:hover:text-stone-100">
          <LinkSimple size={12} /> ou coller un lien
        </button>
      )}
      <AnimatePresence initial={false}>
        {linkOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className={`overflow-hidden ${shape === 'logo' ? 'basis-full' : ''}`}>
            <input
              type="url"
              defaultValue={value ?? ''}
              placeholder="https://…"
              onBlur={(e) => { onChange(e.target.value.trim() || null); setLinkOpen(false) }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur() } }}
              className={`${INPUT} mt-2 py-2 text-sm`}
              autoFocus
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
