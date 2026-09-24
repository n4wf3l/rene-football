import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowSquareOut,
  Buildings,
  CheckCircle,
  DownloadSimple,
  EnvelopeSimple,
  MagnifyingGlass,
  MegaphoneSimple,
  Question,
  SoccerBall,
  Trash,
  User,
} from '@phosphor-icons/react'
import { api, ApiError } from '../../api/client'

/* -------------------------------------------------------------------------- */
/*  Types matching the admin controller payload                               */
/* -------------------------------------------------------------------------- */

type Reason = 'joueur' | 'club' | 'medias' | 'autre'
type Status = 'new' | 'read' | 'handled' | 'archived'

interface SubmissionSummary {
  id: number
  reason: Reason
  name: string
  email: string
  phone: string | null
  status: Status
  snippet: string
  created_at: string
  has_cv: boolean
}

interface Player {
  id: number
  slug: string
  name: string
  club: string | null
  position: string | null
  photo_url: string | null
}

interface SubmissionDetail extends SubmissionSummary {
  subject: string | null
  message: string
  payload: Record<string, unknown>
  player: Player | null
  cv_url: string | null
  consent_at: string | null
  ip: string | null
  user_agent: string | null
}

interface ListResponse {
  data: SubmissionSummary[]
  meta: {
    current_page: number
    per_page: number
    total: number
    last_page: number
    counts: Record<Status, number>
  }
}

/* -------------------------------------------------------------------------- */
/*  Presentation helpers                                                      */
/* -------------------------------------------------------------------------- */

const REASON_META: Record<Reason, { label: string; Icon: typeof SoccerBall; tint: string }> = {
  joueur: { label: 'Joueur',  Icon: SoccerBall,      tint: 'text-turf-700 bg-turf-50 border-turf-100 dark:text-turf-300 dark:bg-turf-800/30 dark:border-turf-500/30' },
  club:   { label: 'Club',    Icon: Buildings,       tint: 'text-blue-800 bg-blue-50 border-blue-100 dark:text-blue-300 dark:bg-blue-900/30 dark:border-blue-500/30' },
  medias: { label: 'Média',   Icon: MegaphoneSimple, tint: 'text-amber-900 bg-amber-50 border-amber-100 dark:text-amber-300 dark:bg-amber-900/30 dark:border-amber-500/30' },
  autre:  { label: 'Autre',   Icon: Question,        tint: 'text-zinc-700 bg-zinc-100 border-zinc-200 dark:text-stone-300 dark:bg-zinc-800/60 dark:border-stone-50/10' },
}

const STATUS_META: Record<Status, { label: string; className: string }> = {
  new:      { label: 'Nouveau',    className: 'bg-rose-600 text-stone-50' },
  read:     { label: 'Lu',         className: 'bg-stone-500 text-stone-50' },
  handled:  { label: 'Traité',     className: 'bg-turf-600 text-stone-50' },
  archived: { label: 'Archivé',    className: 'bg-zinc-400 text-stone-50 dark:bg-zinc-700' },
}

const PAYLOAD_LABELS: Record<string, string> = {
  intent:           'Objectif',
  player_name:      'Joueur',
  date_of_birth:    'Date de naissance',
  position:         'Poste',
  current_club:     'Club actuel',
  level:            'Niveau',
  video_url:        'Vidéo',
  objective:        'Objectif long terme',
  club_name:        'Nom du club',
  role:             'Rôle',
  interest:         'Objet',
  player_id:        'Joueur (id)',
  needed_position:  'Poste recherché',
  age_min:          'Âge min',
  age_max:          'Âge max',
  budget:           'Budget',
  media_name:       'Média',
  purpose:          'Objet média',
  deadline:         'Deadline',
  subject:          'Sujet',
}

