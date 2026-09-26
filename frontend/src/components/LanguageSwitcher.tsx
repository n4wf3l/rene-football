import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'framer-motion'
import { CaretDown, Check, Translate } from '@phosphor-icons/react'
import { SUPPORTED_LOCALES, type SupportedLocale } from '../i18n'

interface LanguageSwitcherProps {
  /** Style variant: `chip` for the desktop navbar, `full` for the mobile drawer. */
  variant?: 'chip' | 'full'
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
 * i18next-browser-languagedetector's cache. Native `<select>` for the mobile
 * drawer; a custom dropdown for the desktop pill so the visual matches the
 * rest of the header.
 */
export default function LanguageSwitcher({ variant = 'chip' }: LanguageSwitcherProps) {
  const { i18n, t } = useTranslation()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const current = (i18n.resolvedLanguage ?? 'fr') as SupportedLocale

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current) return
      if (!rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('mousedown', onClick)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onClick)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const pick = (lng: SupportedLocale) => {
    void i18n.changeLanguage(lng)
    setOpen(false)
  }

  if (variant === 'full') {
    return (
      <label className="block">
        <span className="block text-[0.65rem] font-mono uppercase tracking-[0.16em] text-stone-400 mb-1">
          {t('language.label')}
        </span>
        <select
          value={current}
          onChange={(e) => pick(e.target.value as SupportedLocale)}
          className="w-full rounded-lg border border-stone-50/15 bg-zinc-900 text-stone-100 px-3 py-2 text-sm"
        >
          {SUPPORTED_LOCALES.map((lng) => (
            <option key={lng} value={lng}>{t(`language.${lng}` as const)}</option>
          ))}
        </select>
      </label>
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
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            className="absolute right-0 top-full mt-2 w-44 rounded-xl border border-stone-200 bg-white/95 backdrop-blur-xl shadow-diffusion dark:border-stone-50/10 dark:bg-zinc-950/95 overflow-hidden z-50"
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
