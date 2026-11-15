import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ClipboardEvent as ReactClipboardEvent, KeyboardEvent as ReactKeyboardEvent } from 'react'
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
  X as XIcon,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import { countWords, htmlToMarkdown, markdownToHtml } from '../../lib/markdown'

interface MarkdownEditorProps {
  /** Article body, in the site's light Markdown. */
  value: string
  onChange: (value: string) => void
  rows?: number
  placeholder?: string
}

type ActionKey = 'bold' | 'italic' | 'h2' | 'h3' | 'ul' | 'ol' | 'quote' | 'link' | 'hr'

interface ToolbarAction {
  key: ActionKey
  label: string
  shortcut?: string
  Icon: Icon
}

const ACTIONS: ToolbarAction[][] = [
  [
    { key: 'bold', label: 'Gras', shortcut: 'Ctrl+B', Icon: TextB },
    { key: 'italic', label: 'Italique', shortcut: 'Ctrl+I', Icon: TextItalic },
  ],
  [
    { key: 'h2', label: 'Intertitre', Icon: TextHTwo },
    { key: 'h3', label: 'Sous-titre', Icon: TextHThree },
  ],
  [
    { key: 'ul', label: 'Liste à puces', Icon: ListBullets },
    { key: 'ol', label: 'Liste numérotée', Icon: ListNumbers },
    { key: 'quote', label: 'Citation', Icon: Quotes },
  ],
  [
    { key: 'link', label: 'Lien', shortcut: 'Ctrl+K', Icon: LinkSimple },
    { key: 'hr', label: 'Séparateur', Icon: Minus },
  ],
]

/** What the editor content looks like: close to the public article page. */
const CONTENT_CLASSES = [
  'px-5 py-4 text-[0.98rem] leading-relaxed text-zinc-900 dark:text-stone-100 focus:outline-none overflow-y-auto',
  '[&_p]:my-3 first:[&_p]:mt-0',
  '[&_h2]:mt-7 [&_h2]:mb-2 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-zinc-950 dark:[&_h2]:text-stone-50',
  '[&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:font-display [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-zinc-950 dark:[&_h3]:text-stone-50',
  '[&_blockquote]:my-5 [&_blockquote]:border-l-2 [&_blockquote]:border-turf-600 [&_blockquote]:pl-5 [&_blockquote]:font-display [&_blockquote]:text-lg [&_blockquote]:italic dark:[&_blockquote]:border-turf-300',
  '[&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1',
  '[&_a]:text-turf-700 [&_a]:underline [&_a]:underline-offset-4 dark:[&_a]:text-turf-300',
  '[&_strong]:font-semibold [&_b]:font-semibold [&_strong]:text-zinc-950 dark:[&_strong]:text-stone-50',
  '[&_hr]:my-6 [&_hr]:border-0 [&_hr]:border-t [&_hr]:border-zinc-950/15 dark:[&_hr]:border-stone-50/15',
].join(' ')

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function normaliseUrl(raw: string): string | null {
  const url = raw.trim()
  if (!url) return null
  if (/^(https?:\/\/|mailto:)/i.test(url) || (url.startsWith('/') && !url.startsWith('//'))) return url
  if (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(url)) return `https://${url}`
  return null
}

/**
 * Article body editor, visual: bold shows bold, a heading looks like a
 * heading, no `**` or `##` on screen. It still stores the site's light
 * Markdown (lib/markdown), so the public article renders exactly as before.
 */
