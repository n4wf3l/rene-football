import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { ChangeEvent, FormEvent } from 'react'
import {
  Buildings, CheckCircle, PencilSimpleLine, Plus, Trash, User, WarningCircle, X as XIcon,
} from '@phosphor-icons/react'
import { api, ApiError } from '../../../api/client'
import type { ScoutProspect, ScoutWorkspace } from '../../../types/scouting'
import Skeleton from '../../Skeleton'

/**
 * Scout's personal workspace ("boîte perso").
 *
 * Isolated from Rene's shared scouting data — the prospects listed here
 * belong only to the connected scout and never appear in the roster
 * consumed by presentations, analysis or the public site. The workspace
 * has an editable name so the scout can label it after their external
 * client (e.g. "FC X Recruiting").
 *
 * MVP scope kept intentionally tight: name rename + prospect list + CRUD.
 * Reports / heatmap / attachments will come once the base flow is used.
 */

const RECOMMENDATIONS = ['signer', 'shortlist', 'observer', 'passer'] as const
const STATUSES        = ['decouvert', 'watchlist', 'shortlist', 'valide', 'rejete'] as const

interface ProspectDraft {
  id?: number
  name: string
  age: string
  position: string
  category: string
  club: string
  nationality: string
  preferred_foot: string
  height: string
  rating: string
  potential_rating: string
  recommendation: string
  status: string
  notes: string
  strengths: string
  weaknesses: string
  next_action: string
  matches_played: string
  goals: string
  assists: string
}

const emptyDraft = (): ProspectDraft => ({
  name: '', age: '', position: '', category: 'Attaquant', club: '', nationality: '',
  preferred_foot: 'Droit', height: '', rating: '', potential_rating: '',
  recommendation: '', status: 'decouvert', notes: '', strengths: '',
  weaknesses: '', next_action: '', matches_played: '', goals: '', assists: '',
})

/** Convert a ScoutProspect (API shape) into a draft (all strings for the form). */
function toDraft(p: ScoutProspect): ProspectDraft {
  return {
    id: p.id,
    name: p.name ?? '',
    age: p.age?.toString() ?? '',
    position: p.position ?? '',
    category: p.category ?? 'Attaquant',
    club: p.club ?? '',
    nationality: p.nationality ?? '',
    preferred_foot: p.preferred_foot ?? 'Droit',
    height: p.height ?? '',
    rating: p.rating?.toString() ?? '',
    potential_rating: p.potential_rating?.toString() ?? '',
    recommendation: p.recommendation ?? '',
    status: p.status ?? 'decouvert',
    notes: p.notes ?? '',
    strengths: p.strengths ?? '',
    weaknesses: p.weaknesses ?? '',
    next_action: p.next_action ?? '',
    matches_played: p.matches_played?.toString() ?? '',
    goals: p.goals?.toString() ?? '',
    assists: p.assists?.toString() ?? '',
  }
}

/** Cast a draft back into an API payload (empty strings become null,
 *  numeric fields parse into numbers). */
function fromDraft(d: ProspectDraft): Record<string, unknown> {
  const num = (v: string) => v.trim() === '' ? null : Number(v.replace(',', '.'))
  return {
    name: d.name.trim(),
    age: num(d.age),
    position: d.position.trim() || null,
    category: d.category.trim() || null,
    club: d.club.trim() || null,
    nationality: d.nationality.trim() || null,
    preferred_foot: d.preferred_foot.trim() || null,
    height: d.height.trim() || null,
    rating: num(d.rating),
    potential_rating: num(d.potential_rating),
    recommendation: d.recommendation.trim() || null,
    status: d.status.trim() || null,
    notes: d.notes.trim() || null,
    strengths: d.strengths.trim() || null,
    weaknesses: d.weaknesses.trim() || null,
    next_action: d.next_action.trim() || null,
    matches_played: num(d.matches_played),
    goals: num(d.goals),
    assists: num(d.assists),
  }
}

