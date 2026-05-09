import { useEffect, useMemo, useState } from 'react'
import type { FormEvent, InputHTMLAttributes, MouseEvent as ReactMouseEvent, ReactNode, SelectHTMLAttributes } from 'react'
import { useNavigate } from 'react-router-dom'
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
import Skeleton from '../../components/Skeleton'
import TagPicker from '../../components/TagPicker'
import ClipsGalleryAdmin from '../../components/ClipsGalleryAdmin'
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
  tags: [],
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
  /** "modal" = slide-from-right panel (default). "page" = inline embedded — no fixed wrapper. */
  mode?: 'modal' | 'page'
}

/**
 * Layout wrappers MUST live at module scope. Defining them inside
 * `PlayerEditor` (e.g. `const Wrapper = mode === 'page' ? (...) => ... : ...`)
 * recreates fresh function references on every render → React treats them as
 * a brand-new component type → it unmounts and remounts the entire form
 * subtree on each keystroke, killing input focus mid-typing.
 */
function PageWrapper({ children }: { children: ReactNode }) {
  return <div className="bg-stone-50 dark:bg-zinc-950 min-h-[100dvh] flex flex-col">{children}</div>
}
function ModalWrapper({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ x: 420 }}
      animate={{ x: 0 }}
      exit={{ x: 420 }}
      transition={{ type: 'spring', stiffness: 280, damping: 32 }}
      className="fixed top-0 right-0 h-[100dvh] w-full max-w-xl bg-stone-50 dark:bg-zinc-950 shadow-2xl flex flex-col z-50"
    >
      {children}
    </motion.div>
  )
}

interface SaveResponse {
  data: AdminPlayer
}

type EditorErrors = Record<string, string>

/* Convert a flat JSON-style payload into FormData. Arrays/objects are JSON-stringified
   so the Laravel controller can decode them back. Booleans become "1"/"0".
   On update, Laravel's PUT spoofing is added via _method so multipart works on PUT too. */
function buildFormData(
  payload: Record<string, unknown>,
  photoFile: File | null,
  photoRemove: boolean,
  isNew: boolean,
): FormData {
  const fd = new FormData()
  if (!isNew) fd.append('_method', 'PUT')

  for (const [key, raw] of Object.entries(payload)) {
    if (raw === null || raw === undefined) continue
    if (Array.isArray(raw) || (typeof raw === 'object' && !(raw instanceof File))) {
      fd.append(key, JSON.stringify(raw))
    } else if (typeof raw === 'boolean') {
      fd.append(key, raw ? '1' : '0')
    } else {
      fd.append(key, String(raw))
    }
  }

  if (photoFile) fd.append('photo', photoFile)
  if (photoRemove) fd.append('photo_remove', '1')

  return fd
}

