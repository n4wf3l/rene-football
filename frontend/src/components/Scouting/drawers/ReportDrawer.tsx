import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowBendUpLeft,
  Check,
  FilePdf,
  NotePencil,
  PaperPlaneTilt,
  UserCircle,
  X as XIcon,
} from '@phosphor-icons/react'
import { scoutingApi } from '../../../lib/scoutingApi'
import type { ScoutingReport, ScoutingReportTransition } from '../../../types/scouting'
import Skeleton from '../../Skeleton'
import Toast, { type ToastState } from '../../Toast'
import { ReportStatusBadge } from '../badges'
import ReportActionModal, { type ReportAction, type ReportActionResult } from '../ReportActionModal'

interface Props { id: number; onClose: () => void }

function ReportDrawer({ id, onClose }: Props) {
  const [report, setReport] = useState<ScoutingReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [busy, setBusy] = useState(false)
  const [modal, setModal] = useState<ReportAction | null>(null)

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

  /** Executes the API call associated with the modal action, handles loading + toast. */
  const runAction = async (action: ReportAction, result: ReportActionResult) => {
    if (!report) return
    setBusy(true)
    try {
      if (action === 'submit') {
        await scoutingApi.submitReport(report.id, {
          submitted_to: result.recipientId ?? undefined,
          comment: result.comment,
        })
        showToast('success', 'Rapport soumis.')
      } else if (action === 'validate') {
        await scoutingApi.validateReport(report.id, { comment: result.comment })
        showToast('success', 'Rapport validé.')
      } else if (action === 'request_changes') {
        await scoutingApi.requestChanges(report.id, {
          comment: result.comment,
          to_user: result.recipientId ?? undefined,
        })
        showToast('success', 'Corrections demandées.')
      }
      await reload()
      setModal(null)
    } catch (e: unknown) {
      showToast('error', e instanceof Error ? e.message : 'Erreur')
    } finally {
      setBusy(false)
    }
  }

  // Recipient pre-selected in the modal. `submitted_to` can be either an integer FK
  // (when the relation isn't loaded) or the eager-loaded `{ id, name }` object - handle both.
  const currentRecipient = ((): { id: number; name: string } | null => {
    if (!report) return null
    const v = report.submitted_to
    if (v && typeof v === 'object') return v
    return null
  })()
  const currentRecipientId = currentRecipient?.id ?? null

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
            <div className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-turf-700 dark:text-turf-300">Rapport scout</div>
            <div className="font-display font-semibold text-lg text-zinc-950 dark:text-stone-50 truncate">{report?.player?.name ?? '-'}</div>
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
                    {report.match.home_team} - {report.match.away_team}
                  </span>
                )}
                <span className="text-xs text-zinc-500 dark:text-stone-400">· {report.scout?.name ?? '-'}</span>
                {report.global_rating != null && (
                  <span className="ml-auto font-mono text-lg tabular-nums text-zinc-950 dark:text-stone-50">{Number(report.global_rating).toFixed(1)}/10</span>
                )}
              </div>

              {/* Routing summary - who's currently expected to action it. */}
              {(report.status === 'submitted' || report.status === 'needs_changes') && currentRecipient && (
                <div className="rounded-xl border border-stone-200/70 dark:border-stone-50/[0.06] bg-white dark:bg-zinc-900 px-3 py-2.5 flex items-center gap-2.5">
                  <UserCircle size={16} weight="duotone" className="text-turf-700 dark:text-turf-300 shrink-0" />
                  <div className="text-sm text-zinc-700 dark:text-stone-200">
                    {report.status === 'submitted' ? 'En attente de validation par' : 'À corriger par'}
                    <span className="font-medium text-zinc-950 dark:text-stone-50 ml-1">{currentRecipient.name}</span>
                  </div>
                </div>
              )}

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
                          <span className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-zinc-500 dark:text-stone-400 mr-2">{s.category}</span>
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

              {/* Audit timeline - always last so the meat of the report comes first. */}
              {report.transitions && report.transitions.length > 0 && (
                <Section label={`Historique (${report.transitions.length})`}>
                  <TransitionTimeline transitions={report.transitions} />
                </Section>
              )}
            </div>
          )}
        </div>

        {!loading && report && (
          <footer className="border-t border-stone-200 dark:border-stone-50/8 bg-white dark:bg-zinc-900 px-6 py-4 space-y-3">
            <ActionPanel
              report={report}
              busy={busy}
              onOpenModal={setModal}
              onArchive={async () => {
                setBusy(true)
                try {
                  await scoutingApi.archiveReport(report.id)
                  await reload()
                  showToast('success', 'Rapport archivé.')
                } catch (e: unknown) {
                  showToast('error', e instanceof Error ? e.message : 'Erreur')
                } finally { setBusy(false) }
              }}
            />
            <div className="text-[0.62rem] font-mono text-zinc-500 dark:text-stone-400 text-right">
              ID #{report.id} · créé le {new Date(report.created_at).toLocaleDateString('fr-FR')}
            </div>
          </footer>
        )}
      </motion.aside>

      <AnimatePresence>
        {modal && (
          <ReportActionModal
            action={modal}
            defaultRecipientId={modal === 'request_changes'
              ? (report?.scout?.id ?? null)
              : currentRecipientId}
            showRecipientPicker={modal !== 'validate'}
            busy={busy}
            onClose={() => !busy && setModal(null)}
            onConfirm={(result) => runAction(modal, result)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && <Toast {...toast} onDismiss={() => setToast(null)} />}
      </AnimatePresence>
    </>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[0.62rem] font-mono uppercase tracking-[0.12em] text-zinc-500 dark:text-stone-400 mb-1.5">{label}</div>
      {children}
    </div>
  )
}

