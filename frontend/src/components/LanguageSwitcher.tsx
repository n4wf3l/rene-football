import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'framer-motion'
import { CaretDown, Check, Translate, X } from '@phosphor-icons/react'
import { SUPPORTED_LOCALES, type SupportedLocale } from '../i18n'

interface LanguageSwitcherProps {
  /** Style variant: `chip` for the desktop navbar, `full` for the mobile drawer. */
  variant?: 'chip' | 'full'
  /** Chip-only : whether the dropdown opens below (default) or above the
   *  trigger. Use `up` when the switcher sits in a sidebar footer so the
   *  menu doesn't overflow the viewport bottom. */
  direction?: 'down' | 'up'
}

const SHORT_CODE: Record<SupportedLocale, string> = {
  fr: 'FR',
  en: 'EN',
  de: 'DE',
  lb: 'LB',
  nl: 'NL',
}

/**
 * Small language picker used in the navbar. Persists to localStorage via
 * i18next-browser-languagedetector's cache.
 *
 *   - `chip` : compact desktop dropdown next to the primary nav.
 *   - `full` : mobile drawer trigger that opens a fullscreen picker so each
 *              language becomes a large tap target (5 x ~72 px cards) instead
 *              of a native `<select>` sheet that hides the visual identity.
 */
export default function LanguageSwitcher({ variant = 'chip', direction = 'down' }: LanguageSwitcherProps) {
  const { i18n, t } = useTranslation()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const current = (i18n.resolvedLanguage ?? 'fr') as SupportedLocale

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current) return
      // The fullscreen picker uses a portal so the ref click-check would
      // always fire outside; escape via key is enough and the backdrop
      // handles its own dismiss.
      if (variant === 'full') return
      if (!rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('mousedown', onClick)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onClick)
      window.removeEventListener('keydown', onKey)
    }
  }, [open, variant])

  // Lock body scroll while the fullscreen picker is open so the drawer
  // underneath doesn't rubber-band on iOS Safari.
  useEffect(() => {
    if (variant !== 'full' || !open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [variant, open])

  const pick = (lng: SupportedLocale) => {
    void i18n.changeLanguage(lng)
    setOpen(false)
  }

  if (variant === 'full') {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={open}
          className="w-full flex items-center justify-between gap-3 rounded-xl border border-stone-50/15 bg-zinc-900 hover:bg-stone-50/5 px-4 py-3 text-left transition-colors"
        >
          <span className="flex items-center gap-3 min-w-0">
            <span className="grid place-items-center w-8 h-8 rounded-lg bg-stone-50/5 text-turf-300 shrink-0">
              <Translate size={14} weight="regular" />
            </span>
            <span className="min-w-0">
              <span className="block text-[0.6rem] font-mono uppercase tracking-[0.18em] text-stone-400 mb-0.5">
                {t('language.label')}
              </span>
              <span className="block text-base text-stone-100 font-medium truncate">
                {t(`language.${current}` as const)}
              </span>
            </span>
          </span>
          <span className="inline-flex items-center gap-2 shrink-0">
            <span className="font-mono text-[0.65rem] tracking-wider text-stone-400 tabular-nums">
              {SHORT_CODE[current]}
            </span>
            <CaretDown size={12} weight="bold" className="text-stone-400" />
          </span>
        </button>

        {typeof document !== 'undefined' && createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                key="lang-fullscreen"
                role="dialog"
                aria-modal="true"
                aria-label={t('language.label')}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-[70] bg-zinc-950/95 backdrop-blur-xl flex flex-col"
              >
                {/* Header row: title + close */}
                <div
                  className="flex items-center justify-between px-4 sm:px-6 pt-4 pb-3 border-b border-stone-50/10"
                  style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top))' }}
                >
                  <div>
                    <div className="text-[0.65rem] font-mono uppercase tracking-[0.22em] text-turf-300">
                      {t('language.label')}
                    </div>
                    <div className="mt-1 font-display font-semibold text-lg text-stone-50">
                      {t('language.chooseLabel', 'Choisissez votre langue')}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label={t('cookieNotice.closeAria', 'Fermer')}
                    className="grid place-items-center w-11 h-11 rounded-xl text-stone-300 hover:text-stone-50 hover:bg-stone-50/10 transition-colors"
                  >
                    <X size={18} weight="bold" />
                  </button>
                </div>

                {/* Scrollable list of language cards */}
                <ul
                  className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-3"
                  style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
                >
                  {SUPPORTED_LOCALES.map((lng) => {
                    const active = lng === current
                    return (
                      <li key={lng}>
                        <motion.button
                          type="button"
                          onClick={() => pick(lng)}
                          role="option"
                          aria-selected={active}
                          whileTap={{ scale: 0.985 }}
                          className={`w-full flex items-center justify-between gap-4 rounded-2xl px-5 py-4 text-left transition-colors ${
                            active
                              ? 'bg-turf-800/40 border border-turf-300/40 text-stone-50'
                              : 'bg-stone-50/5 border border-stone-50/10 text-stone-200 hover:bg-stone-50/10'
                          }`}
                        >
                          <span className="min-w-0">
                            <div className="font-display font-semibold text-lg">
                              {t(`language.${lng}` as const)}
                            </div>
                            <div className="mt-0.5 text-xs font-mono uppercase tracking-[0.18em] text-stone-400">
                              {SHORT_CODE[lng]}
                            </div>
                          </span>
                          {active && (
                            <span className="grid place-items-center w-8 h-8 rounded-full bg-turf-500/25 text-turf-300 shrink-0">
                              <Check size={14} weight="bold" />
                            </span>
                          )}
                        </motion.button>
                      </li>
                    )
                  })}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
      </>
    )
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t('language.label')}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="group relative inline-flex items-center gap-1 h-9 px-2.5 rounded-full text-xs font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-900/5 dark:text-stone-400 dark:hover:text-stone-50 dark:hover:bg-stone-50/5 transition-colors"
      >
        <Translate size={13} weight="regular" />
        <span className="font-mono tracking-wider">{SHORT_CODE[current]}</span>
        <CaretDown size={9} weight="bold" className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            aria-label={t('language.label')}
            initial={{ opacity: 0, y: direction === 'up' ? 6 : -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: direction === 'up' ? 6 : -6, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            className={`absolute right-0 w-44 rounded-xl border border-stone-200 bg-white/95 backdrop-blur-xl shadow-diffusion dark:border-stone-50/10 dark:bg-zinc-950/95 overflow-hidden z-50 ${
              direction === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'
            }`}
          >
            {SUPPORTED_LOCALES.map((lng) => {
              const active = lng === current
              return (
                <li key={lng}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => pick(lng)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left transition-colors ${
                      active
                        ? 'bg-turf-50 text-turf-800 dark:bg-turf-800/20 dark:text-turf-200'
                        : 'text-zinc-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-50/5'
                    }`}
                  >
                    <span>{t(`language.${lng}` as const)}</span>
                    {active && <Check size={13} weight="bold" />}
                  </button>
                </li>
              )
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
