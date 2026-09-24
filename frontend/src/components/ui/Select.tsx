import { forwardRef, useId } from 'react'
import type { ReactNode } from 'react'
import * as RSelect from '@radix-ui/react-select'
import { CaretDown, CaretUp, Check } from '@phosphor-icons/react'

/**
 * Editorial-tuned Select built on Radix so we get accessible keyboard nav,
 * a portalled dropdown that never gets clipped by parent `overflow:hidden`,
 * and a look that matches the rest of the wizard controls in both themes.
 *
 * API is intentionally minimal - value/onChange strings, an array of
 * options, and standard input trimmings (placeholder, disabled, invalid).
 * Anything fancier (icons in items, groups) can be added incrementally.
 */
export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectProps {
  id?: string
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
  invalid?: boolean
  ariaLabel?: string
  className?: string
  emptyLabel?: string
}

const Select = forwardRef<HTMLButtonElement, SelectProps>(function Select(
  { id, value, onChange, options, placeholder = 'Choisir…', disabled, invalid, ariaLabel, className = '', emptyLabel = 'Aucune option disponible.' },
  ref,
) {
  const fallbackId = useId()
  const triggerId = id ?? fallbackId

  return (
    <RSelect.Root value={value === '' ? undefined : value} onValueChange={onChange} disabled={disabled}>
      <RSelect.Trigger
        ref={ref}
        id={triggerId}
        aria-label={ariaLabel}
        data-invalid={invalid || undefined}
        className={`group inline-flex w-full items-center justify-between gap-3 rounded-xl border bg-white dark:bg-zinc-900 px-4 py-3 text-sm text-zinc-900 dark:text-stone-100 transition focus:outline-none focus:ring-2 focus:ring-turf-700/20 dark:focus:ring-turf-300/20 disabled:opacity-50 disabled:cursor-not-allowed
          data-[state=open]:border-turf-700 dark:data-[state=open]:border-turf-300
          data-[invalid]:border-rose-400
          border-stone-300 focus:border-turf-700 dark:border-stone-50/15 dark:focus:border-turf-300 ${className}`}
      >
        <RSelect.Value placeholder={<span className="text-zinc-400 dark:text-stone-500">{placeholder}</span>} />
        <RSelect.Icon asChild>
          <CaretDown size={14} weight="bold" className="text-zinc-500 dark:text-stone-400 group-data-[state=open]:rotate-180 transition-transform" />
        </RSelect.Icon>
      </RSelect.Trigger>

      <RSelect.Portal>
        <RSelect.Content
          position="popper"
          sideOffset={6}
          className="z-50 min-w-[var(--radix-select-trigger-width)] max-h-[min(24rem,var(--radix-select-content-available-height))] overflow-hidden rounded-xl border border-stone-200 dark:border-stone-50/10 bg-white dark:bg-zinc-900 shadow-[0_20px_50px_-24px_rgba(24,24,27,0.35)] dark:shadow-[0_20px_50px_-24px_rgba(0,0,0,0.6)]"
        >
          <RSelect.ScrollUpButton className="flex h-7 items-center justify-center text-zinc-500 dark:text-stone-400 bg-white dark:bg-zinc-900">
            <CaretUp size={12} weight="bold" />
          </RSelect.ScrollUpButton>
          <RSelect.Viewport className="p-1.5">
            {options.length === 0 ? (
              <div className="px-3 py-2 text-xs text-zinc-500 dark:text-stone-500">{emptyLabel}</div>
            ) : (
              options.map((opt) => (
                <RSelect.Item
                  key={opt.value}
                  value={opt.value}
                  disabled={opt.disabled}
                  className="relative flex items-center gap-2 rounded-lg px-3 py-2 pr-8 text-sm text-zinc-800 dark:text-stone-200 cursor-pointer select-none outline-none data-[highlighted]:bg-stone-100 dark:data-[highlighted]:bg-stone-50/5 data-[state=checked]:text-zinc-950 dark:data-[state=checked]:text-stone-50 data-[state=checked]:font-medium data-[disabled]:opacity-40 data-[disabled]:cursor-not-allowed"
                >
                  <RSelect.ItemText>{opt.label}</RSelect.ItemText>
                  <RSelect.ItemIndicator className="absolute right-2 grid place-items-center">
                    <Check size={12} weight="bold" className="text-turf-700 dark:text-turf-300" />
                  </RSelect.ItemIndicator>
                </RSelect.Item>
              ))
            )}
          </RSelect.Viewport>
          <RSelect.ScrollDownButton className="flex h-7 items-center justify-center text-zinc-500 dark:text-stone-400 bg-white dark:bg-zinc-900">
            <CaretDown size={12} weight="bold" />
          </RSelect.ScrollDownButton>
        </RSelect.Content>
      </RSelect.Portal>
    </RSelect.Root>
  )
})

/** Convenience wrapper for rendering an inline label + <Select /> pair. */
export function SelectField({
  label,
  htmlFor,
  optional,
  children,
}: {
  label: ReactNode
  htmlFor?: string
  optional?: boolean
  children: ReactNode
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-zinc-900 dark:text-stone-100 mb-2">
        {label}
        {optional && <span className="ml-2 font-normal text-zinc-400 dark:text-stone-500 text-xs">(facultatif)</span>}
      </label>
      {children}
    </div>
  )
}

export default Select
