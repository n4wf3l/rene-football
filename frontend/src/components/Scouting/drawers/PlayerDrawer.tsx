import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowSquareOut, CheckCircle, X as XIcon, Warning, ArrowsClockwise } from '@phosphor-icons/react'
import { scoutingApi } from '../../../lib/scoutingApi'
import type { ScoutingPlayerDetail, ScoutingStatus } from '../../../types/scouting'
import { STATUS_LABEL } from '../../../types/scouting'
import Skeleton from '../../Skeleton'
import { CompletenessBar, ScoreBadge, StatusBadge, NextActionBadge } from '../badges'
import Toast, { type ToastState } from '../../Toast'

interface Props { slug: string; onClose: () => void }

type Tab = 'resume' | 'reports' | 'scores' | 'videos' | 'risks' | 'history' | 'sources' | 'actions'

const TABS: { key: Tab; label: string }[] = [
  { key: 'resume',  label: 'Résumé' },
  { key: 'reports', label: 'Rapports' },
  { key: 'scores',  label: 'Scores' },
  { key: 'videos',  label: 'Vidéos' },
  { key: 'risks',   label: 'Risques' },
  { key: 'history', label: 'Historique' },
  { key: 'sources', label: 'Sources' },
  { key: 'actions', label: 'Actions' },
]

