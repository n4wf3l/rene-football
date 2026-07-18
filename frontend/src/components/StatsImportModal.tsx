import { useState } from 'react'
import type { ChangeEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle, DownloadSimple, UploadSimple, WarningCircle, X as XIcon } from '@phosphor-icons/react'
import { api, ApiError, getToken } from '../api/client'

/**
 * Batch-import numeric player stats from a CSV. The admin drops in a
 * spreadsheet export (Wyscout, club file, internal Excel), we POST to
 * /admin/players/import which validates + applies. On success we return
 * a diff (updated / skipped / errors) so the admin sees exactly what
 * landed. Data provenance (source label + reliability + timestamp) is
 * recorded on every touched player.
 */

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

const SOURCES = [
  { value: 'csv',           label: 'Import CSV (générique)' },
  { value: 'wyscout',       label: 'Wyscout' },
  { value: 'instat',        label: 'Instat' },
  { value: 'club_official', label: 'Données club officielles' },
  { value: 'observed',      label: 'Observation scout' },
  { value: 'manual',        label: 'Saisie manuelle vérifiée' },
] as const

type ImportKind = 'stats' | 'appearances'

interface ImportResult {
  updated?: number
  created?: number
  skipped: number
  errors: Array<{ row: number; slug: string | null; reason: string }>
}

