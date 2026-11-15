import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

/**
 * Light Markdown for article bodies, written in the admin editor and rendered
 * on the public article page (and in the editor preview).
 *
 * Supported - and nothing else, on purpose:
 *   blocks : paragraphs (blank line), `## ` / `### ` headings, `> ` quote,
 *            `- ` / `* ` bullet list, `1. ` numbered list, `---` separator
 *   inline : **bold**, *italic* / _italic_, [text](url)
 *
 * Output is built as React elements, never as HTML strings, so article text
 * can't inject markup. Links only accept http(s), mailto and site-relative
 * URLs; anything else renders as plain text. Plain-text articles written
 * before the toolbar existed render exactly as before (one <p> per block).
 */

type Block =
  | { kind: 'p'; lines: string[] }
  | { kind: 'h2' | 'h3'; text: string }
  | { kind: 'quote'; lines: string[] }
  | { kind: 'ul' | 'ol'; items: string[] }
  | { kind: 'hr' }

const BULLET = /^\s*[-*]\s+(.*)$/
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/
const QUOTE = /^\s*>\s?(.*)$/

function parseBlocks(source: string): Block[] {
  const blocks: Block[] = []
  let para: string[] = []
  const flush = () => {
    if (para.length) blocks.push({ kind: 'p', lines: para })
    para = []
  }
  const last = () => blocks[blocks.length - 1]

  for (const raw of source.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trimEnd()
    if (!line.trim()) { flush(); continue }

    let m: RegExpMatchArray | null
    if (/^\s*-{3,}\s*$/.test(line)) { flush(); blocks.push({ kind: 'hr' }); continue }
    if ((m = line.match(/^\s*###\s+(.*)$/))) { flush(); blocks.push({ kind: 'h3', text: m[1] }); continue }
    if ((m = line.match(/^\s*##\s+(.*)$/))) { flush(); blocks.push({ kind: 'h2', text: m[1] }); continue }
    if ((m = line.match(QUOTE))) {
      flush()
      const prev = last()
      if (prev?.kind === 'quote') prev.lines.push(m[1])
      else blocks.push({ kind: 'quote', lines: [m[1]] })
      continue
    }
    if ((m = line.match(BULLET)) || (m = line.match(NUMBERED))) {
      const kind = BULLET.test(line) ? 'ul' : 'ol'
      flush()
      const prev = last()
      if (prev && prev.kind === kind) prev.items.push(m[1])
      else blocks.push({ kind, items: [m[1]] })
      continue
    }
    para.push(line.trim())
  }
  flush()
  return blocks
}

const INLINE = /\*\*(.+?)\*\*|\*([^*\s][^*]*?)\*|_([^_\s][^_]*?)_|\[([^\]]+)\]\(([^)\s]+)\)/g

function safeHref(url: string): string | null {
  if (url.startsWith('/') && !url.startsWith('//')) return url
  if (/^(https?:\/\/|mailto:)/i.test(url)) return url
  return null
}

function renderInline(text: string, key = 'i'): ReactNode[] {
  const out: ReactNode[] = []
  let last = 0
  let n = 0
  for (const m of text.matchAll(INLINE)) {
    const at = m.index ?? 0
    if (at > last) out.push(text.slice(last, at))
    const k = `${key}-${n++}`
    if (m[1] !== undefined) {
      out.push(<strong key={k} className="font-semibold text-zinc-950 dark:text-stone-50">{renderInline(m[1], k)}</strong>)
    } else if (m[2] !== undefined || m[3] !== undefined) {
      out.push(<em key={k}>{renderInline(m[2] ?? m[3], k)}</em>)
    } else {
      const href = safeHref(m[5])
      const label = renderInline(m[4], k)
      const cls = 'font-medium text-turf-700 underline decoration-turf-700/30 underline-offset-4 transition-colors hover:decoration-turf-700 dark:text-turf-300 dark:decoration-turf-300/30 dark:hover:decoration-turf-300'
      if (!href) out.push(<span key={k}>{label}</span>)
      else if (href.startsWith('/')) out.push(<Link key={k} to={href} className={cls}>{label}</Link>)
      else out.push(<a key={k} href={href} target="_blank" rel="noopener noreferrer" className={cls}>{label}</a>)
    }
    last = at + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

function withBreaks(lines: string[], key: string): ReactNode[] {
  return lines.flatMap((line, i) => [
    ...(i > 0 ? [<br key={`${key}-br-${i}`} />] : []),
    ...renderInline(line, `${key}-${i}`),
  ])
}

/** Renders article Markdown; returns null when there is nothing to show. */
export function renderMarkdown(content: string | null | undefined): ReactNode {
  if (!content?.trim()) return null
  const blocks = parseBlocks(content)
  if (blocks.length === 0) return null

  return (
    <div className="space-y-6 text-base lg:text-lg leading-[1.75] text-zinc-800 dark:text-stone-300">
      {blocks.map((b, i) => {
        const k = `b${i}`
        switch (b.kind) {
          case 'h2':
            return <h2 key={k} className="!mt-12 font-display text-2xl font-semibold leading-tight tracking-tight text-zinc-950 dark:text-stone-50 lg:text-3xl">{renderInline(b.text, k)}</h2>
          case 'h3':
            return <h3 key={k} className="!mt-10 font-display text-xl font-semibold leading-snug tracking-tight text-zinc-950 dark:text-stone-50 lg:text-2xl">{renderInline(b.text, k)}</h3>
          case 'quote':
            return (
              <blockquote key={k} className="!my-10 border-l-2 border-turf-700 pl-6 font-display text-xl italic leading-snug text-zinc-950 dark:border-turf-300 dark:text-stone-50 lg:text-2xl">
                {withBreaks(b.lines, k)}
              </blockquote>
            )
          case 'ul':
            return (
              <ul key={k} className="list-disc space-y-2 pl-6 marker:text-turf-700 dark:marker:text-turf-300">
                {b.items.map((item, j) => <li key={j}>{renderInline(item, `${k}-${j}`)}</li>)}
              </ul>
            )
          case 'ol':
            return (
              <ol key={k} className="list-decimal space-y-2 pl-6 marker:font-mono marker:text-turf-700 dark:marker:text-turf-300">
                {b.items.map((item, j) => <li key={j}>{renderInline(item, `${k}-${j}`)}</li>)}
              </ol>
            )
          case 'hr':
            return <hr key={k} className="!my-12 border-0 border-t border-zinc-950/10 dark:border-stone-50/10" />
          default:
            return <p key={k}>{withBreaks(b.lines, k)}</p>
        }
      })}
    </div>
  )
}

/* ───────────── Visual editor bridge (admin) ─────────────
 * The admin edits articles visually (bold looks bold). These two helpers
 * convert between that editable HTML and the light Markdown above, so what
 * is stored - and how the public page renders it - does not change. */

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function inlineHtml(text: string): string {
  let out = ''
  let last = 0
  for (const m of text.matchAll(INLINE)) {
    const at = m.index ?? 0
    out += esc(text.slice(last, at))
    if (m[1] !== undefined) out += `<strong>${inlineHtml(m[1])}</strong>`
    else if (m[2] !== undefined || m[3] !== undefined) out += `<em>${inlineHtml(m[2] ?? m[3])}</em>`
    else {
      const href = safeHref(m[5])
      out += href ? `<a href="${esc(href)}">${inlineHtml(m[4])}</a>` : inlineHtml(m[4])
    }
    last = at + m[0].length
  }
  return out + esc(text.slice(last))
}

/** Article Markdown → HTML for the visual editor (text is escaped). */
export function markdownToHtml(content: string | null | undefined): string {
  if (!content?.trim()) return ''
  return parseBlocks(content).map((b) => {
    switch (b.kind) {
      case 'h2': return `<h2>${inlineHtml(b.text)}</h2>`
      case 'h3': return `<h3>${inlineHtml(b.text)}</h3>`
      case 'quote': return `<blockquote>${b.lines.map(inlineHtml).join('<br>')}</blockquote>`
      case 'ul': return `<ul>${b.items.map((i) => `<li>${inlineHtml(i)}</li>`).join('')}</ul>`
      case 'ol': return `<ol>${b.items.map((i) => `<li>${inlineHtml(i)}</li>`).join('')}</ol>`
      case 'hr': return '<hr>'
      default: return `<p>${b.lines.map(inlineHtml).join('<br>')}</p>`
    }
  }).join('')
}

/** Puts `mark` around each non-empty line, spaces kept outside ("**word** "). */
function wrapLines(s: string, mark: string): string {
  return s.split('\n').map((line) => {
    const core = line.trim()
    if (!core) return line
    const lead = line.slice(0, line.indexOf(core))
    const trail = line.slice(line.indexOf(core) + core.length)
    return `${lead}${mark}${core}${mark}${trail}`
  }).join('\n')
}

const INLINE_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'A', 'SPAN', 'U', 'FONT', 'BR', 'CODE', 'SMALL', 'SUB', 'SUP', 'MARK'])

function inlineMd(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return (node.textContent ?? '').replace(/ /g, ' ')
  if (!(node instanceof HTMLElement)) return ''
  if (node.tagName === 'BR') return '\n'
  const inner = Array.from(node.childNodes).map(inlineMd).join('')
  if (node.tagName === 'A') {
    const href = safeHref(node.getAttribute('href') ?? '')
    const label = inner.trim()
    return href && label ? `[${label}](${href})` : inner
  }
  const weight = node.style.fontWeight
  const bold = node.tagName === 'B' || node.tagName === 'STRONG' || weight === 'bold' || Number(weight) >= 600
  const italic = node.tagName === 'I' || node.tagName === 'EM' || node.style.fontStyle === 'italic'
  let out = inner
  if (italic) out = wrapLines(out, '*')
  if (bold) out = wrapLines(out, '**')
  return out
}

/** Editable HTML → article Markdown (only the syntax the site renders). */
export function htmlToMarkdown(root: HTMLElement): string {
  const blocks: string[] = []
  const paragraph = (text: string) => {
    const lines = text.split('\n').map((l) => l.replace(/[ \t]+/g, ' ').trim()).filter(Boolean)
    if (lines.length) blocks.push(lines.join('\n'))
  }
  const oneLine = (text: string) => text.replace(/\s*\n\s*/g, ' ').replace(/[ \t]+/g, ' ').trim()

  const walk = (container: Node) => {
    let buffer = ''
    const flush = () => { paragraph(buffer); buffer = '' }
    for (const node of Array.from(container.childNodes)) {
      if (node.nodeType === Node.TEXT_NODE || (node instanceof HTMLElement && INLINE_TAGS.has(node.tagName))) {
        buffer += inlineMd(node)
        continue
      }
      if (!(node instanceof HTMLElement)) continue
      flush()
      const inner = () => Array.from(node.childNodes).map(inlineMd).join('')
      switch (node.tagName) {
        case 'H1': case 'H2': { const t = oneLine(inner()); if (t) blocks.push(`## ${t}`); break }
        case 'H3': case 'H4': case 'H5': case 'H6': { const t = oneLine(inner()); if (t) blocks.push(`### ${t}`); break }
        case 'BLOCKQUOTE': {
          // Lines inside a quote: <br> or nested paragraphs both start a new line.
          const lines = Array.from(node.childNodes)
            .map((c) => (c instanceof HTMLElement && !INLINE_TAGS.has(c.tagName) ? `${inlineMd(c)}\n` : inlineMd(c)))
            .join('')
          const kept = lines.split('\n').map((l) => l.trim()).filter(Boolean)
          if (kept.length) blocks.push(kept.map((l) => `> ${l}`).join('\n'))
          break
        }
        case 'UL': case 'OL': {
          const items = Array.from(node.children).filter((c) => c.tagName === 'LI')
            .map((li) => oneLine(Array.from(li.childNodes).map(inlineMd).join(''))).filter(Boolean)
          if (items.length) blocks.push(items.map((t, i) => (node.tagName === 'UL' ? `- ${t}` : `${i + 1}. ${t}`)).join('\n'))
          break
        }
        case 'HR': blocks.push('---'); break
        default: walk(node) // P, DIV, SECTION… may hold inline text and blocks
      }
    }
    flush()
  }
  walk(root)
  return blocks.join('\n\n')
}

/** Plain-text word count of an article body (Markdown markers ignored). */
export function countWords(content: string | null | undefined): number {
  if (!content) return 0
  const plain = content
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_>#`-]+/g, ' ')
  return plain.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length
}