function formatDate(iso: string | null): string {
  if (!iso) return '-'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

function AdminContact() {
  const [rows, setRows] = useState<SubmissionSummary[]>([])
  const [counts, setCounts] = useState<Record<Status, number>>({ new: 0, read: 0, handled: 0, archived: 0 })
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('new')
  const [reasonFilter, setReasonFilter] = useState<Reason | 'all'>('all')
  const [search, setSearch] = useState('')

  const [selected, setSelected] = useState<SubmissionDetail | null>(null)
  const [selectedLoading, setSelectedLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams()
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (reasonFilter !== 'all') params.set('reason', reasonFilter)
    if (search.trim()) params.set('search', search.trim())
    params.set('per_page', '50')
    try {
      const res = await api.get<ListResponse>(`/admin/contact-submissions?${params.toString()}`, { auth: true })
      setRows(res.data)
      setCounts(res.meta.counts)
      setTotal(res.meta.total)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Chargement impossible.')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, reasonFilter, search])

  useEffect(() => { load() }, [load])

  const openSubmission = async (id: number) => {
    setSelectedLoading(true)
    try {
      const res = await api.get<{ data: SubmissionDetail }>(`/admin/contact-submissions/${id}`, { auth: true })
      setSelected(res.data)
      // Flip status "new → read" locally too so the list badge follows the server.
      setRows((prev) => prev.map((r) => r.id === id ? { ...r, status: res.data.status } : r))
      setCounts((prev) => ({
        ...prev,
        new: Math.max(0, prev.new - (res.data.status !== 'new' ? 1 : 0)),
        read: prev.read + (res.data.status === 'read' ? 1 : 0),
      }))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Chargement impossible.')
    } finally {
      setSelectedLoading(false)
    }
  }

  const updateStatus = async (id: number, status: Status) => {
    try {
      const res = await api.patch<{ data: SubmissionDetail }>(`/admin/contact-submissions/${id}/status`, { status }, { auth: true })
      setSelected(res.data)
      setRows((prev) => prev.map((r) => r.id === id ? { ...r, status } : r))
      await load()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Mise à jour impossible.')
    }
  }

  const deleteSubmission = async (id: number) => {
    if (!confirm('Supprimer définitivement cette demande ?')) return
    try {
      await api.delete(`/admin/contact-submissions/${id}`, { auth: true })
      setSelected(null)
      await load()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Suppression impossible.')
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
      <header className="mb-8">
        <h1 className="font-display font-semibold text-2xl lg:text-3xl tracking-tight text-zinc-950 dark:text-stone-50">
          Boîte contact
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-stone-400">
          {total} demande{total === 1 ? '' : 's'} au total · {counts.new} nouveau{counts.new === 1 ? '' : 'x'}.
        </p>
      </header>

      {/* Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_auto] gap-3 mb-6">
        <div className="relative">
          <MagnifyingGlass size={15} weight="regular" className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-stone-500" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom, email, message…"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 dark:border-stone-50/15 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-stone-100 placeholder:text-zinc-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-turf-700/20 focus:border-turf-700"
          />
        </div>
        <select
          value={reasonFilter}
          onChange={(e) => setReasonFilter(e.target.value as Reason | 'all')}
          className="px-3 py-2.5 rounded-xl border border-stone-300 dark:border-stone-50/15 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-stone-100"
        >
          <option value="all">Tous les profils</option>
          <option value="joueur">Joueur</option>
          <option value="club">Club</option>
          <option value="medias">Média</option>
          <option value="autre">Autre</option>
        </select>
        <div className="flex gap-1 rounded-xl border border-stone-300 dark:border-stone-50/15 bg-white dark:bg-zinc-900 p-1">
          {(['new', 'read', 'handled', 'archived', 'all'] as const).map((s) => {
            const active = statusFilter === s
            const label = s === 'all' ? 'Tous' : STATUS_META[s].label
            const c = s === 'all' ? '' : ` (${counts[s]})`
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  active
                    ? 'bg-zinc-950 text-stone-50 dark:bg-stone-50 dark:text-zinc-950'
                    : 'text-zinc-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-50/5'
                }`}
              >
                {label}{c}
              </button>
            )
          })}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200 px-3 py-2 text-sm">
          {error}
        </div>
      )}

      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,480px)] gap-6 items-start">
        {/* List */}
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-stone-50/10 overflow-hidden">
          {loading && rows.length === 0 && (
            <div className="p-8 text-sm text-zinc-500 dark:text-stone-400">Chargement…</div>
          )}
          {!loading && rows.length === 0 && (
            <div className="p-8 text-sm text-zinc-500 dark:text-stone-400">
              Aucune demande ne correspond aux filtres.
            </div>
          )}
          <ul className="divide-y divide-stone-200 dark:divide-stone-50/10">
            {rows.map((r) => {
              const meta = REASON_META[r.reason]
              const status = STATUS_META[r.status]
              const isSelected = selected?.id === r.id
              const Icon = meta.Icon
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => openSubmission(r.id)}
                    className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors ${
                      isSelected
                        ? 'bg-stone-100 dark:bg-stone-50/5'
                        : 'hover:bg-stone-50 dark:hover:bg-stone-50/[0.02]'
                    }`}
                  >
                    <span className={`grid place-items-center w-9 h-9 rounded-lg border shrink-0 ${meta.tint}`}>
                      <Icon size={16} weight="regular" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-zinc-950 dark:text-stone-50 truncate">{r.name}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[0.6rem] font-semibold uppercase tracking-wider ${status.className}`}>
                          {status.label}
                        </span>
                        {r.has_cv && (
                          <span className="inline-flex items-center gap-1 text-[0.6rem] uppercase tracking-wider text-zinc-500 dark:text-stone-500">
                            <DownloadSimple size={10} weight="bold" /> CV
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-stone-400 truncate">{r.email}</div>
                      <p className="mt-1 text-xs text-zinc-600 dark:text-stone-400 line-clamp-2 leading-relaxed">{r.snippet}</p>
                    </div>
                    <span className="text-[0.65rem] font-mono text-zinc-400 dark:text-stone-500 shrink-0">{formatDate(r.created_at)}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        {/* Detail */}
        <aside className="rounded-2xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-stone-50/10 p-5 lg:p-6 lg:sticky lg:top-6">
          {!selected && !selectedLoading && (
            <div className="text-sm text-zinc-500 dark:text-stone-400 py-16 text-center">
              Sélectionnez une demande pour voir le détail.
            </div>
          )}
          {selectedLoading && (
            <div className="text-sm text-zinc-500 dark:text-stone-400 py-16 text-center">Chargement…</div>
          )}
          {selected && !selectedLoading && (
            <SubmissionDetailPanel
              submission={selected}
              onStatus={(s) => updateStatus(selected.id, s)}
              onDelete={() => deleteSubmission(selected.id)}
              onClose={() => setSelected(null)}
            />
          )}
        </aside>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Detail panel                                                              */
/* -------------------------------------------------------------------------- */

function SubmissionDetailPanel({
  submission,
  onStatus,
  onDelete,
  onClose,
}: {
  submission: SubmissionDetail
  onStatus: (s: Status) => void
  onDelete: () => void
  onClose: () => void
}) {
  const meta = REASON_META[submission.reason]
  const status = STATUS_META[submission.status]
  const Icon = meta.Icon

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[0.65rem] font-medium border ${meta.tint}`}>
              <Icon size={11} weight="regular" />
              {meta.label}
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[0.6rem] font-semibold uppercase tracking-wider ${status.className}`}>
              {status.label}
            </span>
            <span className="text-[0.65rem] font-mono text-zinc-500 dark:text-stone-500">#{submission.id}</span>
          </div>
          <h2 className="mt-2 font-display font-semibold text-lg text-zinc-950 dark:text-stone-50 leading-tight">
            {submission.name}
          </h2>
          <div className="mt-1 text-xs text-zinc-500 dark:text-stone-400">
            <a href={`mailto:${submission.email}`} className="hover:underline">{submission.email}</a>
            {submission.phone && <> · <a href={`tel:${submission.phone.replace(/\s/g, '')}`} className="hover:underline font-mono">{submission.phone}</a></>}
          </div>
          <div className="mt-0.5 text-[0.65rem] font-mono text-zinc-400 dark:text-stone-500">
            Reçue {formatDate(submission.created_at)}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-zinc-500 hover:text-zinc-900 dark:text-stone-400 dark:hover:text-stone-100"
        >
          Fermer
        </button>
      </div>

      {/* Referenced player (club/media flows) */}
      {submission.player && (
        <div className="mt-5 flex items-center gap-3 rounded-xl border border-stone-200 dark:border-stone-50/10 p-3">
          {submission.player.photo_url ? (
            <img src={submission.player.photo_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
          ) : (
            <div className="w-12 h-12 rounded-lg grid place-items-center bg-stone-100 dark:bg-stone-50/5 text-zinc-400">
              <User size={18} weight="regular" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-xs uppercase tracking-wider font-mono text-zinc-500 dark:text-stone-500">Joueur référencé</div>
            <div className="font-medium text-sm text-zinc-950 dark:text-stone-50 truncate">{submission.player.name}</div>
            <div className="text-xs text-zinc-500 dark:text-stone-400 truncate">
              {submission.player.position ?? '-'}{submission.player.club ? ` · ${submission.player.club}` : ''}
            </div>
          </div>
          <Link
            to={`/admin/joueurs/${submission.player.slug}/edit`}
            className="text-xs text-turf-700 dark:text-turf-300 hover:underline inline-flex items-center gap-1 shrink-0"
          >
            Fiche <ArrowSquareOut size={11} weight="bold" />
          </Link>
        </div>
      )}

      {/* Structured payload */}
      {Object.keys(submission.payload).length > 0 && (
        <div className="mt-5">
          <div className="text-xs uppercase tracking-wider font-mono text-zinc-500 dark:text-stone-500 mb-2">
            Détails du profil
          </div>
          <dl className="rounded-xl border border-stone-200 dark:border-stone-50/10 divide-y divide-stone-200 dark:divide-stone-50/10 overflow-hidden">
            {Object.entries(submission.payload)
              .filter(([k]) => !k.startsWith('_') && k !== 'player_id')
              .map(([k, v]) => (
                <div key={k} className="grid grid-cols-[130px_1fr] gap-3 px-3 py-2 text-xs">
                  <dt className="text-zinc-500 dark:text-stone-500">{PAYLOAD_LABELS[k] ?? k}</dt>
                  <dd className="text-zinc-900 dark:text-stone-100 break-words">
                    {typeof v === 'string' && /^https?:\/\//i.test(v) ? (
                      <a href={v} target="_blank" rel="noopener noreferrer" className="text-turf-700 dark:text-turf-300 hover:underline inline-flex items-center gap-1">
                        {v} <ArrowSquareOut size={10} weight="bold" />
                      </a>
                    ) : (
                      String(v ?? '-')
                    )}
                  </dd>
                </div>
              ))}
          </dl>
        </div>
      )}

      {/* Free-form message */}
      <div className="mt-5">
        <div className="text-xs uppercase tracking-wider font-mono text-zinc-500 dark:text-stone-500 mb-2">Message</div>
        <div className="text-sm text-zinc-900 dark:text-stone-100 whitespace-pre-wrap leading-relaxed rounded-xl border border-stone-200 dark:border-stone-50/10 p-3">
          {submission.message}
        </div>
      </div>

      {/* CV */}
      {submission.cv_url && (
        <a
          href={submission.cv_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex items-center gap-2 rounded-xl border border-stone-300 dark:border-stone-50/15 px-3 py-2 text-sm text-zinc-800 dark:text-stone-100 hover:bg-stone-50 dark:hover:bg-stone-50/5"
        >
          <DownloadSimple size={14} weight="bold" />
          Télécharger le CV
        </a>
      )}

      {/* Actions */}
      <div className="mt-6 pt-5 border-t border-stone-200 dark:border-stone-50/10 flex flex-wrap gap-2">
        {submission.status !== 'handled' && (
          <button
            type="button"
            onClick={() => onStatus('handled')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-turf-600 text-stone-50 text-sm hover:bg-turf-700 transition-colors"
          >
            <CheckCircle size={14} weight="regular" /> Marquer traité
          </button>
        )}
        {submission.status !== 'archived' && (
          <button
            type="button"
            onClick={() => onStatus('archived')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-50/15 text-zinc-700 dark:text-stone-300 text-sm hover:bg-stone-50 dark:hover:bg-stone-50/5"
          >
            Archiver
          </button>
        )}
        {submission.status !== 'new' && (
          <button
            type="button"
            onClick={() => onStatus('new')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-50/15 text-zinc-700 dark:text-stone-300 text-sm hover:bg-stone-50 dark:hover:bg-stone-50/5"
          >
            Rouvrir
          </button>
        )}
        <a
          href={`mailto:${submission.email}?subject=Re:%20votre%20demande%20(#${submission.id})`}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-50/15 text-zinc-700 dark:text-stone-300 text-sm hover:bg-stone-50 dark:hover:bg-stone-50/5"
        >
          <EnvelopeSimple size={14} weight="regular" /> Répondre
        </a>
        <button
          type="button"
          onClick={onDelete}
          className="ml-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-rose-700 dark:text-rose-300 text-sm hover:bg-rose-50 dark:hover:bg-rose-500/10"
        >
          <Trash size={14} weight="regular" /> Supprimer
        </button>
      </div>
    </div>
  )
}

export default AdminContact
