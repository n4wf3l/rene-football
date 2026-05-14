import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, FilePdf, NotePencil, X as XIcon } from '@phosphor-icons/react'
import { scoutingApi } from '../../../lib/scoutingApi'
import type { ScoutingReport } from '../../../types/scouting'
import Skeleton from '../../Skeleton'
import Toast, { type ToastState } from '../../Toast'
import { ReportStatusBadge } from '../badges'

interface Props { id: number; onClose: () => void }

function ReportDrawer({ id, onClose }: Props) {
  const [report, setReport] = useState<ScoutingReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [busy, setBusy] = useState(false)

  const reload = async () => {
    const res = await scoutingApi.showReport(id)
    setReport(res.data)
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    reload().catch(() => {}).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line
  }, [id])

  const showToast = (kind: ToastState['kind'], message: string) => {
    setToast({ kind, message })
    setTimeout(() => setToast(null), 3000)
  }

  const action = async (fn: () => Promise<unknown>, success: string) => {
    setBusy(true)
    try {
      await fn()
      await reload()
      showToast('success', success)
    } catch (e: unknown) {
      showToast('error', e instanceof Error ? e.message : 'Erreur')
    } finally {
      setBusy(false)
    }
  }

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
        className="fixed top-0 right-0 h-[100dvh] w-full max-w-xl bg-stone-50 dark:bg-zinc-950 shadow-2xl flex flex-col z-50"
      >
        <header className="flex items-center justify-between px-6 h-16 border-b border-stone-200 dark:border-stone-50/8 bg-white dark:bg-zinc-900">
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-turf-700 dark:text-turf-300">Rapport scout</div>
            <div className="font-display font-semibold text-lg text-zinc-950 dark:text-stone-50 truncate">{report?.player?.name ?? '—'}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid place-items-center w-9 h-9 rounded-full text-zinc-500 hover:bg-stone-100 hover:text-zinc-900 dark:text-stone-400 dark:hover:bg-stone-50/8 dark:hover:text-stone-50 transition"
          >
            <XIcon size={18} weight="bold" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading && <div className="space-y-3"><Skeleton className="h-6 w-32" /><Skeleton className="h-40 w-full" /></div>}
          {!loading && report && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 flex-wrap">
                <ReportStatusBadge status={report.status} />
                {report.match && (
                  <span className="text-xs text-zinc-500 dark:text-stone-400">
                    {report.match.home_team} – {report.match.away_team}
                  </span>
                )}
                <span className="text-xs text-zinc-500 dark:text-stone-400">· {report.scout?.name ?? '—'}</span>
                {report.global_rating != null && (
                  <span className="ml-auto font-mono text-lg tabular-nums text-zinc-950 dark:text-stone-50">{Number(report.global_rating).toFixed(1)}/10</span>
                )}
              </div>

              {report.tactical_role && (
                <Section label="Rôle tactique"><p className="text-sm">{report.tactical_role}</p></Section>
              )}
              {report.strengths && (
                <Section label="Points forts"><p className="text-sm text-zinc-700 dark:text-stone-300 whitespace-pre-line">{report.strengths}</p></Section>
              )}
              {report.weaknesses && (
                <Section label="Points faibles"><p className="text-sm text-zinc-700 dark:text-stone-300 whitespace-pre-line">{report.weaknesses}</p></Section>
              )}

              {report.scores && report.scores.length > 0 && (
                <Section label="Notes par critère">
                  <div className="rounded-xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-stone-50/8 divide-y divide-stone-200 dark:divide-stone-50/8">
                    {report.scores.map((s) => (
                      <div key={`${s.category}-${s.criterion}`} className="px-3 py-2 flex items-center justify-between text-sm">
                        <div>
                          <span className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-zinc-500 dark:text-stone-400 mr-2">{s.category}</span>
                          <span className="text-zinc-900 dark:text-stone-50">{s.criterion}</span>
                        </div>
                        <span className="font-mono tabular-nums text-zinc-900 dark:text-stone-50">{s.score}/10</span>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {report.recommendation && (
                <Section label="Recommandation">
                  <span className="inline-block px-3 py-1 rounded-full bg-turf-50 dark:bg-turf-800/30 text-turf-800 dark:text-turf-200 text-xs font-medium uppercase tracking-wider border border-turf-200 dark:border-turf-300/30">
                    {report.recommendation.replace(/_/g, ' ')}
                  </span>
                </Section>
              )}

              {report.next_action && (
                <Section label="Prochaine action">
                  <p className="text-sm text-zinc-700 dark:text-stone-300">{report.next_action}</p>
                </Section>
              )}
            </div>
          )}
        </div>

        {!loading && report && (
          <footer className="border-t border-stone-200 dark:border-stone-50/8 bg-white dark:bg-zinc-900 px-6 py-4 flex flex-wrap items-center gap-2">
            {report.status !== 'validated' && report.status !== 'archived' && (
              <button
                type="button"
                disabled={busy}
                onClick={() => action(() => scoutingApi.validateReport(report.id), 'Rapport validé.')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-turf-800 text-stone-50 hover:bg-turf-700 transition disabled:opacity-50"
              >
                <Check size={12} weight="bold" /> Valider
              </button>
            )}
            {report.status !== 'needs_changes' && report.status !== 'archived' && (
              <button
                type="button"
                disabled={busy}
                onClick={() => action(() => scoutingApi.requestChanges(report.id), 'Corrections demandées.')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 dark:bg-amber-800/30 dark:border-amber-300/30 dark:text-amber-200 transition disabled:opacity-50"
              >
                <NotePencil size={12} weight="bold" /> Demander corrections
              </button>
            )}
            {report.status === 'draft' && (
              <button
                type="button"
                disabled={busy}
                onClick={() => action(() => scoutingApi.submitReport(report.id), 'Rapport soumis.')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-50 border border-blue-200 text-blue-800 hover:bg-blue-100 dark:bg-blue-800/30 dark:border-blue-300/30 dark:text-blue-200 transition disabled:opacity-50"
              >
                <FilePdf size={12} weight="bold" /> Soumettre
              </button>
            )}
            <span className="ml-auto text-[0.65rem] font-mono text-zinc-500 dark:text-stone-400">
              ID #{report.id} · {new Date(report.created_at).toLocaleDateString('fr-FR')}
            </span>
          </footer>
        )}
      </motion.aside>

      <AnimatePresence>
        {toast && <Toast {...toast} onDismiss={() => setToast(null)} />}
      </AnimatePresence>
    </>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[0.65rem] font-mono uppercase tracking-[0.16em] text-zinc-500 dark:text-stone-400 mb-1.5">{label}</div>
      {children}
    </div>
  )
}

export default ReportDrawer
