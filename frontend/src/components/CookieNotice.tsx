import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { CookieIcon, Info, X } from '@phosphor-icons/react'

/**
 * Lightweight transparency notice, not a consent banner - because we ship
 * zero non-essential traceurs (no analytics, no marketing, no
 * fingerprinting). Consent isn't required by the CNPD for strictly
 * necessary storage, but a visible "here's what we don't do" note both
 * builds trust and cleanly documents the policy for any RGPD audit.
 *
 * When we ever add analytics or marketing tools we upgrade this to a
 * full accept/refuse consent banner (both buttons at same visual level,
 * category granularity, 12-month re-collection - see CNPD cookies
 * guidelines Nov 2021).
 *
 * Ack is stored in localStorage as a timestamped ISO string and refreshed
 * every 12 months, matching CNPD Guidance §III.B.
 */
const STORAGE_KEY = 'rf_cookie_notice_ack'
const REFRESH_MONTHS = 12

function isAckStillValid(): boolean {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return false
    const ackedAt = new Date(raw)
    if (isNaN(ackedAt.getTime())) return false
    const now = new Date()
    const diffMonths = (now.getFullYear() - ackedAt.getFullYear()) * 12 + (now.getMonth() - ackedAt.getMonth())
    return diffMonths < REFRESH_MONTHS
  } catch {
    return true // localStorage disabled → don't nag the user
  }
}

export default function CookieNotice() {
  // Hydration-safe: false on server, real check on client mount so SSR
  // doesn't flash the banner before hydration decides.
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!isAckStillValid()) {
      // Slight delay so the banner doesn't compete with the page-transition
      // animation for the visitor's attention.
      const t = setTimeout(() => setOpen(true), 900)
      return () => clearTimeout(t)
    }
  }, [])

  const ack = () => {
    try { window.localStorage.setItem(STORAGE_KEY, new Date().toISOString()) } catch { /* private mode */ }
    setOpen(false)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          role="region"
          aria-label="Information sur les cookies"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{    opacity: 0, y: 16 }}
          transition={{ type: 'spring', stiffness: 200, damping: 26 }}
          className="fixed inset-x-3 bottom-3 z-50 md:inset-x-auto md:left-4 md:right-auto md:bottom-4 md:max-w-[440px]"
        >
          <div className="relative rounded-2xl bg-zinc-950 text-stone-100 border border-stone-50/10 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.06)] p-5 pr-4">
            <button
              type="button"
              onClick={ack}
              aria-label="Fermer le bandeau"
              className="absolute top-3 right-3 grid place-items-center w-7 h-7 rounded-lg text-stone-400 hover:text-stone-50 hover:bg-stone-50/5 transition-colors"
            >
              <X size={14} weight="bold" />
            </button>

            <div className="flex items-start gap-3">
              <span className="grid place-items-center w-9 h-9 rounded-xl bg-turf-800/50 border border-turf-300/25 text-turf-200 shrink-0">
                <CookieIcon size={16} weight="regular" />
              </span>
              <div className="min-w-0">
                <div className="text-[0.62rem] uppercase tracking-[0.22em] font-mono text-turf-300 mb-1">
                  Vie privée
                </div>
                <div className="font-display font-semibold text-sm text-stone-50">
                  Aucun cookie de suivi, aucune analytique.
                </div>
                <p className="mt-2 text-xs text-stone-400 leading-relaxed">
                  Nous n'utilisons que le stockage local strictement
                  nécessaire (préférence de thème, session admin). Aucun
                  cookie publicitaire, aucun tracker tiers, aucun profilage.
                  Voir la{' '}
                  <Link to="/cookies" className="text-turf-300 hover:text-turf-200 underline underline-offset-2">
                    politique cookies
                  </Link>
                  {' '}et la{' '}
                  <Link to="/confidentialite" className="text-turf-300 hover:text-turf-200 underline underline-offset-2">
                    politique de confidentialité
                  </Link>
                  {' '}pour le détail.
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={ack}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-stone-50 text-zinc-950 hover:bg-stone-200 text-xs font-semibold px-3.5 py-2 transition-colors"
                  >
                    Compris
                  </button>
                  <Link
                    to="/cookies"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-stone-50/15 text-stone-200 hover:bg-stone-50/5 text-xs font-medium px-3.5 py-2 transition-colors"
                  >
                    <Info size={12} weight="regular" />
                    En savoir plus
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