function PlayerEditor({ player, isNew, onClose, onSaved, onDelete, mode = 'modal' }: PlayerEditorProps) {
  const [form, setForm] = useState<PlayerFormState>(player)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<EditorErrors>({})
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoRemove, setPhotoRemove] = useState(false)

  useEffect(() => {
    setForm(player); setErrors({})
    setPhotoFile(null); setPhotoRemove(false); setPhotoPreview(null)
  }, [player])

  // Generate object URL for the locally-picked file; revoke on change/unmount.
  useEffect(() => {
    if (!photoFile) { setPhotoPreview(null); return }
    const url = URL.createObjectURL(photoFile)
    setPhotoPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [photoFile])

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

      // If a file is being uploaded (or removed), switch to multipart so the
      // backend gets the actual binary. Otherwise stay on plain JSON.
      const useMultipart = Boolean(photoFile) || photoRemove
      let result: SaveResponse

      if (useMultipart) {
        const fd = buildFormData(payload, photoFile, photoRemove, isNew)
        result = isNew
          ? await api.post<SaveResponse>('/admin/players', fd, { auth: true })
          : await api.post<SaveResponse>(`/admin/players/${player.slug}`, fd, { auth: true })
      } else {
        result = isNew
          ? await api.post<SaveResponse>('/admin/players', payload, { auth: true })
          : await api.put<SaveResponse>(`/admin/players/${player.slug}`, payload, { auth: true })
      }

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

  // Pick a stable wrapper — both refs live at module scope so React keeps the
  // form subtree mounted across re-renders (otherwise the input loses focus
  // on every keystroke).
  const Wrapper = mode === 'page' ? PageWrapper : ModalWrapper

  return (
    <Wrapper>
      <div className={`flex items-center justify-between px-6 h-16 border-b border-stone-200 bg-white dark:bg-zinc-900 dark:border-stone-50/8 ${
        mode === 'page' ? 'sticky top-0 z-10' : ''
      }`}>
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
          aria-label={mode === 'page' ? 'Retour à la liste' : 'Fermer'}
        >
          <XIcon size={18} weight="bold" />
        </button>
      </div>

      <form onSubmit={submit} className={`flex-1 overflow-y-auto space-y-8 ${
        mode === 'page' ? 'px-6 lg:px-10 py-8 max-w-5xl w-full mx-auto' : 'px-6 py-6'
      }`}>
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
              <FieldRow label="Photo" hint="Upload depuis votre PC ou collez une URL externe.">
                <div className="space-y-3">
                  <div className="flex items-start gap-4">
                    {/* Preview */}
                    <div className="shrink-0 relative w-20 h-24 rounded-xl overflow-hidden bg-stone-200 dark:bg-stone-50/5 border border-stone-300 dark:border-stone-50/10">
                      {photoPreview ? (
                        <img src={photoPreview} alt="" className="absolute inset-0 w-full h-full object-cover" />
                      ) : photoRemove ? (
                        <div className="absolute inset-0 grid place-items-center text-[0.65rem] text-zinc-500 dark:text-stone-500 text-center px-2">
                          (à retirer)
                        </div>
                      ) : form.photo_url ? (
                        <img src={form.photo_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 grid place-items-center text-[0.65rem] text-zinc-400 dark:text-stone-500">
                          Aucune
                        </div>
                      )}
                    </div>

                    {/* Pickers */}
                    <div className="flex-1 space-y-2">
                      <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border border-stone-300 dark:border-stone-50/15 bg-white dark:bg-zinc-900/40 hover:bg-stone-100 dark:hover:bg-stone-50/5 cursor-pointer transition">
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0] ?? null
                            setPhotoFile(file)
                            if (file) setPhotoRemove(false)
                          }}
                        />
                        {photoFile ? `Changer (${photoFile.name.slice(0, 24)})` : 'Choisir une photo…'}
                      </label>
                      {(photoFile || form.photo_url) && !photoRemove && (
                        <button
                          type="button"
                          onClick={() => {
                            setPhotoFile(null)
                            setPhotoRemove(Boolean(form.photo_url) && !photoFile)
                          }}
                          className="block text-[0.7rem] text-zinc-500 hover:text-rose-700 dark:text-stone-400 dark:hover:text-rose-400 transition"
                        >
                          {photoFile ? 'Annuler le fichier choisi' : 'Retirer la photo actuelle'}
                        </button>
                      )}
                      {photoRemove && (
                        <button
                          type="button"
                          onClick={() => setPhotoRemove(false)}
                          className="block text-[0.7rem] text-zinc-500 hover:text-zinc-900 dark:text-stone-400 dark:hover:text-stone-100 transition"
                        >
                          Annuler le retrait
                        </button>
                      )}
                      <p className="text-[0.65rem] text-zinc-500 dark:text-stone-500">
                        JPG, PNG ou WebP — 4&nbsp;Mo max.
                      </p>
                    </div>
                  </div>

                  {/* Optional URL fallback (kept for external links). */}
                  <details className="text-xs">
                    <summary className="cursor-pointer text-zinc-500 dark:text-stone-400 hover:text-zinc-900 dark:hover:text-stone-100">
                      …ou utiliser une URL publique
                    </summary>
                    <div className="mt-2">
                      <TextInput
                        value={form.photo_url || ''}
                        onChange={(e) => set('photo_url', e.target.value)}
                        placeholder="https://…"
                      />
                    </div>
                  </details>
                </div>
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
            <div className="col-span-2">
              <FieldRow label="Tags & statut" hint="situation contractuelle, suivi médical, dispo…">
                <TagPicker
                  value={form.tags ?? []}
                  onChange={(tags) => set('tags', tags)}
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

        <section className="space-y-4">
          <h3 className="font-mono uppercase tracking-[0.18em] text-[0.7rem] text-zinc-500 dark:text-stone-400">
            Tracking physique <span className="text-zinc-400 dark:text-stone-500 normal-case font-sans tracking-normal">— moyennes par match (GPS)</span>
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <FieldRow label="Distance / match" hint="km">
              <NumberInput
                value={form.distance_avg_km ?? null}
                onChange={(v) => set('distance_avg_km', v)}
                step="0.1"
                max={20}
              />
            </FieldRow>
            <FieldRow label="Sprints / match">
              <NumberInput
                value={form.sprints_avg ?? null}
                onChange={(v) => set('sprints_avg', v)}
                max={200}
              />
            </FieldRow>
            <FieldRow label="Vitesse max" hint="km/h">
              <NumberInput
                value={form.top_speed_kmh ?? null}
                onChange={(v) => set('top_speed_kmh', v)}
                step="0.1"
                max={50}
              />
            </FieldRow>
            <FieldRow label="Courses HI / match">
              <NumberInput
                value={form.high_intensity_runs_avg ?? null}
                onChange={(v) => set('high_intensity_runs_avg', v)}
                max={300}
              />
            </FieldRow>
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
          <h3 className="font-mono uppercase tracking-[0.18em] text-[0.7rem] text-zinc-500 dark:text-stone-400">
            Moments clés <span className="text-zinc-400 dark:text-stone-500 normal-case font-sans tracking-normal">— frames annotées (vidéos jamais stockées)</span>
          </h3>
          <ClipsGalleryAdmin playerSlug={(form as AdminPlayer).slug ?? null} />
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

      <div className={`border-t border-stone-200 bg-white dark:bg-zinc-900 dark:border-stone-50/8 px-6 py-4 flex items-center justify-between gap-3 ${
        mode === 'page' ? 'sticky bottom-0' : ''
      }`}>
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
          <button type="button" onClick={onClose} className="btn btn-outline text-sm">
            {mode === 'page' ? 'Retour' : 'Annuler'}
          </button>
          <button type="button" onClick={submit} disabled={saving} className="btn btn-primary text-sm disabled:opacity-50">
            {saving ? 'Enregistrement…' : (isNew ? 'Créer le joueur' : 'Enregistrer les modifications')}
          </button>
        </div>
      </div>
    </Wrapper>
  )
}