function PlayerDrawer({ slug, onClose }: Props) {
  const [detail, setDetail] = useState<ScoutingPlayerDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('resume')
  const [toast, setToast] = useState<ToastState | null>(null)
  const [saving, setSaving] = useState(false)

  const reload = async () => {
    setLoading(true)
    const res = await scoutingApi.showPlayer(slug)
    setDetail(res)
    setLoading(false)
  }

  useEffect(() => { reload().catch(() => setLoading(false)); /* eslint-disable-next-line */ }, [slug])

  const showToast = (kind: ToastState['kind'], message: string) => {
    setToast({ kind, message })
    setTimeout(() => setToast(null), 3000)
  }

  const patch = async (body: Parameters<typeof scoutingApi.patchPlayer>[1]) => {
    setSaving(true)
    try {
      const res = await scoutingApi.patchPlayer(slug, body)
      setDetail(res)
      showToast('success', 'Joueur mis à jour.')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erreur'
      showToast('error', msg)
    } finally {
      setSaving(false)
    }
  }

  const refresh = async () => {
    setSaving(true)
    try {
      const res = await scoutingApi.refreshScores(slug)
      setDetail(res)
      showToast('success', 'Scores recalculés.')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erreur'
      showToast('error', msg)
    } finally {
      setSaving(false)
    }
  }

  const p = detail?.data

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-zinc-950/40"
      />
      <motion.aside
        initial={{ x: 480 }} animate={{ x: 0 }} exit={{ x: 480 }}
        transition={{ type: 'spring', stiffness: 280, damping: 32 }}
        className="fixed top-0 right-0 h-[100dvh] w-full max-w-2xl bg-stone-50 dark:bg-zinc-950 shadow-2xl flex flex-col z-50"
      >
        <header className="flex items-center justify-between px-6 h-16 border-b border-stone-200 dark:border-stone-50/8 bg-white dark:bg-zinc-900">
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-turf-700 dark:text-turf-300">Joueur scouting</div>
            <div className="font-display font-semibold text-lg text-zinc-950 dark:text-stone-50 truncate">{p?.name ?? slug}</div>
          </div>
          <a
            href={`/joueurs/${slug}`}
            target="_blank" rel="noopener"
            className="grid place-items-center w-9 h-9 rounded-full text-zinc-500 hover:bg-stone-100 hover:text-zinc-900 dark:text-stone-400 dark:hover:bg-stone-50/8 dark:hover:text-stone-50 transition"
            aria-label="Voir la fiche publique"
            title="Voir la fiche publique"
          >
            <ArrowSquareOut size={16} weight="regular" />
          </a>
          <button
            type="button"
            onClick={onClose}
            className="grid place-items-center w-9 h-9 rounded-full text-zinc-500 hover:bg-stone-100 hover:text-zinc-900 dark:text-stone-400 dark:hover:bg-stone-50/8 dark:hover:text-stone-50 transition"
            aria-label="Fermer"
          >
            <XIcon size={18} weight="bold" />
          </button>
        </header>

        {/* Tabs */}
        <div className="px-6 border-b border-stone-200 dark:border-stone-50/8 bg-white dark:bg-zinc-900 overflow-x-auto">
          <div className="flex gap-1 py-2 min-w-max">
            {TABS.map((t) => {
              const active = tab === t.key
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                    active
                      ? 'bg-zinc-950 text-stone-50 dark:bg-stone-50 dark:text-zinc-950'
                      : 'text-zinc-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-50/5'
                  }`}
                >
                  {t.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading && (
            <div className="space-y-3">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          )}
          {!loading && p && (
            <>
              {tab === 'resume' && <ResumeTab detail={detail!} onPatch={patch} onRefresh={refresh} saving={saving} />}
              {tab === 'reports' && <ReportsTab detail={detail!} />}
              {tab === 'scores' && <ScoresTab detail={detail!} onRefresh={refresh} saving={saving} />}
              {tab === 'videos' && <VideosTab detail={detail!} />}
              {tab === 'risks' && <RisksTab detail={detail!} />}
              {tab === 'history' && <HistoryTab detail={detail!} />}
              {tab === 'sources' && <SourcesTab detail={detail!} />}
              {tab === 'actions' && <ActionsTab detail={detail!} onPatch={patch} saving={saving} />}
            </>
          )}
        </div>
      </motion.aside>

      <AnimatePresence>
        {toast && <Toast {...toast} onDismiss={() => setToast(null)} />}
      </AnimatePresence>
    </>
  )
}

/* ---------- Tab contents ---------- */

function ResumeTab({ detail, onPatch, onRefresh, saving }: { detail: ScoutingPlayerDetail; onPatch: (body: any) => void; onRefresh: () => void; saving: boolean }) {
  const p = detail.data
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-4">
        <img src={p.photo_url || ''} alt="" className="w-20 h-20 rounded-2xl object-cover bg-stone-200 dark:bg-stone-800" />
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={p.scouting_status} />
            <span className="text-[0.7rem] text-zinc-500 dark:text-stone-400">{p.position} · {p.club ?? '-'} · {p.age ?? '-'} ans</span>
          </div>
          <p className="text-sm text-zinc-700 dark:text-stone-300 leading-relaxed">{p.scout_summary || <span className="italic text-zinc-400 dark:text-stone-500">Pas de résumé scout encore.</span>}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <Metric label="Global"     value={p.score_global} />
        <Metric label="Potentiel"  value={p.score_potential} />
        <Metric label="Club fit"   value={p.score_club_fit} />
        <Metric label="Confiance"  value={p.score_confidence} />
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-[0.65rem] font-mono uppercase tracking-[0.16em] text-zinc-500 dark:text-stone-400">Complétude dossier</span>
          <button
            type="button"
            onClick={onRefresh}
            disabled={saving}
            className="text-[0.7rem] text-turf-700 dark:text-turf-300 hover:underline disabled:opacity-50 inline-flex items-center gap-1"
          >
            <ArrowsClockwise size={11} weight="bold" /> Recalculer
          </button>
        </div>
        <CompletenessBar percent={detail.completeness_pct} />
        {detail.missing.length > 0 && (
          <ul className="mt-3 text-xs text-zinc-600 dark:text-stone-400 space-y-1">
            {detail.missing.slice(0, 6).map((m) => (
              <li key={m} className="flex items-center gap-2"><Warning size={12} className="text-amber-600 dark:text-amber-400" /> {m}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-stone-50/8 p-4">
        <div className="text-[0.65rem] font-mono uppercase tracking-[0.16em] text-zinc-500 dark:text-stone-400 mb-2">Prochaine action</div>
        <NextActionBadge action={p.next_action} />
        <input
          type="text"
          defaultValue={p.next_action ?? ''}
          onBlur={(e) => {
            const v = e.target.value.trim() || null
            if (v !== p.next_action) onPatch({ next_action: v })
          }}
          placeholder="Ajouter une prochaine action…"
          className="mt-3 w-full rounded-lg border border-stone-300 bg-white dark:bg-zinc-950 dark:border-stone-50/15 dark:text-stone-50 px-3 py-2 text-sm focus:outline-none focus:border-zinc-900 dark:focus:border-turf-300"
        />
      </div>

      {!detail.shortlist_a_gate.ok && (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-400/30 px-4 py-3">
          <div className="text-[0.65rem] font-mono uppercase tracking-[0.16em] text-amber-800 dark:text-amber-300 mb-1.5">Passage Shortlist A - prérequis</div>
          <ul className="text-xs text-amber-900 dark:text-amber-200 space-y-1">
            {detail.shortlist_a_gate.reasons.map((r, i) => <li key={i}>• {r}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-stone-50/8 p-3">
      <div className="text-[0.6rem] font-mono uppercase tracking-[0.16em] text-zinc-500 dark:text-stone-400">{label}</div>
      <div className="mt-1 font-mono text-2xl tabular-nums text-zinc-950 dark:text-stone-50">{value == null ? '-' : Math.round(value)}</div>
    </div>
  )
}

function ReportsTab({ detail }: { detail: ScoutingPlayerDetail }) {
  const reports = detail.data.scouting_reports ?? []
  if (reports.length === 0) return <EmptyTab message="Aucun rapport scout pour ce joueur." />
  return (
    <ul className="space-y-2">
      {reports.map((r) => (
        <li key={r.id} className="rounded-xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-stone-50/8 p-3">
          <div className="flex items-center justify-between">
            <div className="text-xs text-zinc-500 dark:text-stone-400">
              {r.match ? `${r.match.home_team} - ${r.match.away_team}` : 'Hors match'} · {r.scout?.name ?? '-'}
            </div>
            <span className="text-xs font-mono tabular-nums text-zinc-700 dark:text-stone-300">{r.global_rating != null ? `${Number(r.global_rating).toFixed(1)}/10` : '-'}</span>
          </div>
          {r.strengths && <p className="mt-1.5 text-sm text-zinc-700 dark:text-stone-300 line-clamp-2">{r.strengths}</p>}
          {r.next_action && <div className="mt-2"><NextActionBadge action={r.next_action} /></div>}
        </li>
      ))}
    </ul>
  )
}

function ScoresTab({ detail, onRefresh, saving }: { detail: ScoutingPlayerDetail; onRefresh: () => void; saving: boolean }) {
  const p = detail.data
  const rows: Array<[string, number | null]> = [
    ['Niveau actuel',     p.score_current],
    ['Potentiel',         p.score_potential],
    ['Compatibilité club',p.score_club_fit],
    ['Marché',            p.score_market],
    ['Risque (haut = pire)', p.score_risk],
    ['Confiance',         p.score_confidence],
    ['Score global',      p.score_global],
  ]
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onRefresh}
        disabled={saving}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-turf-50 border border-turf-200 text-turf-800 hover:bg-turf-100 dark:bg-turf-800/30 dark:border-turf-300/30 dark:text-turf-200 transition disabled:opacity-50"
      >
        <ArrowsClockwise size={12} weight="bold" /> Recalculer depuis les rapports + risques
      </button>
      <div className="rounded-xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-stone-50/8 divide-y divide-stone-200 dark:divide-stone-50/8">
        {rows.map(([label, val]) => (
          <div key={label} className="px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-zinc-700 dark:text-stone-300">{label}</span>
            <ScoreBadge score={val} />
          </div>
        ))}
      </div>
    </div>
  )
}

function VideosTab({ detail }: { detail: ScoutingPlayerDetail }) {
  const clips = (detail.data.clips ?? []) as Array<{ id: number; title: string; image_path: string; video_source_label?: string | null; timestamp_seconds?: number | null }>
  if (clips.length === 0) return <EmptyTab message="Aucun clip annoté. Va dans /admin/joueurs pour en attacher." />
  return (
    <ul className="grid grid-cols-2 gap-2">
      {clips.map((c) => (
        <li key={c.id} className="rounded-xl overflow-hidden bg-white dark:bg-zinc-900 border border-stone-200 dark:border-stone-50/8">
          {c.image_path && <img src={c.image_path} alt="" className="w-full aspect-[16/9] object-cover bg-stone-200 dark:bg-stone-800" />}
          <div className="px-3 py-2">
            <div className="text-xs font-medium text-zinc-950 dark:text-stone-50 truncate">{c.title}</div>
            <div className="text-[0.65rem] text-zinc-500 dark:text-stone-400 truncate">{c.video_source_label ?? ''}{c.timestamp_seconds ? ` · ${Math.round(c.timestamp_seconds)}s` : ''}</div>
          </div>
        </li>
      ))}
    </ul>
  )
}

function RisksTab({ detail }: { detail: ScoutingPlayerDetail }) {
  const risks = detail.data.risks ?? []
  if (risks.length === 0) return <EmptyTab message="Aucun risque évalué pour ce joueur." />
  return (
    <ul className="space-y-2">
      {risks.map((r) => (
        <li key={r.id} className="rounded-xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-stone-50/8 p-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[0.6rem] font-mono uppercase tracking-[0.16em] text-zinc-500 dark:text-stone-400">{r.risk_type}</span>
            <span className="text-[0.6rem] font-mono tabular-nums text-zinc-500 dark:text-stone-400">P:{r.probability} · I:{r.impact}</span>
            <span className="ml-auto text-[0.6rem] font-mono uppercase tracking-[0.16em] text-zinc-500 dark:text-stone-400">{r.status}</span>
          </div>
          <div className="font-medium text-sm text-zinc-950 dark:text-stone-50">{r.title}</div>
          {r.description && <div className="mt-1 text-xs text-zinc-600 dark:text-stone-400">{r.description}</div>}
          {r.mitigation_plan && <div className="mt-2 text-xs text-zinc-600 dark:text-stone-400"><span className="font-mono uppercase text-[0.55rem] tracking-wider mr-1">Mitigation:</span>{r.mitigation_plan}</div>}
        </li>
      ))}
    </ul>
  )
}

function HistoryTab({ detail }: { detail: ScoutingPlayerDetail }) {
  const hist = detail.data.status_history ?? []
  if (hist.length === 0) return <EmptyTab message="Pas d'historique de statut." />
  return (
    <ul className="space-y-2">
      {hist.map((h) => (
        <li key={h.id} className="flex items-center gap-3 text-sm">
          <span className="font-mono text-[0.65rem] text-zinc-500 dark:text-stone-400 tabular-nums w-24">{new Date(h.created_at).toLocaleDateString('fr-FR')}</span>
          <span className="text-xs text-zinc-700 dark:text-stone-300">
            {h.old_status ? <><span className="text-zinc-400">{STATUS_LABEL[h.old_status as keyof typeof STATUS_LABEL]}</span> → </> : null}
            <strong className="text-zinc-950 dark:text-stone-50">{STATUS_LABEL[h.new_status]}</strong>
          </span>
          {h.reason && <span className="text-xs text-zinc-500 dark:text-stone-400 truncate">- {h.reason}</span>}
        </li>
      ))}
    </ul>
  )
}

function SourcesTab({ detail }: { detail: ScoutingPlayerDetail }) {
  const sources = detail.data.sources ?? []
  if (sources.length === 0) return <EmptyTab message="Aucune source enregistrée." />
  return (
    <div className="rounded-xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-stone-50/8 divide-y divide-stone-200 dark:divide-stone-50/8">
      {sources.map((s) => (
        <div key={s.id} className="px-4 py-2.5 grid grid-cols-[1fr_2fr_auto] gap-3 items-center text-sm">
          <span className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-zinc-500 dark:text-stone-400">{s.field_name}</span>
          <span className="text-zinc-900 dark:text-stone-50 truncate">{s.value ?? '-'}</span>
          <span className="text-[0.65rem] font-mono text-zinc-500 dark:text-stone-400">{s.source_type} · {s.reliability_score ?? '-'}</span>
        </div>
      ))}
    </div>
  )
}

function ActionsTab({ detail, onPatch, saving }: { detail: ScoutingPlayerDetail; onPatch: (body: any) => void; saving: boolean }) {
  const p = detail.data
  const statuses: ScoutingStatus[] = ['decouvert', 'watchlist', 'shortlist_b', 'shortlist_a', 'valide', 'rejete', 'archive']
  return (
    <div className="space-y-4">
      <div>
        <div className="text-[0.65rem] font-mono uppercase tracking-[0.16em] text-zinc-500 dark:text-stone-400 mb-2">Statut scouting</div>
        <div className="flex flex-wrap gap-1.5">
          {statuses.map((s) => {
            const active = p.scouting_status === s
            return (
              <button
                key={s}
                type="button"
                disabled={saving}
                onClick={() => onPatch({ scouting_status: s })}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition disabled:opacity-50 ${
                  active
                    ? 'bg-zinc-950 border-zinc-950 text-stone-50 dark:bg-stone-50 dark:border-stone-50 dark:text-zinc-950'
                    : 'bg-white border-stone-300 text-zinc-700 hover:border-zinc-500 dark:bg-zinc-900 dark:border-stone-50/15 dark:text-stone-300 dark:hover:border-stone-50/40'
                }`}
              >
                {STATUS_LABEL[s]}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <div className="text-[0.65rem] font-mono uppercase tracking-[0.16em] text-zinc-500 dark:text-stone-400 mb-2">Résumé scout</div>
        <textarea
          rows={4}
          defaultValue={p.scout_summary ?? ''}
          onBlur={(e) => {
            const v = e.target.value.trim() || null
            if (v !== p.scout_summary) onPatch({ scout_summary: v })
          }}
          placeholder="Quelques lignes pour résumer le profil scout…"
          className="w-full rounded-lg border border-stone-300 bg-white dark:bg-zinc-950 dark:border-stone-50/15 dark:text-stone-50 px-3 py-2 text-sm focus:outline-none focus:border-zinc-900 dark:focus:border-turf-300"
        />
      </div>
    </div>
  )
}

function EmptyTab({ message }: { message: string }) {
  return (
    <div className="grid place-items-center py-12 text-center">
      <CheckCircle size={20} weight="duotone" className="text-zinc-400 dark:text-stone-500 mb-2" />
      <p className="text-sm text-zinc-600 dark:text-stone-400 max-w-sm">{message}</p>
    </div>
  )
}

export default PlayerDrawer
