import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Icon as PhosphorIcon } from '@phosphor-icons/react'
import { CaretLeft, CaretRight, Question, X as XIcon } from '@phosphor-icons/react'

/**
 * Spotlight tutorial tour.
 *
 * Each step optionally targets a real DOM element (via a `data-tour="…"`
 * attribute or a raw CSS selector). When a target is set, the backdrop
 * darkens the whole page EXCEPT a rounded cutout around that element,
 * making it obvious which button / tab the step is describing. The
 * tooltip auto-positions next to the cutout (below → above → right → left
 * based on available room) and re-measures on window resize / scroll.
 *
 * Steps without a target fall back to a centered modal (useful for
 * welcome / recap slides that aren't about a specific button).
 *
 * `onEnter` per step lets the parent auto-switch tabs / open sections
 * so the target is actually rendered before the spotlight lands.
 *
 * Dismissal is persisted per storageKey (`rene_tutorial_<key>_dismissed`).
 * The manual trigger button always re-opens the tour regardless.
 */

export interface TutorialStep {
  title: string
  icon?: PhosphorIcon
  description: ReactNode
  bullets?: string[]
  tip?: string
  /** CSS selector or bare data-tour value. Missing → centered modal. */
  target?: string
  /** Fires when the step becomes active (use to change tab / open drawer). */
  onEnter?: () => void
}

interface Props {
  storageKey: string
  eyebrow?: string
  title?: string
  steps: TutorialStep[]
  open?: boolean
  onClose?: () => void
}

function storageDismissKey(key: string): string {
  return `rene_tutorial_${key}_dismissed`
}

function readDismissed(key: string): boolean {
  try { return window.localStorage.getItem(storageDismissKey(key)) === '1' }
  catch { return false }
}

function writeDismissed(key: string, value: boolean): void {
  try {
    if (value) window.localStorage.setItem(storageDismissKey(key), '1')
    else window.localStorage.removeItem(storageDismissKey(key))
  } catch { /* no-op */ }
}

/** Look the step's target up as either a CSS selector (when it starts
 *  with `.`, `#` or `[`) or as a `data-tour` value otherwise. */
