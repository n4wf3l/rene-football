import type { ReactNode } from 'react'

interface StickySaveBarProps {
  /** The actions (Annuler, Enregistrer…), shown on the right. */
  children: ReactNode
  /** Optional status on the left ("Enregistré", a hint, an error count). */
  status?: ReactNode
  /**
   * How the bar reaches the edges of what it sits in:
   * - `page`: an admin page padded px-6 lg:px-10 (Réglages, article editor…)
   * - `card`: a form card padded p-6 (Partenaires)
   */
  inset?: 'page' | 'card'
}

const INSET = {
  page: '-mx-6 lg:-mx-10 px-6 lg:px-10 bg-stone-50/95 dark:bg-zinc-950/95',
  card: '-mx-6 -mb-6 px-6 rounded-b-2xl bg-white/95 dark:bg-zinc-900/95',
} as const

/**
 * Save bar that stays on screen while a long form scrolls: the save button
 * is always one click away, never at the bottom of the page. Every admin
 * form taller than the screen ends with one (see CLAUDE.md §2-bis).
 */
export default function StickySaveBar({ children, status, inset = 'page' }: StickySaveBarProps) {
  return (
    <div
      className={`sticky bottom-0 z-20 mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-stone-200 py-4 backdrop-blur dark:border-stone-50/10 ${INSET[inset]}`}
      style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
    >
      {status && <div className="mr-auto min-w-0">{status}</div>}
      {children}
    </div>
  )
}
