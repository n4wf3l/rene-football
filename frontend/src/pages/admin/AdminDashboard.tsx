import { useEffect, useMemo, useState } from 'react'
import type { Icon as PhosphorIcon } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowUpRight, ChartLineUp, SoccerBall, Trophy, Users } from '@phosphor-icons/react'
import { api } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import type { Player } from '../../types/player'

interface StatTileProps {
  icon: PhosphorIcon
  label: string
  value: number | string
  hint?: string
}

function StatTile({ icon: Icon, label, value, hint }: StatTileProps) {
  return (
    <div className="rounded-2xl bg-white border border-stone-200 dark:bg-zinc-900 dark:border-stone-50/8 p-5 shadow-diffusion">
      <div className="flex items-start justify-between">
        <span className="font-mono uppercase tracking-[0.18em] text-[0.65rem] text-zinc-500 dark:text-stone-400">
          {label}
        </span>
        <span className="grid place-items-center w-9 h-9 rounded-xl bg-turf-50 text-turf-700 dark:bg-turf-800/40 dark:text-turf-300">
          <Icon size={16} weight="duotone" />
        </span>
      </div>
      <div className="mt-4 font-display font-semibold text-3xl tracking-tight text-zinc-950 dark:text-stone-50 tabular-nums">
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-zinc-500 dark:text-stone-400">{hint}</div>}
    </div>
  )
}

interface PlayersResponse {
  data: Player[]
}

function AdminDashboard() {
  const { user } = useAuth()
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    api.get<PlayersResponse>('/admin/players', { auth: true })
      .then((res) => { if (!cancelled) setPlayers(res.data) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const stats = useMemo(() => {
    if (!players.length) return null
    const totalGoals = players.reduce((acc, p) => acc + (p.goals || 0), 0)
    const totalAssists = players.reduce((acc, p) => acc + (p.assists || 0), 0)
    const totalMatches = players.reduce((acc, p) => acc + (p.matches_played || 0), 0)
    const clubs = new Set(players.map((p) => p.club).filter(Boolean)).size
    const topScorer = [...players].sort((a, b) => (b.goals || 0) - (a.goals || 0))[0]
    const topAssist = [...players].sort((a, b) => (b.assists || 0) - (a.assists || 0))[0]
    return { totalGoals, totalAssists, totalMatches, clubs, topScorer, topAssist }
  }, [players])

  return (
    <div className="px-6 lg:px-10 py-10">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <span className="eyebrow">Tableau de bord</span>
        <h1 className="mt-2 font-display font-semibold text-3xl lg:text-4xl tracking-tight text-zinc-950 dark:text-stone-50">
          Bonjour {user?.name?.split(' ')[0] || 'René'} 👋
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-stone-400 max-w-prose">
          Vue d'ensemble de votre roster. Cliquez sur « Joueurs » pour mettre à jour
          les statistiques, ou sur « Data analyse » pour explorer les données.
        </p>
      </motion.div>

      {loading ? (
        <div className="mt-10 text-zinc-500 dark:text-stone-400 text-sm">Chargement…</div>
      ) : !stats ? (
        <div className="mt-10 text-zinc-500 dark:text-stone-400 text-sm">Aucun joueur dans la base.</div>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatTile icon={Users}       label="Joueurs"       value={players.length}    hint={`${stats.clubs} clubs représentés`} />
            <StatTile icon={SoccerBall}  label="Matchs joués"  value={stats.totalMatches} />
            <StatTile icon={Trophy}      label="Buts cumulés"  value={stats.totalGoals}  />
            <StatTile icon={ChartLineUp} label="Passes décisives" value={stats.totalAssists} />
          </div>

          <div className="mt-10 grid lg:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-zinc-950 text-stone-100 p-6">
              <div className="font-mono uppercase tracking-[0.18em] text-[0.65rem] text-turf-300 mb-3">
                Meilleur buteur
              </div>
              <div className="font-display font-semibold text-2xl">{stats.topScorer.name}</div>
              <div className="text-stone-400 text-sm mt-1">{stats.topScorer.club} · {stats.topScorer.position}</div>
              <div className="mt-4 flex gap-6">
                <div>
                  <div className="font-mono text-3xl text-stone-50 tabular-nums">{stats.topScorer.goals}</div>
                  <div className="text-xs text-stone-400 mt-0.5">Buts</div>
                </div>
                <div>
                  <div className="font-mono text-3xl text-stone-50 tabular-nums">{stats.topScorer.matches_played}</div>
                  <div className="text-xs text-stone-400 mt-0.5">Matchs</div>
                </div>
                <div>
                  <div className="font-mono text-3xl text-stone-50 tabular-nums">{Number(stats.topScorer.xg).toFixed(1)}</div>
                  <div className="text-xs text-stone-400 mt-0.5">xG</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white border border-stone-200 dark:bg-zinc-900 dark:border-stone-50/8 p-6">
              <div className="font-mono uppercase tracking-[0.18em] text-[0.65rem] text-zinc-500 dark:text-stone-400 mb-3">
                Meilleur passeur
              </div>
              <div className="font-display font-semibold text-2xl text-zinc-950 dark:text-stone-50">{stats.topAssist.name}</div>
              <div className="text-zinc-500 dark:text-stone-400 text-sm mt-1">{stats.topAssist.club} · {stats.topAssist.position}</div>
              <div className="mt-4 flex gap-6">
                <div>
                  <div className="font-mono text-3xl text-zinc-950 dark:text-stone-50 tabular-nums">{stats.topAssist.assists}</div>
                  <div className="text-xs text-zinc-500 dark:text-stone-400 mt-0.5">Passes D.</div>
                </div>
                <div>
                  <div className="font-mono text-3xl text-zinc-950 dark:text-stone-50 tabular-nums">{stats.topAssist.key_passes}</div>
                  <div className="text-xs text-zinc-500 dark:text-stone-400 mt-0.5">Passes clés</div>
                </div>
                <div>
                  <div className="font-mono text-3xl text-zinc-950 dark:text-stone-50 tabular-nums">{Number(stats.topAssist.xa).toFixed(1)}</div>
                  <div className="text-xs text-zinc-500 dark:text-stone-400 mt-0.5">xA</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link to="/admin/joueurs" className="btn btn-primary">
              Mettre à jour les stats
              <ArrowUpRight size={15} weight="bold" />
            </Link>
            <Link to="/admin/analyse" className="btn btn-outline">
              Ouvrir l'analyse
              <ArrowUpRight size={15} weight="bold" />
            </Link>
          </div>
        </>
      )}
    </div>
  )
}

export default AdminDashboard