function resolveTarget(target: string | undefined): HTMLElement | null {
  if (!target) return null
  const sel = /^[.#[]/.test(target) ? target : `[data-tour="${target}"]`
  return document.querySelector(sel)
}

const TOOLTIP_W = 460
const GAP = 14
const PAD = 8

interface Placement {
  top: number
  left: number
  anchor: 'bottom' | 'top' | 'right' | 'left' | 'center'
}

/**
 * Position the tooltip against the target's rect using the tooltip's
 * *measured* height (not a hardcoded estimate) so long content doesn't
 * spill below the viewport. Falls back to a viewport-centered placement
 * when no direction has enough room.
 */
function place(rect: DOMRect | null, tooltipH: number): Placement {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const centerFallback: Placement = {
    top: Math.max(GAP, vh / 2 - tooltipH / 2),
    left: vw / 2 - TOOLTIP_W / 2,
    anchor: 'center',
  }
  if (!rect) return centerFallback

  const spaceBelow = vh - rect.bottom
  const spaceAbove = rect.top
  const spaceRight = vw - rect.right
  const spaceLeft = rect.left

  const clampLeft = (l: number) => Math.max(GAP, Math.min(l, vw - TOOLTIP_W - GAP))
  const clampTop  = (t: number) => Math.max(GAP, Math.min(t, vh - tooltipH - GAP))

  if (spaceBelow >= tooltipH + GAP) {
    return { top: rect.bottom + GAP, left: clampLeft(rect.left + rect.width / 2 - TOOLTIP_W / 2), anchor: 'bottom' }
  }
  if (spaceAbove >= tooltipH + GAP) {
    return { top: rect.top - tooltipH - GAP, left: clampLeft(rect.left + rect.width / 2 - TOOLTIP_W / 2), anchor: 'top' }
  }
  if (spaceRight >= TOOLTIP_W + GAP) {
    return { top: clampTop(rect.top + rect.height / 2 - tooltipH / 2), left: rect.right + GAP, anchor: 'right' }
  }
  if (spaceLeft >= TOOLTIP_W + GAP) {
    return { top: clampTop(rect.top + rect.height / 2 - tooltipH / 2), left: Math.max(GAP, rect.left - TOOLTIP_W - GAP), anchor: 'left' }
  }
  return centerFallback
}

export default function TutorialModal({ storageKey, eyebrow, title, steps, open, onClose }: Props) {
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)
  const [dontShow, setDontShow] = useState(false)
  const [rect, setRect] = useState<DOMRect | null>(null)
  // Measured tooltip height. Used to place the tooltip so its footer
  // (Précédent / Fermer / Suivant) stays inside the viewport.
  const [tooltipH, setTooltipH] = useState(320)
  const tooltipRef = useRef<HTMLDivElement | null>(null)

  const s = steps[step]

  // Auto-open on first mount when not dismissed. When `open` is externally
  // controlled (manual re-trigger), mirror it instead.
  useEffect(() => {
    if (open !== undefined) { setVisible(open); if (open) setStep(0); return }
    if (!readDismissed(storageKey)) { setVisible(true); setStep(0) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const close = () => {
    if (dontShow) writeDismissed(storageKey, true)
    setVisible(false)
    onClose?.()
  }
  const next = () => { if (step < steps.length - 1) setStep(step + 1); else close() }
  const prev = () => { if (step > 0) setStep(step - 1) }

  // Fire onEnter + resolve target rect whenever step changes.
  useLayoutEffect(() => {
    if (!visible || !s) return
    s.onEnter?.()
    if (!s.target) { setRect(null); return }

    // Give the DOM a beat after onEnter (React re-render + smooth scroll)
    // before we start measuring the target.
    let cancelled = false
    let raf: number | null = null
    let scrollTimeout: number | null = null

    const measure = () => {
      const el = resolveTarget(s.target)
      if (!el) { setRect(null); return }
      setRect(el.getBoundingClientRect())
    }

    const initialTarget = resolveTarget(s.target)
    if (initialTarget) {
      // Scroll into view first so measurement reflects the final position.
      try { initialTarget.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' }) } catch { /* older browsers */ }
      scrollTimeout = window.setTimeout(() => { if (!cancelled) measure() }, 380)
    } else {
      // Element not yet mounted — retry on next frame.
      raf = window.requestAnimationFrame(() => { if (!cancelled) measure() })
    }

    const onResize = () => { if (!cancelled) measure() }
    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', onResize, true)
    return () => {
      cancelled = true
      if (raf !== null) window.cancelAnimationFrame(raf)
      if (scrollTimeout !== null) window.clearTimeout(scrollTimeout)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onResize, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, step])

  // Keyboard: Esc closes, arrows navigate.
  useEffect(() => {
    if (!visible) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      else if (e.key === 'ArrowRight') next()
      else if (e.key === 'ArrowLeft') prev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, step])

  // While the tour is open, tag <body> so we can hide external floating
  // triggers (e.g. AdminLayout's ReopenHandle at z-30 fixed) that would
  // otherwise peek through the darkened backdrop and confuse the user.
  useEffect(() => {
    if (!visible) return
    document.body.classList.add('tutorial-active')
    return () => document.body.classList.remove('tutorial-active')
  }, [visible])

  // Re-measure the tooltip whenever the visible step changes.
  useLayoutEffect(() => {
    if (!visible || !tooltipRef.current) return
    // Bounded to viewport so the tooltip never claims more than 92vh —
    // matches the maxHeight style below.
    const h = Math.min(tooltipRef.current.offsetHeight, window.innerHeight * 0.92)
    if (h && Math.abs(h - tooltipH) > 4) setTooltipH(h)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, step, rect])

  const placement = place(rect, tooltipH)
  const Icon = s?.icon

  return (
    <AnimatePresence>
      {visible && s && (
        <>
          {/* Backdrop: full-viewport dark plane with a cutout at the
              target's rect. When there's no target, it's a plain darken. */}
          <motion.div
            key="tut-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 pointer-events-none"
            style={{ zIndex: 9998 }}
          >
            {rect ? (
              <div
                className="absolute rounded-xl transition-[top,left,width,height] duration-200 ease-out"
                style={{
                  top: rect.top - PAD,
                  left: rect.left - PAD,
                  width: rect.width + PAD * 2,
                  height: rect.height + PAD * 2,
                  boxShadow: '0 0 0 100vmax rgba(2, 6, 23, 0.78)',
                  outline: '2px solid rgba(82, 153, 109, 0.9)',
                  outlineOffset: 0,
                }}
              />
            ) : (
              <div className="absolute inset-0 bg-black/75 backdrop-blur-[2px]" />
            )}
          </motion.div>

          {/* Tooltip - the only interactive layer. Closing goes through
              the X, Fermer or Esc; we don't intercept the rest of the page
              so the user can still scroll / navigate around the spotlight. */}
          <motion.div
            key="tut-tooltip"
            ref={tooltipRef}
            initial={{ opacity: 0, scale: 0.98, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 6 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            className="fixed rounded-2xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-stone-50/10 shadow-2xl overflow-hidden flex flex-col"
            style={{
              width: TOOLTIP_W,
              maxWidth: 'calc(100vw - 24px)',
              maxHeight: '92vh',
              top: placement.top,
              left: placement.left,
              zIndex: 9999,
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="tutorial-title"
          >
            {/* Header */}
            <div className="px-5 pt-4 pb-3 border-b border-stone-200 dark:border-stone-50/10 flex items-start justify-between gap-3">
              <div className="min-w-0">
                {eyebrow && (
                  <div className="text-[0.6rem] font-mono uppercase tracking-[0.2em] text-turf-700 dark:text-turf-300">
                    {eyebrow}
                  </div>
                )}
                <h2 id="tutorial-title" className="mt-1 font-display font-semibold text-lg text-zinc-950 dark:text-stone-50">
                  {title ?? 'Prise en main'}
                </h2>
                <div className="mt-0.5 text-[0.65rem] font-mono uppercase tracking-[0.14em] text-zinc-500 dark:text-stone-500">
                  Étape {step + 1} / {steps.length}
                </div>
              </div>
              <button
                type="button" onClick={close} aria-label="Fermer"
                className="grid place-items-center w-8 h-8 rounded-full text-zinc-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-50/10 transition"
              >
                <XIcon size={16} weight="bold" />
              </button>
            </div>

            <div className="h-1 bg-stone-200 dark:bg-stone-50/5">
              <motion.div
                className="h-full bg-turf-700 dark:bg-turf-300"
                animate={{ width: `${((step + 1) / steps.length) * 100}%` }}
                transition={{ type: 'spring', stiffness: 220, damping: 26 }}
              />
            </div>

            {/* Step body (scrolls internally when the content is taller
                than the remaining space — the footer buttons stay pinned). */}
            <div className="px-5 py-4 space-y-3 overflow-y-auto">
              <div className="flex items-start gap-3">
                {Icon && (
                  <span className="shrink-0 grid place-items-center w-10 h-10 rounded-xl bg-turf-100 text-turf-800 dark:bg-turf-500/15 dark:text-turf-300">
                    <Icon size={20} weight="duotone" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="font-display font-semibold text-base text-zinc-950 dark:text-stone-50">
                    {s.title}
                  </h3>
                  <div className="mt-1 text-sm text-zinc-700 dark:text-stone-300 leading-relaxed">
                    {s.description}
                  </div>
                </div>
              </div>

              {s.bullets && s.bullets.length > 0 && (
                <ul className="space-y-1 pl-1">
                  {s.bullets.map((b, i) => (
                    <li key={i} className="flex items-start gap-2 text-[0.85rem] text-zinc-700 dark:text-stone-300 leading-snug">
                      <span className="mt-1.5 inline-block w-1.5 h-1.5 rounded-full bg-turf-500 shrink-0" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              )}

              {s.tip && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/30 px-3 py-2 text-xs text-amber-900 dark:text-amber-300">
                  <span className="font-semibold">Astuce · </span>{s.tip}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-stone-200 dark:border-stone-50/10 bg-stone-50/60 dark:bg-zinc-950/40 flex flex-wrap items-center justify-between gap-2">
              <label className="inline-flex items-center gap-2 text-[0.7rem] text-zinc-600 dark:text-stone-400 cursor-pointer select-none">
                <input
                  type="checkbox" checked={dontShow}
                  onChange={(e) => setDontShow(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-stone-300 text-turf-700 focus:ring-turf-500"
                />
                Ne plus afficher
              </label>

              <div className="flex items-center gap-1.5 ml-auto">
                <button
                  type="button" onClick={prev} disabled={step === 0}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[0.7rem] font-medium text-zinc-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-50/5 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <CaretLeft size={11} weight="bold" /> Précédent
                </button>
                <button
                  type="button" onClick={close}
                  className="px-2.5 py-1.5 rounded-lg text-[0.7rem] font-medium text-zinc-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-50/5 transition"
                >
                  Fermer
                </button>
                <button
                  type="button" onClick={next}
                  className="inline-flex items-center gap-1 btn btn-primary text-[0.7rem] px-2.5 py-1.5"
                >
                  {step === steps.length - 1 ? 'Terminer' : 'Suivant'}
                  {step < steps.length - 1 && <CaretRight size={11} weight="bold" />}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

/** Trigger pill for the page header. */
export function TutorialTrigger({ onClick, label = 'Guide' }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[0.7rem] font-medium border border-stone-300 dark:border-stone-50/15 bg-white dark:bg-zinc-900 hover:bg-stone-100 dark:hover:bg-stone-50/5 text-zinc-700 dark:text-stone-300 transition"
      title="Ouvrir le guide de la page"
    >
      <Question size={12} weight="bold" /> {label}
    </button>
  )
}