export default function MarkdownEditor({ value, onChange, rows = 14, placeholder }: MarkdownEditorProps) {
  const ref = useRef<HTMLDivElement | null>(null)
  const lastEmitted = useRef<string | null>(null)
  const savedRange = useRef<Range | null>(null)
  const [active, setActive] = useState<Partial<Record<ActionKey, boolean>>>({})
  const [empty, setEmpty] = useState(!value.trim())
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkError, setLinkError] = useState(false)
  const linkInputRef = useRef<HTMLInputElement | null>(null)

  // Load the stored Markdown (first render, or a value changed from outside).
  // Line endings are ignored: the server may send back CRLF.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const norm = (s: string | null) => (s ?? '').replace(/\r\n?/g, '\n').trim()
    if (lastEmitted.current !== null && norm(value) === norm(lastEmitted.current)) return
    el.innerHTML = markdownToHtml(value) || '<p><br></p>'
    lastEmitted.current = value
    setEmpty(!value.trim())
  }, [value])

  const emit = useCallback(() => {
    const el = ref.current
    if (!el) return
    const md = htmlToMarkdown(el)
    setEmpty(!el.textContent?.trim() && !el.querySelector('hr'))
    if (md === lastEmitted.current) return
    lastEmitted.current = md
    onChange(md)
  }, [onChange])

  const insideEditor = (node: Node | null) => !!node && !!ref.current && ref.current.contains(node)

  const refreshActive = useCallback(() => {
    const sel = document.getSelection()
    if (!sel || !insideEditor(sel.anchorNode)) return
    const block = String(document.queryCommandValue('formatBlock') || '').toLowerCase()
    const anchorEl = sel.anchorNode instanceof Element ? sel.anchorNode : sel.anchorNode?.parentElement
    const inHeading = block === 'h2' || block === 'h3'
    setActive({
      bold: !inHeading && document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      h2: block === 'h2',
      h3: block === 'h3',
      quote: block === 'blockquote' || !!anchorEl?.closest('blockquote'),
      ul: document.queryCommandState('insertUnorderedList'),
      ol: document.queryCommandState('insertOrderedList'),
      link: !!anchorEl?.closest('a'),
    })
  }, [])

  useEffect(() => {
    document.addEventListener('selectionchange', refreshActive)
    return () => document.removeEventListener('selectionchange', refreshActive)
  }, [refreshActive])

  const exec = (command: string, arg?: string) => {
    ref.current?.focus()
    document.execCommand(command, false, arg)
    emit()
    refreshActive()
  }

  const toggleBlock = (tag: 'h2' | 'h3' | 'blockquote') => {
    const current = String(document.queryCommandValue('formatBlock') || '').toLowerCase()
    exec('formatBlock', current === tag ? '<p>' : `<${tag}>`)
  }

  const openLink = () => {
    const sel = document.getSelection()
    if (!sel || sel.rangeCount === 0 || !insideEditor(sel.anchorNode)) {
      ref.current?.focus()
    }
    const s = document.getSelection()
    savedRange.current = s && s.rangeCount ? s.getRangeAt(0).cloneRange() : null
    const anchorEl = s?.anchorNode instanceof Element ? s.anchorNode : s?.anchorNode?.parentElement
    setLinkUrl(anchorEl?.closest('a')?.getAttribute('href') ?? '')
    setLinkError(false)
    setLinkOpen(true)
    window.setTimeout(() => linkInputRef.current?.focus(), 0)
  }

  const restoreSelection = () => {
    ref.current?.focus()
    const sel = document.getSelection()
    if (sel && savedRange.current) {
      sel.removeAllRanges()
      sel.addRange(savedRange.current)
    }
  }

  const applyLink = () => {
    const url = normaliseUrl(linkUrl)
    if (!url) { setLinkError(true); return }
    restoreSelection()
    const sel = document.getSelection()
    if (sel && sel.rangeCount && sel.getRangeAt(0).collapsed) {
      document.execCommand('insertHTML', false, `<a href="${escapeHtml(url)}">${escapeHtml(linkUrl.trim())}</a>`)
    } else {
      document.execCommand('createLink', false, url)
    }
    setLinkOpen(false)
    emit()
  }

  const removeLink = () => {
    restoreSelection()
    document.execCommand('unlink')
    setLinkOpen(false)
    emit()
  }

  const run = (key: ActionKey) => {
    switch (key) {
      case 'bold': return exec('bold')
      case 'italic': return exec('italic')
      case 'h2': return toggleBlock('h2')
      case 'h3': return toggleBlock('h3')
      case 'quote': return toggleBlock('blockquote')
      case 'ul': return exec('insertUnorderedList')
      case 'ol': return exec('insertOrderedList')
      case 'hr': return exec('insertHorizontalRule')
      case 'link': return openLink()
    }
  }

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'k') {
      e.preventDefault()
      openLink()
    }
  }

  // Pasted text arrives clean (no fonts or colours from Word or a website);
  // blank lines become paragraphs.
  const onPaste = (e: ReactClipboardEvent<HTMLDivElement>) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain').replace(/\r\n?/g, '\n')
    const parts = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
    if (parts.length > 1) {
      document.execCommand('insertHTML', false, parts.map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`).join(''))
    } else {
      document.execCommand('insertText', false, text)
    }
    emit()
  }

  const words = countWords(value)
  const minutes = Math.max(1, Math.round(words / 220))

  return (
    <div className="overflow-hidden rounded-xl border border-stone-300 bg-white focus-within:border-turf-600 dark:border-stone-50/15 dark:bg-zinc-900/40 dark:focus-within:border-turf-400">
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1 border-b border-stone-200 bg-stone-50 px-2 py-1.5 dark:border-stone-50/10 dark:bg-zinc-900" role="toolbar" aria-label="Mise en forme">
        {ACTIONS.map((group, gi) => (
          <div key={gi} className="flex items-center gap-0.5 border-r border-stone-200 pr-1 last:border-r-0 dark:border-stone-50/10">
            {group.map(({ key, label, shortcut, Icon }) => (
              <button
                key={key}
                type="button"
                title={shortcut ? `${label} (${shortcut})` : label}
                aria-label={label}
                aria-pressed={!!active[key]}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => run(key)}
                className={`grid h-8 w-8 place-items-center rounded-md transition ${
                  active[key]
                    ? 'bg-zinc-950 text-stone-50 dark:bg-stone-50 dark:text-zinc-950'
                    : 'text-zinc-600 hover:bg-stone-200/70 hover:text-zinc-950 dark:text-stone-400 dark:hover:bg-stone-50/10 dark:hover:text-stone-50'
                }`}
              >
                <Icon size={16} weight={key === 'bold' ? 'bold' : 'regular'} />
              </button>
            ))}
          </div>
        ))}
      </div>

      {linkOpen && (
        // Not a <form>: this editor sits inside the article form, and a nested
        // form would submit (save) the whole article.
        <div role="group" aria-label="Lien" className="flex flex-wrap items-center gap-2 border-b border-stone-200 bg-white px-3 py-2 dark:border-stone-50/10 dark:bg-zinc-900">
          <LinkSimple size={15} className="text-zinc-400" />
          <input
            ref={linkInputRef}
            type="text"
            value={linkUrl}
            onChange={(e) => { setLinkUrl(e.target.value); setLinkError(false) }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); applyLink() }
              if (e.key === 'Escape') { e.preventDefault(); setLinkOpen(false); restoreSelection() }
            }}
            placeholder="https://… ou /joueurs/…"
            aria-label="Adresse du lien"
            className={`min-w-[12rem] flex-1 rounded-md border bg-white px-2.5 py-1.5 text-sm text-zinc-900 focus:outline-none dark:bg-zinc-950 dark:text-stone-100 ${linkError ? 'border-rose-500' : 'border-stone-300 focus:border-zinc-500 dark:border-stone-50/15'}`}
          />
          <button type="button" onClick={applyLink} className="btn btn-primary px-3 py-1.5 text-xs">Valider</button>
          {active.link && (
            <button type="button" onClick={removeLink} className="rounded-md px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10">Retirer le lien</button>
          )}
          <button type="button" onClick={() => { setLinkOpen(false); restoreSelection() }} aria-label="Fermer" className="grid h-7 w-7 place-items-center rounded-md text-zinc-500 hover:bg-stone-100 dark:hover:bg-stone-50/10">
            <XIcon size={13} weight="bold" />
          </button>
          {linkError && <span className="w-full text-[0.7rem] text-rose-600 dark:text-rose-400">Adresse invalide : commencez par https://, mailto: ou / pour une page du site.</span>}
        </div>
      )}

      <div className="relative">
        {empty && placeholder && (
          <div className="pointer-events-none absolute left-5 top-4 text-[0.98rem] text-zinc-400 dark:text-stone-500">{placeholder}</div>
        )}
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label="Texte de l'article"
          onInput={emit}
          onBlur={emit}
          onFocus={() => document.execCommand('defaultParagraphSeparator', false, 'p')}
          onKeyDown={onKeyDown}
          onKeyUp={refreshActive}
          onMouseUp={refreshActive}
          onPaste={onPaste}
          className={CONTENT_CLASSES}
          style={{ minHeight: `${Math.max(rows, 6) * 1.65}rem`, maxHeight: '70vh' }}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-200 bg-stone-50 px-4 py-2 font-mono text-[0.62rem] uppercase tracking-[0.12em] text-zinc-500 dark:border-stone-50/10 dark:bg-zinc-900 dark:text-stone-500">
        <span className="normal-case tracking-normal">Ctrl+B gras · Ctrl+I italique · Ctrl+K lien · Maj+Entrée : retour à la ligne</span>
        <span>{words} mot{words > 1 ? 's' : ''} · {minutes} min de lecture</span>
      </div>
    </div>
  )
}
