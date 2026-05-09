import { useEffect, useMemo, useState } from 'react'
import type { FormEvent, InputHTMLAttributes, MouseEvent as ReactMouseEvent, ReactNode, SelectHTMLAttributes } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  CheckCircle,
  MagnifyingGlass,
  PencilSimpleLine,
  Plus,
  Trash,
  X as XIcon,
} from '@phosphor-icons/react'
import { api, ApiError } from '../../api/client'
import type { Player } from '../../types/player'
import Pitch from '../../components/Pitch'
import { type HeatmapGrid, emptyGrid, heatmapFromPosition, isValidGrid } from '../../lib/heatmap'

type AdminPlayer = Player & { id?: number }
type PlayerFormState = Partial<AdminPlayer>

const CATEGORIES = ['Gardien', 'Defenseur', 'Milieu', 'Attaquant']
const FEET = ['Droit', 'Gauche', 'Ambidextre']

const EMPTY_PLAYER: PlayerFormState = {
  name: '',
  age: 20,
  height: '',
  position: '',
  category: 'Milieu',
  club: '',
  nationality: '',
  preferred_foot: 'Droit',
  since: new Date().getFullYear(),
  photo_url: '',
  bio: '',
  matches_played: 0,
  goals: 0,
  assists: 0,
  minutes_played: 0,
  shots: 0,
  shots_on_target: 0,
  xg: 0,
  xa: 0,
  key_passes: 0,
  pass_accuracy: 0,
  dribbles_completed: 0,
  tackles: 0,
  interceptions: 0,
  duels_won: 0,
  yellow_cards: 0,
  red_cards: 0,
  clean_sheets: 0,
  saves: 0,
  heatmap_grid: null,
  is_published: true,
}

const NUMERIC_FIELDS: (keyof PlayerFormState)[] = [
  'age','since',
  'matches_played','goals','assists',
  'minutes_played','shots','shots_on_target','xg','xa',
  'key_passes','pass_accuracy','dribbles_completed',
  'tackles','interceptions','duels_won',
  'yellow_cards','red_cards','clean_sheets','saves',
]

interface FieldRowProps {
  label: string
  hint?: string
  children: ReactNode
}

function FieldRow({ label, hint, children }: FieldRowProps) {
  return (
    <label className="block">
      <span className="block text-[0.65rem] font-mono uppercase tracking-[0.16em] text-zinc-500 dark:text-stone-400 mb-1">
        {label}{hint ? <span className="text-zinc-400 dark:text-stone-500 normal-case font-sans tracking-normal ml-1">— {hint}</span> : null}
      </span>
      {children}
    </label>
  )
}

const INPUT_BASE =
  'w-full rounded-lg border border-stone-300 bg-white text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 dark:border-stone-50/15 dark:bg-zinc-900 dark:text-stone-50 dark:placeholder:text-stone-500 dark:focus:border-turf-300 px-3 py-2 text-sm focus:outline-none transition'

type TextInputProps = InputHTMLAttributes<HTMLInputElement>

function TextInput(props: TextInputProps) {
  return (
    <input
      {...props}
      className={`${INPUT_BASE} ${props.className || ''}`}
    />
  )
}

interface NumberInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'step' | 'min' | 'max' | 'type'> {
  value: number | null | undefined
  onChange: (value: number | null) => void
  step?: number | string
  min?: number
  max?: number
}

function NumberInput({ value, onChange, step = 1, min = 0, max, ...rest }: NumberInputProps) {
  return (
    <input
      type="number"
      step={step}
      min={min}
      max={max}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
      className={`${INPUT_BASE} tabular-nums`}
      {...rest}
    />
  )
}

interface SelectInputProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'value' | 'onChange'> {
  value: string | null | undefined
  onChange: (value: string) => void
  options: string[]
}

function SelectInput({ value, onChange, options, ...rest }: SelectInputProps) {
  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className={INPUT_BASE}
      {...rest}
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  )
}

interface ToastState {
  kind: 'success' | 'error'
  message: string
}

interface ToastProps extends ToastState {
  onDismiss: () => void
}

