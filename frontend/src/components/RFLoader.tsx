import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

/* Page-size loaders currently on screen. The corner LoadingBadge stays
   hidden while one is visible, so the monogram never shows twice. */
let pageLoaders = 0
const pageLoaderListeners = new Set<(count: number) => void>()

export function subscribeToPageLoaders(fn: (count: number) => void): () => void {
  pageLoaderListeners.add(fn)
  fn(pageLoaders)
  return () => { pageLoaderListeners.delete(fn) }
}

function setPageLoaders(next: number): void {
  pageLoaders = next
  pageLoaderListeners.forEach((fn) => fn(pageLoaders))
}

/** From this size on, the loader counts as the page's main loader. */
const PAGE_LOADER_MIN_SIZE = 48

/* Layer colors: `brand` for page surfaces (follows light/dark), `light`
   for a white monogram on a colored surface such as the blue buttons. */
const TONES = {
  brand: {
    ghost: 'bg-zinc-300/80 dark:bg-zinc-700/80',
    ink: 'bg-turf-700 dark:bg-turf-400',
    sheen: 'via-white/70 dark:via-white/45',
  },
  light: {
    ghost: 'bg-white/25',
    ink: 'bg-stone-50',
    sheen: 'via-turf-200/90',
  },
} as const

export interface RFLoaderProps {
  /** Width/height of the monogram in px. */
  size?: number
  /**
   * Caption under the mark. `undefined` shows the generic "Chargement…",
   * `null` hides it (the label stays available to screen readers).
   */
  label?: string | null
  /** Wait this long before appearing, so fast loads never flash a loader. */
  delay?: number
  /** Loading finished: the ink fills the whole monogram instead of looping. */
  done?: boolean
  tone?: keyof typeof TONES
  /**
   * Hide the corner LoadingBadge while this loader is on screen. On by
   * default for page-size loaders; set it on a small loader that already
   * shows the wait (a submit button), so the monogram never shows twice.
   */
  hidesBadge?: boolean
  className?: string
}

/**
 * Animated Rene Football monogram, shown while data loads.
 *
 * The RF logo is used as a mask over three layers: a ghost tint of the
 * letters, a brand-blue "ink" that writes the monogram from left to right
 * then wipes away, and a light sheen running along the slant of the
 * letters. Pure CSS animations on transform only (see index.css,
 * "RF loader"), so it stays smooth while the page is busy; light and dark
 * themes are handled by the layer colors, reduced motion by a calm pulse.
 */
export default function RFLoader({
  size = 56,
  label,
  delay = 0,
  done = false,
  tone = 'brand',
  hidesBadge,
  className = '',
}: RFLoaderProps) {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(delay <= 0)

  useEffect(() => {
    if (delay <= 0) return
    const id = window.setTimeout(() => setVisible(true), delay)
    return () => window.clearTimeout(id)
  }, [delay])

  const isPageLoader = visible && (hidesBadge ?? size >= PAGE_LOADER_MIN_SIZE)
  useEffect(() => {
    if (!isPageLoader) return
    setPageLoaders(pageLoaders + 1)
    return () => setPageLoaders(Math.max(0, pageLoaders - 1))
  }, [isPageLoader])

  if (!visible) return null

  const caption = label === undefined ? t('common.loading') : label
  const colors = TONES[tone]

  return (
    <div
      role="status"
      aria-live="polite"
      className={`rf-loader inline-flex flex-col items-center gap-3 ${className}`}
    >
      <span
        aria-hidden="true"
        data-done={done ? 'true' : undefined}
        className="rf-loader-mark relative block overflow-hidden"
        style={{ width: size, height: size }}
      >
        <span className={`absolute inset-0 ${colors.ghost}`} />
        <span className={`rf-loader-ink absolute inset-0 ${colors.ink}`} />
        <span className={`rf-loader-sheen absolute inset-y-0 left-0 w-2/5 bg-gradient-to-r from-transparent to-transparent ${colors.sheen}`} />
      </span>
      {caption ? (
        <span className="text-[0.68rem] font-mono uppercase tracking-[0.24em] text-zinc-500 dark:text-stone-400">
          {caption}
        </span>
      ) : (
        <span className="sr-only">{t('common.loading')}</span>
      )}
    </div>
  )
}
