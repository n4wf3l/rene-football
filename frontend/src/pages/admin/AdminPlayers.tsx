import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowsClockwise,
  Binoculars,
  CheckCircle,
  Eye,
  EyeSlash,
  FunnelSimple,
  MagnifyingGlass,
  PencilSimpleLine,
  Plus,
  UploadSimple,
  Users,
  WarningCircle,
} from '@phosphor-icons/react'
import StatsImportModal from '../../components/StatsImportModal'
import StatsProvenanceBadge from '../../components/StatsProvenanceBadge'
import { api } from '../../api/client'
import Skeleton from '../../components/Skeleton'
import { useConfirm } from '../../components/ConfirmProvider'
import { completenessTone, playerCompleteness, TONE_CLASSES } from '../../lib/playerCompleteness'
import { useToast } from '../../components/ToastProvider'

import { CATEGORIES, type AdminPlayer, type PlayerFormState } from '../../components/admin/playerEditor/model'


interface PlayersListResponse {
  data: AdminPlayer[]
}

/* ───── Business statuses (replaces "EN LIGNE / HORS LIGNE") ───── */

type BusinessStatus =
  | 'stats_a_jour'   // dossier complet + matchs renseignés
  | 'a_completer'    // dossier sous le seuil (< 60 %)
  | 'a_verifier'     // dossier intermédiaire (60-85 %)
  | 'a_surveiller'   // tag « À surveiller » présent
  | 'scouting'       // potentiel renseigné (≥ 7) - préfigure le module scouting
  | 'blesse'         // tag « Blessé long »
  | 'archive'        // marqué hors-ligne par l'admin

interface StatusMeta {
  label: string
  dot: string
  pill: string
}

const STATUS_META: Record<BusinessStatus, StatusMeta> = {
  stats_a_jour: {
    label: 'Stats à jour',
    dot:   'bg-turf-500',
    pill:  'bg-turf-50 text-turf-800 border border-turf-200 dark:bg-turf-900/30 dark:text-turf-200 dark:border-turf-400/20',
  },
  a_completer: {
    label: 'À compléter',
    dot:   'bg-amber-500',
    pill:  'bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:border-amber-400/20',
  },
  a_verifier: {
    label: 'À vérifier',
    dot:   'bg-amber-400',
    pill:  'bg-amber-50/70 text-amber-700 border border-amber-200/70 dark:bg-amber-500/[0.06] dark:text-amber-200 dark:border-amber-400/15',
  },
  a_surveiller: {
    label: 'À surveiller',
    dot:   'bg-violet-500',
    pill:  'bg-violet-50 text-violet-800 border border-violet-200 dark:bg-violet-500/10 dark:text-violet-200 dark:border-violet-400/20',
  },
  scouting: {
    label: 'Scouting',
    dot:   'bg-sky-500',
    pill:  'bg-sky-50 text-sky-800 border border-sky-200 dark:bg-sky-500/10 dark:text-sky-200 dark:border-sky-400/20',
  },
  blesse: {
    label: 'Blessé',
    dot:   'bg-rose-500',
    pill:  'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-200 dark:border-rose-400/20',
  },
  archive: {
    label: 'Archivé',
    dot:   'bg-stone-400 dark:bg-stone-500',
    pill:  'bg-stone-100 text-zinc-600 border border-stone-200 dark:bg-stone-50/[0.06] dark:text-stone-300 dark:border-stone-50/10',
  },
}

function deriveStatus(p: AdminPlayer, pct: number): BusinessStatus {
  if (p.is_published === false) return 'archive'
  const tags = (p.tags ?? []).map((t) => t.toLowerCase())
  if (tags.some((t) => t.includes('bless'))) return 'blesse'
  if (tags.some((t) => t.includes('surveiller'))) return 'a_surveiller'
  if ((p.potential_rating ?? 0) >= 7.5) return 'scouting'
  if (pct < 50) return 'a_completer'
  if (pct < 80 || (p.matches_played ?? 0) === 0) return 'a_verifier'
  return 'stats_a_jour'
}