// Make the editor (and the new-player template) reachable for the dedicated page route.
export { PlayerEditor, EMPTY_PLAYER }
export type { PlayerFormState, AdminPlayer, SaveKind }

interface PlayersListResponse {
  data: AdminPlayer[]
}

type StatusFilter = 'Tous' | 'online' | 'offline'
type AgeFilter = 'Tous' | 'U21' | '21-26' | '27+'

type SortColumn = 'name' | 'category' | 'club' | 'age' | 'matches' | 'goals' | 'assists' | 'xg' | 'pass_accuracy'
type SortDir = 'asc' | 'desc'

const DEFAULT_DIR: Record<SortColumn, SortDir> = {
  name: 'asc',
  category: 'asc',
  club: 'asc',
  age: 'asc',
  matches: 'desc',
  goals: 'desc',
  assists: 'desc',
  xg: 'desc',
  pass_accuracy: 'desc',
}

const AGE_OPTIONS: { key: AgeFilter; label: string }[] = [
  { key: 'Tous',  label: 'Tous âges' },
  { key: 'U21',   label: 'Moins de 21' },
  { key: '21-26', label: '21–26' },
  { key: '27+',   label: '27 et plus' },
]

const STATUS_OPTIONS: { key: StatusFilter; label: string }[] = [
  { key: 'Tous',    label: 'Tous statuts' },
  { key: 'online',  label: 'En ligne' },
  { key: 'offline', label: 'Hors ligne' },
]

/* Mini select used inside table headers — neutral chrome, mono font, no chrome on focus. */
const HEAD_SELECT =
  'mt-1.5 w-full max-w-[140px] bg-transparent border border-stone-300 dark:border-stone-50/15 rounded-md px-1.5 py-0.5 text-[0.65rem] font-mono normal-case tracking-normal text-zinc-700 dark:text-stone-300 hover:border-zinc-500 focus:border-zinc-900 dark:hover:border-stone-50/40 dark:focus:border-turf-300 focus:outline-none transition'

interface HeadCellProps {
  /** Sort column key — omit if the column isn't sortable. */
  column?: SortColumn
  label: string
  align?: 'left' | 'right'
  currentColumn?: SortColumn
  currentDir?: SortDir
  onSort?: (col: SortColumn) => void
  /** Filter dropdown rendered below the label. */
  filter?: ReactNode
}

