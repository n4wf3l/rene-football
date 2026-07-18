import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowClockwise, CheckCircle, PencilSimpleLine, Plus, Trash, WarningCircle, X as XIcon,
} from '@phosphor-icons/react'
import { api, ApiError } from '../api/client'

/**
 * Editable position × age-tier × metric benchmark table. Backed by
 * /api/admin/benchmarks — DB overrides layered on top of the shipped
 * defaults in config/benchmarks.php. Any change flushes the in-memory
 * server cache automatically.
 *
 * UX intent: the sporting direction can tune reference values for a
 * specific league / cohort without asking a developer. Reset is one click
 * and re-applies the seed. Not exposed as its own route — mounted as a
 * modal from the Analysis > Benchmark tab.
 */

interface BenchmarkRow {
  id: number
  category: string
  tier: string
  metric: string
  avg: number
  elite: number
  unit: string | null
}

interface Payload {
  data: {
    rows: BenchmarkRow[]
    categories: string[]
    tiers: string[]
    table: Record<string, Record<string, Record<string, { avg: number; elite: number; unit?: string }>>>
  }
}

interface Props {
  open: boolean
  onClose: () => void
  /** Fired after any successful mutation so the parent can refetch stale
   *  benchmark-dependent views (radar overlay, benchmark tab). */
  onMutated?: () => void
}

const TIER_LABEL: Record<string, string> = {
  u18: 'U18', u21: 'U21', young: 'Jeune 21-25', prime: 'Prime 26-30', vet: 'Vétéran 31+',
}

interface Draft {
  id?: number
  category: string
  tier: string
  metric: string
  avg: string
  elite: string
  unit: string
}

const emptyDraft = (defaults: Partial<Draft> = {}): Draft => ({
  category: 'Attaquant', tier: 'young', metric: '',
  avg: '', elite: '', unit: '',
  ...defaults,
})

