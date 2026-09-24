import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, ChangeEvent, KeyboardEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { DayPicker } from 'react-day-picker'
import { fr } from 'date-fns/locale'
import { format, isValid, parse as parseFormat, parseISO } from 'date-fns'
import { CalendarBlank, X } from '@phosphor-icons/react'
import 'react-day-picker/style.css'

/**
 * Type-or-pick date input following 2026 UX guidance for pickers:
 *   - dual input (typed dd/mm/yyyy OR calendar) so keyboard users don't
 *     have to click through 15 years of dropdowns to pick a DOB
 *   - month + year rendered as accessible <select>s inside the caption
 *   - day cells at 40px so touch targets stay comfortable
 *   - fully localised (French month names + "dd MMMM yyyy" display)
 *   - focus rings + ARIA invalid state + labelled clear button
 *
 * Value shape stays ISO YYYY-MM-DD so wizard state and server payloads
 * don't change.
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

const TYPED_FORMATS = ['dd/MM/yyyy', 'd/M/yyyy', 'dd-MM-yyyy', 'd-M-yyyy', 'yyyy-MM-dd'] as const

function iso(date: Date | undefined): string {
  return date ? format(date, 'yyyy-MM-dd') : ''
}

function parseIso(value: string): Date | undefined {
  if (!value) return undefined
  const d = parseISO(value)
  return isValid(d) ? d : undefined
}

/**
 * Best-effort parse of what the user typed. Accepts French-style dd/mm/yyyy
 * and dashed variants + ISO. Returns null on ambiguous input so callers can
 * display a validation error.
 */
function parseTyped(input: string): Date | null | undefined {
  if (!input.trim()) return undefined
  for (const f of TYPED_FORMATS) {
    const d = parseFormat(input.trim(), f, new Date())
    if (isValid(d)) return d
  }
  return null
}