/* ───── Avatar with initials fallback (no more picsum) ───── */

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function Avatar({ player }: { player: AdminPlayer }) {
  if (player.photo_url) {
    return (
      <img
        src={player.photo_url}
        alt=""
        className="w-9 h-9 rounded-full object-cover bg-stone-200 dark:bg-stone-800 border border-stone-200/70 dark:border-stone-50/[0.06]"
      />
    )
  }
  return (
    <div className="grid place-items-center w-9 h-9 rounded-full bg-zinc-900 dark:bg-zinc-800 text-stone-100 border border-stone-300/70 dark:border-stone-50/10 text-[0.72rem] font-medium tracking-wide ring-1 ring-turf-700/20 dark:ring-turf-300/15">
      {initialsOf(player.name)}
    </div>
  )
}

/* ───── Relative date helper ───── */

function freshness(iso?: string | null): { label: string; tone: 'turf' | 'amber' | 'neutral' } {
  if (!iso) return { label: 'à vérifier', tone: 'amber' }
  const ts = new Date(iso).getTime()
  const days = Math.floor((Date.now() - ts) / 86_400_000)
  if (days <= 0) return { label: 'aujourd\'hui',     tone: 'turf' }
  if (days === 1) return { label: 'hier',             tone: 'turf' }
  if (days < 7)   return { label: `il y a ${days} j.`, tone: 'turf' }
  if (days < 14)  return { label: 'il y a 1 sem.',    tone: 'neutral' }
  if (days < 30)  return { label: `il y a ${Math.floor(days / 7)} sem.`, tone: 'neutral' }
  return { label: 'à vérifier', tone: 'amber' }
}

type AgeFilter = 'Tous' | 'U21' | '21-26' | '27+'

type SortColumn = 'name' | 'category' | 'club' | 'age' | 'matches' | 'goals' | 'assists' | 'xg' | 'pass_accuracy' | 'completeness'
type SortDir = 'asc' | 'desc'

const DEFAULT_DIR: Record<SortColumn, SortDir> = {
  name:           'asc',
  category:       'asc',
  club:           'asc',
  age:            'asc',
  matches:        'desc',
  goals:          'desc',
  assists:        'desc',
  xg:             'desc',
  pass_accuracy:  'desc',
  completeness:   'desc',
}

const AGE_OPTIONS: { key: AgeFilter; label: string }[] = [
  { key: 'Tous',  label: 'Tous âges' },
  { key: 'U21',   label: 'Moins de 21' },
  { key: '21-26', label: '21-26' },
  { key: '27+',   label: '27 et plus' },
]

type StatusFilter = 'Tous' | BusinessStatus
const STATUS_FILTER_OPTIONS: { key: StatusFilter; label: string }[] = [
  { key: 'Tous',         label: 'Tous statuts' },
  { key: 'stats_a_jour', label: STATUS_META.stats_a_jour.label },
  { key: 'a_completer',  label: STATUS_META.a_completer.label },
  { key: 'a_verifier',   label: STATUS_META.a_verifier.label },
  { key: 'a_surveiller', label: STATUS_META.a_surveiller.label },
  { key: 'scouting',     label: STATUS_META.scouting.label },
  { key: 'blesse',       label: STATUS_META.blesse.label },
  { key: 'archive',      label: STATUS_META.archive.label },
]

interface HeadCellProps {
  column?: SortColumn
  label: string
  hint?: string
  align?: 'left' | 'right'
  currentColumn?: SortColumn
  currentDir?: SortDir
  onSort?: (col: SortColumn) => void
}

function HeadCell({ column, label, hint, align = 'left', currentColumn, currentDir, onSort }: HeadCellProps) {
  const sortable = !!column && !!onSort
  const active = sortable && currentColumn === column
  const indicator = active ? (currentDir === 'asc' ? '↑' : '↓') : (sortable ? '↕' : '')
  return (
    <th className={`px-4 py-3 align-middle ${align === 'right' ? 'text-right' : 'text-left'}`}>
      {sortable ? (
        <button
          type="button"
          onClick={() => onSort!(column!)}
          title={hint}
          className={`inline-flex items-center gap-1 text-[0.62rem] font-mono uppercase tracking-[0.12em] transition-colors ${
            active
              ? 'text-zinc-950 dark:text-stone-50'
              : 'text-zinc-600 dark:text-stone-400 hover:text-zinc-900 dark:hover:text-stone-100'
          }`}
        >
          {label}
          <span className={`inline-block ${active ? 'opacity-100' : 'opacity-40'}`}>{indicator}</span>
        </button>
      ) : (
        <span title={hint} className="text-[0.62rem] font-mono uppercase tracking-[0.12em] text-zinc-600 dark:text-stone-400">{label}</span>
      )}
    </th>
  )
}

