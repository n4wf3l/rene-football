import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { playerImage } from '../../lib/playerImage'
import type { Player } from '../../types/player'

interface RosterSheetProps {
  players: Player[]
  loading: boolean
}

/**
 * Roster as a numbered team sheet: one line per player, the name set large.
 * On desktop a sticky portrait follows the hovered / focused line; on mobile
 * every line carries its own thumbnail instead.
 */
function RosterSheet({ players, loading }: RosterSheetProps) {
  const { t } = useTranslation()
  const [active, setActive] = useState(0)
  const current = players[active] ?? players[0]

  if (loading && players.length === 0) {
    return (
      <div className="divide-y divide-stone-200 border-y border-stone-200 dark:divide-stone-50/10 dark:border-stone-50/10">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-6 py-7">
            <div className="h-4 w-8 animate-pulse bg-stone-200 dark:bg-zinc-800" />
            <div className="h-9 w-2/3 animate-pulse bg-stone-200 dark:bg-zinc-800" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-10 lg:grid-cols-12">
      <ol className="lg:col-span-8 border-t border-stone-300/70 dark:border-stone-50/10">
        {players.map((p, i) => (
          <li key={p.slug} className="border-b border-stone-300/70 dark:border-stone-50/10">
            <Link
              to={`/joueurs/${p.slug}`}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              className="group relative grid grid-cols-[auto_1fr_auto] items-center gap-4 py-5 sm:gap-6 lg:py-6 focus:outline-none focus-visible:bg-turf-50 dark:focus-visible:bg-turf-950/40"
            >
              <span className="flex items-center gap-4">
                <span className="w-7 font-mono text-xs tabular-nums text-zinc-400 transition-colors group-hover:text-turf-700 dark:text-stone-500 dark:group-hover:text-turf-300">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <img
                  src={playerImage(p)}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-14 w-11 object-cover object-top bg-stone-200 dark:bg-zinc-800 lg:hidden"
                />
              </span>
              <span className="min-w-0">
                <span className="block truncate font-display text-2xl font-semibold uppercase leading-none tracking-tight text-zinc-950 transition-[color,transform] duration-500 ease-premium group-hover:translate-x-2 group-hover:text-turf-700 dark:text-stone-50 dark:group-hover:text-turf-300 sm:text-4xl lg:text-5xl">
                  {p.name}
                </span>
                <span className="mt-2 block truncate text-sm text-zinc-500 dark:text-stone-400">
                  {[p.position, p.club].filter(Boolean).join(' · ')}
                </span>
              </span>
              <span className="flex items-center gap-4">
                {p.age > 0 && (
                  <span className="hidden font-mono text-xs tabular-nums text-zinc-500 dark:text-stone-400 sm:inline">
                    {p.age} {t('playerProfile.yearsUnit')}
                  </span>
                )}
                <ArrowUpRight
                  size={18}
                  weight="bold"
                  className="text-zinc-400 transition-[color,transform] duration-300 ease-premium group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-turf-700 dark:text-stone-500 dark:group-hover:text-turf-300"
                />
              </span>
            </Link>
          </li>
        ))}
      </ol>

      {current && (
        <div className="hidden lg:col-span-4 lg:block">
          <div className="sticky top-28">
            <div className="relative aspect-[3/4] overflow-hidden bg-gradient-to-b from-turf-900 to-zinc-950">
              <AnimatePresence initial={false}>
                <motion.img
                  key={current.slug}
                  src={playerImage(current)}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover object-[50%_18%]"
                  initial={{ clipPath: 'inset(0% 0% 100% 0%)' }}
                  animate={{ clipPath: 'inset(0% 0% 0% 0%)' }}
                  exit={{ opacity: 0, transition: { duration: 0.2, delay: 0.4 } }}
                  transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
                />
              </AnimatePresence>
              <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-zinc-950/80 to-transparent" />
              <div className="absolute bottom-4 left-4 font-mono text-[0.68rem] uppercase tracking-[0.22em] text-stone-50/90">
                {String(active + 1).padStart(2, '0')} · {current.club ?? ''}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RosterSheet