const INPUT = 'w-full rounded-md border border-stone-300 dark:border-stone-50/15 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm focus:outline-none focus:border-zinc-900 dark:focus:border-turf-300'

export default function PersoView() {
  const [workspace, setWorkspace] = useState<ScoutWorkspace | null>(null)
  const [prospects, setProspects] = useState<ScoutProspect[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nameEditing, setNameEditing] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [draft, setDraft] = useState<ProspectDraft | null>(null)
  const [saving, setSaving] = useState(false)
  const [okMsg, setOkMsg] = useState<string | null>(null)

  const load = async () => {
    setLoading(true); setError(null)
    try {
      const [wsRes, pRes] = await Promise.all([
        api.get<{ data: ScoutWorkspace }>('/admin/scouting/workspace', { auth: true }),
        api.get<{ data: ScoutProspect[] }>('/admin/scouting/prospects', { auth: true }),
      ])
      setWorkspace(wsRes.data)
      setProspects(pRes.data)
      setNameDraft(wsRes.data.name ?? '')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de charger la boîte perso.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const toast = (msg: string) => { setOkMsg(msg); window.setTimeout(() => setOkMsg(null), 2500) }

  const displayName = workspace?.name || 'Ma boîte perso'

  const saveName = async () => {
    if (!workspace) return
    setSaving(true)
    try {
      const res = await api.patch<{ data: ScoutWorkspace }>(
        '/admin/scouting/workspace',
        { name: nameDraft.trim() || null },
        { auth: true },
      )
      setWorkspace(res.data)
      setNameEditing(false)
      toast('Nom mis à jour.')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Renommage impossible.')
    } finally {
      setSaving(false)
    }
  }

  const submitDraft = async (e: FormEvent) => {
    e.preventDefault()
    if (!draft) return
    if (!draft.name.trim()) { setError('Le nom du prospect est requis.'); return }
    setSaving(true); setError(null)
    try {
      const payload = fromDraft(draft)
      if (draft.id) {
        await api.patch(`/admin/scouting/prospects/${draft.id}`, payload, { auth: true })
        toast('Prospect mis à jour.')
      } else {
        await api.post('/admin/scouting/prospects', payload, { auth: true })
        toast('Prospect ajouté.')
      }
      setDraft(null)
      await load()
    } catch (err: unknown) {
      const msg = err instanceof ApiError && err.status === 422
        ? 'Payload invalide - vérifiez les champs.'
        : err instanceof Error ? err.message : 'Enregistrement impossible.'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  const removeProspect = async (p: ScoutProspect) => {
    if (!confirm(`Supprimer définitivement « ${p.name} » ?`)) return
    try {
      await api.delete(`/admin/scouting/prospects/${p.id}`, { auth: true })
      await load()
      toast('Prospect supprimé.')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Suppression impossible.')
    }
  }

  const grouped = useMemo(() => {
    const map = new Map<string, ScoutProspect[]>()
    for (const p of prospects) {
      const k = p.status ?? 'decouvert'
      const arr = map.get(k) ?? []
      arr.push(p)
      map.set(k, arr)
    }
    return map
  }, [prospects])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Workspace header */}
      <section className="rounded-2xl border border-stone-200 dark:border-stone-50/10 bg-white dark:bg-zinc-900 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[0.6rem] font-mono uppercase tracking-[0.18em] text-turf-700 dark:text-turf-300">Espace privé du scout</div>
            {nameEditing ? (
              <div className="mt-1 flex items-center gap-2">
                <input
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  placeholder="FC X · Standard Liège · …"
                  maxLength={80}
                  className={`${INPUT} !text-lg !font-display !font-semibold w-72`}
                  onKeyDown={(e) => { if (e.key === 'Enter') void saveName() }}
                  autoFocus
                />
                <button
                  type="button" onClick={saveName} disabled={saving}
                  className="btn btn-primary text-xs px-3 py-1.5 disabled:opacity-60"
                >Enregistrer</button>
                <button
                  type="button" onClick={() => { setNameEditing(false); setNameDraft(workspace?.name ?? '') }}
                  className="px-3 py-1.5 rounded-md text-xs text-zinc-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-50/5"
                >Annuler</button>
              </div>
            ) : (
              <div className="mt-1 flex items-center gap-2">
                <h2 className="font-display font-semibold text-xl text-zinc-950 dark:text-stone-50">
                  {displayName}
                </h2>
                <button
                  type="button" onClick={() => setNameEditing(true)}
                  title="Renommer (ex. le nom de votre client externe)"
                  className="grid place-items-center w-7 h-7 rounded-md text-zinc-500 hover:text-zinc-900 hover:bg-stone-100 dark:text-stone-400 dark:hover:text-stone-50 dark:hover:bg-stone-50/5 transition"
                >
                  <PencilSimpleLine size={13} weight="bold" />
                </button>
              </div>
            )}
            <p className="mt-1 text-xs text-zinc-500 dark:text-stone-400 max-w-prose leading-relaxed">
              Vos prospects et notes ici sont <span className="font-medium text-zinc-700 dark:text-stone-200">strictement privés</span> et n'apparaissent
              jamais dans les données partagées Rene Football. Idéal pour le travail parallèle chez un club externe.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDraft(emptyDraft())}
            className="btn btn-primary text-sm"
          >
            <Plus size={14} weight="bold" /> Nouveau prospect
          </button>
        </div>
      </section>

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

      {/* Prospects grouped by status */}
      {prospects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 dark:border-stone-50/15 bg-white/40 dark:bg-zinc-900/30 py-16 text-center">
          <User size={32} weight="regular" className="mx-auto text-zinc-400 dark:text-stone-500 mb-3" />
          <p className="text-sm text-zinc-600 dark:text-stone-400">
            Aucun prospect pour l'instant. Cliquez sur <span className="font-medium">« Nouveau prospect »</span> pour commencer.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {Array.from(grouped.entries()).map(([status, items]) => (
            <section key={status} className="rounded-2xl border border-stone-200 dark:border-stone-50/10 bg-white dark:bg-zinc-900 overflow-hidden">
              <header className="px-4 py-2.5 flex items-center justify-between border-b border-stone-200 dark:border-stone-50/10 bg-stone-100/60 dark:bg-zinc-950/40">
                <div className="text-[0.65rem] font-mono uppercase tracking-[0.16em] text-zinc-600 dark:text-stone-400">
                  {status.replace('_', ' ')} · {items.length}
                </div>
              </header>
              <div className="divide-y divide-stone-200 dark:divide-stone-50/10">
                {items.map((p) => (
                  <ProspectRow key={p.id} prospect={p} onEdit={() => setDraft(toDraft(p))} onDelete={() => removeProspect(p)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Draft modal */}
      <AnimatePresence>
        {draft && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm grid place-items-center px-4"
            onClick={() => setDraft(null)}
          >
            <motion.form
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              onSubmit={submitDraft}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-3xl max-h-[92vh] rounded-2xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-stone-50/10 shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 dark:border-stone-50/10">
                <div>
                  <div className="text-[0.6rem] font-mono uppercase tracking-[0.18em] text-turf-700 dark:text-turf-300">
                    {displayName}
                  </div>
                  <h2 className="mt-1 font-display font-semibold text-lg text-zinc-950 dark:text-stone-50">
                    {draft.id ? 'Modifier le prospect' : 'Nouveau prospect'}
                  </h2>
                </div>
                <button
                  type="button" onClick={() => setDraft(null)}
                  className="grid place-items-center w-9 h-9 rounded-full text-zinc-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-50/10"
                >
                  <XIcon size={18} weight="bold" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="grid sm:grid-cols-2 gap-3">
                  <TextField label="Nom" value={draft.name} required
                    onChange={(v) => setDraft({ ...draft, name: v })} />
                  <TextField label="Club actuel" value={draft.club}
                    onChange={(v) => setDraft({ ...draft, club: v })} placeholder="ex. Standard Liège" />
                  <TextField label="Âge" value={draft.age} type="number"
                    onChange={(v) => setDraft({ ...draft, age: v })} />
                  <TextField label="Nationalité" value={draft.nationality}
                    onChange={(v) => setDraft({ ...draft, nationality: v })} />
                  <TextField label="Poste" value={draft.position}
                    onChange={(v) => setDraft({ ...draft, position: v })} placeholder="ex. Ailier gauche" />
                  <SelectField label="Catégorie" value={draft.category}
                    onChange={(v) => setDraft({ ...draft, category: v })}
                    options={['Gardien', 'Defenseur', 'Milieu', 'Attaquant']} />
                  <SelectField label="Pied fort" value={draft.preferred_foot}
                    onChange={(v) => setDraft({ ...draft, preferred_foot: v })}
                    options={['Droit', 'Gauche', 'Ambidextre']} />
                  <TextField label="Taille" value={draft.height}
                    onChange={(v) => setDraft({ ...draft, height: v })} placeholder="1m82" />
                </div>

                <div className="grid sm:grid-cols-4 gap-3">
                  <TextField label="Note globale (0-10)" value={draft.rating} type="number" step="0.1"
                    onChange={(v) => setDraft({ ...draft, rating: v })} />
                  <TextField label="Potentiel (0-10)" value={draft.potential_rating} type="number" step="0.1"
                    onChange={(v) => setDraft({ ...draft, potential_rating: v })} />
                  <SelectField label="Recommandation" value={draft.recommendation}
                    onChange={(v) => setDraft({ ...draft, recommendation: v })}
                    options={['', ...RECOMMENDATIONS]} />
                  <SelectField label="Statut" value={draft.status}
                    onChange={(v) => setDraft({ ...draft, status: v })}
                    options={[...STATUSES]} />
                </div>

                <div className="grid sm:grid-cols-3 gap-3">
                  <TextField label="Matchs vus" value={draft.matches_played} type="number"
                    onChange={(v) => setDraft({ ...draft, matches_played: v })} />
                  <TextField label="Buts observés" value={draft.goals} type="number"
                    onChange={(v) => setDraft({ ...draft, goals: v })} />
                  <TextField label="Passes déc." value={draft.assists} type="number"
                    onChange={(v) => setDraft({ ...draft, assists: v })} />
                </div>

                <TextareaField label="Points forts" value={draft.strengths}
                  onChange={(v) => setDraft({ ...draft, strengths: v })}
                  rows={2} placeholder="Vitesse d'exécution, jeu dos au but, résistance à la pression…" />
                <TextareaField label="Points faibles" value={draft.weaknesses}
                  onChange={(v) => setDraft({ ...draft, weaknesses: v })}
                  rows={2} placeholder="Impact aérien, précision face au but…" />
                <TextareaField label="Notes libres" value={draft.notes}
                  onChange={(v) => setDraft({ ...draft, notes: v })} rows={3} />
                <TextareaField label="Prochaine action" value={draft.next_action}
                  onChange={(v) => setDraft({ ...draft, next_action: v })} rows={2}
                  placeholder="Réunion agent 2026-08-01 · nouvelle observation vs. RSCA…" />
              </div>

              <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-stone-200 dark:border-stone-50/10 bg-stone-50/60 dark:bg-zinc-950/40">
                <div className="text-[0.65rem] text-zinc-500 dark:text-stone-500 inline-flex items-center gap-1.5">
                  <Buildings size={12} weight="bold" /> Espace privé — invisible pour Rene Football
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button" onClick={() => setDraft(null)}
                    className="px-3 py-1.5 rounded-md text-xs text-zinc-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-50/5"
                  >Annuler</button>
                  <button
                    type="submit" disabled={saving}
                    className="btn btn-primary text-xs disabled:opacity-60"
                  >
                    {saving ? '…' : (draft.id ? 'Enregistrer' : 'Créer')}
                  </button>
                </div>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─────────────── Row + small field helpers ─────────────── */

function ProspectRow({ prospect, onEdit, onDelete }: {
  prospect: ScoutProspect
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="px-4 py-3 flex items-center gap-4 hover:bg-stone-50 dark:hover:bg-stone-50/[0.03] transition-colors">
      <div className="w-9 h-9 rounded-full bg-stone-200 dark:bg-stone-50/10 grid place-items-center shrink-0 overflow-hidden">
        {prospect.photo_url
          ? <img src={prospect.photo_url} alt="" className="w-full h-full object-cover" />
          : <User size={16} weight="regular" className="text-zinc-500" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="font-medium text-zinc-950 dark:text-stone-50 truncate">{prospect.name}</div>
          {prospect.rating != null && (
            <span className="text-[0.65rem] font-mono px-1.5 py-0.5 rounded bg-turf-500/15 text-turf-800 dark:text-turf-300">
              {prospect.rating.toFixed(1)}/10
            </span>
          )}
          {prospect.recommendation && (
            <span className="text-[0.65rem] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-stone-100 text-zinc-700 dark:bg-stone-50/10 dark:text-stone-300">
              {prospect.recommendation}
            </span>
          )}
        </div>
        <div className="text-[0.7rem] text-zinc-500 dark:text-stone-500 truncate">
          {[prospect.position, prospect.club, prospect.age ? `${prospect.age} ans` : null].filter(Boolean).join(' · ')}
        </div>
        {prospect.next_action && (
          <div className="mt-1 text-[0.7rem] text-turf-700 dark:text-turf-300 truncate">
            → {prospect.next_action}
          </div>
        )}
      </div>
      <div className="inline-flex items-center gap-0.5 shrink-0">
        <button
          type="button" onClick={onEdit}
          className="grid place-items-center w-8 h-8 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-stone-100 dark:text-stone-400 dark:hover:text-stone-50 dark:hover:bg-stone-50/5 transition"
          title="Modifier"
        >
          <PencilSimpleLine size={14} weight="bold" />
        </button>
        <button
          type="button" onClick={onDelete}
          className="grid place-items-center w-8 h-8 rounded-lg text-zinc-500 hover:text-rose-700 hover:bg-rose-100 dark:text-stone-400 dark:hover:text-rose-400 dark:hover:bg-rose-500/15 transition"
          title="Supprimer"
        >
          <Trash size={14} weight="bold" />
        </button>
      </div>
    </div>
  )
}

interface FieldProps { label: string; value: string; onChange: (v: string) => void }
function TextField({ label, value, onChange, type = 'text', required, placeholder, step }: FieldProps & { type?: string; required?: boolean; placeholder?: string; step?: string }) {
  return (
    <label className="block">
      <span className="block text-[0.6rem] font-mono uppercase text-zinc-500 dark:text-stone-500 mb-1">{label}{required && ' *'}</span>
      <input
        value={value} type={type} step={step} placeholder={placeholder} required={required}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        className={INPUT}
      />
    </label>
  )
}
function SelectField({ label, value, onChange, options }: FieldProps & { options: string[] }) {
  return (
    <label className="block">
      <span className="block text-[0.6rem] font-mono uppercase text-zinc-500 dark:text-stone-500 mb-1">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={INPUT}
      >
        {options.map((o) => <option key={o} value={o}>{o || '—'}</option>)}
      </select>
    </label>
  )
}
function TextareaField({ label, value, onChange, rows = 3, placeholder }: FieldProps & { rows?: number; placeholder?: string }) {
  return (
    <label className="block">
      <span className="block text-[0.6rem] font-mono uppercase text-zinc-500 dark:text-stone-500 mb-1">{label}</span>
      <textarea
        value={value} rows={rows} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`${INPUT} resize-y leading-relaxed`}
      />
    </label>
  )
}