/* ───── Reusable filter <select> chrome ───── */
const FILTER_SELECT =
  'h-9 rounded-lg border border-stone-200 dark:border-stone-50/10 bg-white dark:bg-zinc-900/60 px-3 pr-7 text-[0.78rem] text-zinc-700 dark:text-stone-200 hover:border-stone-300 dark:hover:border-stone-50/20 focus:outline-none focus:border-zinc-500 dark:focus:border-turf-300 transition appearance-none'

/* ───── Mini-KPI strip ───── */
interface MiniKpiProps { icon: typeof Users; label: string; value: number | string; tone?: 'turf' | 'amber' | 'neutral' }
function MiniKpi({ icon: Icon, label, value, tone = 'neutral' }: MiniKpiProps) {
  const iconColor =
    tone === 'turf'  ? 'text-turf-700 dark:text-turf-300' :
    tone === 'amber' ? 'text-amber-600 dark:text-amber-300' :
                       'text-zinc-500 dark:text-stone-400'
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-stone-200/70 dark:border-stone-50/[0.06] bg-white dark:bg-zinc-900/60 px-3 py-1.5">
      <Icon size={13} weight="duotone" className={iconColor} />
      <span className="text-[0.7rem] text-zinc-600 dark:text-stone-300">{label}</span>
      <span className="text-[0.72rem] font-medium text-zinc-950 dark:text-stone-50 tabular-nums">{value}</span>
    </div>
  )
}

