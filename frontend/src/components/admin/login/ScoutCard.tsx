import { memo, useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import type { Player } from '../../../types/player'
import { playerImage } from '../../../lib/playerImage'

/**
 * "Fiche en direct": cycles through the agency's published players, as a
 * live scouting feed would. Real public data only (the same fields as the
 * public /joueurs page); zero values are hidden, like everywhere else.
 */

const CYCLE_MS = 4500

interface ScoutCardProps {
  players: Player[]
}

function ScoutCardBase({ players }: ScoutCardProps) {
  const reduce = useReducedMotion()
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (reduce || players.length < 2) return
    const timer = setInterval(() => setIndex((i) => (i + 1) % players.length), CYCLE_MS)
    return () => clearInterval(timer)
  }, [players.length, reduce])

  const player = players[index % Math.max(players.length, 1)]
  if (!player) return null

  const stats = [
    { label: 'Matchs', value: player.matches_played },
    { label: 'Buts', value: player.goals },
    { label: 'Passes D.', value: player.assists },
  ].filter((s) => Number(s.value ?? 0) > 0)

  return (
    <div className="w-[300px] rounded-2xl border border-stone-50/10 bg-zinc-950/70 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_30px_60px_-30px_rgba(2,6,23,0.9)] overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <span className="inline-flex items-center gap-1.5 font-mono text-[0.6rem] uppercase tracking-[0.22em] text-turf-300">
          <span className="w-1.5 h-1.5 rounded-full bg-turf-300 animate-pulse" />
          Fiche en direct
        </span>
        <span className="font-mono text-[0.6rem] tabular-nums text-stone-500">
          {String(index + 1).padStart(2, '0')} / {String(players.length).padStart(2, '0')}
        </span>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={player.slug}
          initial={{ opacity: 0, x: 18 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -18 }}
          transition={{ type: 'spring', stiffness: 220, damping: 26 }}
          className="flex gap-3 px-4 pb-4"
        >
          <img
            src={playerImage(player)}
            alt=""
            className="w-16 h-20 rounded-lg object-cover object-top bg-zinc-900 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="font-display font-semibold text-stone-50 leading-tight truncate">{player.name}</div>
            <div className="mt-0.5 text-[0.72rem] text-stone-400 truncate">
              {[player.position, player.club].filter(Boolean).join(' · ')}
            </div>
            {stats.length > 0 && (
              <dl className="mt-2.5 flex gap-4">
                {stats.map((s) => (
                  <div key={s.label}>
                    <dt className="font-mono text-[0.55rem] uppercase tracking-[0.16em] text-stone-500">{s.label}</dt>
                    <dd className="font-mono text-sm tabular-nums text-stone-100">{s.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

const ScoutCard = memo(ScoutCardBase)
export default ScoutCard
