import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

/* Shared admin form chrome — used by AdminPlayers, AdminArticles, Scouting. */

export const INPUT_BASE =
  'w-full rounded-lg border border-stone-300 bg-white text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 dark:border-stone-50/15 dark:bg-zinc-900 dark:text-stone-50 dark:placeholder:text-stone-500 dark:focus:border-turf-300 px-3 py-2 text-sm focus:outline-none transition'

interface FieldRowProps {
  label: string
  hint?: string
  children: ReactNode
}

export function FieldRow({ label, hint, children }: FieldRowProps) {
  return (
    <label className="block">
      <span className="block text-[0.65rem] font-mono uppercase tracking-[0.16em] text-zinc-500 dark:text-stone-400 mb-1">
        {label}
        {hint ? <span className="text-zinc-400 dark:text-stone-500 normal-case font-sans tracking-normal ml-1">— {hint}</span> : null}
      </span>
      {children}
    </label>
  )
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${INPUT_BASE} ${props.className || ''}`} />
}

interface NumberInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'step' | 'min' | 'max' | 'type'> {
  value: number | null | undefined
  onChange: (value: number | null) => void
  step?: number | string
  min?: number
  max?: number
}

export function NumberInput({ value, onChange, step = 1, min = 0, max, ...rest }: NumberInputProps) {
  return (
    <input
      type="number"
      step={step}
      min={min}
      max={max}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
      className={`${INPUT_BASE} tabular-nums`}
      {...rest}
    />
  )
}

interface SelectInputProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'value' | 'onChange'> {
  value: string | null | undefined
  onChange: (value: string) => void
  options: { value: string; label: string }[] | string[]
}

export function SelectInput({ value, onChange, options, ...rest }: SelectInputProps) {
  const opts = options.map((opt) => (typeof opt === 'string' ? { value: opt, label: opt } : opt))
  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className={INPUT_BASE}
      {...rest}
    >
      {opts.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  )
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${INPUT_BASE} ${props.className || ''}`} />
}