function HeadCell({ column, label, align = 'left', currentColumn, currentDir, onSort, filter }: HeadCellProps) {
  const sortable = !!column && !!onSort
  const active = sortable && currentColumn === column
  const sortIndicator = active
    ? (currentDir === 'asc' ? '↑' : '↓')
    : (sortable ? '↕' : '')

  return (
    <th className={`px-4 py-2.5 align-top ${align === 'right' ? 'text-right' : 'text-left'}`}>
      {sortable ? (
        <button
          type="button"
          onClick={() => onSort!(column!)}
          className={`inline-flex items-center gap-1 text-[0.65rem] font-mono uppercase tracking-[0.16em] transition-colors ${
            active
              ? 'text-zinc-950 dark:text-stone-50'
              : 'text-zinc-600 dark:text-stone-400 hover:text-zinc-900 dark:hover:text-stone-100'
          }`}
        >
          {label}
          <span className={`inline-block ${active ? 'opacity-100' : 'opacity-40'}`}>{sortIndicator}</span>
        </button>
      ) : (
        <span className="text-[0.65rem] font-mono uppercase tracking-[0.16em] text-zinc-600 dark:text-stone-400">{label}</span>
      )}
      {filter}
    </th>
  )
}

type SortKey = 'name' | 'matches' | 'goals' | 'assists' | 'xg' | 'age-asc' | 'age-desc'

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'name',     label: 'Nom (A → Z)' },
  { key: 'matches',  label: 'Matchs joués ↓' },
  { key: 'goals',    label: 'Buts ↓' },
  { key: 'assists',  label: 'Passes décisives ↓' },
  { key: 'xg',       label: 'xG ↓' },
  { key: 'age-asc',  label: 'Âge (jeune → vieux)' },
  { key: 'age-desc', label: 'Âge (vieux → jeune)' },
]

const AGE_FILTERS: { key: AgeFilter; label: string }[] = [
  { key: 'Tous',  label: 'Tous âges' },
  { key: 'U21',   label: 'Moins de 21' },
  { key: '21-26', label: '21–26' },
  { key: '27+',   label: '27 et plus' },
]

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'Tous',    label: 'Tous' },
  { key: 'online',  label: 'En ligne' },
  { key: 'offline', label: 'Hors ligne' },
]