export default function DateInput({
  id,
  value,
  onChange,
  placeholder = 'jj/mm/aaaa',
  disabled,
  invalid,
  min,
  max,
  ariaLabel,
  className = '',
}: DateInputProps) {
  const [open, setOpen] = useState(false)
  const [typedDraft, setTypedDraft] = useState<string>('')
  const [typedError, setTypedError] = useState<boolean>(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = parseIso(value)
  const shownText = typedDraft !== '' ? typedDraft : selected ? format(selected, 'dd/MM/yyyy', { locale: fr }) : ''
  const humanText = selected ? format(selected, 'd MMMM yyyy', { locale: fr }) : ''

  // Close on outside click / ESC.
  useEffect(() => {
    if (!open) return
    const click = (e: MouseEvent) => {
      if (!wrapperRef.current) return
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false)
    }
    const esc = (e: KeyboardEvent | globalThis.KeyboardEvent) => {
      if ((e as globalThis.KeyboardEvent).key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', click)
    document.addEventListener('keydown', esc as (e: globalThis.KeyboardEvent) => void)
    return () => {
      document.removeEventListener('mousedown', click)
      document.removeEventListener('keydown', esc as (e: globalThis.KeyboardEvent) => void)
    }
  }, [open])

  const handleTypedInput = (e: ChangeEvent<HTMLInputElement>) => {
    setTypedDraft(e.target.value)
    setTypedError(false)
  }
  const commitTyped = () => {
    if (typedDraft === '') return
    const d = parseTyped(typedDraft)
    if (d === undefined) return
    if (d === null) {
      setTypedError(true)
      return
    }
    onChange(iso(d))
    setTypedDraft('')
    setTypedError(false)
  }
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      commitTyped()
      setOpen(false)
    } else if (e.key === 'ArrowDown' && !open) {
      e.preventDefault()
      setOpen(true)
    }
  }

  const showInvalid = invalid || typedError

  // v10 theming knobs through CSS custom properties on the popover wrapper.
  const rdpVars: CSSProperties = {
    ['--rdp-accent-color' as string]: 'rgb(58 105 84)',
    ['--rdp-accent-background-color' as string]: 'transparent',
    ['--rdp-today-color' as string]: 'rgb(58 105 84)',
    ['--rdp-day-height' as string]: '40px',
    ['--rdp-day-width' as string]: '40px',
    ['--rdp-day_button-height' as string]: '36px',
    ['--rdp-day_button-width' as string]: '36px',
    ['--rdp-day_button-border-radius' as string]: '0.5rem',
    ['--rdp-day_button-border' as string]: '2px solid transparent',
    ['--rdp-selected-border' as string]: 'none',
    ['--rdp-nav_button-height' as string]: '32px',
    ['--rdp-nav_button-width' as string]: '32px',
    ['--rdp-nav-height' as string]: '2.75rem',
    ['--rdp-months-gap' as string]: '1rem',
    ['--rdp-dropdown-gap' as string]: '0.4rem',
    ['--rdp-outside-opacity' as string]: '0.35',
    ['--rdp-disabled-opacity' as string]: '0.3',
    fontFamily: 'inherit',
    fontSize: '0.85rem',
  }

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      {/* Type-or-pick trigger: real <input> for typed dates + a calendar
         button that opens the popover. Users can hit ArrowDown from the
         input to open the calendar with keyboard-only nav. */}
      <div
        className={`group inline-flex w-full items-center gap-2 rounded-xl border bg-white dark:bg-zinc-900 pl-3 pr-1.5 py-1.5 transition
          focus-within:ring-2 focus-within:ring-turf-700/20 dark:focus-within:ring-turf-300/20
          ${showInvalid ? 'border-rose-400' : 'border-stone-300 focus-within:border-turf-700 dark:border-stone-50/15 dark:focus-within:border-turf-300'}
          ${open ? 'border-turf-700 dark:border-turf-300' : ''}
          ${disabled ? 'opacity-50' : ''}
        `}
      >
        <CalendarBlank size={14} weight="regular" className="text-zinc-500 dark:text-stone-400 shrink-0" />
        <input
          ref={inputRef}
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          aria-label={ariaLabel}
          aria-invalid={showInvalid || undefined}
          disabled={disabled}
          value={shownText}
          onChange={handleTypedInput}
          onBlur={commitTyped}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 min-w-0 bg-transparent border-0 px-1 py-1.5 text-sm text-zinc-900 dark:text-stone-100 placeholder:text-zinc-400 dark:placeholder:text-stone-500 focus:outline-none disabled:cursor-not-allowed"
        />
        {selected && !disabled && (
          <button
            type="button"
            aria-label="Effacer la date"
            onClick={() => { onChange(''); setTypedDraft(''); setTypedError(false) }}
            className="grid place-items-center w-7 h-7 rounded-md text-zinc-400 hover:text-zinc-900 hover:bg-stone-100 dark:hover:text-stone-50 dark:hover:bg-stone-50/10 transition"
          >
            <X size={11} weight="bold" />
          </button>
        )}
        <button
          type="button"
          aria-label={open ? 'Fermer le calendrier' : 'Ouvrir le calendrier'}
          aria-expanded={open}
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
          className="grid place-items-center w-8 h-8 rounded-lg text-zinc-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-50/10 transition"
        >
          <CalendarBlank size={14} weight="regular" />
        </button>
      </div>

      {/* Feedback line: shows the parsed date once selected + error hint. */}
      {humanText && !typedError && (
        <div className="mt-1.5 text-[0.7rem] text-zinc-500 dark:text-stone-500 pl-1">
          {humanText}
        </div>
      )}
      {typedError && (
        <div className="mt-1.5 text-[0.7rem] text-rose-600 dark:text-rose-400 pl-1">
          Date invalide. Essayez au format jj/mm/aaaa.
        </div>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit={{    opacity: 0, y: -6, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="absolute left-0 top-[calc(100%+8px)] z-50 rounded-2xl border border-stone-200 dark:border-stone-50/10 bg-white dark:bg-zinc-900 shadow-[0_24px_50px_-24px_rgba(24,24,27,0.35)] dark:shadow-[0_24px_50px_-24px_rgba(0,0,0,0.6)] p-3 w-[320px]"
            style={{ transformOrigin: 'top left', ...rdpVars }}
          >
            <DayPicker
              mode="single"
              locale={fr}
              selected={selected}
              defaultMonth={selected ?? (max ? parseIso(max) : new Date())}
              onSelect={(d) => { onChange(iso(d)); setTypedDraft(''); setOpen(false) }}
              startMonth={min ? parseIso(min) : new Date(1950, 0)}
              endMonth={max ? parseIso(max) : new Date(new Date().getFullYear() + 5, 11)}
              captionLayout="dropdown"
              navLayout="around"
              showOutsideDays
              disabled={[
                ...(min ? [{ before: parseIso(min) as Date }] : []),
                ...(max ? [{ after: parseIso(max) as Date }] : []),
              ]}
              classNames={{
                root: 'text-zinc-900 dark:text-stone-100',
                months: 'flex flex-col',
                month: 'space-y-2',
                month_caption: 'flex items-center justify-center gap-2 py-1',
                caption_label: 'sr-only',
                dropdowns: 'flex items-center gap-2',
                dropdown_root:
                  'relative inline-flex items-center rounded-lg border border-stone-200 dark:border-stone-50/10 bg-white dark:bg-zinc-900 hover:border-stone-300 dark:hover:border-stone-50/20 transition',
                dropdown:
                  'appearance-none bg-transparent text-xs font-medium text-zinc-900 dark:text-stone-100 pl-2.5 pr-6 py-1 focus:outline-none focus:ring-2 focus:ring-turf-700/20 cursor-pointer',
                chevron: 'text-zinc-500 dark:text-stone-400',
                nav: 'absolute left-3 right-3 top-3 flex items-center justify-between pointer-events-none',
                button_previous:
                  'pointer-events-auto inline-flex items-center justify-center rounded-md border border-stone-200 dark:border-stone-50/10 text-zinc-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-50/5 transition disabled:opacity-30 disabled:cursor-not-allowed',
                button_next:
                  'pointer-events-auto inline-flex items-center justify-center rounded-md border border-stone-200 dark:border-stone-50/10 text-zinc-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-50/5 transition disabled:opacity-30 disabled:cursor-not-allowed',
                month_grid: 'w-full mt-1',
                weekdays: 'grid grid-cols-7 mb-1',
                weekday: 'text-[0.6rem] uppercase tracking-wider font-mono text-zinc-500 dark:text-stone-500 text-center py-1',
                weeks: 'grid gap-y-0.5',
                week: 'grid grid-cols-7',
                day: 'p-0 text-center',
                day_button:
                  'grid place-items-center rounded-lg text-[0.85rem] transition-colors hover:bg-stone-100 dark:hover:bg-stone-50/5 focus:outline-none focus:ring-2 focus:ring-turf-700/20',
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