/** Row-sized completeness gauge: red under 50 %, orange under 80 %, green above. */
function CompletenessBar({ pct }: { pct: number }) {
  const tone = TONE_CLASSES[completenessTone(pct)]
  return (
    <div className="mt-1.5 flex items-center gap-2" title={`Profil complété à ${pct} %`}>
      <div className={`h-1.5 w-20 rounded-full overflow-hidden ${tone.track}`}>
        <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-[0.65rem] font-mono font-semibold tabular-nums ${tone.text}`}>{pct}%</span>
    </div>
  )
}

function AdminPlayers() {
  const confirm = useConfirm()
  const toast = useToast()
  const [players, setPlayers] = useState<AdminPlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<string>('Tous')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('Tous')
  const [ageFilter, setAgeFilter] = useState<AgeFilter>('Tous')
  const [clubFilter, setClubFilter] = useState<string>('Tous')
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [sortColumn, setSortColumn] = useState<SortColumn>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const navigate = useNavigate()
  const [importOpen, setImportOpen] = useState(false)

  // Editing opens the full-screen editor (/admin/joueurs/:slug/edit).
  const openEditor = (p: AdminPlayer) => navigate(`/admin/joueurs/${p.slug}/edit`)
  const openCreator = () => navigate('/admin/joueurs/nouveau')
  const [togglingSlug, setTogglingSlug] = useState<string | null>(null)

  const reload = () => {
    setLoading(true)
    return api.get<PlayersListResponse>('/admin/players', { auth: true })
      .then((res) => setPlayers(res.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { reload() }, [])

  // Pick up a toast handed off by the page editor via navigation state, then
  // clear it from history so a refresh doesn't re-show the same message.
  const location = useLocation()
  useEffect(() => {
    const toastMsg = (location.state as { toast?: string } | null)?.toast
    if (toastMsg) {
      showToast('success', toastMsg)
      navigate(location.pathname, { replace: true, state: null })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state])

  /* Enrich each player once : completeness % + derived business status. */
  const enriched = useMemo(() => {
    return players.map((p) => {
      const pct = playerCompleteness(p).pct
      return { player: p, pct, status: deriveStatus(p, pct) }
    })
  }, [players])

  const allClubs = useMemo(() => {
    const set = new Set<string>()
    players.forEach((p) => p.club && set.add(p.club))
    return Array.from(set).sort()
  }, [players])

  const allTags = useMemo(() => {
    const set = new Set<string>()
    players.forEach((p) => (p.tags ?? []).forEach((t) => set.add(t)))
    return Array.from(set).sort()
  }, [players])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const rows = enriched.filter(({ player: p, status }) => {
      if (filter !== 'Tous' && p.category !== filter) return false
      if (clubFilter !== 'Tous' && (p.club ?? '') !== clubFilter) return false
      if (statusFilter !== 'Tous' && status !== statusFilter) return false
      if (ageFilter === 'U21' && p.age >= 21) return false
      if (ageFilter === '21-26' && (p.age < 21 || p.age > 26)) return false
      if (ageFilter === '27+' && p.age < 27) return false
      if (tagFilter && !(p.tags ?? []).includes(tagFilter)) return false
      if (q && !`${p.name} ${p.club || ''} ${p.position}`.toLowerCase().includes(q)) return false
      return true
    })

    const sign = sortDir === 'asc' ? 1 : -1
    const num = (v: unknown) => Number(v ?? 0)
    const txt = (v: unknown) => String(v ?? '')

    const compare = (A: typeof rows[number], B: typeof rows[number]): number => {
      const a = A.player; const b = B.player
      switch (sortColumn) {
        case 'name':           return sign * txt(a.name).localeCompare(txt(b.name), 'fr')
        case 'category':       return sign * txt(a.category).localeCompare(txt(b.category), 'fr')
        case 'club':           return sign * txt(a.club).localeCompare(txt(b.club), 'fr')
        case 'age':            return sign * (num(a.age) - num(b.age))
        case 'matches':        return sign * (num(a.matches_played) - num(b.matches_played))
        case 'goals':          return sign * (num(a.goals) - num(b.goals))
        case 'assists':        return sign * (num(a.assists) - num(b.assists))
        case 'xg':              return sign * (num(a.xg) - num(b.xg))
        case 'pass_accuracy':  return sign * (num(a.pass_accuracy) - num(b.pass_accuracy))
        case 'completeness':   return sign * (A.pct - B.pct)
      }
    }
    return [...rows].sort(compare)
  }, [enriched, query, filter, clubFilter, statusFilter, ageFilter, tagFilter, sortColumn, sortDir])

  /* Mini-KPI counters - computed from the unfiltered enriched set. */
  const kpi = useMemo(() => {
    const acc = { total: enriched.length, clubs: allClubs.length, statsAJour: 0, aCompleter: 0, aVerifier: 0 }
    for (const { status } of enriched) {
      if (status === 'stats_a_jour') acc.statsAJour++
      else if (status === 'a_completer') acc.aCompleter++
      else if (status === 'a_verifier') acc.aVerifier++
    }
    return acc
  }, [enriched, allClubs])

  const anyFilterActive =
    !!query.trim() ||
    filter !== 'Tous' ||
    clubFilter !== 'Tous' ||
    statusFilter !== 'Tous' ||
    ageFilter !== 'Tous' ||
    tagFilter !== null ||
    sortColumn !== 'name' ||
    sortDir !== 'asc'

  const resetFilters = () => {
    setQuery('')
    setFilter('Tous')
    setClubFilter('Tous')
    setStatusFilter('Tous')
    setAgeFilter('Tous')
    setTagFilter(null)
    setSortColumn('name')
    setSortDir('asc')
  }

  /** Click on a header → sort by that column. Re-click on the same → flip direction. */
  const onSort = (col: SortColumn) => {
    if (sortColumn === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(col)
      setSortDir(DEFAULT_DIR[col])
    }
  }

  const showToast = (kind: 'success' | 'error', message: string) => {
    if (kind === 'success') toast.success(message)
    else toast.error(message)
  }

  const onDelete = async (player: PlayerFormState) => {
    if (!(await confirm({
      title: `Supprimer « ${player.name} » ?`,
      body: 'Cette action est définitive et retirera le joueur du roster public.',
      confirmLabel: 'Supprimer',
      danger: true,
    }))) return
    try {
      await api.delete(`/admin/players/${player.slug}`, { auth: true })
      await reload()
      showToast('success', 'Joueur supprimé.')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Suppression impossible.'
      showToast('error', message)
    }
  }

  /**
   * Quick publish/hide toggle from the table row - bypasses the editor.
   * Optimistic UI: flip the badge immediately and roll back on API error.
   */
  const togglePublished = async (player: AdminPlayer) => {
    if (togglingSlug) return
    const next = !player.is_published
    const previous = players
    setTogglingSlug(player.slug)
    setPlayers((prev) => prev.map((p) => (p.slug === player.slug ? { ...p, is_published: next } : p)))
    try {
      // Resend the full record so the controller's required-field validation passes.
      const { id: _id, created_at: _c, updated_at: _u, ...payload } = player as AdminPlayer & { created_at?: string; updated_at?: string }
      await api.put(`/admin/players/${player.slug}`, { ...payload, is_published: next }, { auth: true })
      showToast('success', next ? `« ${player.name} » publié.` : `« ${player.name} » masqué.`)
    } catch (err: unknown) {
      setPlayers(previous)
      const message = err instanceof Error ? err.message : 'Modification impossible.'
      showToast('error', message)
    } finally {
      setTogglingSlug(null)
    }
  }

  return (
    <div className="px-6 lg:px-10 py-10">
      {/* ───── Header ───── */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <span className="eyebrow">Roster</span>
          <h1 className="mt-2 font-display font-semibold text-3xl lg:text-[2rem] tracking-tight text-zinc-950 dark:text-stone-50">
            Joueurs & statistiques
          </h1>
          <p className="mt-1.5 text-sm text-zinc-600 dark:text-stone-300 max-w-[60ch] leading-relaxed">
            Gérez les profils joueurs, suivez les statistiques clés et identifiez
            les dossiers à compléter.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-stone-300 dark:border-stone-50/15 bg-white dark:bg-zinc-900 hover:bg-stone-100 dark:hover:bg-stone-50/5 transition"
            title="Importer les stats du roster depuis un CSV"
          >
            <UploadSimple size={14} weight="bold" /> Importer CSV
          </button>
          <button type="button" onClick={openCreator} className="btn btn-primary text-sm">
            <Plus size={14} weight="bold" /> Nouveau joueur
          </button>
        </div>
      </div>

      <StatsImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={() => { void reload() }}
      />

      {/* ───── Mini-KPI strip ───── */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {/* Roster totals always shown — they set the scale for the rest. */}
        <MiniKpi icon={Users}      label="Joueurs" value={kpi.total} />
        <MiniKpi icon={Binoculars} label="Clubs"   value={kpi.clubs} />
        {/* Status chips only appear when they have a signal to carry.
            A zero-value amber "À compléter 0" was reading like a broken
            widget instead of a healthy state. */}
        {kpi.statsAJour > 0 && (
          <MiniKpi icon={CheckCircle}   label="Stats à jour" value={kpi.statsAJour} tone="turf" />
        )}
        {kpi.aCompleter > 0 && (
          <MiniKpi icon={WarningCircle} label="À compléter"  value={kpi.aCompleter} tone="amber" />
        )}
        {kpi.aVerifier > 0 && (
          <MiniKpi icon={WarningCircle} label="À vérifier"   value={kpi.aVerifier}  tone="amber" />
        )}
      </div>

      {/* ───── Filter bar (search + filters + reset + count) ───── */}
      <div className="rounded-2xl border border-stone-200/70 dark:border-stone-50/[0.06] bg-white dark:bg-zinc-900/60 p-3 mb-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <MagnifyingGlass size={14} weight="regular" className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-stone-500" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un joueur, club, poste…"
            className="w-full pl-9 pr-3 h-9 rounded-lg border border-stone-200 bg-white text-[0.82rem] focus:outline-none focus:border-zinc-500 dark:bg-zinc-900/60 dark:border-stone-50/10 dark:text-stone-50 dark:placeholder:text-stone-500 dark:focus:border-turf-300"
          />
        </div>

        <FunnelSimple size={14} weight="regular" className="text-zinc-400 dark:text-stone-500 hidden sm:inline" />

        <select className={FILTER_SELECT} value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filtrer par catégorie">
          <option value="Tous">Toutes catégories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        {allClubs.length > 0 && (
          <select className={FILTER_SELECT} value={clubFilter} onChange={(e) => setClubFilter(e.target.value)} aria-label="Filtrer par club">
            <option value="Tous">Tous les clubs</option>
            {allClubs.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}

        <select className={FILTER_SELECT} value={ageFilter} onChange={(e) => setAgeFilter(e.target.value as AgeFilter)} aria-label="Filtrer par tranche d'âge">
          {AGE_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>

        <select className={FILTER_SELECT} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)} aria-label="Filtrer par statut">
          {STATUS_FILTER_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>

        {allTags.length > 0 && (
          <select className={FILTER_SELECT} value={tagFilter ?? ''} onChange={(e) => setTagFilter(e.target.value || null)} aria-label="Filtrer par tag">
            <option value="">Tous tags</option>
            {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        )}

        {anyFilterActive && (
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-1.5 h-9 px-2.5 rounded-lg text-[0.72rem] text-zinc-600 hover:text-zinc-950 dark:text-stone-400 dark:hover:text-stone-50 hover:bg-stone-100 dark:hover:bg-stone-50/5 transition"
            title="Réinitialiser tous les filtres"
          >
            <ArrowsClockwise size={12} weight="bold" />
            Réinitialiser
          </button>
        )}

        <span className="ml-auto text-[0.72rem] text-zinc-500 dark:text-stone-400 font-mono tabular-nums shrink-0">
          {filtered.length} / {players.length} joueurs
        </span>
      </div>

      {/* ───── Table ───── */}
      <div className="overflow-x-auto rounded-2xl border border-stone-200/70 dark:border-stone-50/[0.06] bg-white dark:bg-zinc-900/60">
        <table className="w-full text-sm">
          <thead className="bg-stone-50/80 dark:bg-stone-50/[0.02]">
            {/* Compact header — xG / Précision / Complétude vivent dans la
                fiche joueur ; ici on garde le strict essentiel pour scanner
                le roster d'un coup d'œil. */}
            <tr className="border-b border-stone-200/60 dark:border-stone-50/[0.05]">
              <HeadCell column="name"     label="Joueur"                currentColumn={sortColumn} currentDir={sortDir} onSort={onSort} />
              <HeadCell column="category" label="Catégorie"             currentColumn={sortColumn} currentDir={sortDir} onSort={onSort} />
              <HeadCell column="club"     label="Club"                  currentColumn={sortColumn} currentDir={sortDir} onSort={onSort} />
              <HeadCell column="age"      label="Âge"     align="right" currentColumn={sortColumn} currentDir={sortDir} onSort={onSort} />
              <HeadCell column="matches"  label="Matchs"  align="right" currentColumn={sortColumn} currentDir={sortDir} onSort={onSort} />
              <HeadCell column="goals"    label="Buts"    align="right" currentColumn={sortColumn} currentDir={sortDir} onSort={onSort} />
              <HeadCell column="assists"  label="Passes D." align="right" currentColumn={sortColumn} currentDir={sortDir} onSort={onSort} />
              <HeadCell                   label="Statut" />
              <th className="px-3 py-3 text-right">
                <span className="text-[0.62rem] font-mono uppercase tracking-[0.12em] text-zinc-600 dark:text-stone-400">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && Array.from({ length: 6 }).map((_, i) => (
              <tr key={`skel-${i}`} className="border-t border-stone-200/60 dark:border-stone-50/[0.05]">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-9 h-9" rounded="full" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-3 w-32" />
                      <Skeleton className="h-2.5 w-20" />
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3"><Skeleton className="h-3 w-20" /></td>
                <td className="px-4 py-3"><Skeleton className="h-3 w-24" /></td>
                <td className="px-4 py-3 text-right"><Skeleton className="h-3 w-6 ml-auto" /></td>
                <td className="px-4 py-3 text-right"><Skeleton className="h-3 w-8 ml-auto" /></td>
                <td className="px-4 py-3 text-right"><Skeleton className="h-3 w-8 ml-auto" /></td>
                <td className="px-4 py-3 text-right"><Skeleton className="h-3 w-8 ml-auto" /></td>
                <td className="px-4 py-3"><Skeleton className="h-5 w-20" rounded="full" /></td>
                <td className="px-3 py-3"><Skeleton className="h-6 w-12 ml-auto" /></td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center">
                  <div className="inline-flex flex-col items-center gap-2 text-sm">
                    <WarningCircle size={20} weight="duotone" className="text-zinc-400 dark:text-stone-500" />
                    <div className="text-zinc-700 dark:text-stone-200 font-medium">Aucun joueur trouvé</div>
                    <div className="text-zinc-500 dark:text-stone-400 text-xs">
                      Essayez de modifier vos filtres ou ajoutez un nouveau joueur.
                    </div>
                    <div className="flex gap-2 mt-2">
                      {anyFilterActive && (
                        <button type="button" onClick={resetFilters} className="btn btn-outline text-xs px-3 py-1.5">
                          <ArrowsClockwise size={12} weight="bold" /> Réinitialiser les filtres
                        </button>
                      )}
                      <button type="button" onClick={openCreator} className="btn btn-primary text-xs px-3 py-1.5">
                        <Plus size={12} weight="bold" /> Ajouter un joueur
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            )}
            {filtered.map(({ player: p, pct, status }) => {
              const meta = STATUS_META[status]
              const fresh = freshness(p.updated_at)
              const freshTone =
                fresh.tone === 'turf'  ? 'text-turf-700 dark:text-turf-300' :
                fresh.tone === 'amber' ? 'text-amber-600 dark:text-amber-300' :
                                         'text-zinc-500 dark:text-stone-400'
              return (
                <tr
                  key={p.id ?? p.slug}
                  onClick={() => openEditor(p)}
                  className="group border-t border-stone-200/60 dark:border-stone-50/[0.05] hover:bg-stone-50 dark:hover:bg-stone-50/[0.025] cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar player={p} />
                      <div className="min-w-0">
                        <div className="font-medium text-zinc-950 dark:text-stone-50 truncate">{p.name}</div>
                        <div className="text-[0.7rem] text-zinc-500 dark:text-stone-400 truncate">
                          {p.position}
                          <span className="mx-1.5 opacity-50">·</span>
                          <span className={`font-mono ${freshTone}`}>maj {fresh.label}</span>
                        </div>
                        <div className="mt-1">
                          <StatsProvenanceBadge player={p} />
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-700 dark:text-stone-300">{p.category}</td>
                  <td className="px-4 py-3 text-zinc-700 dark:text-stone-300 truncate max-w-[20ch]">{p.club || '-'}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-zinc-900 dark:text-stone-100">{p.age}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-zinc-900 dark:text-stone-100">{p.matches_played}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-zinc-900 dark:text-stone-100">{p.goals}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-zinc-900 dark:text-stone-100">{p.assists}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[0.65rem] font-mono tracking-[0.04em] ${meta.pill}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                      {meta.label}
                    </span>
                    <CompletenessBar pct={pct} />
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className="inline-flex items-center gap-0.5 opacity-50 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); togglePublished(p) }}
                        disabled={togglingSlug === p.slug}
                        title={p.is_published ? 'Masquer du site public' : 'Publier sur le site public'}
                        aria-pressed={p.is_published}
                        className={`grid place-items-center w-7 h-7 rounded-md transition disabled:opacity-50 disabled:cursor-wait ${
                          p.is_published
                            ? 'text-turf-700 hover:bg-turf-50 dark:text-turf-300 dark:hover:bg-turf-900/30'
                            : 'text-zinc-400 hover:bg-stone-100 dark:text-stone-500 dark:hover:bg-stone-50/5'
                        }`}
                      >
                        {p.is_published
                          ? <Eye size={14} weight="duotone" />
                          : <EyeSlash size={14} weight="regular" />}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); openEditor(p) }}
                        title="Modifier la fiche"
                        className="grid place-items-center w-7 h-7 rounded-md text-zinc-500 hover:text-zinc-950 hover:bg-stone-100 dark:text-stone-400 dark:hover:text-stone-50 dark:hover:bg-stone-50/5 transition"
                      >
                        <PencilSimpleLine size={14} weight="regular" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

    </div>
  )
}

export default AdminPlayers