/* ───────────────────── Transition timeline ───────────────────── */

const STATUS_DOT: Record<string, string> = {
  draft:         'bg-stone-400 dark:bg-stone-500',
  submitted:     'bg-sky-500',
  needs_changes: 'bg-amber-500',
  validated:     'bg-turf-500',
  archived:      'bg-zinc-500',
}

const STATUS_LABEL_FR: Record<string, string> = {
  draft:         'Brouillon',
  submitted:     'Soumis',
  needs_changes: 'Corrections demandées',
  validated:     'Validé',
  archived:      'Archivé',
}

function statusLabel(s: string): string {
  return STATUS_LABEL_FR[s] ?? s
}

function TransitionTimeline({ transitions }: { transitions: ScoutingReportTransition[] }) {
  return (
    <ol className="relative ml-2 border-l border-stone-200 dark:border-stone-50/10 space-y-3.5 pl-4">
      {transitions.map((t) => (
        <li key={t.id} className="relative">
          <span
            aria-hidden
            className={`absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full ring-2 ring-stone-50 dark:ring-zinc-950 ${STATUS_DOT[t.to_status] ?? 'bg-stone-400'}`}
          />
          <div className="flex items-baseline justify-between gap-3">
            <div className="text-sm">
              <span className="font-medium text-zinc-950 dark:text-stone-50">
                {statusLabel(t.to_status)}
              </span>
              {t.from_user && (
                <span className="text-zinc-600 dark:text-stone-400"> par {t.from_user.name}</span>
              )}
              {t.to_user && (
                <span className="text-zinc-600 dark:text-stone-400">
                  {' '}<ArrowBendUpLeft size={11} weight="bold" className="inline -mt-0.5 mx-0.5 opacity-60" /> {t.to_user.name}
                </span>
              )}
            </div>
            <span className="font-mono text-[0.65rem] text-zinc-500 dark:text-stone-500 tabular-nums shrink-0">
              {new Date(t.created_at).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          {t.comment && (
            <div className="mt-1 text-[0.78rem] text-zinc-700 dark:text-stone-300 italic">
              « {t.comment} »
            </div>
          )}
        </li>
      ))}
    </ol>
  )
}

/* ───────────────────── ActionPanel ─────────────────────
   Replaces the previous 4-pill footer. For each status, surfaces a *primary*
   action (recommended next step) with explanatory copy, an optional secondary
   action, and the archive action as a small text link. This makes "Valider",
   "Demander corrections" and "Archiver" self-explanatory without tooltips.
-------------------------------------------------------------------------- */

interface ActionPanelProps {
  report: ScoutingReport
  busy?: boolean
  onOpenModal: (a: ReportAction) => void
  onArchive: () => void
}

function ActionPanel({ report, busy, onOpenModal, onArchive }: ActionPanelProps) {
  const status = report.status
  const recipient = (report.submitted_to && typeof report.submitted_to === 'object')
    ? report.submitted_to.name
    : null

  if (status === 'archived') {
    return (
      <div className="rounded-xl border border-stone-200 dark:border-stone-50/[0.06] bg-stone-50 dark:bg-stone-50/[0.02] px-3 py-2.5 text-sm text-zinc-600 dark:text-stone-400">
        Ce rapport est archivé. Plus aucune action n'est requise.
      </div>
    )
  }

  if (status === 'validated') {
    return (
      <>
        <div className="rounded-xl border border-turf-200/70 dark:border-turf-400/20 bg-turf-50 dark:bg-turf-900/20 px-3 py-2.5 text-sm text-turf-900 dark:text-turf-100">
          ✓ Rapport validé. Il fait foi pour la décision de shortlist et reste disponible dans l'historique.
        </div>
        <div className="flex items-center justify-end">
          <ArchiveLink onClick={onArchive} busy={busy} />
        </div>
      </>
    )
  }

  // Le scout (auteur) doit corriger et resoumettre.
  if (status === 'needs_changes') {
    return (
      <>
        <ActionCard
          tone="primary"
          icon={PaperPlaneTilt}
          title="Resoumettre après corrections"
          description="Le scout met à jour le rapport puis le renvoie au validateur. Une note peut être jointe pour expliquer ce qui a changé."
          cta="Resoumettre"
          onClick={() => onOpenModal('submit')}
          busy={busy}
        />
        <div className="flex items-center justify-end">
          <ArchiveLink onClick={onArchive} busy={busy} label="Abandonner le rapport" />
        </div>
      </>
    )
  }

  // status === 'submitted' : Validateur peut valider ou demander corrections.
  if (status === 'submitted') {
    return (
      <>
        <ActionCard
          tone="primary"
          icon={Check}
          title="Valider le rapport"
          description={`Confirme que le rapport est exploitable. Le statut passe à "Validé" et le joueur peut être promu en shortlist A. ${recipient ? `Vous validez en tant que ${recipient}.` : ''}`}
          cta="Valider le rapport"
          onClick={() => onOpenModal('validate')}
          busy={busy}
        />
        <ActionCard
          tone="warning"
          icon={NotePencil}
          title="Demander des corrections"
          description="Renvoie le rapport au scout pour complément (vidéo, 2e angle d'observation, données manquantes…). Votre note explique précisément ce qui manque."
          cta="Demander corrections"
          onClick={() => onOpenModal('request_changes')}
          busy={busy}
        />
        <div className="flex items-center justify-end">
          <ArchiveLink onClick={onArchive} busy={busy} />
        </div>
      </>
    )
  }

  // status === 'draft' : Scout doit soumettre.
  return (
    <>
      <ActionCard
        tone="primary"
        icon={PaperPlaneTilt}
        title="Soumettre pour validation"
        description="Envoie le rapport à un chef de scouting (auto-routé selon la catégorie du joueur). Vous pouvez aussi choisir manuellement le destinataire."
        cta="Soumettre"
        onClick={() => onOpenModal('submit')}
        busy={busy}
      />
    </>
  )
}

interface ActionCardProps {
  tone: 'primary' | 'warning'
  icon: typeof Check
  title: string
  description: string
  cta: string
  onClick: () => void
  busy?: boolean
}

function ActionCard({ tone, icon: Icon, title, description, cta, onClick, busy }: ActionCardProps) {
  const wrap = tone === 'primary'
    ? 'rounded-xl border border-turf-200/70 dark:border-turf-400/20 bg-turf-50/70 dark:bg-turf-900/15'
    : 'rounded-xl border border-amber-200/70 dark:border-amber-400/20 bg-amber-50/60 dark:bg-amber-500/[0.06]'
  const iconWrap = tone === 'primary'
    ? 'bg-turf-700 text-stone-50'
    : 'bg-amber-500 text-stone-50'
  const titleColor = tone === 'primary'
    ? 'text-turf-900 dark:text-turf-50'
    : 'text-amber-900 dark:text-amber-50'
  const descColor = tone === 'primary'
    ? 'text-turf-800/80 dark:text-turf-100/80'
    : 'text-amber-900/80 dark:text-amber-100/80'
  const btn = tone === 'primary'
    ? 'bg-turf-700 hover:bg-turf-600 text-stone-50'
    : 'bg-amber-600 hover:bg-amber-500 text-stone-50'
  return (
    <div className={`${wrap} p-3 flex items-start gap-3`}>
      <span className={`grid place-items-center w-8 h-8 rounded-lg shrink-0 ${iconWrap}`}>
        <Icon size={14} weight="bold" />
      </span>
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium ${titleColor}`}>{title}</div>
        <p className={`text-[0.78rem] leading-relaxed mt-0.5 ${descColor}`}>{description}</p>
      </div>
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-50 ${btn}`}
      >
        {cta}
      </button>
    </div>
  )
}

function ArchiveLink({ onClick, busy, label = 'Archiver le rapport' }: { onClick: () => void; busy?: boolean; label?: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        if (busy) return
        if (confirm('Archiver ce rapport ? Il sera retiré des files actives mais reste consultable dans l\'historique.')) {
          onClick()
        }
      }}
      disabled={busy}
      className="inline-flex items-center gap-1.5 text-[0.72rem] text-zinc-500 hover:text-zinc-800 dark:text-stone-400 dark:hover:text-stone-100 transition disabled:opacity-50"
    >
      <FilePdf size={11} weight="regular" />
      {label}
    </button>
  )
}

export default ReportDrawer
