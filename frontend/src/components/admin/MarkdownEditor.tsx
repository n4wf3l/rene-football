import { useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import {
  LinkSimple,
  ListBullets,
  ListNumbers,
  Minus,
  Quotes,
  TextB,
  TextHThree,
  TextHTwo,
  TextItalic,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import { countWords, renderMarkdown } from '../../lib/markdown'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  rows?: number
  placeholder?: string
}

type Selection = { start: number; end: number }

interface ToolbarAction {
  key: string
  label: string
  shortcut?: string
  Icon: Icon
  apply: (text: string, sel: Selection) => { text: string; sel: Selection }
}

/** Wraps the selection in `before`/`after`, or inserts a selected placeholder. */
function wrap(before: string, after: string, placeholder: string) {
  return (text: string, { start, end }: Selection) => {
    const picked = text.slice(start, end) || placeholder
    const next = text.slice(0, start) + before + picked + after + text.slice(end)
    const from = start + before.length
    return { text: next, sel: { start: from, end: from + picked.length } }
  }
}

/**
 * Prefixes every selected line. `strip` removes any competing prefix (e.g. an
 * H3 marker when applying H2); the action toggles off only when every line
 * already carries this exact format (`same`).
 */
function prefixLines(prefix: (index: number) => string, strip: RegExp, same: RegExp = strip) {
  return (text: string, { start, end }: Selection) => {
    const lineStart = text.lastIndexOf('\n', start - 1) + 1
    const lineEndIdx = text.indexOf('\n', end)
    const lineEnd = lineEndIdx === -1 ? text.length : lineEndIdx
    const lines = text.slice(lineStart, lineEnd).split('\n')
    const all = lines.every((l) => same.test(l))
    const updated = lines.map((l, i) => (all ? l.replace(strip, '') : prefix(i) + l.replace(strip, ''))).join('\n')
    const next = text.slice(0, lineStart) + updated + text.slice(lineEnd)
    return { text: next, sel: { start: lineStart, end: lineStart + updated.length } }
  }
}

const ACTIONS: ToolbarAction[] = [
  { key: 'bold', label: 'Gras', shortcut: 'Ctrl+B', Icon: TextB, apply: wrap('**', '**', 'texte en gras') },
  { key: 'italic', label: 'Italique', shortcut: 'Ctrl+I', Icon: TextItalic, apply: wrap('*', '*', 'texte en italique') },
  { key: 'h2', label: 'Intertitre', Icon: TextHTwo, apply: prefixLines(() => '## ', /^#{2,3}\s+/, /^##(?!#)\s+/) },
  { key: 'h3', label: 'Sous-intertitre', Icon: TextHThree, apply: prefixLines(() => '### ', /^#{2,3}\s+/, /^###\s+/) },
  { key: 'ul', label: 'Liste à puces', Icon: ListBullets, apply: prefixLines(() => '- ', /^\s*[-*]\s+/) },
  { key: 'ol', label: 'Liste numérotée', Icon: ListNumbers, apply: prefixLines((i) => `${i + 1}. `, /^\s*\d+[.)]\s+/) },
  { key: 'quote', label: 'Citation', Icon: Quotes, apply: prefixLines(() => '> ', /^\s*>\s?/) },
  {
    key: 'link',
    label: 'Lien',
    shortcut: 'Ctrl+K',
    Icon: LinkSimple,
    apply: (text, { start, end }) => {
      const picked = text.slice(start, end) || 'texte du lien'
      const url = 'https://'
      const next = `${text.slice(0, start)}[${picked}](${url})${text.slice(end)}`
      const urlAt = start + picked.length + 3
      return { text: next, sel: { start: urlAt, end: urlAt + url.length } }
    },
  },
  {
    key: 'hr',
    label: 'Séparateur',
    Icon: Minus,
    apply: (text, { end }) => {
      const insert = '\n\n---\n\n'
      const next = text.slice(0, end) + insert + text.slice(end)
      const at = end + insert.length
      return { text: next, sel: { start: at, end: at } }
    },
  },
]

const SHORTCUTS: Record<string, string> = { b: 'bold', i: 'italic', k: 'link' }

/**
 * Article body editor: Markdown textarea with a formatting toolbar, keyboard
 * shortcuts and a preview that uses the exact renderer of the public page.
 */
export default function MarkdownEditor({ value, onChange, rows = 18, placeholder }: MarkdownEditorProps) {
  const ref = useRef<HTMLTextAreaElement | null>(null)
  const pendingSel = useRef<Selection | null>(null)
  const [mode, setMode] = useState<'write' | 'preview'>('write')

  // Restore the selection after React re-renders the new value.
  useLayoutEffect(() => {
    const sel = pendingSel.current
    const el = ref.current
    if (!sel || !el) return
    pendingSel.current = null
    el.focus()
    el.setSelectionRange(sel.start, sel.end)
  }, [value])

  const run = (action: ToolbarAction) => {
    const el = ref.current
    if (!el) return
    const { text, sel } = action.apply(value, { start: el.selectionStart, end: el.selectionEnd })
    pendingSel.current = sel
    onChange(text)
  }

  const onKeyDown = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (!(e.ctrlKey || e.metaKey)) return
    const key = SHORTCUTS[e.key.toLowerCase()]
    const action = ACTIONS.find((a) => a.key === key)
    if (!action) return
    e.preventDefault()
    run(action)
  }

  const words = countWords(value)
  const minutes = Math.max(1, Math.round(words / 200))
  const tab = (active: boolean) =>
    `px-3 py-1.5 text-xs font-medium rounded-md transition ${
      active
        ? 'bg-white text-zinc-950 shadow-sm dark:bg-zinc-800 dark:text-stone-50'
        : 'text-zinc-500 hover:text-zinc-950 dark:text-stone-400 dark:hover:text-stone-50'
    }`

  return (
    <div className="overflow-hidden rounded-xl border border-stone-300 bg-white focus-within:border-turf-600 dark:border-stone-50/15 dark:bg-zinc-900/40 dark:focus-within:border-turf-400">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 bg-stone-50 px-2 py-1.5 dark:border-stone-50/10 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center gap-0.5" role="toolbar" aria-label="Mise en forme">
          {ACTIONS.map((action) => (
            <button
              key={action.key}
              type="button"
              onClick={() => run(action)}
              disabled={mode === 'preview'}
              title={action.shortcut ? `${action.label} (${action.shortcut})` : action.label}
              aria-label={action.label}
              className="grid h-8 w-8 place-items-center rounded-md text-zinc-600 transition hover:bg-stone-200/70 hover:text-zinc-950 disabled:opacity-30 disabled:hover:bg-transparent dark:text-stone-400 dark:hover:bg-stone-50/10 dark:hover:text-stone-50"
            >
              <action.Icon size={16} weight="bold" />
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-stone-200/60 p-0.5 dark:bg-zinc-950/60">
          <button type="button" onClick={() => setMode('write')} className={tab(mode === 'write')}>Rédiger</button>
          <button type="button" onClick={() => setMode('preview')} className={tab(mode === 'preview')}>Aperçu</button>
        </div>
      </div>

      {mode === 'write' ? (
        <textarea
          ref={ref}
          rows={rows}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          className="block w-full resize-y bg-transparent px-4 py-3.5 text-[0.95rem] leading-relaxed text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-stone-100 dark:placeholder:text-stone-500"
        />
      ) : (
        <div className="max-h-[70vh] min-h-[18rem] overflow-y-auto bg-stone-50 px-6 py-6 dark:bg-zinc-950">
          {renderMarkdown(value) ?? (
            <p className="text-sm italic text-zinc-500 dark:text-stone-500">Rien à prévisualiser pour l'instant.</p>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-200 px-4 py-2 font-mono text-[0.68rem] text-zinc-500 dark:border-stone-50/10 dark:text-stone-500">
        <span>**gras** · *italique* · ## intertitre · - liste · &gt; citation · [lien](https://…)</span>
        {words > 0 && <span className="uppercase tracking-[0.14em] tabular-nums">{words} mots · {minutes} min de lecture</span>}
      </div>
    </div>
  )
}
