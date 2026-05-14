import { useEffect, useMemo, useState } from 'react'
import type { Icon as PhosphorIcon } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  ArrowUpRight,
  Binoculars,
  ChartLineUp,
  CheckCircle,
  ClipboardText,
  ClockClockwise,
  FilePlus,
  HandWaving,
  Newspaper,
  PencilSimpleLine,
  Plus,
  Pulse,
  SealCheck,
  SoccerBall,
  Sparkle,
  Trophy,
  UserCirclePlus,
  Users,
  Warning,
  WarningCircle,
} from '@phosphor-icons/react'
import { api } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import type { Player } from '../../types/player'
import type { ScoutingDashboardSnapshot } from '../../types/scouting'
import Skeleton from '../../components/Skeleton'

interface PlayersResponse {
  data: Player[]
}

/* ─────────────────────────── Helpers ─────────────────────────── */

function formatRelative(iso?: string | null): string {
  if (!iso) return '—'
  const date = new Date(iso)
  const now = Date.now()
  const diff = Math.max(0, now - date.getTime())
  const minutes = Math.round(diff / 60_000)
  if (minutes < 1) return 'à l\'instant'
  if (minutes < 60) return `il y a ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `il y a ${hours}h`
  const days = Math.round(hours / 24)
  if (days === 1) return 'hier'
  if (days < 7) return `il y a ${days} jours`
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

function startOfMonth(): number {
  const d = new Date()
  d.setDate(1); d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function lastName(full?: string | null): string {
  if (!full) return '—'
  const parts = full.trim().split(/\s+/)
  return parts.length > 1 ? parts.slice(-1)[0] : parts[0]
}

/* Shared typography tokens — used everywhere to avoid drift. */
const EYEBROW = 'font-mono uppercase tracking-[0.12em] text-[0.62rem] text-zinc-500 dark:text-stone-400'
const META    = 'text-[0.72rem] text-zinc-500 dark:text-stone-400'

/* ─────────────────────────── KPI tile ─────────────────────────── */

type BadgeTone = 'turf' | 'amber' | 'neutral'

interface StatTileProps {
  icon: PhosphorIcon
  label: string
  value: number | string
  hint?: string
  sub?: string
  badge?: { text: string; tone: BadgeTone }
}

const BADGE_TONES: Record<BadgeTone, string> = {
  turf:    'bg-turf-50 text-turf-700 border border-turf-200/70 dark:bg-turf-900/30 dark:text-turf-200 dark:border-turf-400/20',
  amber:   'bg-amber-50 text-amber-700 border border-amber-200/70 dark:bg-amber-500/10 dark:text-amber-200 dark:border-amber-400/20',
  neutral: 'bg-stone-100 text-zinc-600 border border-stone-200 dark:bg-stone-50/[0.06] dark:text-stone-300 dark:border-stone-50/10',
}

function StatTile({ icon: Icon, label, value, hint, sub, badge }: StatTileProps) {
  return (
    <div className="rounded-2xl bg-white border border-stone-200/70 dark:bg-zinc-900/60 dark:border-stone-50/[0.06] p-5 hover:border-turf-300/40 dark:hover:border-turf-400/20 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <span className={EYEBROW}>{label}</span>
        <span className="grid place-items-center w-8 h-8 rounded-lg bg-turf-50 text-turf-700 dark:bg-turf-900/35 dark:text-turf-300">
          <Icon size={15} weight="duotone" />
        </span>
      </div>
      <div className="mt-3 font-display font-semibold text-[2rem] leading-none tracking-tight text-zinc-950 dark:text-stone-50 tabular-nums">
        {value}
      </div>
      {hint && (
        <div className="mt-2 text-xs text-zinc-600 dark:text-stone-300">{hint}</div>
      )}
      {(sub || badge) && (
        <div className="mt-2.5 flex items-center justify-between gap-2">
          {sub
            ? <span className={`${META} truncate`}>{sub}</span>
            : <span />}
          {badge && (
            <span className={`text-[0.625rem] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-md ${BADGE_TONES[badge.tone]}`}>
              {badge.text}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

/* ───────────────────── Priority row primitive ───────────────────── */

type PriorityTone = 'amber' | 'rose' | 'turf' | 'neutral'

interface PriorityItem {
  tone: PriorityTone
  label: string
  target: string
  status: string
  to: string
  cta: string
}

const PRIORITY_DOT: Record<PriorityTone, string> = {
  amber:   'bg-amber-500',
  rose:    'bg-rose-500',
  turf:    'bg-turf-500',
  neutral: 'bg-stone-400 dark:bg-stone-500',
}

function PriorityRow({ item }: { item: PriorityItem }) {
  return (
    <Link
      to={item.to}
      className="group flex items-center gap-3 px-4 py-3 border-t border-stone-200/60 dark:border-stone-50/[0.05] first:border-t-0 hover:bg-stone-50 dark:hover:bg-stone-50/[0.025] transition-colors"
    >
      <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[item.tone]} shrink-0`} />
      <div className="flex-1 min-w-0">
        <div className="text-sm text-zinc-900 dark:text-stone-100 font-medium truncate">
          {item.label}
        </div>
        <div className="text-[0.72rem] text-zinc-600 dark:text-stone-400 truncate">
          {item.target} <span className="opacity-50">·</span> {item.status}
        </div>
      </div>
      <span className="hidden sm:inline-flex items-center gap-1 text-[0.7rem] font-mono uppercase tracking-[0.1em] text-zinc-500 group-hover:text-turf-700 dark:text-stone-400 dark:group-hover:text-turf-200 transition-colors shrink-0">
        {item.cta}
        <ArrowRight size={11} weight="bold" className="transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  )
}