function Toast({ kind = 'success', message, onDismiss }: ToastProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-diffusion text-sm ${
        kind === 'success' ? 'bg-turf-800 text-stone-50' : 'bg-red-600 text-white'
      }`}
      role="status"
    >
      <CheckCircle size={16} weight="bold" />
      <span>{message}</span>
      <button type="button" onClick={onDismiss} className="ml-2 opacity-70 hover:opacity-100">
        <XIcon size={14} weight="bold" />
      </button>
    </motion.div>
  )
}

type SaveKind = 'created' | 'updated'

interface PlayerEditorProps {
  player: PlayerFormState
  isNew: boolean
  onClose: () => void
  onSaved: (saved: AdminPlayer, kind: SaveKind) => void
  onDelete: (player: PlayerFormState) => void
}

interface SaveResponse {
  data: AdminPlayer
}

type EditorErrors = Record<string, string>

function PlayerEditor({ player, isNew, onClose, onSaved, onDelete }: PlayerEditorProps) {
  const [form, setForm] = useState<PlayerFormState>(player)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<EditorErrors>({})

  useEffect(() => { setForm(player); setErrors({}) }, [player])

  // Editor accepts null for numeric fields to model "empty input"; we coerce to 0 at submit.
  const set = <K extends keyof PlayerFormState>(key: K, value: PlayerFormState[K] | null) =>
    setForm((f) => ({ ...f, [key]: value } as PlayerFormState))

  const submit = async (e: FormEvent | ReactMouseEvent) => {
    e.preventDefault()
    setSaving(true)
    setErrors({})
    try {
      const payload: Record<string, unknown> = { ...form }
      NUMERIC_FIELDS.forEach((k) => {
        if (payload[k] === null || payload[k] === undefined || payload[k] === '') payload[k] = 0
      })
      const result = isNew
        ? await api.post<SaveResponse>('/admin/players', payload, { auth: true })
        : await api.put<SaveResponse>(`/admin/players/${player.slug}`, payload, { auth: true })
      onSaved(result.data, isNew ? 'created' : 'updated')
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 422) {
        const flat: EditorErrors = {}
        const data = err.data as { errors?: Record<string, unknown> } | null | undefined
        Object.entries(data?.errors || {}).forEach(([k, v]) => {
          flat[k] = Array.isArray(v) ? String(v[0]) : String(v)
        })
        setErrors(flat)
      } else {
        const message = err instanceof Error ? err.message : 'Erreur d\'enregistrement.'
        setErrors({ _global: message })
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      initial={{ x: 420 }}
      animate={{ x: 0 }}
      exit={{ x: 420 }}
      transition={{ type: 'spring', stiffness: 280, damping: 32 }}
      className="fixed top-0 right-0 h-[100dvh] w-full max-w-xl bg-stone-50 dark:bg-zinc-950 shadow-2xl flex flex-col z-50"
    >
      <div className="flex items-center justify-between px-6 h-16 border-b border-stone-200 bg-white dark:bg-zinc-900 dark:border-stone-50/8">
        <div>
          <div className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-turf-700 dark:text-turf-300">
            {isNew ? 'Nouveau joueur' : 'Édition'}
          </div>
          <div className="font-display font-semibold text-lg text-zinc-950 dark:text-stone-50 truncate">
            {form.name || 'Joueur sans nom'}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid place-items-center w-9 h-9 rounded-full text-zinc-500 hover:bg-stone-100 hover:text-zinc-900 dark:text-stone-400 dark:hover:bg-stone-50/8 dark:hover:text-stone-50 transition"
          aria-label="Fermer"
        >
          <XIcon size={18} weight="bold" />
        </button>
      </div>

      <form onSubmit={submit} className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
        <section className="space-y-4">
          <h3 className="font-mono uppercase tracking-[0.18em] text-[0.7rem] text-zinc-500 dark:text-stone-400">Identité</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <FieldRow label="Nom complet">
                <TextInput value={form.name} onChange={(e) => set('name', e.target.value)} required />
              </FieldRow>
            </div>
            <FieldRow label="Âge">
              <NumberInput value={form.age} onChange={(v) => set('age', v)} min={14} max={60} />
            </FieldRow>
            <FieldRow label="Taille" hint="ex. 1m83">
              <TextInput value={form.height || ''} onChange={(e) => set('height', e.target.value)} />
            </FieldRow>
            <FieldRow label="Poste" hint="ex. Milieu offensif">
              <TextInput value={form.position} onChange={(e) => set('position', e.target.value)} required />
            </FieldRow>
            <FieldRow label="Catégorie">
              <SelectInput value={form.category} onChange={(v) => set('category', v)} options={CATEGORIES} />
            </FieldRow>
            <FieldRow label="Club">
              <TextInput value={form.club || ''} onChange={(e) => set('club', e.target.value)} />
            </FieldRow>
            <FieldRow label="Depuis">
              <NumberInput value={form.since} onChange={(v) => set('since', v)} min={1990} max={2100} />
            </FieldRow>
            <FieldRow label="Nationalité">
              <TextInput value={form.nationality || ''} onChange={(e) => set('nationality', e.target.value)} />
            </FieldRow>
            <FieldRow label="Pied fort">
              <SelectInput value={form.preferred_foot || 'Droit'} onChange={(v) => set('preferred_foot', v)} options={FEET} />
            </FieldRow>
            <div className="col-span-2">
              <FieldRow label="Photo (URL)">
                <TextInput value={form.photo_url || ''} onChange={(e) => set('photo_url', e.target.value)} />
              </FieldRow>
            </div>
            <div className="col-span-2">
              <FieldRow label="Bio" hint="optionnelle, affichée dans le PDF">
                <textarea
                  rows={3}
                  value={form.bio || ''}
                  onChange={(e) => set('bio', e.target.value)}
                  className={INPUT_BASE}
                />
              </FieldRow>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="font-mono uppercase tracking-[0.18em] text-[0.7rem] text-zinc-500 dark:text-stone-400">Stats de base</h3>
          <div className="grid grid-cols-3 gap-3">
            <FieldRow label="Matchs joués"><NumberInput value={form.matches_played} onChange={(v) => set('matches_played', v)} max={200} /></FieldRow>
            <FieldRow label="Buts"><NumberInput value={form.goals} onChange={(v) => set('goals', v)} max={200} /></FieldRow>
            <FieldRow label="Passes décisives"><NumberInput value={form.assists} onChange={(v) => set('assists', v)} max={200} /></FieldRow>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="font-mono uppercase tracking-[0.18em] text-[0.7rem] text-zinc-500 dark:text-stone-400">Stats avancées</h3>
          <div className="grid grid-cols-3 gap-3">
            <FieldRow label="Minutes jouées"><NumberInput value={form.minutes_played} onChange={(v) => set('minutes_played', v)} max={20000} /></FieldRow>
            <FieldRow label="Tirs"><NumberInput value={form.shots} onChange={(v) => set('shots', v)} max={1000} /></FieldRow>
            <FieldRow label="Tirs cadrés"><NumberInput value={form.shots_on_target} onChange={(v) => set('shots_on_target', v)} max={1000} /></FieldRow>

            <FieldRow label="xG"><NumberInput value={form.xg} onChange={(v) => set('xg', v)} step="0.1" max={200} /></FieldRow>
            <FieldRow label="xA"><NumberInput value={form.xa} onChange={(v) => set('xa', v)} step="0.1" max={200} /></FieldRow>
            <FieldRow label="Passes clés"><NumberInput value={form.key_passes} onChange={(v) => set('key_passes', v)} max={1000} /></FieldRow>

            <FieldRow label="% passes" hint="0–100"><NumberInput value={form.pass_accuracy} onChange={(v) => set('pass_accuracy', v)} step="0.1" max={100} /></FieldRow>
            <FieldRow label="Dribbles réussis"><NumberInput value={form.dribbles_completed} onChange={(v) => set('dribbles_completed', v)} max={1000} /></FieldRow>
            <FieldRow label="Duels gagnés"><NumberInput value={form.duels_won} onChange={(v) => set('duels_won', v)} max={1000} /></FieldRow>

            <FieldRow label="Tacles"><NumberInput value={form.tackles} onChange={(v) => set('tackles', v)} max={1000} /></FieldRow>
            <FieldRow label="Interceptions"><NumberInput value={form.interceptions} onChange={(v) => set('interceptions', v)} max={1000} /></FieldRow>
            <FieldRow label="Clean sheets"><NumberInput value={form.clean_sheets} onChange={(v) => set('clean_sheets', v)} max={200} /></FieldRow>

            <FieldRow label="Arrêts"><NumberInput value={form.saves} onChange={(v) => set('saves', v)} max={1000} /></FieldRow>
            <FieldRow label="Cartons jaunes"><NumberInput value={form.yellow_cards} onChange={(v) => set('yellow_cards', v)} max={50} /></FieldRow>
            <FieldRow label="Cartons rouges"><NumberInput value={form.red_cards} onChange={(v) => set('red_cards', v)} max={20} /></FieldRow>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h3 className="font-mono uppercase tracking-[0.18em] text-[0.7rem] text-zinc-500 dark:text-stone-400">
              Zones d'activité — terrain
            </h3>
            <span className="text-[0.65rem] text-zinc-400 dark:text-stone-500">
              Le joueur attaque de gauche à droite
            </span>
          </div>
          <Pitch
            mode="paint"
            grid={isValidGrid(form.heatmap_grid) ? form.heatmap_grid : emptyGrid()}
            position={form.position}
            slug={(form as AdminPlayer).slug}
            onChange={(next: HeatmapGrid) => set('heatmap_grid', next)}
          />
          {!form.heatmap_grid && form.position && (
            <button
              type="button"
              onClick={() => set('heatmap_grid', heatmapFromPosition(form.position || '', (form as AdminPlayer).slug || form.name || 'new'))}
              className="text-xs text-turf-700 dark:text-turf-300 hover:underline"
            >
              Initialiser depuis le poste « {form.position} »
            </button>
          )}
        </section>

        <section className="space-y-3">
          <h3 className="font-mono uppercase tracking-[0.18em] text-[0.7rem] text-zinc-500 dark:text-stone-400">Visibilité</h3>
          <label className="inline-flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={!!form.is_published}
              onChange={(e) => set('is_published', e.target.checked)}
              className="w-4 h-4 accent-turf-700"
            />
            <span className="text-sm text-zinc-800 dark:text-stone-200">Publier le profil sur le site public</span>
          </label>
        </section>

        {errors._global && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-200">
            {errors._global}
          </div>
        )}
        {Object.keys(errors).filter((k) => k !== '_global').length > 0 && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-200 space-y-1">
            {Object.entries(errors).filter(([k]) => k !== '_global').map(([k, v]) => (
              <div key={k}><span className="font-mono">{k}</span>: {v}</div>
            ))}
          </div>
        )}
      </form>

      <div className="border-t border-stone-200 bg-white dark:bg-zinc-900 dark:border-stone-50/8 px-6 py-4 flex items-center justify-between gap-3">
        {!isNew ? (
          <button
            type="button"
            onClick={() => onDelete(player)}
            className="inline-flex items-center gap-2 text-sm text-red-600 hover:text-red-700 transition"
          >
            <Trash size={14} weight="bold" /> Supprimer
          </button>
        ) : <span />}
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="btn btn-outline text-sm">Annuler</button>
          <button type="button" onClick={submit} disabled={saving} className="btn btn-primary text-sm disabled:opacity-50">
            {saving ? 'Enregistrement…' : (isNew ? 'Créer le joueur' : 'Enregistrer les modifications')}
          </button>
        </div>
      </div>
    </motion.div>
  )
}

interface PlayersListResponse {
  data: AdminPlayer[]
}

function AdminPlayers() {
  const [players, setPlayers] = useState<AdminPlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<string>('Tous')
  const [editing, setEditing] = useState<AdminPlayer | null>(null)
  const [creating, setCreating] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)

  const reload = () => {
    setLoading(true)
    return api.get<PlayersListResponse>('/admin/players', { auth: true })
      .then((res) => setPlayers(res.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { reload() }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return players.filter((p) => {
      if (filter !== 'Tous' && p.category !== filter) return false
      if (q && !`${p.name} ${p.club || ''}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [players, query, filter])

  const showToast = (kind: ToastState['kind'], message: string) => {
    setToast({ kind, message })
    setTimeout(() => setToast(null), 3500)
  }

  const onSaved = async (saved: AdminPlayer, kind: SaveKind) => {
    setEditing(null)
    setCreating(false)
    await reload()
    showToast('success', kind === 'created' ? 'Joueur créé.' : `« ${saved.name} » mis à jour.`)
  }

  const onDelete = async (player: PlayerFormState) => {
    if (!confirm(`Supprimer définitivement « ${player.name} » ?`)) return
    try {
      await api.delete(`/admin/players/${player.slug}`, { auth: true })
      setEditing(null)
      await reload()
      showToast('success', 'Joueur supprimé.')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Suppression impossible.'
      showToast('error', message)
    }
  }

  return (
    <div className="px-6 lg:px-10 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <span className="eyebrow">Roster</span>
          <h1 className="mt-2 font-display font-semibold text-3xl lg:text-4xl tracking-tight text-zinc-950 dark:text-stone-50">
            Joueurs & statistiques
          </h1>
          <p className="mt-1.5 text-sm text-zinc-600 dark:text-stone-400">
            Cliquez sur un joueur pour mettre à jour ses statistiques.
          </p>
        </div>
        <button type="button" onClick={() => setCreating(true)} className="btn btn-primary text-sm">
          <Plus size={14} weight="bold" /> Nouveau joueur
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative">
          <MagnifyingGlass size={14} weight="regular" className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un joueur"
            className="pl-9 pr-3 py-2 rounded-full border border-stone-300 bg-white text-sm w-64 focus:outline-none focus:border-zinc-900 dark:bg-zinc-900 dark:border-stone-50/15 dark:text-stone-50 dark:placeholder:text-stone-500 dark:focus:border-turf-300"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {['Tous', ...CATEGORIES].map((c) => {
            const active = filter === c
            return (
              <button
                key={c}
                type="button"
                onClick={() => setFilter(c)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors duration-200 ease-premium ${
                  active
                    ? 'bg-zinc-950 border-zinc-950 text-stone-50 dark:bg-stone-50 dark:border-stone-50 dark:text-zinc-950'
                    : 'bg-white border-stone-300 text-zinc-700 hover:border-zinc-500 dark:bg-zinc-900 dark:border-stone-50/15 dark:text-stone-300 dark:hover:border-stone-50/40'
                }`}
              >
                {c}
              </button>
            )
          })}
        </div>
        <span className="ml-auto text-xs text-zinc-500 dark:text-stone-400 font-mono tabular-nums">
          {filtered.length} / {players.length} joueurs
        </span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white dark:bg-zinc-900 dark:border-stone-50/8">
        <table className="w-full text-sm">
          <thead className="bg-stone-100 text-zinc-600 dark:bg-zinc-950 dark:text-stone-400 text-[0.65rem] font-mono uppercase tracking-[0.16em]">
            <tr>
              <th className="text-left px-4 py-3">Joueur</th>
              <th className="text-left px-4 py-3">Catégorie</th>
              <th className="text-left px-4 py-3">Club</th>
              <th className="text-right px-4 py-3">Matchs</th>
              <th className="text-right px-4 py-3">Buts</th>
              <th className="text-right px-4 py-3">Passes D.</th>
              <th className="text-right px-4 py-3">xG</th>
              <th className="text-right px-4 py-3">% passes</th>
              <th className="text-right px-4 py-3">Statut</th>
              <th className="px-2 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={10} className="px-4 py-8 text-center text-zinc-500 dark:text-stone-400">Chargement…</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={10} className="px-4 py-8 text-center text-zinc-500 dark:text-stone-400">Aucun joueur.</td></tr>
            )}
            {filtered.map((p) => (
              <tr
                key={p.id ?? p.slug}
                onClick={() => setEditing(p)}
                className="border-t border-stone-200 hover:bg-stone-50/60 dark:border-stone-50/8 dark:hover:bg-stone-50/5 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={p.photo_url || `https://picsum.photos/seed/${p.slug}/80`}
                      alt=""
                      className="w-9 h-9 rounded-full object-cover bg-stone-200 dark:bg-stone-800"
                    />
                    <div>
                      <div className="font-medium text-zinc-950 dark:text-stone-50">{p.name}</div>
                      <div className="text-xs text-zinc-500 dark:text-stone-400">{p.position}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-zinc-700 dark:text-stone-300">{p.category}</td>
                <td className="px-4 py-3 text-zinc-700 dark:text-stone-300">{p.club || '—'}</td>
                <td className="px-4 py-3 text-right tabular-nums text-zinc-900 dark:text-stone-50">{p.matches_played}</td>
                <td className="px-4 py-3 text-right tabular-nums text-zinc-900 dark:text-stone-50">{p.goals}</td>
                <td className="px-4 py-3 text-right tabular-nums text-zinc-900 dark:text-stone-50">{p.assists}</td>
                <td className="px-4 py-3 text-right tabular-nums text-zinc-700 dark:text-stone-300">{Number(p.xg).toFixed(1)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-zinc-700 dark:text-stone-300">{Number(p.pass_accuracy).toFixed(1)}%</td>
                <td className="px-4 py-3 text-right">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[0.65rem] font-mono uppercase tracking-wider ${
                    p.is_published
                      ? 'bg-turf-50 text-turf-800 border border-turf-200 dark:bg-turf-800/30 dark:text-turf-200 dark:border-turf-300/30'
                      : 'bg-stone-100 text-zinc-500 border border-stone-200 dark:bg-stone-50/5 dark:text-stone-400 dark:border-stone-50/10'
                  }`}>
                    {p.is_published ? 'Publié' : 'Masqué'}
                  </span>
                </td>
                <td className="px-2 py-3 text-zinc-400 dark:text-stone-500">
                  <PencilSimpleLine size={15} weight="regular" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {(editing || creating) && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setEditing(null); setCreating(false) }}
              className="fixed inset-0 z-40 bg-zinc-950/40"
            />
            <PlayerEditor
              key={editing?.id ?? 'new'}
              isNew={creating}
              player={creating ? EMPTY_PLAYER : (editing as AdminPlayer)}
              onClose={() => { setEditing(null); setCreating(false) }}
              onSaved={onSaved}
              onDelete={onDelete}
            />
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && <Toast {...toast} onDismiss={() => setToast(null)} />}
      </AnimatePresence>
    </div>
  )
}

export default AdminPlayers