export default function StatsImportModal({ open, onClose, onSuccess }: Props) {
  const [kind, setKind] = useState<ImportKind>('stats')
  const [file, setFile] = useState<File | null>(null)
  const [source, setSource] = useState<string>('csv')
  const [reliability, setReliability] = useState<number>(4)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setKind('stats'); setFile(null); setSource('csv'); setReliability(4)
    setResult(null); setError(null); setSubmitting(false)
  }

  const close = () => { reset(); onClose() }

  const submit = async () => {
    if (!file) return
    setSubmitting(true); setError(null); setResult(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      if (kind === 'stats') {
        // Source + reliability only make sense on player-level stats — the
        // appearances endpoint deliberately keeps its own provenance blank
        // (each row is a match observation, not an aggregate).
        fd.append('source', source)
        fd.append('reliability', String(reliability))
      }
      const url = kind === 'stats' ? '/admin/players/import' : '/admin/players/appearances/import'
      const res = await api.post<{ data: ImportResult }>(url, fd, { auth: true })
      setResult(res.data)
      onSuccess()
    } catch (err: unknown) {
      const msg = err instanceof ApiError && err.status === 422
        ? 'Fichier invalide — vérifiez le format (CSV / XLSX, max 4-8 Mo).'
        : err instanceof Error ? err.message : 'Import impossible.'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  /** Download the pre-filled template for the chosen import kind. */
  const downloadTemplate = async () => {
    try {
      const token = getToken()
      const path = kind === 'stats'
        ? '/api/admin/players/import/template'
        : '/api/admin/players/appearances/template'
      const filename = kind === 'stats'
        ? 'rene-football-stats-template.csv'
        : 'rene-football-appearances-template.csv'
      const resp = await fetch(path, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const blob = await resp.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      window.setTimeout(() => URL.revokeObjectURL(url), 20_000)
    } catch {
      setError('Téléchargement du template impossible.')
    }
  }

  const onFilePicked = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    setFile(f); setResult(null); setError(null)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm grid place-items-center px-4"
          onClick={close}
        >
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            className="relative w-full max-w-xl rounded-2xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-stone-50/10 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 dark:border-stone-50/10">
              <div>
                <div className="text-[0.6rem] font-mono uppercase tracking-[0.18em] text-turf-700 dark:text-turf-300">Analytics</div>
                <h2 className="mt-1 font-display font-semibold text-lg text-zinc-950 dark:text-stone-50">
                  {kind === 'stats' ? 'Importer les stats du roster' : 'Importer les matchs joués'}
                </h2>
              </div>
              <button
                type="button"
                onClick={close}
                className="grid place-items-center w-9 h-9 rounded-full text-zinc-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-50/10 transition"
                aria-label="Fermer"
              >
                <XIcon size={18} weight="bold" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-5">
              {/* Kind toggle - stats vs match-by-match. Determines which
                  endpoint we post to and which template downloads. */}
              <div className="inline-flex items-center gap-0.5 rounded-full border border-stone-300 dark:border-stone-50/15 p-0.5 text-xs">
                {([
                  { value: 'stats' as const,       label: 'Stats agrégées',  hint: 'Une ligne par joueur, colonnes: goals/xg/pass_accuracy…' },
                  { value: 'appearances' as const, label: 'Matchs joués',    hint: "Une ligne par match, colonnes: date/opponent/minutes/rating…" },
                ]).map((k) => {
                  const active = kind === k.value
                  return (
                    <button
                      key={k.value}
                      type="button"
                      onClick={() => { setKind(k.value); setFile(null); setResult(null); setError(null) }}
                      title={k.hint}
                      className={`px-3 py-1.5 rounded-full font-medium transition ${
                        active
                          ? 'bg-zinc-950 text-stone-50 dark:bg-stone-50 dark:text-zinc-950'
                          : 'text-zinc-600 hover:text-zinc-900 dark:text-stone-400 dark:hover:text-stone-100'
                      }`}
                    >
                      {k.label}
                    </button>
                  )
                })}
              </div>

              <p className="text-sm text-zinc-600 dark:text-stone-300 leading-relaxed">
                {kind === 'stats' ? (
                  <>
                    Chargez un fichier contenant <span className="font-mono">slug</span> (ou <span className="font-mono">name</span>) et
                    les stats agrégées (goals, xg, pass_accuracy…). Cellules vides ignorées, joueurs inconnus listés en erreur — rien n'est écrit tant que le fichier n'est pas valide.
                  </>
                ) : (
                  <>
                    Chargez un fichier avec une ligne par match : <span className="font-mono">slug</span> (ou <span className="font-mono">name</span>), <span className="font-mono">date</span>, opponent, minutes, goals, rating… Les doublons (même joueur + même date + même adversaire) sont mis à jour, pas dupliqués.
                  </>
                )}
              </p>

              <button
                type="button"
                onClick={downloadTemplate}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border border-stone-300 dark:border-stone-50/15 bg-white dark:bg-zinc-900 hover:bg-stone-100 dark:hover:bg-stone-50/5 transition"
              >
                <DownloadSimple size={14} weight="bold" /> Télécharger le template pré-rempli
              </button>

              {kind === 'stats' && (
                <div className="grid sm:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="block text-[0.65rem] font-mono uppercase tracking-[0.16em] text-zinc-500 dark:text-stone-400 mb-1">Source des données</span>
                    <select
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                      className="w-full rounded-lg border border-stone-300 bg-white text-zinc-900 dark:border-stone-50/15 dark:bg-zinc-900 dark:text-stone-50 px-3 py-2 text-sm focus:outline-none focus:border-zinc-900 dark:focus:border-turf-300"
                    >
                      {SOURCES.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </label>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[0.65rem] font-mono uppercase tracking-[0.16em] text-zinc-500 dark:text-stone-400">Fiabilité</span>
                      <span className="text-[0.7rem] font-mono tabular-nums text-zinc-700 dark:text-stone-300">{reliability}/5</span>
                    </div>
                    <input
                      type="range" min={1} max={5} step={1}
                      value={reliability}
                      onChange={(e) => setReliability(Number(e.target.value))}
                      className="w-full accent-turf-700 dark:accent-turf-300"
                    />
                    <p className="mt-1 text-[0.65rem] text-zinc-500 dark:text-stone-500">
                      1 = ouï-dire / 5 = certifié fédé/club
                    </p>
                  </div>
                </div>
              )}

              <label className="block">
                <span className="block text-[0.65rem] font-mono uppercase tracking-[0.16em] text-zinc-500 dark:text-stone-400 mb-1">Fichier CSV ou Excel</span>
                <label className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-dashed border-stone-300 dark:border-stone-50/15 bg-stone-50/60 dark:bg-zinc-950/40 cursor-pointer hover:bg-stone-100/60 dark:hover:bg-zinc-950/60 transition">
                  <UploadSimple size={16} weight="bold" className="text-zinc-500 dark:text-stone-400" />
                  <span className="text-sm text-zinc-700 dark:text-stone-200 truncate flex-1">
                    {file ? file.name : `Choisir un fichier .csv / .xlsx / .xls / .ods (max ${kind === 'appearances' ? '8' : '4'} Mo)`}
                  </span>
                  <input
                    type="file"
                    accept=".csv,text/csv,.xlsx,.xls,.ods,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/vnd.oasis.opendocument.spreadsheet"
                    onChange={onFilePicked}
                    className="hidden"
                  />
                </label>
              </label>

              {/* Feedback */}
              {error && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-rose-50 text-rose-800 dark:bg-rose-500/10 dark:text-rose-300 text-sm">
                  <WarningCircle size={16} weight="bold" className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              {result && (
                <div className="rounded-lg border border-stone-200 dark:border-stone-50/10 bg-stone-50/60 dark:bg-zinc-950/40 divide-y divide-stone-200 dark:divide-stone-50/10">
                  <div className="px-3 py-2.5 flex items-center gap-2 text-sm flex-wrap">
                    <CheckCircle size={16} weight="bold" className="text-turf-700 dark:text-turf-300" />
                    <span className="font-medium text-zinc-900 dark:text-stone-100">
                      {kind === 'stats'
                        ? `${result.updated ?? 0} joueur${(result.updated ?? 0) > 1 ? 's' : ''} mis à jour`
                        : `${result.created ?? 0} match${(result.created ?? 0) > 1 ? 's' : ''} créés · ${result.updated ?? 0} mis à jour`}
                    </span>
                    <span className="text-zinc-500 dark:text-stone-500 text-xs">
                      · {result.skipped} ligne{result.skipped > 1 ? 's' : ''} ignorée{result.skipped > 1 ? 's' : ''}
                      · {result.errors.length} erreur{result.errors.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  {result.errors.length > 0 && (
                    <ul className="px-3 py-2 max-h-40 overflow-y-auto text-xs text-rose-800 dark:text-rose-300 space-y-1">
                      {result.errors.slice(0, 20).map((e, i) => (
                        <li key={i}>
                          <span className="font-mono">Ligne {e.row}{e.slug ? ` (${e.slug})` : ''}</span> — {e.reason}
                        </li>
                      ))}
                      {result.errors.length > 20 && (
                        <li className="italic">… et {result.errors.length - 20} autres.</li>
                      )}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-stone-200 dark:border-stone-50/10 bg-stone-50/60 dark:bg-zinc-950/40">
              <button
                type="button"
                onClick={close}
                className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-50/10 transition"
              >
                {result ? 'Fermer' : 'Annuler'}
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={!file || submitting}
                className="inline-flex items-center gap-2 btn btn-primary text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <UploadSimple size={14} weight="bold" />
                {submitting ? 'Import…' : 'Importer'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