/* ───────────────────── Activity row primitive ───────────────────── */

type ActivityKind = 'rapport' | 'stats' | 'profil' | 'alerte' | 'analyse' | 'scouting'

const ACTIVITY_META: Record<ActivityKind, { icon: PhosphorIcon; badge: string; tone: string; iconTone: string }> = {
  rapport:  { icon: SealCheck,         badge: 'Rapport',  tone: 'text-turf-700 dark:text-turf-200 bg-turf-50 dark:bg-turf-900/30 border-turf-200/70 dark:border-turf-400/20', iconTone: 'bg-turf-50 text-turf-700 dark:bg-turf-900/35 dark:text-turf-200' },
  stats:    { icon: PencilSimpleLine,  badge: 'Stats',    tone: 'text-zinc-700 dark:text-stone-200 bg-stone-100 dark:bg-stone-50/[0.06] border-stone-200 dark:border-stone-50/10', iconTone: 'bg-stone-100 text-zinc-600 dark:bg-stone-50/[0.06] dark:text-stone-200' },
  profil:   { icon: UserCirclePlus,    badge: 'Profil',   tone: 'text-turf-700 dark:text-turf-200 bg-turf-50 dark:bg-turf-900/30 border-turf-200/70 dark:border-turf-400/20', iconTone: 'bg-turf-50 text-turf-700 dark:bg-turf-900/35 dark:text-turf-200' },
  alerte:   { icon: WarningCircle,     badge: 'Alerte',   tone: 'text-amber-700 dark:text-amber-200 bg-amber-50 dark:bg-amber-500/10 border-amber-200/70 dark:border-amber-400/20', iconTone: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200' },
  analyse:  { icon: ChartLineUp,       badge: 'Analyse',  tone: 'text-zinc-700 dark:text-stone-200 bg-stone-100 dark:bg-stone-50/[0.06] border-stone-200 dark:border-stone-50/10', iconTone: 'bg-stone-100 text-zinc-600 dark:bg-stone-50/[0.06] dark:text-stone-200' },
  scouting: { icon: Binoculars,        badge: 'Scouting', tone: 'text-turf-700 dark:text-turf-200 bg-turf-50 dark:bg-turf-900/30 border-turf-200/70 dark:border-turf-400/20', iconTone: 'bg-turf-50 text-turf-700 dark:bg-turf-900/35 dark:text-turf-200' },
}

interface ActivityItem {
  kind: ActivityKind
  text: string
  meta: string
  to?: string
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const meta = ACTIVITY_META[item.kind]
  const Icon = meta.icon
  const content = (
    <>
      <span className={`grid place-items-center w-7 h-7 rounded-lg shrink-0 ${meta.iconTone}`}>
        <Icon size={13} weight="duotone" />
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-zinc-900 dark:text-stone-100 truncate">{item.text}</div>
        <div className="text-[0.72rem] text-zinc-500 dark:text-stone-400 font-mono">{item.meta}</div>
      </div>
      <span className={`hidden sm:inline-flex shrink-0 text-[0.6rem] font-mono uppercase tracking-[0.1em] px-1.5 py-0.5 rounded-md border ${meta.tone}`}>
        {meta.badge}
      </span>
    </>
  )
  return item.to ? (
    <Link to={item.to} className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50 dark:hover:bg-stone-50/[0.025] transition-colors">
      {content}
    </Link>
  ) : (
    <div className="flex items-center gap-3 px-4 py-3">{content}</div>
  )
}

/* ───────────────────── Leader card primitive ───────────────────── */

interface LeaderCardProps {
  eyebrow: string
  player: Player
  primary: { value: string | number; label: string }
  secondary: { value: string | number; label: string }
  tertiary: { value: string | number; label: string }
  summary: string
  variant: 'dark' | 'light'
}

function LeaderCard({ eyebrow, player, primary, secondary, tertiary, summary, variant }: LeaderCardProps) {
  const isDark = variant === 'dark'
  const wrap = isDark
    ? 'rounded-2xl bg-zinc-950 text-stone-100 p-6 border border-stone-50/[0.04] relative overflow-hidden'
    : 'rounded-2xl bg-white text-zinc-900 dark:bg-zinc-900/60 dark:text-stone-100 p-6 border border-stone-200/70 dark:border-stone-50/[0.06] relative overflow-hidden'
  const eyebrowClass = isDark
    ? 'font-mono uppercase tracking-[0.12em] text-[0.62rem] text-turf-300'
    : 'font-mono uppercase tracking-[0.12em] text-[0.62rem] text-turf-700 dark:text-turf-200'
  const subText = isDark
    ? 'text-stone-400'
    : 'text-zinc-600 dark:text-stone-300'
  const numberText = isDark
    ? 'font-mono text-[1.65rem] leading-none text-stone-50 tabular-nums'
    : 'font-mono text-[1.65rem] leading-none text-zinc-950 dark:text-stone-50 tabular-nums'
  const labelText = isDark
    ? 'text-[0.65rem] uppercase tracking-[0.1em] text-stone-400 mt-1.5'
    : 'text-[0.65rem] uppercase tracking-[0.1em] text-zinc-500 dark:text-stone-400 mt-1.5'
  const link = isDark
    ? 'inline-flex items-center gap-1.5 mt-5 text-[0.72rem] font-mono uppercase tracking-[0.1em] text-turf-300 hover:text-turf-200 transition-colors'
    : 'inline-flex items-center gap-1.5 mt-5 text-[0.72rem] font-mono uppercase tracking-[0.1em] text-turf-700 hover:text-turf-600 dark:text-turf-200 dark:hover:text-turf-100 transition-colors'

  return (
    <div className={wrap}>
      {isDark && (
        <span
          aria-hidden
          className="pointer-events-none absolute -top-12 -right-12 w-48 h-48 rounded-full bg-turf-500/10 blur-3xl"
        />
      )}
      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <span className={eyebrowClass}>{eyebrow}</span>
          <span className={`inline-flex items-center gap-1 text-[0.6rem] font-mono uppercase tracking-[0.1em] px-1.5 py-0.5 rounded-md ${
            isDark
              ? 'bg-turf-500/15 text-turf-200 border border-turf-400/20'
              : 'bg-turf-50 text-turf-700 border border-turf-200/70 dark:bg-turf-900/30 dark:text-turf-200 dark:border-turf-400/20'
          }`}>
            <Pulse size={10} weight="bold" />
            Top roster
          </span>
        </div>
        <div className={`mt-3 font-display font-semibold text-2xl tracking-tight ${isDark ? 'text-stone-50' : 'text-zinc-950 dark:text-stone-50'}`}>
          {player.name}
        </div>
        <div className={`text-sm mt-1 ${subText}`}>
          {player.club || '—'} <span className="opacity-50">·</span> {player.position}
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3">
          <div>
            <div className={numberText}>{primary.value}</div>
            <div className={labelText}>{primary.label}</div>
          </div>
          <div>
            <div className={numberText}>{secondary.value}</div>
            <div className={labelText}>{secondary.label}</div>
          </div>
          <div>
            <div className={numberText}>{tertiary.value}</div>
            <div className={labelText}>{tertiary.label}</div>
          </div>
        </div>
        <p className={`mt-5 text-[0.78rem] italic max-w-[42ch] ${subText}`}>
          « {summary} »
        </p>
        <Link to={`/admin/joueurs/${player.slug}/edit`} className={link}>
          Ouvrir le profil
          <ArrowUpRight size={12} weight="bold" />
        </Link>
      </div>
    </div>
  )
}

/* ─────────────────────────── Page ─────────────────────────── */

function AdminDashboard() {
  const { user } = useAuth()
  const [players, setPlayers] = useState<Player[]>([])
  const [scouting, setScouting] = useState<ScoutingDashboardSnapshot | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.allSettled([
      api.get<PlayersResponse>('/admin/players', { auth: true }),
      api.get<ScoutingDashboardSnapshot>('/admin/scouting/dashboard', { auth: true }),
    ]).then(([pRes, sRes]) => {
      if (cancelled) return
      if (pRes.status === 'fulfilled') setPlayers(pRes.value.data)
      if (sRes.status === 'fulfilled') setScouting(sRes.value)
    }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const stats = useMemo(() => {
    if (!players.length) return null
    const totalGoals = players.reduce((acc, p) => acc + (p.goals || 0), 0)
    const totalAssists = players.reduce((acc, p) => acc + (p.assists || 0), 0)
    const totalMatches = players.reduce((acc, p) => acc + (p.matches_played || 0), 0)
    const totalKeyPasses = players.reduce((acc, p) => acc + (p.key_passes || 0), 0)
    const clubs = new Set(players.map((p) => p.club).filter(Boolean)).size
    const topScorer = [...players].sort((a, b) => (b.goals || 0) - (a.goals || 0))[0]
    const topAssist = [...players].sort((a, b) => (b.assists || 0) - (a.assists || 0))[0]
    const goalsPerMatch = totalMatches > 0 ? (totalGoals / totalMatches).toFixed(2) : '0.00'
    const monthStart = startOfMonth()
    const addedThisMonth = players.filter((p) => p.created_at && new Date(p.created_at).getTime() >= monthStart).length
    const updatedRecently = players.filter((p) => p.updated_at && (Date.now() - new Date(p.updated_at).getTime()) < 7 * 86_400_000).length
    const xgVsGoals = topScorer.goals && topScorer.xg ? (topScorer.goals - topScorer.xg) : 0
    const lastUpdatedTs = Math.max(...players.map((p) => p.updated_at ? new Date(p.updated_at).getTime() : 0))
    return {
      totalGoals, totalAssists, totalMatches, totalKeyPasses, clubs,
      topScorer, topAssist, goalsPerMatch, addedThisMonth, updatedRecently, xgVsGoals,
      lastUpdatedTs,
    }
  }, [players])

  /* Build priority rows from real data — Player gaps + scouting backend. */
  const priorities = useMemo<PriorityItem[]>(() => {
    if (!stats) return []
    const list: PriorityItem[] = []

    const incompleteStats = players.filter((p) => (p.matches_played || 0) === 0 || (p.minutes_played || 0) === 0)
    if (incompleteStats.length > 0) {
      list.push({
        tone: 'amber',
        label: 'Statistiques à compléter',
        target: `${incompleteStats.length} joueur${incompleteStats.length > 1 ? 's' : ''} sans match enregistré`,
        status: 'À traiter',
        to: '/admin/joueurs',
        cta: 'Mettre à jour',
      })
    }

    const missingProfile = players.filter((p) => !p.bio || !p.photo_url)
    if (missingProfile.length > 0) {
      list.push({
        tone: 'neutral',
        label: 'Profils à compléter',
        target: `${missingProfile.length} fiche${missingProfile.length > 1 ? 's' : ''} sans bio ou photo`,
        status: 'Détails manquants',
        to: '/admin/joueurs',
        cta: 'Compléter',
      })
    }

    const oldUpdates = players.filter((p) => p.updated_at && (Date.now() - new Date(p.updated_at).getTime()) > 30 * 86_400_000)
    if (oldUpdates.length > 0) {
      list.push({
        tone: 'neutral',
        label: 'Données à vérifier',
        target: `${oldUpdates.length} fiche${oldUpdates.length > 1 ? 's' : ''} non mises à jour depuis 30 j.`,
        status: 'À revoir',
        to: '/admin/joueurs',
        cta: 'Vérifier',
      })
    }

    if (scouting) {
      if (scouting.kpi.reports_to_validate > 0) {
        list.push({
          tone: 'rose',
          label: 'Rapports scouting à valider',
          target: `${scouting.kpi.reports_to_validate} rapport${scouting.kpi.reports_to_validate > 1 ? 's' : ''} soumis`,
          status: 'En attente',
          to: '/admin/scouting?view=reports',
          cta: 'Ouvrir scouting',
        })
      }
      if (scouting.kpi.players_no_next_action > 0) {
        list.push({
          tone: 'amber',
          label: 'Joueurs sans prochaine action',
          target: `${scouting.kpi.players_no_next_action} profil${scouting.kpi.players_no_next_action > 1 ? 's' : ''} sans étape suivante`,
          status: 'Action à définir',
          to: '/admin/scouting?view=players',
          cta: 'Assigner',
        })
      }
      if (scouting.kpi.files_incomplete > 0) {
        list.push({
          tone: 'neutral',
          label: 'Dossiers incomplets',
          target: `${scouting.kpi.files_incomplete} fiche${scouting.kpi.files_incomplete > 1 ? 's' : ''} sous le seuil de complétude`,
          status: 'À enrichir',
          to: '/admin/scouting?view=intelligence',
          cta: 'Voir alertes',
        })
      }
    }

    return list.slice(0, 5)
  }, [players, stats, scouting])

  /* Recent activity feed — fusionne 5 sources réelles avec types variés. */
  const activities = useMemo<ActivityItem[]>(() => {
    if (!stats) return []
    type Evt = ActivityItem & { ts: number }
    const events: Evt[] = []

    /* 1. Validated scouting reports */
    scouting?.recent_reports?.forEach((r) => {
      if (r.status === 'validated') {
        events.push({
          kind: 'rapport',
          text: `Rapport scouting validé — ${r.player?.name ?? 'joueur inconnu'}`,
          meta: formatRelative(r.validated_at ?? r.updated_at ?? r.created_at),
          to: '/admin/scouting?view=reports',
          ts: new Date(r.validated_at ?? r.updated_at ?? r.created_at).getTime(),
        })
      } else if (r.status === 'submitted') {
        events.push({
          kind: 'scouting',
          text: `Rapport soumis — ${r.player?.name ?? 'joueur inconnu'}`,
          meta: formatRelative(r.updated_at ?? r.created_at),
          to: '/admin/scouting?view=reports',
          ts: new Date(r.updated_at ?? r.created_at).getTime(),
        })
      }
    })

    /* 2. Newly added profiles this month */
    const monthStart = startOfMonth()
    players
      .filter((p) => p.created_at && new Date(p.created_at).getTime() >= monthStart)
      .sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime())
      .slice(0, 2)
      .forEach((p) => {
        events.push({
          kind: 'profil',
          text: `Nouveau profil ajouté — ${p.name}`,
          meta: formatRelative(p.created_at),
          to: `/admin/joueurs/${p.slug}/edit`,
          ts: new Date(p.created_at!).getTime(),
        })
      })

    /* 3. Recent stat updates (most recent updated_at distinct from created_at) */
    players
      .filter((p) => p.updated_at && p.created_at && new Date(p.updated_at).getTime() > new Date(p.created_at).getTime() + 1000)
      .sort((a, b) => new Date(b.updated_at!).getTime() - new Date(a.updated_at!).getTime())
      .slice(0, 2)
      .forEach((p) => {
        events.push({
          kind: 'stats',
          text: `Statistiques mises à jour — ${p.name}`,
          meta: formatRelative(p.updated_at),
          to: `/admin/joueurs/${p.slug}/edit`,
          ts: new Date(p.updated_at!).getTime(),
        })
      })

    /* 4. Incomplete-file alerts surfaced from scouting */
    scouting?.alerts?.incomplete_files?.slice(0, 1).forEach((p) => {
      events.push({
        kind: 'alerte',
        text: `Dossier incomplet détecté — ${p.name}`,
        meta: 'détecté aujourd\'hui',
        to: '/admin/scouting?view=intelligence',
        ts: Date.now() - 2 * 60 * 60_000,
      })
    })

    /* 5. Missing next_action alert */
    scouting?.alerts?.missing_next_action?.slice(0, 1).forEach((p) => {
      events.push({
        kind: 'alerte',
        text: `Action suivante manquante — ${p.name}`,
        meta: 'à définir',
        to: '/admin/scouting?view=players',
        ts: Date.now() - 4 * 60 * 60_000,
      })
    })

    /* Sort by timestamp desc, drop ts before returning, cap at 5 */
    return events
      .sort((a, b) => b.ts - a.ts)
      .slice(0, 5)
      .map(({ ts: _ts, ...rest }) => rest)
  }, [players, stats, scouting])

  /* ───── Loading state ───── */
  if (loading) {
    return (
      <div className="px-6 lg:px-10 py-10">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="mt-3 h-9 w-64" />
        <Skeleton className="mt-3 h-3 w-96" />
        <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-stone-200/70 dark:border-stone-50/[0.06] bg-white dark:bg-zinc-900/60 p-5 space-y-3">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-28" />
            </div>
          ))}
        </div>
        <div className="mt-8 grid lg:grid-cols-2 gap-4">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="px-6 lg:px-10 py-10">
        <span className="eyebrow">Tableau de bord</span>
        <h1 className="mt-2 font-display font-semibold text-3xl tracking-tight text-zinc-950 dark:text-stone-50">
          Aucun joueur enregistré
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-stone-300 max-w-prose">
          Commencez par créer votre premier profil pour activer le cockpit.
        </p>
        <Link to="/admin/joueurs/nouveau" className="btn btn-primary mt-6">
          <Plus size={15} weight="bold" />
          Ajouter un joueur
        </Link>
      </div>
    )
  }

  const lastUpdateLabel = stats.lastUpdatedTs > 0
    ? formatRelative(new Date(stats.lastUpdatedTs).toISOString()).replace('il y a ', '').replace(/^à l'instant$/, 'à l\'instant')
    : 'jamais'

  return (
    <div className="px-6 lg:px-10 py-10 space-y-8 lg:space-y-10">
      {/* ─────────── Header ─────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <span className="font-mono uppercase tracking-[0.12em] text-[0.62rem] font-medium text-turf-700 dark:text-turf-300">
          Tableau de bord
        </span>
        <h1 className="mt-2 flex items-center gap-3 font-display font-semibold text-[1.75rem] lg:text-[2rem] tracking-tight text-zinc-950 dark:text-stone-50">
          <span>Bonjour {user?.name?.split(' ')[0] || 'René'}</span>
          <HandWaving size={24} weight="duotone" className="text-turf-700 dark:text-turf-300 shrink-0" />
        </h1>
        <p className="mt-2 text-[0.92rem] text-zinc-600 dark:text-stone-300 max-w-[60ch] leading-relaxed">
          Vue opérationnelle de l'effectif Rene Football : performances,
          profils joueurs, statistiques et priorités d'analyse.
        </p>
        {/* Inline meta — packed right under the description, not floating right. */}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.72rem] text-zinc-500 dark:text-stone-400">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-turf-500 animate-pulse" />
            <span className="tabular-nums">{players.length}</span> joueurs suivis
          </span>
          <span className="text-stone-300 dark:text-stone-700">·</span>
          <span><span className="tabular-nums">{stats.clubs}</span> clubs représentés</span>
          <span className="text-stone-300 dark:text-stone-700">·</span>
          <span>Dernière mise à jour {lastUpdateLabel}</span>
        </div>
      </motion.div>

      {/* ─────────── KPI grid ─────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile
          icon={Users}
          label="Joueurs"
          value={players.length}
          hint={`${stats.clubs} clubs représentés`}
          sub={stats.updatedRecently > 0 ? `${stats.updatedRecently} mis à jour < 7 j.` : undefined}
          badge={stats.addedThisMonth > 0 ? { text: `+${stats.addedThisMonth} ce mois`, tone: 'turf' } : undefined}
        />
        <StatTile
          icon={SoccerBall}
          label="Matchs joués"
          value={stats.totalMatches}
          hint="Toutes compétitions"
          sub={`Moyenne ${(stats.totalMatches / Math.max(1, players.length)).toFixed(1)} / joueur`}
          badge={{ text: 'À jour', tone: 'neutral' }}
        />
        <StatTile
          icon={Trophy}
          label="Buts cumulés"
          value={stats.totalGoals}
          hint={`Moyenne ${stats.goalsPerMatch} / match`}
          sub={`Top buteur · ${lastName(stats.topScorer.name)}`}
          badge={stats.xgVsGoals > 0.5 ? { text: `xG +${stats.xgVsGoals.toFixed(1)}`, tone: 'turf' } : stats.xgVsGoals < -0.5 ? { text: `xG ${stats.xgVsGoals.toFixed(1)}`, tone: 'amber' } : undefined}
        />
        <StatTile
          icon={ChartLineUp}
          label="Passes décisives"
          value={stats.totalAssists}
          hint={`${stats.totalKeyPasses} passes clés cumulées`}
          sub={`Top passeur · ${lastName(stats.topAssist.name)}`}
        />
      </div>

      {/* ─────────── Main two-column section — sections shaped so the LeaderCards align. ─────────── */}
      <div className="grid lg:grid-cols-2 gap-4 lg:items-stretch">
        {/* Left column */}
        <div className="flex flex-col gap-4 min-w-0">
          {/* Priorités du jour */}
          <section className="rounded-2xl bg-white dark:bg-zinc-900/60 border border-stone-200/70 dark:border-stone-50/[0.06] overflow-hidden flex-1 flex flex-col">
            <header className="flex items-center justify-between px-4 py-3 border-b border-stone-200/60 dark:border-stone-50/[0.06]">
              <div className="flex items-center gap-2">
                <Warning size={14} weight="duotone" className="text-amber-600 dark:text-amber-300" />
                <span className="font-mono uppercase tracking-[0.12em] text-[0.62rem] text-zinc-700 dark:text-stone-200">
                  Priorités du jour
                </span>
              </div>
              <span className="text-[0.65rem] font-mono text-zinc-500 dark:text-stone-400 tabular-nums">
                {priorities.length} élément{priorities.length > 1 ? 's' : ''}
              </span>
            </header>
            {priorities.length === 0 ? (
              <div className="flex-1 px-4 py-10 grid place-items-center text-center">
                <CheckCircle size={22} weight="duotone" className="text-turf-600 dark:text-turf-300 mb-2" />
                <div className="text-sm text-zinc-700 dark:text-stone-200">Tout est à jour</div>
                <div className="text-xs text-zinc-500 dark:text-stone-400 mt-1">Aucune priorité urgente.</div>
              </div>
            ) : (
              <div className="flex-1">
                {priorities.map((p, i) => <PriorityRow key={i} item={p} />)}
              </div>
            )}
          </section>

          {/* Meilleur buteur */}
          <LeaderCard
            eyebrow="Meilleur buteur"
            player={stats.topScorer}
            primary={{ value: stats.topScorer.goals, label: 'Buts' }}
            secondary={{ value: stats.topScorer.matches_played, label: 'Matchs' }}
            tertiary={{ value: Number(stats.topScorer.xg).toFixed(1), label: 'xG' }}
            summary={
              stats.xgVsGoals > 0.5
                ? `Surperforme son xG de +${stats.xgVsGoals.toFixed(1)} sur ${stats.topScorer.matches_played} matchs.`
                : stats.xgVsGoals < -0.5
                  ? `Sous-performance face au xG (${stats.xgVsGoals.toFixed(1)}) — efficacité à surveiller.`
                  : `Conversion alignée sur le xG attendu (${stats.topScorer.xg.toFixed(1)}).`
            }
            variant="dark"
          />
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4 min-w-0">
          {/* Dernières activités */}
          <section className="rounded-2xl bg-white dark:bg-zinc-900/60 border border-stone-200/70 dark:border-stone-50/[0.06] overflow-hidden flex-1 flex flex-col">
            <header className="flex items-center justify-between px-4 py-3 border-b border-stone-200/60 dark:border-stone-50/[0.06]">
              <div className="flex items-center gap-2">
                <ClockClockwise size={14} weight="duotone" className="text-turf-700 dark:text-turf-300" />
                <span className="font-mono uppercase tracking-[0.12em] text-[0.62rem] text-zinc-700 dark:text-stone-200">
                  Dernières activités
                </span>
              </div>
              <Link to="/admin/joueurs" className="text-[0.65rem] font-mono uppercase tracking-[0.1em] text-zinc-500 hover:text-turf-700 dark:text-stone-400 dark:hover:text-turf-200 transition-colors">
                Tout voir
              </Link>
            </header>
            {activities.length === 0 ? (
              <div className="flex-1 px-4 py-10 text-center text-sm text-zinc-500 dark:text-stone-400">
                Aucune activité récente.
              </div>
            ) : (
              <div className="flex-1 divide-y divide-stone-200/60 dark:divide-stone-50/[0.05]">
                {activities.map((a, i) => <ActivityRow key={i} item={a} />)}
              </div>
            )}
          </section>

          {/* Meilleur passeur */}
          <LeaderCard
            eyebrow="Meilleur passeur"
            player={stats.topAssist}
            primary={{ value: stats.topAssist.assists, label: 'Passes D.' }}
            secondary={{ value: stats.topAssist.key_passes, label: 'Passes clés' }}
            tertiary={{ value: Number(stats.topAssist.xa).toFixed(1), label: 'xA' }}
            summary={
              stats.topAssist.key_passes > 30
                ? `Créateur le plus régulier du roster — ${stats.topAssist.key_passes} passes clés sur la saison.`
                : `Profil de relais — ${stats.topAssist.assists} passes décisives pour ${stats.topAssist.matches_played} matchs.`
            }
            variant="light"
          />
        </div>
      </div>

      {/* ─────────── Actions rapides ─────────── */}
      <section>
        <header className="flex items-center gap-2 mb-3">
          <Sparkle size={14} weight="duotone" className="text-turf-700 dark:text-turf-300" />
          <span className="font-mono uppercase tracking-[0.12em] text-[0.62rem] text-zinc-700 dark:text-stone-200">
            Actions rapides
          </span>
        </header>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
          <QuickAction icon={UserCirclePlus}   label="Ajouter un joueur"        to="/admin/joueurs/nouveau"       tone="primary" />
          <QuickAction icon={PencilSimpleLine} label="Mettre à jour les stats"  to="/admin/joueurs" />
          <QuickAction icon={FilePlus}         label="Créer un rapport"         to="/admin/scouting?view=reports" />
          <QuickAction icon={ChartLineUp}      label="Ouvrir l'analyse"         to="/admin/analyse" />
          <QuickAction icon={Binoculars}       label="Voir les priorités"       to="/admin/scouting?view=intelligence" />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <Link to="/admin/articles" className="inline-flex items-center gap-1.5 text-[0.72rem] text-zinc-500 hover:text-turf-700 dark:text-stone-400 dark:hover:text-turf-200 transition-colors">
            <Newspaper size={12} weight="regular" />
            Gérer les actualités
          </Link>
          <span className="text-stone-300 dark:text-stone-700">·</span>
          <Link to="/" className="inline-flex items-center gap-1.5 text-[0.72rem] text-zinc-500 hover:text-turf-700 dark:text-stone-400 dark:hover:text-turf-200 transition-colors">
            <ArrowUpRight size={12} weight="regular" />
            Voir la landing page
          </Link>
        </div>
      </section>
    </div>
  )
}

/* ─────────────────── Quick action button ─────────────────── */

interface QuickActionProps {
  icon: PhosphorIcon
  label: string
  to: string
  tone?: 'primary' | 'default'
}

function QuickAction({ icon: Icon, label, to, tone = 'default' }: QuickActionProps) {
  const className = tone === 'primary'
    ? 'group flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border bg-turf-700 hover:bg-turf-600 text-stone-50 border-turf-800/40 transition-colors shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'
    : 'group flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border bg-white dark:bg-zinc-900/60 text-zinc-800 dark:text-stone-200 border-stone-200/70 dark:border-stone-50/[0.06] hover:border-turf-300/60 dark:hover:border-turf-400/25 hover:text-zinc-950 dark:hover:text-stone-50 transition-colors'
  return (
    <Link to={to} className={className}>
      <Icon size={15} weight={tone === 'primary' ? 'bold' : 'regular'} className="shrink-0" />
      <span className="text-[0.82rem] font-medium truncate">{label}</span>
    </Link>
  )
}

export default AdminDashboard
