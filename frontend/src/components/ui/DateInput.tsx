import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { DayPicker } from 'react-day-picker'
import { fr } from 'date-fns/locale'
import { format, isValid, parseISO } from 'date-fns'
import { CalendarBlank, CaretDown, X } from '@phosphor-icons/react'
import 'react-day-picker/style.css'

/**
 * Calendar-driven date picker matching the wizard aesthetic.
 *
 * v10 of react-day-picker changed both the CSS import path and the
 * `classNames` key set; we import the current stylesheet, override the
 * theming knobs through CSS custom properties on the wrapper (so the
 * accent, day size, radii and font all match the wizard), and use the v10
 * class-name keys (root, day_button, selected, today, outside, disabled…)
 * for the last-mile Tailwind polish.
 *
 * Value shape stays ISO YYYY-MM-DD so callers don't need to change.
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

  useEffect(() => {
    if (!open) return
    const click = (e: MouseEvent) => {
      if (!wrapperRef.current) return
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false)
    }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', click)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', click)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  const label = selected ? format(selected, 'd MMMM yyyy', { locale: fr }) : ''

  // Theming through v10 CSS custom properties + `font-family: inherit` so
  // the calendar picks up the wizard font instead of the library default.
  const rdpVars: CSSProperties = {
    ['--rdp-accent-color' as string]: 'rgb(58 105 84)',            // turf-700
    ['--rdp-accent-background-color' as string]: 'transparent',
    ['--rdp-today-color' as string]: 'rgb(58 105 84)',
    ['--rdp-day-height' as string]: '36px',
    ['--rdp-day-width' as string]: '36px',
    ['--rdp-day_button-height' as string]: '34px',
    ['--rdp-day_button-width' as string]: '34px',
    ['--rdp-day_button-border-radius' as string]: '0.5rem',
    ['--rdp-day_button-border' as string]: '2px solid transparent',
    ['--rdp-selected-border' as string]: 'none',
    ['--rdp-nav_button-height' as string]: '28px',
    ['--rdp-nav_button-width' as string]: '28px',
    ['--rdp-nav-height' as string]: '2.5rem',
    ['--rdp-months-gap' as string]: '1rem',
    ['--rdp-dropdown-gap' as string]: '0.35rem',
    ['--rdp-outside-opacity' as string]: '0.35',
    ['--rdp-disabled-opacity' as string]: '0.28',
    fontFamily: 'inherit',
    fontSize: '0.85rem',
  }

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
            className="absolute left-0 top-[calc(100%+6px)] z-50 rounded-2xl border border-stone-200 dark:border-stone-50/10 bg-white dark:bg-zinc-900 shadow-[0_24px_50px_-24px_rgba(24,24,27,0.35)] dark:shadow-[0_24px_50px_-24px_rgba(0,0,0,0.6)] p-2"
            style={{ transformOrigin: 'top left', ...rdpVars }}
          >
            <DayPicker
              mode="single"
              locale={fr}
              selected={selected}
              defaultMonth={selected ?? new Date()}
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
                root: 'text-zinc-900 dark:text-stone-100',
                months: 'flex flex-col',
                month: 'space-y-2',
                nav: 'flex items-center justify-end gap-1 px-1 pb-1',
                button_previous:
                  'inline-flex items-center justify-center rounded-md border border-stone-200 dark:border-stone-50/10 text-zinc-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-50/5 transition disabled:opacity-30 disabled:cursor-not-allowed',
                button_next:
                  'inline-flex items-center justify-center rounded-md border border-stone-200 dark:border-stone-50/10 text-zinc-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-50/5 transition disabled:opacity-30 disabled:cursor-not-allowed',
                month_caption: 'hidden',
                dropdowns: 'flex items-center gap-1.5',
                dropdown_root: 'relative inline-flex items-center',
                dropdown:
                  'appearance-none bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-900 dark:text-stone-100 border border-stone-200 dark:border-stone-50/10 rounded-lg pl-2 pr-6 py-1 focus:outline-none focus:ring-2 focus:ring-turf-700/20',
                caption_label: 'hidden',
                weekdays: 'grid grid-cols-7 mb-1',
                weekday: 'text-[0.6rem] uppercase tracking-wider font-mono text-zinc-500 dark:text-stone-500 text-center py-1',
                weeks: 'grid gap-y-0.5',
                week: 'grid grid-cols-7',
                day: 'p-0 text-center',
                day_button:
                  'w-full h-full grid place-items-center rounded-lg text-[0.8rem] transition-colors hover:bg-stone-100 dark:hover:bg-stone-50/5 focus:outline-none focus:ring-2 focus:ring-turf-700/20',
                today: 'font-semibold',
                selected:
                  '[&_button]:bg-zinc-950 [&_button]:text-stone-50 dark:[&_button]:bg-stone-50 dark:[&_button]:text-zinc-950 [&_button:hover]:bg-zinc-800 dark:[&_button:hover]:bg-stone-200',
                outside: 'text-zinc-300 dark:text-stone-600',
                disabled: 'opacity-30 cursor-not-allowed [&_button]:hover:bg-transparent',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