export default function BenchmarksEditor({ open, onClose, onMutated }: Props) {
  const [payload, setPayload] = useState<Payload['data'] | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)
  const [category, setCategory] = useState<string>('Attaquant')
  const [tier, setTier] = useState<string>('young')
  const [draft, setDraft] = useState<Draft | null>(null)

  const reload = () => {
    setLoading(true); setError(null)
    return api.get<Payload>('/admin/benchmarks', { auth: true })
      .then((res) => setPayload(res.data))
      .catch(() => setError('Impossible de charger la table des benchmarks.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { if (open) void reload() }, [open])

  const rowsForCell = useMemo(() => {
    if (!payload) return []
    const cell = payload.table?.[category]?.[tier] ?? {}
    return Object.entries(cell).map(([metric, v]) => {
      // Find matching DB row (if any) so we can show "Édité" and enable delete.
      const dbRow = payload.rows.find((r) => r.category === category && r.tier === tier && r.metric === metric)
      return { metric, avg: v.avg, elite: v.elite, unit: v.unit ?? '', dbRow }
    }).sort((a, b) => a.metric.localeCompare(b.metric))
  }, [payload, category, tier])

  const toast = (msg: string) => { setOkMsg(msg); window.setTimeout(() => setOkMsg(null), 2500) }

  const startEdit = (row: typeof rowsForCell[number]) => {
    setDraft({
      id: row.dbRow?.id, category, tier, metric: row.metric,
      avg: String(row.avg), elite: String(row.elite), unit: row.unit ?? '',
    })
  }
  const startNew = () => setDraft(emptyDraft({ category, tier }))
  const cancelDraft = () => setDraft(null)

  const submitDraft = async () => {
    if (!draft) return
    if (!draft.metric.trim()) { setError('Le nom de la métrique est requis.'); return }
    const avg = Number(String(draft.avg).replace(',', '.'))
    const elite = Number(String(draft.elite).replace(',', '.'))
    if (Number.isNaN(avg) || Number.isNaN(elite)) { setError('avg et elite doivent être numériques.'); return }
    setSaving(true); setError(null)
    try {
      await api.post('/admin/benchmarks', {
        category: draft.category, tier: draft.tier, metric: draft.metric.trim(),
        avg, elite, unit: draft.unit.trim() || null,
      }, { auth: true })
      setDraft(null)
      await reload()
      onMutated?.()
      toast('Benchmark enregistré.')
    } catch (err: unknown) {
      const msg = err instanceof ApiError && err.status === 422
        ? 'Payload invalide - vérifiez category / tier / avg / elite.'
        : err instanceof Error ? err.message : 'Enregistrement impossible.'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  const deleteRow = async (id: number) => {
    if (!confirm('Supprimer cet override ? La valeur par défaut reprendra effet.')) return
    setSaving(true); setError(null)
    try {
      await api.delete(`/admin/benchmarks/${id}`, { auth: true })
      await reload(); onMutated?.()
      toast('Override supprimé.')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Suppression impossible.')
    } finally {
      setSaving(false)
    }
  }

  const resetAll = async () => {
    if (!confirm('Restaurer toutes les valeurs par défaut ? Vos overrides seront écrasés par le fichier seed.')) return
    setResetting(true); setError(null)
    try {
      await api.post('/admin/benchmarks/reset', {}, { auth: true })
      await reload(); onMutated?.()
      toast('Défauts restaurés.')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Reset impossible.')
    } finally {
      setResetting(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm grid place-items-center px-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            className="relative w-full max-w-4xl max-h-[92vh] rounded-2xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-stone-50/10 shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Header */}
            <div className="flex items-start justify-between px-5 py-4 border-b border-stone-200 dark:border-stone-50/10">
              <div>
                <div className="text-[0.6rem] font-mono uppercase tracking-[0.18em] text-turf-700 dark:text-turf-300">Analytics</div>
                <h2 className="mt-1 font-display font-semibold text-lg text-zinc-950 dark:text-stone-50">
                  Profils de référence (benchmarks)
                </h2>
                <p className="text-xs text-zinc-500 dark:text-stone-400 mt-1 max-w-prose">
                  Ajustez les valeurs moyenne / elite par poste et tranche d'âge. Ce sont ces valeurs qui alimentent l'onglet Benchmark et la silhouette elite du radar.
                </p>
              </div>
              <button
                type="button" onClick={onClose}
                className="grid place-items-center w-9 h-9 rounded-full text-zinc-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-50/10 transition"
                aria-label="Fermer"
              >
                <XIcon size={18} weight="bold" />
              </button>
            </div>

            {/* Category / tier tabs */}
            <div className="px-5 py-3 border-b border-stone-200 dark:border-stone-50/10 space-y-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[0.6rem] font-mono uppercase tracking-[0.16em] text-zinc-500 dark:text-stone-500 mr-1">Poste</span>
                {(payload?.categories ?? []).map((c) => (
                  <button
                    key={c} type="button" onClick={() => setCategory(c)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition ${
                      category === c ? 'bg-zinc-950 text-stone-50 dark:bg-stone-50 dark:text-zinc-950' : 'text-zinc-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-50/5'
                    }`}
                  >{c}</button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[0.6rem] font-mono uppercase tracking-[0.16em] text-zinc-500 dark:text-stone-500 mr-1">Âge</span>
                {(payload?.tiers ?? []).map((t) => (
                  <button
                    key={t} type="button" onClick={() => setTier(t)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition ${
                      tier === t ? 'bg-turf-700 text-white dark:bg-turf-300 dark:text-zinc-950' : 'text-zinc-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-50/5'
                    }`}
                  >{TIER_LABEL[t] ?? t}</button>
                ))}
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {loading && <div className="py-14 text-center text-xs font-mono uppercase tracking-[0.16em] text-zinc-500 dark:text-stone-500 animate-pulse">Chargement…</div>}
              {error && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-rose-50 text-rose-800 dark:bg-rose-500/10 dark:text-rose-300 text-sm">
                  <WarningCircle size={16} weight="bold" className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              {okMsg && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-turf-50 text-turf-800 dark:bg-turf-500/10 dark:text-turf-300 text-sm">
                  <CheckCircle size={16} weight="bold" className="shrink-0 mt-0.5" />
                  <span>{okMsg}</span>
                </div>
              )}

              {!loading && !error && (
                <div className="rounded-xl border border-stone-200 dark:border-stone-50/10 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-stone-100/70 dark:bg-zinc-950/60">
                      <tr className="text-left text-[0.65rem] font-mono uppercase tracking-[0.14em] text-zinc-600 dark:text-stone-400">
                        <th className="px-3 py-2">Métrique</th>
                        <th className="px-3 py-2 text-right">Moyenne</th>
                        <th className="px-3 py-2 text-right">Elite</th>
                        <th className="px-3 py-2">Unité</th>
                        <th className="px-3 py-2">Source</th>
                        <th className="px-3 py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200 dark:divide-stone-50/10">
                      {rowsForCell.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-3 py-8 text-center text-xs text-zinc-500 dark:text-stone-500">
                            Aucun benchmark pour {category} · {TIER_LABEL[tier] ?? tier}. Cliquez sur « + Ajouter » pour en créer un.
                          </td>
                        </tr>
                      )}
                      {rowsForCell.map((r) => (
                        <tr key={r.metric} className="hover:bg-stone-50 dark:hover:bg-stone-50/[0.03]">
                          <td className="px-3 py-2 font-mono text-xs">{r.metric}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{r.avg}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-turf-700 dark:text-turf-300 font-semibold">{r.elite}</td>
                          <td className="px-3 py-2 text-xs text-zinc-500 dark:text-stone-400">{r.unit || '—'}</td>
                          <td className="px-3 py-2">
                            {r.dbRow
                              ? <span className="inline-flex items-center gap-1 text-[0.65rem] font-mono uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300">Édité</span>
                              : <span className="inline-flex items-center gap-1 text-[0.65rem] font-mono uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-full bg-stone-100 text-zinc-600 dark:bg-stone-50/10 dark:text-stone-400">Défaut</span>}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <div className="inline-flex items-center gap-0.5">
                              <button
                                type="button" onClick={() => startEdit(r)}
                                className="grid place-items-center w-7 h-7 rounded text-zinc-500 hover:text-zinc-900 hover:bg-stone-100 dark:text-stone-400 dark:hover:text-stone-50 dark:hover:bg-stone-50/5 transition"
                                title="Modifier"
                              >
                                <PencilSimpleLine size={13} weight="bold" />
                              </button>
                              {r.dbRow && (
                                <button
                                  type="button" onClick={() => deleteRow(r.dbRow!.id)}
                                  className="grid place-items-center w-7 h-7 rounded text-zinc-500 hover:text-rose-700 hover:bg-rose-100 dark:text-stone-400 dark:hover:text-rose-400 dark:hover:bg-rose-500/15 transition"
                                  title="Restaurer la valeur par défaut"
                                >
                                  <Trash size={13} weight="bold" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Draft form (edit / add) */}
              {draft && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-stone-300 dark:border-stone-50/15 bg-stone-50/60 dark:bg-zinc-950/40 p-4 space-y-3"
                >
                  <div className="text-[0.65rem] font-mono uppercase tracking-[0.14em] text-zinc-600 dark:text-stone-400">
                    {draft.id ? `Modifier ${draft.metric}` : 'Nouveau benchmark'}
                  </div>
                  <div className="grid sm:grid-cols-6 gap-2">
                    <label className="sm:col-span-2 flex flex-col gap-1">
                      <span className="text-[0.6rem] font-mono uppercase text-zinc-500 dark:text-stone-500">Métrique (clé)</span>
                      <input
                        value={draft.metric}
                        onChange={(e) => setDraft({ ...draft!, metric: e.target.value })}
                        placeholder="ex. goals, xg, pass_accuracy"
                        disabled={!!draft.id}
                        className="rounded-md border border-stone-300 dark:border-stone-50/15 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm font-mono disabled:opacity-60"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[0.6rem] font-mono uppercase text-zinc-500 dark:text-stone-500">Moyenne</span>
                      <input
                        value={draft.avg}
                        onChange={(e) => setDraft({ ...draft!, avg: e.target.value })}
                        className="rounded-md border border-stone-300 dark:border-stone-50/15 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm tabular-nums"
                        inputMode="decimal"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[0.6rem] font-mono uppercase text-zinc-500 dark:text-stone-500">Elite</span>
                      <input
                        value={draft.elite}
                        onChange={(e) => setDraft({ ...draft!, elite: e.target.value })}
                        className="rounded-md border border-stone-300 dark:border-stone-50/15 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm tabular-nums"
                        inputMode="decimal"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[0.6rem] font-mono uppercase text-zinc-500 dark:text-stone-500">Unité</span>
                      <input
                        value={draft.unit}
                        onChange={(e) => setDraft({ ...draft!, unit: e.target.value })}
                        placeholder="km, %, km/h…"
                        className="rounded-md border border-stone-300 dark:border-stone-50/15 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm"
                      />
                    </label>
                    <div className="flex items-end justify-end gap-1">
                      <button
                        type="button" onClick={cancelDraft}
                        className="px-3 py-1.5 rounded-md text-xs text-zinc-700 dark:text-stone-300 hover:bg-stone-200/50 dark:hover:bg-stone-50/5"
                      >Annuler</button>
                      <button
                        type="button" onClick={submitDraft} disabled={saving}
                        className="btn btn-primary text-xs px-3 py-1.5 disabled:opacity-60"
                      >{saving ? '…' : 'Enregistrer'}</button>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Footer actions */}
            <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-stone-200 dark:border-stone-50/10 bg-stone-50/60 dark:bg-zinc-950/40">
              <button
                type="button" onClick={resetAll} disabled={resetting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-zinc-700 dark:text-stone-300 hover:bg-stone-200/60 dark:hover:bg-stone-50/5 transition disabled:opacity-60"
                title="Restaurer les valeurs par défaut du fichier seed"
              >
                <ArrowClockwise size={13} weight="bold" /> {resetting ? '…' : 'Restaurer défauts'}
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button" onClick={startNew}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-stone-300 dark:border-stone-50/15 bg-white dark:bg-zinc-900 hover:bg-stone-100 dark:hover:bg-stone-50/5 transition"
                >
                  <Plus size={12} weight="bold" /> Ajouter
                </button>
                <button
                  type="button" onClick={onClose}
                  className="px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-950 text-stone-50 dark:bg-stone-50 dark:text-zinc-950"
                >
                  Fermer
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