function AdminPlayers() {
  const [players, setPlayers] = useState<AdminPlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<string>('Tous')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('Tous')
  const [ageFilter, setAgeFilter] = useState<AgeFilter>('Tous')
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [sortColumn, setSortColumn] = useState<SortColumn>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [editing, setEditing] = useState<AdminPlayer | null>(null)
  const [creating, setCreating] = useState(false)

  // Editor preference: persisted in localStorage so the choice sticks across sessions.
  const navigate = useNavigate()
  const [editorMode, setEditorMode] = useState<'modal' | 'page'>(() => {
    if (typeof window === 'undefined') return 'modal'
    const saved = window.localStorage.getItem('rene_admin_editor_mode')
    return saved === 'page' ? 'page' : 'modal'
  })
  useEffect(() => {
    window.localStorage.setItem('rene_admin_editor_mode', editorMode)
  }, [editorMode])

  const openEditor = (p: AdminPlayer) => {
    if (editorMode === 'page') navigate(`/admin/joueurs/${p.slug}/edit`)
    else setEditing(p)
  }
  const openCreator = () => {
    if (editorMode === 'page') navigate('/admin/joueurs/nouveau')
    else setCreating(true)
  }
  const [toast, setToast] = useState<ToastState | null>(null)
  const [togglingSlug, setTogglingSlug] = useState<string | null>(null)

  const reload = () => {
    setLoading(true)
    return api.get<PlayersListResponse>('/admin/players', { auth: true })
      .then((res) => setPlayers(res.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { reload() }, [])

  const allTags = useMemo(() => {
    const set = new Set<string>()
    players.forEach((p) => (p.tags ?? []).forEach((t) => set.add(t)))
    return Array.from(set).sort()
  }, [players])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const rows = players.filter((p) => {
      if (filter !== 'Tous' && p.category !== filter) return false
      if (statusFilter === 'online' && !p.is_published) return false
      if (statusFilter === 'offline' && p.is_published) return false
      if (ageFilter === 'U21' && p.age >= 21) return false
      if (ageFilter === '21-26' && (p.age < 21 || p.age > 26)) return false
      if (ageFilter === '27+' && p.age < 27) return false
      if (tagFilter && !(p.tags ?? []).includes(tagFilter)) return false
      if (q && !`${p.name} ${p.club || ''}`.toLowerCase().includes(q)) return false
      return true
    })

    const sign = sortDir === 'asc' ? 1 : -1
    const num = (v: unknown) => Number(v ?? 0)
    const txt = (v: unknown) => String(v ?? '')

    const compare = (a: AdminPlayer, b: AdminPlayer): number => {
      switch (sortColumn) {
        case 'name':           return sign * txt(a.name).localeCompare(txt(b.name), 'fr')
        case 'category':       return sign * txt(a.category).localeCompare(txt(b.category), 'fr')
        case 'club':           return sign * txt(a.club).localeCompare(txt(b.club), 'fr')
        case 'age':            return sign * (num(a.age) - num(b.age))
        case 'matches':        return sign * (num(a.matches_played) - num(b.matches_played))
        case 'goals':          return sign * (num(a.goals) - num(b.goals))
        case 'assists':        return sign * (num(a.assists) - num(b.assists))
        case 'xg':             return sign * (num(a.xg) - num(b.xg))
        case 'pass_accuracy':  return sign * (num(a.pass_accuracy) - num(b.pass_accuracy))
      }
    }
    return [...rows].sort(compare)
  }, [players, query, filter, statusFilter, ageFilter, tagFilter, sortColumn, sortDir])

  const anyFilterActive =
    !!query.trim() ||
    filter !== 'Tous' ||
    statusFilter !== 'Tous' ||
    ageFilter !== 'Tous' ||
    tagFilter !== null ||
    sortColumn !== 'name' ||
    sortDir !== 'asc'

  const resetFilters = () => {
    setQuery('')
    setFilter('Tous')
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

  /**
   * Quick publish/hide toggle from the table row — bypasses the editor.
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
        <div className="flex items-center gap-3">
          {/* Editor preference toggle — persists per-admin via localStorage. */}
          <div className="hidden sm:inline-flex items-center gap-0.5 rounded-full border border-stone-300 dark:border-stone-50/15 p-0.5 text-[0.7rem]">
            {(['modal', 'page'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setEditorMode(m)}
                className={`px-2.5 py-1 rounded-full font-medium transition ${
                  editorMode === m
                    ? 'bg-zinc-950 text-stone-50 dark:bg-stone-50 dark:text-zinc-950'
                    : 'text-zinc-600 hover:text-zinc-900 dark:text-stone-400 dark:hover:text-stone-100'
                }`}
                title={m === 'modal' ? 'Édition en panneau latéral' : 'Édition en page complète'}
              >
                {m === 'modal' ? 'Modal' : 'Page'}
              </button>
            ))}
          </div>
          <button type="button" onClick={openCreator} className="btn btn-primary text-sm">
            <Plus size={14} weight="bold" /> Nouveau joueur
          </button>
        </div>
      </div>

      {/* Toolbar : search + reset + count. Sort + filters live inside the table head. */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
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

        {anyFilterActive && (
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-1.5 text-[0.7rem] font-medium text-zinc-600 hover:text-zinc-950 dark:text-stone-400 dark:hover:text-stone-50 transition"
            title="Réinitialiser les filtres"
          >
            <XIcon size={12} weight="bold" />
            Réinitialiser
          </button>
        )}

        <span className="ml-auto text-xs text-zinc-500 dark:text-stone-400 font-mono tabular-nums">
          {filtered.length} / {players.length} joueurs
        </span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white dark:bg-zinc-900 dark:border-stone-50/8">
        <table className="w-full text-sm">
          <thead className="bg-stone-100 dark:bg-zinc-950 align-top">
            <tr>
              <HeadCell column="name" label="Joueur"
                currentColumn={sortColumn} currentDir={sortDir} onSort={onSort} />

              <HeadCell column="category" label="Catégorie"
                currentColumn={sortColumn} currentDir={sortDir} onSort={onSort}
                filter={
                  <select className={HEAD_SELECT} value={filter} onChange={(e) => setFilter(e.target.value)}>
                    <option value="Tous">Toutes</option>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                } />

              <HeadCell column="club" label="Club"
                currentColumn={sortColumn} currentDir={sortDir} onSort={onSort} />

              <HeadCell column="age" label="Âge" align="right"
                currentColumn={sortColumn} currentDir={sortDir} onSort={onSort}
                filter={
                  <select className={HEAD_SELECT + ' ml-auto'} value={ageFilter} onChange={(e) => setAgeFilter(e.target.value as AgeFilter)}>
                    {AGE_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                  </select>
                } />

              <HeadCell column="matches" label="Matchs" align="right"
                currentColumn={sortColumn} currentDir={sortDir} onSort={onSort} />
              <HeadCell column="goals" label="Buts" align="right"
                currentColumn={sortColumn} currentDir={sortDir} onSort={onSort} />
              <HeadCell column="assists" label="Passes D." align="right"
                currentColumn={sortColumn} currentDir={sortDir} onSort={onSort} />
              <HeadCell column="xg" label="xG" align="right"
                currentColumn={sortColumn} currentDir={sortDir} onSort={onSort} />
              <HeadCell column="pass_accuracy" label="% passes" align="right"
                currentColumn={sortColumn} currentDir={sortDir} onSort={onSort} />

              {allTags.length > 0 && (
                <HeadCell label="Tags"
                  filter={
                    <select className={HEAD_SELECT} value={tagFilter ?? ''} onChange={(e) => setTagFilter(e.target.value || null)}>
                      <option value="">Tous</option>
                      {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  } />
              )}

              <HeadCell label="Statut" align="right"
                filter={
                  <select className={HEAD_SELECT + ' ml-auto'} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}>
                    {STATUS_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                  </select>
                } />

              <th className="px-2 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading && Array.from({ length: 6 }).map((_, i) => (
              <tr key={`skel-${i}`} className="border-t border-stone-200 dark:border-stone-50/8">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10" rounded="lg" />
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
                <td className="px-4 py-3 text-right"><Skeleton className="h-3 w-10 ml-auto" /></td>
                <td className="px-4 py-3 text-right"><Skeleton className="h-3 w-10 ml-auto" /></td>
                {allTags.length > 0 && (
                  <td className="px-4 py-3"><Skeleton className="h-3 w-16" /></td>
                )}
                <td className="px-4 py-3"><Skeleton className="h-5 w-16" rounded="full" /></td>
                <td className="px-2 py-3"><Skeleton className="h-6 w-6" /></td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={allTags.length > 0 ? 12 : 11} className="px-4 py-8 text-center text-zinc-500 dark:text-stone-400">Aucun joueur.</td></tr>
            )}
            {filtered.map((p) => (
              <tr
                key={p.id ?? p.slug}
                onClick={() => openEditor(p)}
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
                <td className="px-4 py-3 text-right tabular-nums text-zinc-900 dark:text-stone-50">{p.age}</td>
                <td className="px-4 py-3 text-right tabular-nums text-zinc-900 dark:text-stone-50">{p.matches_played}</td>
                <td className="px-4 py-3 text-right tabular-nums text-zinc-900 dark:text-stone-50">{p.goals}</td>
                <td className="px-4 py-3 text-right tabular-nums text-zinc-900 dark:text-stone-50">{p.assists}</td>
                <td className="px-4 py-3 text-right tabular-nums text-zinc-700 dark:text-stone-300">{Number(p.xg).toFixed(1)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-zinc-700 dark:text-stone-300">{Number(p.pass_accuracy).toFixed(1)}%</td>
                {allTags.length > 0 && (
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1 max-w-[160px]">
                      {(p.tags ?? []).slice(0, 2).map((t) => (
                        <span key={t} className="inline-block px-1.5 py-0.5 rounded-full text-[0.6rem] font-mono bg-stone-100 text-zinc-600 border border-stone-200 dark:bg-stone-50/5 dark:text-stone-400 dark:border-stone-50/10">
                          {t}
                        </span>
                      ))}
                      {(p.tags ?? []).length > 2 && (
                        <span className="text-[0.6rem] font-mono text-zinc-400 dark:text-stone-500">+{(p.tags ?? []).length - 2}</span>
                      )}
                    </div>
                  </td>
                )}
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); togglePublished(p) }}
                    disabled={togglingSlug === p.slug}
                    title={p.is_published ? 'Masquer du site public' : 'Publier sur le site public'}
                    aria-pressed={p.is_published}
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[0.65rem] font-mono uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-wait ${
                      p.is_published
                        ? 'bg-turf-50 text-turf-800 border border-turf-200 hover:bg-turf-100 dark:bg-turf-800/30 dark:text-turf-200 dark:border-turf-300/30 dark:hover:bg-turf-800/50'
                        : 'bg-stone-100 text-zinc-500 border border-stone-200 hover:bg-stone-200 dark:bg-stone-50/5 dark:text-stone-400 dark:border-stone-50/10 dark:hover:bg-stone-50/10'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${p.is_published ? 'bg-turf-600 dark:bg-turf-300' : 'bg-zinc-400 dark:bg-stone-500'}`} />
                    {p.is_published ? 'En ligne' : 'Hors ligne'}
                  </button>
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
