import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { DayPicker } from 'react-day-picker'
import { fr } from 'date-fns/locale'
import { format, isValid, parseISO } from 'date-fns'
import { CalendarBlank, CaretDown, X } from '@phosphor-icons/react'
import 'react-day-picker/dist/style.css'

/**
 * Calendar-driven date picker matching the wizard aesthetic. The <input> we
 * expose to callers stores an ISO YYYY-MM-DD string (same shape as the
 * previous native date input) so wizard state and server payloads don't
 * need to change.
 *
 * The picker itself is react-day-picker localised in French; we render it in
 * a Framer-animated pop-over positioned under the trigger. Clicking outside
 * dismisses it. `min` and `max` bound the visible + selectable range so the
 * DOB flow can hide unrealistic years.
 */
interface DateInputProps {
  id?: string
  value: string
  onChange: (iso: string) => void
  placeholder?: string
  disabled?: boolean
  invalid?: boolean
  min?: string
  max?: string
  ariaLabel?: string
  className?: string
}

function iso(date: Date | undefined): string {
  return date ? format(date, 'yyyy-MM-dd') : ''
}

function parse(value: string): Date | undefined {
  if (!value) return undefined
  const d = parseISO(value)
  return isValid(d) ? d : undefined
}

export default function DateInput({
  id,
  value,
  onChange,
  placeholder = 'Sélectionner une date',
  disabled,
  invalid,
  min,
  max,
  ariaLabel,
  className = '',
}: DateInputProps) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const selected = parse(value)

  // Close on outside click.
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (!wrapperRef.current) return
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // ESC to close.
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  const label = selected ? format(selected, 'd MMMM yyyy', { locale: fr }) : ''

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <button
        id={id}
        type="button"
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={`group inline-flex w-full items-center justify-between gap-3 rounded-xl border bg-white dark:bg-zinc-900 px-4 py-3 text-sm transition focus:outline-none focus:ring-2 focus:ring-turf-700/20 dark:focus:ring-turf-300/20 disabled:opacity-50 disabled:cursor-not-allowed
          ${invalid ? 'border-rose-400' : 'border-stone-300 focus:border-turf-700 dark:border-stone-50/15 dark:focus:border-turf-300'}
          ${open ? 'border-turf-700 dark:border-turf-300' : ''}
        `}
      >
        <span className="inline-flex items-center gap-2.5 min-w-0">
          <CalendarBlank size={14} weight="regular" className="text-zinc-500 dark:text-stone-400 shrink-0" />
          <span className={`truncate ${selected ? 'text-zinc-900 dark:text-stone-100' : 'text-zinc-400 dark:text-stone-500'}`}>
            {label || placeholder}
          </span>
        </span>
        <span className="inline-flex items-center gap-1 shrink-0">
          {selected && !disabled && (
            <span
              role="button"
              tabIndex={0}
              aria-label="Effacer la date"
              onClick={(e) => { e.stopPropagation(); onChange('') }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onChange('') } }}
              className="grid place-items-center w-5 h-5 rounded-md text-zinc-400 hover:text-zinc-900 hover:bg-stone-100 dark:hover:text-stone-50 dark:hover:bg-stone-50/10 transition"
            >
              <X size={11} weight="bold" />
            </span>
          )}
          <CaretDown
            size={12}
            weight="bold"
            className={`text-zinc-500 dark:text-stone-400 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit={{    opacity: 0, y: -6, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="absolute left-0 top-[calc(100%+6px)] z-50 rounded-2xl border border-stone-200 dark:border-stone-50/10 bg-white dark:bg-zinc-900 shadow-[0_24px_50px_-24px_rgba(24,24,27,0.35)] dark:shadow-[0_24px_50px_-24px_rgba(0,0,0,0.6)] p-3"
            style={{ transformOrigin: 'top left' }}
          >
            <DayPicker
              mode="single"
              locale={fr}
              selected={selected}
              defaultMonth={selected}
              onSelect={(d) => { onChange(iso(d)); setOpen(false) }}
              startMonth={min ? parse(min) : new Date(1950, 0)}
              endMonth={max ? parse(max) : new Date(new Date().getFullYear() + 5, 11)}
              captionLayout="dropdown"
              showOutsideDays
              disabled={[
                ...(min ? [{ before: parse(min) as Date }] : []),
                ...(max ? [{ after: parse(max) as Date }] : []),
              ]}
              classNames={{
                root: 'text-sm text-zinc-900 dark:text-stone-100',
                months: 'flex flex-col gap-4',
                month: 'space-y-3',
                caption: 'flex items-center justify-between px-1',
                caption_label: 'font-semibold text-sm',
                nav: 'flex items-center gap-1',
                nav_button:
                  'inline-flex items-center justify-center w-7 h-7 rounded-md border border-stone-200 dark:border-stone-50/10 hover:bg-stone-100 dark:hover:bg-stone-50/5 transition',
                nav_button_previous: '',
                nav_button_next: '',
                dropdowns: 'flex gap-2',
                dropdown:
                  'text-xs bg-white dark:bg-zinc-900 border border-stone-200 dark:border-stone-50/10 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-turf-700/20',
                table: 'w-full border-collapse',
                head_row: 'flex mb-1',
                head_cell:
                  'w-9 h-8 text-[0.65rem] uppercase tracking-wider font-mono text-zinc-500 dark:text-stone-500 grid place-items-center',
                row: 'flex mt-1',
                cell: 'w-9 h-9 p-0 relative',
                day:
                  'w-9 h-9 grid place-items-center rounded-lg text-[0.8rem] transition-colors hover:bg-stone-100 dark:hover:bg-stone-50/5 focus:outline-none focus:ring-2 focus:ring-turf-700/20',
                day_selected: 'bg-zinc-950 text-stone-50 dark:bg-stone-50 dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-stone-200',
                day_today: 'text-turf-700 dark:text-turf-300 font-semibold',
                day_outside: 'text-zinc-300 dark:text-stone-600',
                day_disabled: 'opacity-30 cursor-not-allowed hover:bg-transparent',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
