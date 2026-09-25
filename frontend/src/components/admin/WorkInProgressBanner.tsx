import { Wrench, Info, X } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * Editorial "work in progress" banner used across admin sections that
 * ship functional but not final. Amber palette signals attention without
 * looking like a runtime error; the "Compris" dismiss stores its state in
 * localStorage so the operator isn't nagged every navigation.
 *
 * Ack key defaults per-instance so multiple banners can coexist without
 * dismissing each other.
 */
interface WorkInProgressBannerProps {
  /** Dismissal key stored in localStorage. Change bumps re-show the banner. */
  storageKey?: string
  /** Bold headline above the paragraph. */
  title?: string
  /** Descriptive text. */
  description?: string
  /** Compact "eyebrow" tag rendered inside the amber pill. */
  eyebrow?: string
  /** Force the banner to always render, even after dismissal. */
  persistent?: boolean
  className?: string
}

export default function WorkInProgressBanner({
  storageKey = 'admin_presentations_wip_v1',
  eyebrow = 'En travaux',
  title = 'Cette section est en cours de finalisation.',
  description = 'Le générateur de fiches marketing et son aperçu live sont fonctionnels mais évoluent encore - les palettes, mises en page et rendus PDF finaux peuvent changer à mesure que nous ajustons le template avec l\'agence.',
  persistent = false,
  className = '',
}: WorkInProgressBannerProps) {
  const [open, setOpen] = useState<boolean>(true)

  useEffect(() => {
    if (persistent) return
    try {
      const ack = window.localStorage.getItem(storageKey)
      if (ack === '1') setOpen(false)
    } catch { /* ignore */ }
  }, [storageKey, persistent])

  const dismiss = () => {
    try { window.localStorage.setItem(storageKey, '1') } catch { /* private mode */ }
    setOpen(false)
  }

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.aside
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{    opacity: 0, y: -8, height: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 26 }}
          className={`relative rounded-2xl border border-amber-300/70 dark:border-amber-500/30 bg-gradient-to-br from-amber-50 via-amber-50 to-amber-100/50 dark:from-amber-500/[0.08] dark:via-amber-500/[0.05] dark:to-amber-600/[0.03] p-5 lg:p-6 mb-6 overflow-hidden ${className}`}
        >
          {/* Decorative diagonal stripes - restrained, evokes construction */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-6 -right-6 w-40 h-40 opacity-25 dark:opacity-15"
            style={{
              backgroundImage: 'repeating-linear-gradient(45deg, currentColor 0px, currentColor 8px, transparent 8px, transparent 20px)',
              color: 'rgb(217 119 6)',
            }}
          />

          <div className="relative flex items-start gap-4">
            <span className="grid place-items-center w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-400/40 text-amber-800 dark:bg-amber-500/20 dark:border-amber-300/25 dark:text-amber-200 shrink-0">
              <Wrench size={20} weight="regular" />
            </span>

            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-2 mb-2">
                <span className="text-[0.6rem] uppercase tracking-[0.28em] font-mono font-semibold text-amber-800 dark:text-amber-300">
                  {eyebrow}
                </span>
                <span className="inline-block w-1 h-1 rounded-full bg-amber-500 dark:bg-amber-400 animate-pulse" />
              </div>
              <h2 className="font-display font-semibold text-base lg:text-lg tracking-tight text-amber-950 dark:text-amber-50">
                {title}
              </h2>
              <p className="mt-1.5 text-sm text-amber-900/85 dark:text-amber-200/85 leading-relaxed max-w-[70ch]">
                {description}
              </p>
              {!persistent && (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={dismiss}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-amber-900/90 hover:bg-amber-950 text-amber-50 dark:bg-amber-100 dark:hover:bg-amber-50 dark:text-amber-950 px-3.5 py-1.5 text-xs font-semibold transition-colors"
                  >
                    Compris, ne plus afficher
                  </button>
                  <span className="inline-flex items-center gap-1.5 text-[0.68rem] uppercase tracking-[0.18em] font-mono text-amber-800/70 dark:text-amber-300/70">
                    <Info size={10} weight="regular" />
                    Version bêta admin
                  </span>
                </div>
              )}
            </div>

            {!persistent && (
              <button
                type="button"
                onClick={dismiss}
                aria-label="Fermer"
                className="grid place-items-center w-8 h-8 rounded-lg text-amber-800/60 hover:text-amber-950 hover:bg-amber-500/10 dark:text-amber-300/60 dark:hover:text-amber-100 dark:hover:bg-amber-500/15 transition-colors shrink-0"
              >
                <X size={14} weight="bold" />
              </button>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
