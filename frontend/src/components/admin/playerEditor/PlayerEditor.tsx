import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowSquareOut, FloppyDisk, Trash, WarningCircle } from '@phosphor-icons/react'
import { api, ApiError } from '../../../api/client'
import { useConfirm } from '../../ConfirmProvider'
import { useToast } from '../../ToastProvider'
import TagPicker from '../../TagPicker'
import Pitch from '../../Pitch'
import ClipsGalleryAdmin from '../../ClipsGalleryAdmin'
import { type HeatmapGrid, emptyGrid, heatmapFromPosition, isValidGrid } from '../../../lib/heatmap'
import {
  ChipsInput, EditorErrorsContext, Field, ImageUpload, Section, Segmented, StatInput, Switch, TextArea, TextInput,
} from './controls'
import { CareerEditor, GalleryEditor } from './listEditors'
import PreviewCard from './PreviewCard'
import {
  ageFromBirthDate, buildFormData, CATEGORIES, CATEGORY_LABELS, FEET, NUMERIC_FIELDS, TABS, tabOfField,
  type AdminPlayer, type EditorErrors, type PlayerFormState, type SaveKind, type TabId,
} from './model'

interface PlayerEditorProps {
  player: PlayerFormState
  isNew: boolean
  onClose: () => void
  onSaved: (saved: AdminPlayer, kind: SaveKind) => void
  onDelete: (player: PlayerFormState) => void
}

interface SaveResponse { data: AdminPlayer }

const SPRING = { type: 'spring', stiffness: 380, damping: 34 } as const

/**
 * Full-screen player editor: the player card on the left (photo, live
 * summary, what is missing), the fields in five tabs on the right, and the
 * save action fixed at the top (also Ctrl/Cmd + S). Leaving with unsaved
 * changes asks first.
 */
export default function PlayerEditor({ player, isNew, onClose, onSaved, onDelete }: PlayerEditorProps) {
  const toast = useToast()
  const confirm = useConfirm()
  const [form, setForm] = useState<PlayerFormState>(player)
  const [initial, setInitial] = useState<PlayerFormState>(player)
  const [tab, setTab] = useState<TabId>('profil')
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<EditorErrors>({})
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoRemove, setPhotoRemove] = useState(false)

  useEffect(() => {
    setForm(player); setInitial(player); setErrors({})
    setPhotoFile(null); setPhotoRemove(false)
  }, [player])

  useEffect(() => {
    if (!photoFile) { setPhotoPreview(null); return }
    const url = URL.createObjectURL(photoFile)
    setPhotoPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [photoFile])

  const dirty = useMemo(
    () => Boolean(photoFile) || photoRemove || JSON.stringify(form) !== JSON.stringify(initial),
    [form, initial, photoFile, photoRemove],
  )

  // Closing the tab with unsaved changes: let the browser ask.
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const set = <K extends keyof PlayerFormState>(key: K, value: PlayerFormState[K] | null) =>
    setForm((f) => ({ ...f, [key]: value } as PlayerFormState))

  const errorCount = useMemo(() => {
    const counts: Partial<Record<TabId, number>> = {}
    Object.keys(errors).filter((k) => k !== '_global').forEach((k) => {
      const t = tabOfField(k)
      counts[t] = (counts[t] ?? 0) + 1
    })
    return counts
  }, [errors])

  /** Open the field's tab, then bring the field into view and focus it. */
  const goTo = useCallback((field: string) => {
    setTab(tabOfField(field))
    window.setTimeout(() => {
      const el = document.querySelector<HTMLElement>(`[data-field="${field}"]`)
      if (!el) return
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      const ring = ['ring-2', 'ring-orange-400', 'ring-offset-4', 'ring-offset-stone-50', 'dark:ring-offset-zinc-950']
      el.classList.add(...ring)
      window.setTimeout(() => el.classList.remove(...ring), 1800)
      window.setTimeout(() => {
        el.querySelector<HTMLElement>('input:not([type=hidden]):not([type=file]), textarea, select')?.focus({ preventScroll: true })
      }, 400)
    }, 260)
  }, [])

  const submitRef = useRef<() => void>(() => {})
  const submit = async () => {
    if (saving) return
    setSaving(true)
    setErrors({})
    try {
      const payload: Record<string, unknown> = { ...form }
      NUMERIC_FIELDS.forEach((k) => {
        if (payload[k] === null || payload[k] === undefined || payload[k] === '') payload[k] = 0
      })
      let result: SaveResponse
      if (photoFile || photoRemove) {
        const fd = buildFormData(payload, photoFile, photoRemove, isNew)
        result = isNew
          ? await api.post<SaveResponse>('/admin/players', fd, { auth: true })
          : await api.post<SaveResponse>(`/admin/players/${player.slug}`, fd, { auth: true })
      } else {
        result = isNew
          ? await api.post<SaveResponse>('/admin/players', payload, { auth: true })
          : await api.put<SaveResponse>(`/admin/players/${player.slug}`, payload, { auth: true })
      }
      setInitial(form)
      setPhotoFile(null)
      setPhotoRemove(false)
      onSaved(result.data, isNew ? 'created' : 'updated')
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 422) {
        const flat: EditorErrors = {}
        const data = err.data as { errors?: Record<string, unknown> } | null | undefined
        Object.entries(data?.errors || {}).forEach(([k, v]) => { flat[k] = Array.isArray(v) ? String(v[0]) : String(v) })
        setErrors(flat)
        const firstKey = Object.keys(flat)[0]
        if (firstKey) goTo(firstKey)
        const more = Object.keys(flat).length - 1
        toast.error(`Enregistrement impossible : ${flat[firstKey] ?? 'données invalides.'}${more > 0 ? ` (+${more})` : ''}`)
      } else {
        const message = err instanceof Error ? err.message : 'Erreur d’enregistrement.'
        setErrors({ _global: message })
        toast.error(message)
      }
    } finally {
      setSaving(false)
    }
  }
  submitRef.current = submit

  // Ctrl/Cmd + S saves from anywhere in the editor.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        submitRef.current()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const leave = async () => {
    if (dirty && !(await confirm({
      title: 'Quitter sans enregistrer ?',
      body: 'Les modifications faites sur ce joueur seront perdues.',
      confirmLabel: 'Quitter',
      danger: true,
    }))) return
    onClose()
  }

  const computedAge = ageFromBirthDate(form.date_of_birth)
  const slug = (form as AdminPlayer).slug

  return (
    <EditorErrorsContext.Provider value={errors}>
      <div className="min-h-[100dvh] bg-stone-50 dark:bg-zinc-950">
        {/* ---------------------------------------------------- top bar */}
        <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-stone-50/85 backdrop-blur-xl dark:border-stone-50/10 dark:bg-zinc-950/80">
          <div className="mx-auto flex max-w-[1440px] items-center gap-4 px-6 pt-4 lg:pl-16 lg:pr-10">
            <button
              type="button"
              onClick={leave}
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-zinc-500 transition hover:bg-stone-200/60 hover:text-zinc-900 dark:text-stone-400 dark:hover:bg-stone-50/10 dark:hover:text-stone-50"
            >
              <ArrowLeft size={15} weight="bold" /> <span className="hidden sm:inline">Joueurs</span>
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate font-display text-xl font-semibold tracking-tight text-zinc-950 dark:text-stone-50 lg:text-2xl">
                {form.name || (isNew ? 'Nouveau joueur' : 'Joueur sans nom')}
              </h1>
              <AnimatePresence mode="wait" initial={false}>
                <motion.p
                  key={dirty ? 'dirty' : 'clean'}
                  initial={{ opacity: 0, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -3 }}
                  className={`flex items-center gap-1.5 truncate whitespace-nowrap text-xs ${dirty ? 'text-amber-700 dark:text-amber-400' : 'text-zinc-500 dark:text-stone-400'}`}
                >
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dirty ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                  {dirty ? 'Modifications non enregistrées' : isNew ? 'Nouveau profil' : 'Tout est enregistré'}
                </motion.p>
              </AnimatePresence>
            </div>
            {!isNew && slug && form.is_published && (
              <a
                href={`/joueurs/${slug}`}
                target="_blank"
                rel="noreferrer"
                className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-zinc-600 transition hover:bg-stone-200/60 hover:text-zinc-950 dark:text-stone-300 dark:hover:bg-stone-50/10 dark:hover:text-stone-50 sm:inline-flex"
              >
                Voir sur le site <ArrowSquareOut size={14} />
              </a>
            )}
            <motion.button
              type="button"
              onClick={submit}
              disabled={saving || (!dirty && !isNew)}
              whileTap={{ scale: 0.97 }}
              className="btn btn-primary gap-2 px-4 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              title="Enregistrer (Ctrl + S)"
            >
              <FloppyDisk size={16} weight="bold" />
              <span className="hidden sm:inline">{saving ? 'Enregistrement…' : isNew ? 'Créer le joueur' : 'Enregistrer'}</span>
              <span className="sm:hidden">{saving ? '…' : isNew ? 'Créer' : 'Enreg.'}</span>
              <kbd className="ml-1 hidden rounded border border-white/25 px-1.5 font-mono text-[0.65rem] text-white/80 md:inline">Ctrl S</kbd>
            </motion.button>
          </div>

          {/* tabs */}
          <nav className="mx-auto mt-3 flex max-w-[1440px] gap-1 overflow-x-auto px-6 lg:pl-16 lg:pr-10" aria-label="Sections du joueur">
            {TABS.map((t) => {
              const active = t.id === tab
              const count = errorCount[t.id]
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`relative shrink-0 px-3.5 pb-3 pt-1.5 text-sm font-medium transition-colors ${
                    active ? 'text-zinc-950 dark:text-stone-50' : 'text-zinc-500 hover:text-zinc-800 dark:text-stone-400 dark:hover:text-stone-200'
                  }`}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {t.label}
                    {count ? <span className="grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 font-mono text-[0.6rem] text-white">{count}</span> : null}
                  </span>
                  {active && (
                    <motion.span layoutId="player-editor-tab" transition={SPRING}
                      className="absolute inset-x-2 bottom-0 h-[2.5px] rounded-full bg-turf-600 dark:bg-turf-300" />
                  )}
                </button>
              )
            })}
          </nav>
        </header>

        {/* ------------------------------------------------------ body */}
        <div className="mx-auto grid max-w-[1440px] gap-8 px-6 py-8 lg:grid-cols-[minmax(280px,340px)_1fr] lg:pl-16 lg:pr-10">
          <aside className="lg:sticky lg:top-36 lg:self-start">
            <PreviewCard
              form={form}
              photoPreview={photoPreview}
              photoRemove={photoRemove}
              onPhotoFile={(file) => {
                if (file.size > 4 * 1024 * 1024) { toast.error('Photo trop lourde (4 Mo maximum).'); return }
                setPhotoFile(file); setPhotoRemove(false)
              }}
              onPhotoRemove={() => { setPhotoFile(null); setPhotoRemove(Boolean(form.photo_url)) }}
              onPhotoRestore={() => setPhotoRemove(false)}
              onGoTo={goTo}
            />
          </aside>

          <main className="min-w-0">
            {errors._global && (
              <div className="mb-5 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
                <WarningCircle size={18} className="mt-0.5 shrink-0" /> {errors._global}
              </div>
            )}

            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-6"
              >
                {tab === 'profil' && (
                  <>
                    <Section title="Identité">
                      <div className="grid gap-5 sm:grid-cols-2">
                        <Field field="name" label="Nom complet" className="sm:col-span-2">
                          <TextInput value={form.name ?? ''} onChange={(e) => set('name', e.target.value)} placeholder="Prénom Nom" required />
                        </Field>
                        <Field field="date_of_birth" label="Date de naissance">
                          <TextInput
                            type="date"
                            value={form.date_of_birth || ''}
                            onChange={(e) => {
                              const dob = e.target.value || null
                              const age = ageFromBirthDate(dob)
                              setForm((f) => ({ ...f, date_of_birth: dob, ...(age != null ? { age } : {}) }))
                            }}
                          />
                        </Field>
                        <Field field="age" label="Âge" hint={computedAge != null ? 'Calculé depuis la date de naissance' : 'À défaut de date de naissance'}>
                          <TextInput
                            type="number"
                            min={8}
                            max={60}
                            value={computedAge ?? form.age ?? ''}
                            disabled={computedAge != null}
                            onChange={(e) => set('age', e.target.value === '' ? null : Number(e.target.value))}
                            className="font-mono disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-zinc-500 dark:disabled:bg-zinc-950 dark:disabled:text-stone-400"
                          />
                        </Field>
                        <Field field="position" label="Poste" hint="Tel qu’affiché sur le site" className="sm:col-span-2">
                          <TextInput value={form.position ?? ''} onChange={(e) => set('position', e.target.value)} placeholder="Milieu défensif / Latéral droit" required />
                        </Field>
                        <Field field="category" label="Ligne" className="sm:col-span-2">
                          <Segmented
                            ariaLabel="Ligne"
                            value={form.category}
                            onChange={(v) => set('category', v)}
                            options={CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABELS[c] }))}
                          />
                        </Field>
                        <Field field="height" label="Taille" hint="ex. 1m83">
                          <TextInput value={form.height ?? ''} onChange={(e) => set('height', e.target.value)} placeholder="1m80" />
                        </Field>
                        <Field field="preferred_foot" label="Pied fort">
                          <Segmented ariaLabel="Pied fort" value={form.preferred_foot ?? 'Droit'} onChange={(v) => set('preferred_foot', v)}
                            options={FEET.map((f) => ({ value: f, label: f }))} />
                        </Field>
                        <Field field="nationality" label="Nationalité">
                          <TextInput value={form.nationality ?? ''} onChange={(e) => set('nationality', e.target.value)} placeholder="Belge" />
                        </Field>
                        <Field field="secondary_nationality" label="Seconde nationalité" hint="Pour les binationaux">
                          <TextInput value={form.secondary_nationality ?? ''} onChange={(e) => set('secondary_nationality', e.target.value)} />
                        </Field>
                      </div>
                    </Section>

                    <Section title="Club" description="Le club actuel, affiché sur le profil et les fiches.">
                      <div className="grid gap-5 sm:grid-cols-[1fr_10rem]">
                        <Field field="club" label="Club actuel">
                          <TextInput value={form.club ?? ''} onChange={(e) => set('club', e.target.value)} placeholder="Standard de Liège" />
                        </Field>
                        <Field field="since" label="À l’agence depuis">
                          <TextInput type="number" min={1990} max={2100} value={form.since ?? ''} onChange={(e) => set('since', e.target.value === '' ? null : Number(e.target.value))} className="font-mono" />
                        </Field>
                        <Field field="club_logo_url" label="Logo du club" className="sm:col-span-2">
                          <ImageUpload value={form.club_logo_url} onChange={(url) => set('club_logo_url', url ?? '')} kind="logo" shape="logo" label="Blason affiché à côté du club" />
                        </Field>
                      </div>
                    </Section>

                    <Section title="Présentation">
                      <div className="space-y-5">
                        <Field field="bio" label="Bio" hint={`${(form.bio ?? '').length} caractères · 40 minimum pour compter dans le profil`}>
                          <TextArea rows={5} value={form.bio ?? ''} onChange={(e) => set('bio', e.target.value)} placeholder="Qui est le joueur, son parcours, ce qui le distingue…" />
                        </Field>
                        <Field field="tags" label="Tags & statut" hint="Situation contractuelle, suivi médical, disponibilité…">
                          <TagPicker value={form.tags ?? []} onChange={(tags) => set('tags', tags)} />
                        </Field>
                      </div>
                    </Section>
                  </>
                )}

                {tab === 'fiche' && (
                  <>
                    <Section title="Profil de jeu" description="Utilisé par les fiches de présentation envoyées aux clubs.">
                      <div className="grid gap-5 sm:grid-cols-2">
                        <Field field="playing_style" label="Style de jeu">
                          <TextInput value={form.playing_style ?? ''} onChange={(e) => set('playing_style', e.target.value)} placeholder="Percutant, dribbleur" />
                        </Field>
                        <Field field="best_position" label="Meilleur poste">
                          <TextInput value={form.best_position ?? ''} onChange={(e) => set('best_position', e.target.value)} placeholder="Milieu défensif" />
                        </Field>
                        <Field field="languages_spoken" label="Langues parlées" hint="Entrée pour ajouter" className="sm:col-span-2">
                          <ChipsInput value={form.languages_spoken} onChange={(v) => set('languages_spoken', v)} placeholder="Français, Anglais…" />
                        </Field>
                        <Field field="mental_strengths" label="Points forts mentaux" hint="Entrée pour ajouter" className="sm:col-span-2">
                          <ChipsInput value={form.mental_strengths} onChange={(v) => set('mental_strengths', v)} placeholder="Confiant, Persévérant, Compétiteur…" />
                        </Field>
                        <Field field="objective" label="Objectif" hint={`${(form.objective ?? '').length} / 400`} className="sm:col-span-2">
                          <TextArea rows={2} maxLength={400} value={form.objective ?? ''} onChange={(e) => set('objective', e.target.value)} placeholder="Devenir joueur professionnel en Belgique" />
                        </Field>
                      </div>
                    </Section>

                    <Section title="Parcours" description="Du club le plus récent au plus ancien. Faites glisser pour réordonner.">
                      <div data-field="career_history" className="scroll-mt-32 rounded-xl">
                        <CareerEditor value={form.career_history} onChange={(v) => set('career_history', v)} />
                      </div>
                      <div className="mt-6 grid gap-5 border-t border-stone-200/80 pt-6 dark:border-stone-50/10 sm:grid-cols-2">
                        <Field field="previous_club" label="Vient de" hint="Petite étiquette en haut de la photo des fiches">
                          <TextInput value={form.previous_club ?? ''} onChange={(e) => set('previous_club', e.target.value)} placeholder="KRC Genk" />
                        </Field>
                        <Field field="previous_club_logo" label="Logo « vient de »">
                          <ImageUpload value={form.previous_club_logo} onChange={(url) => set('previous_club_logo', url ?? '')} kind="logo" shape="logo" />
                        </Field>
                      </div>
                    </Section>

                    <Section title="Photos des fiches" description="Portrait secondaire et galerie (6 photos maximum).">
                      <div className="grid gap-6 md:grid-cols-[12rem_1fr]">
                        <Field field="secondary_photo_url" label="Portrait secondaire">
                          <ImageUpload value={form.secondary_photo_url} onChange={(url) => set('secondary_photo_url', url ?? '')} kind="portrait" />
                        </Field>
                        <Field field="gallery_photos" label="Galerie">
                          <GalleryEditor value={form.gallery_photos} onChange={(v) => set('gallery_photos', v)} />
                        </Field>
                      </div>
                    </Section>
                  </>
                )}

                {tab === 'stats' && (
                  <>
                    <Section title="Saison" description="Les chiffres de la saison en cours, affichés sur le profil.">
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        <StatInput field="matches_played" label="Matchs" value={form.matches_played} onChange={(v) => set('matches_played', v)} max={200} />
                        <StatInput field="minutes_played" label="Minutes" value={form.minutes_played} onChange={(v) => set('minutes_played', v)} max={20000} />
                        <StatInput field="goals" label="Buts" value={form.goals} onChange={(v) => set('goals', v)} max={200} />
                        <StatInput field="assists" label="Passes déc." value={form.assists} onChange={(v) => set('assists', v)} max={200} />
                      </div>
                    </Section>
                    <Section title="Attaque & construction">
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        <StatInput field="shots" label="Tirs" value={form.shots} onChange={(v) => set('shots', v)} max={1000} />
                        <StatInput field="shots_on_target" label="Tirs cadrés" value={form.shots_on_target} onChange={(v) => set('shots_on_target', v)} max={1000} />
                        <StatInput field="xg" label="xG" value={form.xg} onChange={(v) => set('xg', v)} step="0.1" max={200} />
                        <StatInput field="xa" label="xA" value={form.xa} onChange={(v) => set('xa', v)} step="0.1" max={200} />
                        <StatInput field="key_passes" label="Passes clés" value={form.key_passes} onChange={(v) => set('key_passes', v)} max={1000} />
                        <StatInput field="pass_accuracy" label="Passes réussies" unit="%" value={form.pass_accuracy} onChange={(v) => set('pass_accuracy', v)} step="0.1" max={100} />
                        <StatInput field="dribbles_completed" label="Dribbles réussis" value={form.dribbles_completed} onChange={(v) => set('dribbles_completed', v)} max={1000} />
                      </div>
                    </Section>
                    <Section title="Défense & discipline">
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        <StatInput field="tackles" label="Tacles" value={form.tackles} onChange={(v) => set('tackles', v)} max={1000} />
                        <StatInput field="interceptions" label="Interceptions" value={form.interceptions} onChange={(v) => set('interceptions', v)} max={1000} />
                        <StatInput field="duels_won" label="Duels gagnés" value={form.duels_won} onChange={(v) => set('duels_won', v)} max={1000} />
                        <StatInput field="yellow_cards" label="Cartons jaunes" value={form.yellow_cards} onChange={(v) => set('yellow_cards', v)} max={50} />
                        <StatInput field="red_cards" label="Cartons rouges" value={form.red_cards} onChange={(v) => set('red_cards', v)} max={20} />
                      </div>
                    </Section>
                    {form.category === 'Gardien' && (
                      <Section title="Gardien">
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                          <StatInput field="clean_sheets" label="Clean sheets" value={form.clean_sheets} onChange={(v) => set('clean_sheets', v)} max={200} />
                          <StatInput field="saves" label="Arrêts" value={form.saves} onChange={(v) => set('saves', v)} max={1000} />
                        </div>
                      </Section>
                    )}
                    <Section title="Physique" description="Moyennes par match, d’après le GPS.">
                      <div data-field="tracking" className="grid scroll-mt-32 grid-cols-2 gap-3 rounded-xl md:grid-cols-4">
                        <StatInput field="distance_avg_km" label="Distance" unit="km" value={form.distance_avg_km ?? null} onChange={(v) => set('distance_avg_km', v)} step="0.1" max={20} />
                        <StatInput field="sprints_avg" label="Sprints" value={form.sprints_avg ?? null} onChange={(v) => set('sprints_avg', v)} max={200} />
                        <StatInput field="top_speed_kmh" label="Vitesse max" unit="km/h" value={form.top_speed_kmh ?? null} onChange={(v) => set('top_speed_kmh', v)} step="0.1" max={50} />
                        <StatInput field="high_intensity_runs_avg" label="Courses HI" value={form.high_intensity_runs_avg ?? null} onChange={(v) => set('high_intensity_runs_avg', v)} max={300} />
                      </div>
                    </Section>
                  </>
                )}

                {tab === 'terrain' && (
                  <>
                    <Section title="Zones d’activité" description="Peignez les zones où le joueur évolue. Il attaque de gauche à droite.">
                      <div data-field="heatmap" className="scroll-mt-32 space-y-3 rounded-xl">
                        <Pitch
                          mode="paint"
                          grid={isValidGrid(form.heatmap_grid) ? form.heatmap_grid : emptyGrid()}
                          position={form.position}
                          slug={slug}
                          onChange={(next: HeatmapGrid) => set('heatmap_grid', next)}
                        />
                        {!form.heatmap_grid && form.position && (
                          <button type="button" onClick={() => set('heatmap_grid', heatmapFromPosition(form.position || '', slug || form.name || 'new'))}
                            className="text-sm font-medium text-turf-700 hover:underline dark:text-turf-300">
                            Partir du poste « {form.position} »
                          </button>
                        )}
                      </div>
                    </Section>
                    <Section title="Moments clés" description="Images annotées tirées des vidéos (les vidéos ne sont jamais stockées).">
                      {slug ? <ClipsGalleryAdmin playerSlug={slug} /> : (
                        <p className="text-sm text-zinc-500 dark:text-stone-400">Créez d’abord le joueur pour ajouter ses moments clés.</p>
                      )}
                    </Section>
                  </>
                )}

                {tab === 'publication' && (
                  <>
                    <Section title="Visibilité">
                      <Switch
                        checked={!!form.is_published}
                        onChange={(v) => set('is_published', v)}
                        label="Profil visible sur le site"
                        description={form.is_published ? 'Le joueur apparaît dans « Nos joueurs ».' : 'Seule l’équipe le voit, dans le back-office.'}
                      />
                      {!isNew && slug && (
                        <p className="mt-4 text-sm text-zinc-500 dark:text-stone-400">
                          Adresse du profil : <span className="font-mono text-zinc-800 dark:text-stone-200">renefootball.com/joueurs/{slug}</span>
                        </p>
                      )}
                    </Section>
                    {!isNew && (
                      <section className="rounded-2xl border border-rose-200/80 bg-rose-50/40 p-6 dark:border-rose-500/20 dark:bg-rose-500/5 lg:p-7">
                        <h2 className="font-display text-lg font-semibold text-rose-900 dark:text-rose-200">Supprimer le joueur</h2>
                        <p className="mt-1 max-w-[60ch] text-sm text-rose-800/80 dark:text-rose-200/70">
                          Retire définitivement le joueur, ses statistiques et sa photo. Pour simplement le cacher du site, désactivez plutôt la visibilité.
                        </p>
                        <button type="button" onClick={() => onDelete(player)}
                          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-rose-300 bg-white px-3.5 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-600 hover:text-white dark:border-rose-500/40 dark:bg-transparent dark:text-rose-300 dark:hover:bg-rose-600 dark:hover:text-white">
                          <Trash size={15} weight="bold" /> Supprimer « {player.name} »
                        </button>
                      </section>
                    )}
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </EditorErrorsContext.Provider>
  )
}
