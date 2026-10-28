import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, CSSProperties, FormEvent, ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowSquareOut,
  CheckCircle,
  Copy,
  Eye,
  FileArrowUp,
  Image as ImageIcon,
  Person,
  Plus,
  Trash,
  WarningCircle,
  X as XIcon,
} from '@phosphor-icons/react'
import { api, ApiError } from '../../api/client'
import type { Player } from '../../types/player'
import type {
  FicheCompositionInfo,
  FicheCompositionKey,
  FicheOptionGroup,
  FicheRenderMeta,
  FicheThemeInfo,
  MiddleVariant,
  OrgBlock,
  Presentation,
  PresentationOptions,
  PresentationStatChoice,
  PresentationTemplateKey,
} from '../../types/presentation'
import PdfGenerationOverlay from '../../components/PdfGenerationOverlay'
import PlayerSingleSelect from '../../components/PlayerSingleSelect'
import PresentationPreview from '../../components/PresentationPreview'
import type { PresentationPreviewResult } from '../../components/PresentationPreview'
import Skeleton from '../../components/Skeleton'
import { useConfirm } from '../../components/ConfirmProvider'
import { useToast } from '../../components/ToastProvider'

interface PlayersResponse { data: (Player & { id: number })[] }
interface PresentationResponse { data: Presentation }
interface CatalogueArticleRow { id: number; slug: string; title: string; category: string; is_published: boolean }
interface CatalogueResponse {
  compositions: FicheCompositionInfo[]
  themes: FicheThemeInfo[]
  stats: PresentationStatChoice[]
  articles?: CatalogueArticleRow[]
}

const INPUT_BASE =
  'w-full rounded-lg border border-stone-300 bg-white text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 dark:border-stone-50/15 dark:bg-zinc-900 dark:text-stone-50 dark:placeholder:text-stone-500 dark:focus:border-turf-300 px-3 py-2 text-sm focus:outline-none transition'

const MIDDLE_VARIANTS: Array<{ value: MiddleVariant; label: string; hint: string }> = [
  { value: 'profile-strengths',        label: 'Profil + Points forts',          hint: 'Bio à gauche, points forts numérotés à droite' },
  { value: 'profile-caracteristiques', label: 'Points forts + Caractéristiques', hint: 'Style de jeu, mental, objectif' },
  { value: 'parcours-strengths',       label: 'Parcours + Qualités',            hint: 'Historique des clubs à gauche' },
  { value: 'profile-bars',             label: 'Profil + Barres',                hint: 'Barres de profil athlétique à droite' },
]

const FONT_FAMILIES: Array<{ value: NonNullable<PresentationOptions['font_family']>; label: string; hint: string; style: CSSProperties }> = [
  { value: 'sans',      label: 'Moderne',    hint: 'Titres Bebas Neue, texte Barlow',            style: { fontFamily: '"Bebas Neue", Impact, sans-serif', letterSpacing: '0.02em' } },
  { value: 'grotesque', label: 'Impact',     hint: 'Titres Barlow Condensed extra-gras',         style: { fontFamily: '"Barlow Condensed", "Arial Narrow", sans-serif', fontWeight: 800 } },
  { value: 'editorial', label: 'Éditoriale', hint: 'Titres Bebas Neue, texte courant serif',     style: { fontFamily: 'Georgia, "Times New Roman", serif' } },
]

/** Labels for the lists / texts the PDF may synthesise (FicheDensity caps). */
const SYNTHESIS_LABELS: Record<string, string> = {
  strengths: 'Points forts',
  mental: 'Traits mentaux',
  career: 'Étapes du parcours',
  bars: 'Barres de profil',
  gallery: 'Photos de galerie',
  academies: 'Pays d’académies',
  academy_clubs: 'Clubs des académies',
  comparisons: 'Comparaisons',
  physical: 'Données physiques',
  stats: 'Statistiques',
  languages: 'Langues',
  bio: 'Bio (caractères)',
  project_intro: 'Intro du projet (caractères)',
  objective: 'Objectif (caractères)',
  org_description: 'Description partenaire (caractères)',
  facts: 'Faits d’identité',
  heatmap: 'Heatmap',
  career_logos: 'Logos du parcours',
}

function densityLabel(density: string): string {
  if (density.startsWith('dense+synthèse')) return 'Dense + synthèse'
  return ({ standard: 'Standard', compact: 'Compact', dense: 'Dense', legacy: 'Historique', pdf: 'PDF importé', image: 'Image importée' } as Record<string, string>)[density] ?? density
}

interface FormState {
  player_id: number | null
  template_key: PresentationTemplateKey
  title: string
  is_published: boolean
  options: PresentationOptions
  /** Editable scout bio — lives on the Player. Previewed live without being
   *  saved; written back to the player only on « Enregistrer ». */
  player_bio: string
}

export default function AdminPresentationEdit({ creating = false }: { creating?: boolean }) {
  const confirm = useConfirm()
  const toast = useToast()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [form, setForm] = useState<FormState>({
    player_id: null,
    template_key: 'marketing',
    title: '',
    is_published: false,
    options: { composition: 'signature' },
    player_bio: '',
  })
  const [loading, setLoading] = useState(!creating)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [players, setPlayers] = useState<(Player & { id: number })[]>([])
  const [compositions, setCompositions] = useState<FicheCompositionInfo[]>([])
  const [themes, setThemes] = useState<FicheThemeInfo[]>([])
  const [statCatalogue, setStatCatalogue] = useState<PresentationStatChoice[]>([])
  const [articles, setArticles] = useState<CatalogueArticleRow[]>([])
  const [existing, setExisting] = useState<Presentation | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [uploadingPlayerPhoto, setUploadingPlayerPhoto] = useState(false)
  const [uploadingAsset, setUploadingAsset] = useState(false)
  const [preview, setPreview] = useState<PresentationPreviewResult | null>(null)
  const [previewKey, setPreviewKey] = useState(0)
  const assetInputRef = useRef<HTMLInputElement | null>(null)

  const hasExternalAsset = !!existing?.external_asset_path

  const selectedPlayer = useMemo(
    () => players.find((p) => p.id === form.player_id) ?? null,
    [players, form.player_id],
  )

  // Load the player's saved bio when the selected player changes.
  useEffect(() => {
    setForm((f) => ({ ...f, player_bio: selectedPlayer?.bio ?? '' }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlayer?.id])

  const bioDirty = !!selectedPlayer && (selectedPlayer.bio ?? '').trim() !== form.player_bio.trim()

  // --- composition & effective options (defaults come from the backend) ----

  const compositionKey: FicheCompositionKey = form.options.composition ?? 'classic'
  const composition = compositions.find((c) => c.key === compositionKey) ?? null
  const supports = useMemo(() => new Set<FicheOptionGroup>(composition?.supports ?? []), [composition])
  const has = (g: FicheOptionGroup) => supports.has(g)
  function eff<K extends keyof PresentationOptions>(k: K): PresentationOptions[K] {
    return (form.options[k] ?? composition?.defaults[k]) as PresentationOptions[K]
  }

  // --- bootstrap ----------------------------------------------------------

  useEffect(() => {
    api.get<PlayersResponse>('/admin/players', { auth: true })
      .then((res) => setPlayers(res.data))
      .catch(() => toast.error('Liste des joueurs indisponible.'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (creating) { setLoading(false); return }
    if (!id) return
    let cancelled = false
    setLoading(true)
    api.get<PresentationResponse>(`/admin/presentations/${id}`, { auth: true })
      .then((res) => {
        if (cancelled) return
        const p = res.data
        setExisting(p)
        setForm({
          player_id: p.player_id,
          template_key: 'marketing',
          title: p.title,
          is_published: p.is_published,
          // Stored options as-is: rows saved before the redesign have no
          // composition and keep the historic layout until one is chosen.
          options: { ...(p.options ?? {}) },
          player_bio: '',
        })
      })
      .catch(() => { if (!cancelled) setErrors({ _global: 'Présentation introuvable.' }) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id, creating])

  const lang = eff('language') ?? 'fr'
  useEffect(() => {
    const cat = selectedPlayer?.category || 'Milieu'
    api.get<CatalogueResponse>(`/admin/presentations/catalogue?category=${encodeURIComponent(cat)}&language=${lang}`, { auth: true })
      .then((res) => {
        setCompositions(res.compositions ?? [])
        setThemes(res.themes ?? [])
        setStatCatalogue(res.stats)
        setArticles(res.articles ?? [])
      })
      .catch(() => toast.error('Catalogue des compositions indisponible.'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlayer?.category, lang])

  // --- helpers ------------------------------------------------------------

  const setOpt = <K extends keyof PresentationOptions>(k: K, v: PresentationOptions[K]) => {
    setForm((f) => ({ ...f, options: { ...f.options, [k]: v } }))
  }

  const setOrg = (k: 'supervised_by' | 'partner_agency', patch: Partial<OrgBlock>) => {
    setForm((f) => ({ ...f, options: { ...f.options, [k]: { ...(f.options[k] ?? {}), ...patch } } }))
  }

  const toggleStat = (key: string) => {
    setForm((f) => {
      const current = f.options.selected_stats ?? []
      const next = current.includes(key)
        ? current.filter((s) => s !== key)
        : (current.length >= 4 ? current : [...current, key])
      return { ...f, options: { ...f.options, selected_stats: next } }
    })
  }

  const payload = () => ({
    player_id: form.player_id,
    template_key: form.template_key,
    title: form.title,
    is_published: form.is_published,
    options: form.options,
  })

  /** Writes the edited bio to the player (explicit save only — the preview
   *  shows it without persisting anything). */
  const syncPlayerBio = async (): Promise<void> => {
    if (!selectedPlayer || !bioDirty) return
    const next = form.player_bio.trim()
    await api.patch(`/admin/players/${selectedPlayer.slug}`, { bio: next || null }, { auth: true })
    setPlayers((ps) => ps.map((p) => (p.id === selectedPlayer.id ? { ...p, bio: next || null } : p)))
  }

  /** Creates the row (needed before attaching an external fiche). */
  const ensureDraft = async (): Promise<number | null> => {
    if (!form.player_id) { toast.error('Choisissez un joueur avant d’attacher une fiche.'); return null }
    if (!form.title.trim()) { toast.error('Donnez un titre avant d’attacher une fiche.'); return null }
    if (existing?.id) return existing.id
    try {
      await syncPlayerBio()
      const res = await api.post<PresentationResponse>('/admin/presentations', payload(), { auth: true })
      setExisting(res.data)
      navigate(`/admin/presentations/${res.data.id}/edit`, { replace: true })
      toast.success('Brouillon enregistré.')
      return res.data.id
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Impossible d’enregistrer le brouillon.')
      return null
    }
  }

  const onUploadAsset = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    if (assetInputRef.current) assetInputRef.current.value = ''
    if (!file) return
    const targetId = await ensureDraft()
    if (!targetId) return
    setUploadingAsset(true)
    try {
      const fd = new FormData()
      fd.append('asset', file)
      const res = await api.post<PresentationResponse>(`/admin/presentations/${targetId}/upload-asset`, fd, { auth: true })
      setExisting(res.data)
      setPreviewKey((k) => k + 1)
      toast.success('Fiche externe attachée. Le PDF téléchargeable a été mis à jour.')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Upload de la fiche impossible.')
    } finally {
      setUploadingAsset(false)
    }
  }

  const onClearAsset = async () => {
    if (!existing?.id) return
    if (!(await confirm({
      title: 'Retirer la fiche externe ?',
      body: 'Le PDF sera à nouveau généré à partir de la composition choisie.',
      confirmLabel: 'Retirer',
      danger: true,
    }))) return
    try {
      const res = await api.delete<PresentationResponse>(`/admin/presentations/${existing.id}/asset`, { auth: true })
      setExisting(res.data)
      setPreviewKey((k) => k + 1)
      toast.success('Fiche externe retirée.')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Suppression impossible.')
    }
  }

  const onUploadPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    if (e.target) e.target.value = ''
    if (!file) return
    setUploadingPhoto(true)
    try {
      const fd = new FormData()
      fd.append('photo', file)
      const res = await api.post<{ url: string }>('/admin/presentations/upload-photo', fd, { auth: true })
      setForm((f) => ({ ...f, options: { ...f.options, custom_photo_url: res.url, photo_source: 'custom' } }))
      toast.success('Photo uploadée.')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Upload impossible.')
    } finally {
      setUploadingPhoto(false)
    }
  }

  /** Uploads straight to the player's photo (when the player has none yet). */
  const onUploadPlayerPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    if (e.target) e.target.value = ''
    if (!file || !selectedPlayer) return
    setUploadingPlayerPhoto(true)
    try {
      const fd = new FormData()
      fd.append('photo', file)
      const res = await api.post<{ data: Player & { id: number; photo_url: string | null } }>(
        `/admin/players/${selectedPlayer.slug}`,
        fd,
        { auth: true },
      )
      setPlayers((ps) => ps.map((p) => (p.id === selectedPlayer.id ? { ...p, photo_url: res.data.photo_url } : p)))
      setPreviewKey((k) => k + 1)
      toast.success('Photo enregistrée sur la fiche joueur. Visible partout sur le site.')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Upload impossible.')
    } finally {
      setUploadingPlayerPhoto(false)
    }
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.player_id) { setErrors({ player_id: 'Choisissez un joueur.' }); return }
    if (!form.title.trim()) { setErrors({ title: 'Le titre est requis.' }); return }
    setSaving(true)
    setErrors({})
    try {
      await syncPlayerBio()
      const res = creating && !existing
        ? await api.post<PresentationResponse>('/admin/presentations', payload(), { auth: true })
        : await api.patch<PresentationResponse>(`/admin/presentations/${existing?.id ?? id}`, payload(), { auth: true })
      setExisting(res.data)
      navigate('/admin/presentations', {
        state: { toast: creating ? `« ${res.data.title} » créée.` : `« ${res.data.title} » mise à jour.` },
      })
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 422) {
        const flat: Record<string, string> = {}
        const data = err.data as { errors?: Record<string, unknown> } | null | undefined
        Object.entries(data?.errors ?? {}).forEach(([k, v]) => {
          flat[k] = Array.isArray(v) ? String(v[0]) : String(v)
        })
        if (flat.layout) flat._global = flat.layout
        setErrors(flat)
        toast.error(flat.layout ?? 'Vérifiez les champs en erreur.')
      } else {
        const msg = err instanceof Error ? err.message : 'Erreur d’enregistrement.'
        setErrors({ _global: msg })
        toast.error(msg)
      }
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async () => {
    if (!existing) return
    if (!(await confirm({
      title: `Supprimer « ${existing.title} » ?`,
      body: 'Le lien de partage cessera de fonctionner immédiatement.',
      confirmLabel: 'Supprimer',
      danger: true,
    }))) return
    try {
      await api.delete(`/admin/presentations/${existing.id}`, { auth: true })
      navigate('/admin/presentations', { state: { toast: 'Présentation supprimée.' } })
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Suppression impossible.')
    }
  }

  const openPreviewPdf = () => {
    if (preview?.pdfUrl) window.open(preview.pdfUrl, '_blank', 'noopener,noreferrer')
  }

  // --- render -------------------------------------------------------------

  if (loading) {
    return (
      <div className="px-6 lg:px-10 py-8 max-w-5xl w-full mx-auto space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <div className="grid grid-cols-3 gap-3 mt-8">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      </div>
    )
  }

  if (errors._global === 'Présentation introuvable.') {
    return (
      <div className="px-6 lg:px-10 py-12 max-w-3xl w-full mx-auto text-center">
        <h1 className="font-display font-semibold text-3xl text-zinc-950 dark:text-stone-50">Présentation introuvable</h1>
        <button type="button" onClick={() => navigate('/admin/presentations')} className="btn btn-primary text-sm mt-6">
          Retour à la liste
        </button>
      </div>
    )
  }

  const premiumCompositions = compositions.filter((c) => !c.legacy)
  const legacyComposition = compositions.find((c) => c.legacy) ?? null
  const layout = preview?.layout ?? null
  const synthesized = Object.entries(layout?.synthesized ?? {})

  return (
    <div className="bg-stone-50 dark:bg-zinc-950 h-[100dvh] flex flex-col">
      <div className="sticky top-0 z-10 flex items-center justify-between px-6 h-16 border-b border-stone-200 bg-white dark:bg-zinc-900 dark:border-stone-50/10">
        <div className="min-w-0">
          <div className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-turf-700 dark:text-turf-300">
            {creating ? 'Nouvelle présentation' : 'Édition'}
          </div>
          <div className="font-display font-semibold text-lg text-zinc-950 dark:text-stone-50 truncate">
            {form.title || 'Présentation sans titre'}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!creating && (
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-rose-700 hover:bg-rose-100 dark:text-rose-400 dark:hover:bg-rose-500/15 transition"
            >
              <Trash size={14} weight="bold" /> Supprimer
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate('/admin/presentations')}
            className="grid place-items-center w-9 h-9 rounded-full text-zinc-500 hover:bg-stone-100 hover:text-zinc-900 dark:text-stone-400 dark:hover:bg-stone-50/10 dark:hover:text-stone-50 transition"
            aria-label="Retour à la liste"
          >
            <XIcon size={18} weight="bold" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-6 lg:px-10 py-8 max-w-7xl w-full mx-auto">
          <div className="lg:grid lg:grid-cols-5 lg:gap-8">
            {/* PREVIEW = the real PDF */}
            <aside className="lg:col-span-2 lg:order-2 lg:sticky lg:top-0 lg:self-start lg:h-[calc(100dvh-4rem)] mb-8 lg:mb-0">
              <div className="w-full lg:max-h-full lg:overflow-y-auto lg:pr-1 lg:py-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[0.65rem] font-mono uppercase tracking-[0.16em] text-zinc-500 dark:text-stone-400">
                    Aperçu · PDF réel
                  </span>
                  <button
                    type="button"
                    onClick={openPreviewPdf}
                    disabled={!preview?.pdfUrl}
                    className="inline-flex items-center gap-1 text-[0.65rem] font-mono uppercase tracking-wider text-turf-700 dark:text-turf-300 hover:underline disabled:opacity-40 disabled:no-underline"
                  >
                    Ouvrir <ArrowSquareOut size={11} weight="bold" />
                  </button>
                </div>
                <PresentationPreview
                  playerId={form.player_id}
                  options={form.options}
                  bioOverride={bioDirty ? form.player_bio : undefined}
                  presentationId={existing?.id ?? null}
                  refreshKey={previewKey}
                  onResult={setPreview}
                />
                {/* Layout report: what the one-page engine decided. */}
                {layout && (
                  <div className="rounded-xl border border-stone-200 dark:border-stone-50/10 bg-white dark:bg-zinc-900/60 px-3 py-2.5 text-[0.7rem] space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-400">
                        <CheckCircle size={13} weight="bold" />
                        {layout.pages} page · {layout.page_size_mm?.join(' × ')} mm vérifié
                      </span>
                      <span className="font-mono uppercase tracking-wider text-zinc-500 dark:text-stone-400">
                        Densité : {densityLabel(layout.density)}
                      </span>
                    </div>
                    {synthesized.length > 0 && (
                      <div className="text-amber-800 dark:text-amber-300 leading-relaxed">
                        <span className="font-medium">Synthétisé dans le PDF</span> (données complètes conservées) :{' '}
                        {synthesized.map(([k, v]) => `${SYNTHESIS_LABELS[k] ?? k} ${v.shown}/${v.total}`).join(' · ')}
                      </div>
                    )}
                  </div>
                )}
                {preview?.error && (
                  <div className="rounded-xl bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300 px-3 py-2.5 text-[0.7rem] leading-relaxed">
                    <div className="flex items-start gap-1.5 font-medium"><WarningCircle size={14} weight="bold" className="shrink-0 mt-px" /> {preview.error}</div>
                    {preview.details.length > 0 && <ul className="mt-1 list-disc pl-5 opacity-80">{preview.details.slice(0, 3).map((d) => <li key={d}>{d}</li>)}</ul>}
                  </div>
                )}
              </div>
            </aside>

            <form onSubmit={submit} className="lg:col-span-3 lg:order-1 space-y-10">
              {errors._global && (
                <div className="px-4 py-3 rounded-xl bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300 text-sm">
                  {errors._global}
                </div>
              )}

              {/* JOUEUR + TITRE */}
              <Section title="Cible">
                <div className="grid lg:grid-cols-2 gap-3">
                  <label className="block">
                    <FieldLabel>Joueur</FieldLabel>
                    <PlayerSingleSelect
                      players={players}
                      selectedSlug={selectedPlayer?.slug ?? null}
                      onChange={(slug) => {
                        const p = players.find((x) => x.slug === slug)
                        setForm((f) => ({ ...f, player_id: p?.id ?? null }))
                      }}
                      placeholder="Choisir un joueur du roster"
                    />
                    {errors.player_id && <span className="mt-1 block text-[0.7rem] text-rose-600 dark:text-rose-400">{errors.player_id}</span>}
                  </label>
                  <label className="block">
                    <FieldLabel>Titre du document</FieldLabel>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                      placeholder="ex. Présentation Karim Touré · Borussia Dortmund"
                      className={INPUT_BASE}
                      required
                      maxLength={200}
                    />
                    {errors.title && <span className="mt-1 block text-[0.7rem] text-rose-600 dark:text-rose-400">{errors.title}</span>}
                  </label>
                </div>
              </Section>

              {/* FICHE EXTERNE */}
              <Section title="Fiche externe" hint="image ou PDF prêt à l’emploi" action={hasExternalAsset && (
                <button type="button" onClick={onClearAsset} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[0.7rem] font-medium text-rose-700 hover:bg-rose-100 dark:text-rose-400 dark:hover:bg-rose-500/15 transition">
                  <Trash size={12} weight="bold" /> Retirer la fiche
                </button>
              )}>
                {hasExternalAsset ? (
                  <div className="rounded-xl border border-turf-700/40 dark:border-turf-300/30 bg-turf-50/60 dark:bg-turf-950/20 px-4 py-3 text-sm flex items-center gap-3">
                    <div className="grid place-items-center w-9 h-9 rounded-lg bg-turf-700 text-white">
                      {existing?.external_asset_type === 'pdf' ? <FileArrowUp size={16} weight="bold" /> : <ImageIcon size={16} weight="bold" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-zinc-900 dark:text-stone-100 truncate">{existing?.external_asset_original_name ?? 'Fiche attachée'}</div>
                      <div className="text-[0.7rem] text-zinc-600 dark:text-stone-400">Cette fiche remplace le rendu automatique : les réglages de composition sont masqués.</div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-stone-300 dark:border-stone-50/15 bg-white/60 dark:bg-zinc-900/40 px-4 py-4 text-sm">
                    <p className="text-zinc-600 dark:text-stone-400 leading-relaxed mb-3">
                      Uploadez une fiche déjà conçue (PNG, JPG ou PDF) pour la servir telle quelle aux clubs.
                    </p>
                    <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-turf-700 text-white text-sm font-medium hover:bg-turf-800 transition cursor-pointer">
                      <FileArrowUp size={14} weight="bold" />
                      {uploadingAsset ? 'Upload en cours…' : 'Choisir un fichier'}
                      <input ref={assetInputRef} type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={onUploadAsset} disabled={uploadingAsset} className="hidden" />
                    </label>
                    <div className="mt-2 text-[0.65rem] text-zinc-500 dark:text-stone-500">
                      Max 12 Mo. Une image est placée sur une page A4 (ratio préservé). Un PDF doit faire exactement 1 page A4 portrait.
                    </div>
                  </div>
                )}
              </Section>

              {!hasExternalAsset && (<>
                {/* COMPOSITION */}
                <Section title="Composition" hint="la mise en page de la fiche">
                  <div className="grid sm:grid-cols-3 gap-4">
                    {premiumCompositions.map((c) => (
                      <ChoiceCard key={c.key} active={compositionKey === c.key} onClick={() => setOpt('composition', c.key)}>
                        <div className="aspect-[60/84] rounded-lg overflow-hidden bg-stone-100 dark:bg-zinc-950 mb-3" dangerouslySetInnerHTML={{ __html: c.thumbnail }} />
                        <div className="font-display font-semibold text-sm text-zinc-950 dark:text-stone-50">{c.label}</div>
                        <p className="mt-1 text-xs text-zinc-600 dark:text-stone-400 leading-relaxed">{c.description}</p>
                      </ChoiceCard>
                    ))}
                  </div>
                  {legacyComposition && compositionKey === 'classic' && (
                    <div className="rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10 px-4 py-3 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                      Cette fiche utilise l’ancienne mise en page « {legacyComposition.label} ». Choisissez une composition ci-dessus
                      pour profiter de l’adaptation automatique à une page, des traductions et du cadrage photo.
                    </div>
                  )}
                </Section>

                {/* BIO */}
                {(() => {
                  const bioLen = form.player_bio.length
                  const bioMax = 600
                  const tier: 'ok' | 'warn' = bioLen <= 380 ? 'ok' : 'warn'
                  return (
                    <Section title="Bio scout" hint="enregistrée sur la fiche joueur au clic sur « Enregistrer »">
                      <textarea
                        value={form.player_bio}
                        onChange={(e) => setForm((f) => ({ ...f, player_bio: e.target.value.slice(0, bioMax) }))}
                        placeholder={selectedPlayer ? 'Résumé scout du joueur : style, forces, projection.' : 'Choisissez d’abord un joueur pour éditer sa bio.'}
                        disabled={!selectedPlayer}
                        rows={5}
                        className={`${INPUT_BASE} resize-y leading-relaxed disabled:opacity-60 disabled:cursor-not-allowed`}
                        maxLength={bioMax}
                      />
                      <div className="flex items-center justify-between text-[0.65rem]">
                        <span className={tier === 'ok' ? 'text-zinc-500 dark:text-stone-500' : 'text-amber-700 dark:text-amber-400'}>
                          {bioDirty
                            ? 'Modification visible dans l’aperçu, pas encore enregistrée sur la fiche joueur.'
                            : tier === 'ok' ? 'En phase avec la fiche joueur.' : 'Bio longue : la fiche passera en mise en page plus dense, voire la résumera.'}
                        </span>
                        <span className="tabular-nums font-mono text-zinc-500 dark:text-stone-500">{bioLen}/{bioMax}</span>
                      </div>
                    </Section>
                  )
                })()}

                {/* STYLE */}
                <Section title="Style">
                  {has('theme') && (
                    <div className="space-y-2">
                      <SubLabel>Thème</SubLabel>
                      <div className="grid grid-cols-5 gap-2">
                        {themes.map((t) => {
                          const active = eff('theme') === t.key
                          return (
                            <button key={t.key} type="button" onClick={() => setOpt('theme', t.key)}
                              className={`rounded-lg border p-2 text-center transition ${active ? 'border-turf-700 dark:border-turf-300 ring-2 ring-turf-700/20 dark:ring-turf-300/20 bg-white dark:bg-zinc-900' : 'border-stone-200 dark:border-stone-50/10 bg-white/60 dark:bg-zinc-900/40 hover:border-stone-400 dark:hover:border-stone-50/25'}`}>
                              <div className="w-full h-6 rounded flex overflow-hidden">
                                <span className="flex-[3]" style={{ background: t.bg }} />
                                <span className="flex-[2]" style={{ background: t.accent }} />
                              </div>
                              <div className="mt-1 text-[0.65rem] font-medium text-zinc-800 dark:text-stone-200">{t.label}</div>
                            </button>
                          )
                        })}
                      </div>
                      {eff('theme') === 'custom' && (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                          {(['background_color', 'accent_color', 'secondary_color', 'text_color'] as const).map((k) => (
                            <label key={k} className="block">
                              <FieldLabel>{{ accent_color: 'Accent', secondary_color: 'Secondaire', text_color: 'Texte', background_color: 'Fond' }[k]}</FieldLabel>
                              <div className="flex items-center gap-2">
                                <input type="color" value={form.options[k] ?? '#000000'} onChange={(e) => setOpt(k, e.target.value)}
                                  className="h-9 w-12 rounded cursor-pointer border border-stone-300 dark:border-stone-50/15 bg-white dark:bg-zinc-900" />
                                <input type="text" value={form.options[k] ?? ''} onChange={(e) => setOpt(k, e.target.value)} className={`${INPUT_BASE} font-mono`} maxLength={9} />
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-x-8 gap-y-4">
                    {has('photo_side') && (
                      <div className="space-y-2">
                        <SubLabel>Côté de la photo</SubLabel>
                        <Segmented value={eff('photo_side') ?? 'right'} onChange={(v) => setOpt('photo_side', v)}
                          options={[{ value: 'left', label: 'Gauche' }, { value: 'right', label: 'Droite' }]} />
                      </div>
                    )}
                    {has('watermark') && (
                      <label className="inline-flex items-center gap-2 cursor-pointer text-sm self-end pb-1">
                        <input type="checkbox" checked={eff('show_watermark') !== false} onChange={(e) => setOpt('show_watermark', e.target.checked)}
                          className="h-4 w-4 rounded border-stone-300 text-turf-700 focus:ring-turf-500" />
                        <span className="text-zinc-700 dark:text-stone-300">Monogramme « RF » en filigrane</span>
                      </label>
                    )}
                  </div>

                  {(has('typography') || has('font_family')) && (
                    <div className="space-y-2">
                      <SubLabel>Typographie</SubLabel>
                      <div className="grid sm:grid-cols-3 gap-3">
                        {FONT_FAMILIES.map((f) => (
                          <ChoiceCard key={f.value} active={eff('font_family') === f.value} onClick={() => setOpt('font_family', f.value)}>
                            <div className="text-[22px] leading-none text-zinc-950 dark:text-stone-50" style={f.style}>Aa</div>
                            <div className="mt-2 font-display font-semibold text-sm text-zinc-950 dark:text-stone-50">{f.label}</div>
                            <div className="text-[0.65rem] text-zinc-500 dark:text-stone-500 leading-relaxed mt-1">{f.hint}</div>
                          </ChoiceCard>
                        ))}
                      </div>
                      {has('typography') && (
                        <div className="pt-1">
                          <SubLabel>Taille du texte</SubLabel>
                          <Segmented value={eff('font_scale') ?? 'normal'} onChange={(v) => setOpt('font_scale', v)}
                            options={[{ value: 'small', label: 'Compact' }, { value: 'normal', label: 'Normal' }, { value: 'large', label: 'Confort' }]} />
                          <p className="mt-1 text-[0.65rem] text-zinc-500 dark:text-stone-500">Le texte courant ne descend jamais sous 9 pt, même en mise en page dense.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {has('language') ? (
                    <div className="space-y-2">
                      <SubLabel>Langue de la fiche <span className="normal-case tracking-normal font-sans text-zinc-400">(libellés ; vos textes restent tels que saisis)</span></SubLabel>
                      <Segmented value={lang} onChange={(v) => setOpt('language', v)}
                        options={[{ value: 'fr', label: 'Français' }, { value: 'en', label: 'English' }, { value: 'de', label: 'Deutsch' }, { value: 'nl', label: 'Nederlands' }]} />
                    </div>
                  ) : (
                    <p className="text-[0.7rem] text-zinc-500 dark:text-stone-500">Mise en page historique : libellés en français uniquement.</p>
                  )}
                </Section>

                {/* CONTENU */}
                {(has('middle_variant') || has('stats') || has('heatmap') || has('bars')) && (
                  <Section title="Contenu">
                    {has('middle_variant') && (
                      <div className="space-y-2">
                        <SubLabel>Colonnes centrales</SubLabel>
                        <div className="grid sm:grid-cols-2 gap-2">
                          {MIDDLE_VARIANTS.map((v) => (
                            <ChoiceCard key={v.value} active={eff('middle_variant') === v.value} onClick={() => setOpt('middle_variant', v.value)} compact>
                              <div className="font-medium text-sm text-zinc-900 dark:text-stone-100">{v.label}</div>
                              <div className="text-[0.65rem] text-zinc-500 dark:text-stone-500">{v.hint}</div>
                            </ChoiceCard>
                          ))}
                        </div>
                        <p className="text-[0.65rem] text-zinc-500 dark:text-stone-500">Un bloc sans données est remplacé automatiquement par le suivant disponible.</p>
                      </div>
                    )}

                    {has('stats') && (
                      <div className="space-y-2">
                        <SubLabel>Statistiques mises en avant <span className="normal-case tracking-normal font-sans text-zinc-400">(max 4)</span></SubLabel>
                        <div className="flex flex-wrap gap-2">
                          {statCatalogue.map((s) => {
                            const active = (form.options.selected_stats ?? []).includes(s.key)
                            return (
                              <button key={s.key} type="button" onClick={() => toggleStat(s.key)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition ${active ? 'bg-turf-800 text-stone-50 dark:bg-turf-300 dark:text-zinc-950' : 'bg-stone-200/70 text-zinc-700 hover:bg-stone-300/70 dark:bg-stone-50/10 dark:text-stone-300 dark:hover:bg-stone-50/15'}`}>
                                {active && <CheckCircle size={12} weight="bold" />}
                                {s.label}
                              </button>
                            )
                          })}
                        </div>
                        <p className="text-[0.65rem] text-zinc-500 dark:text-stone-500">
                          Affichées uniquement si le joueur a des statistiques réelles (source renseignée ou matchs joués). Aucune valeur n’est inventée.
                        </p>
                      </div>
                    )}

                    {has('heatmap') && (
                      <label className="inline-flex items-center gap-2 cursor-pointer text-sm">
                        <input type="checkbox" checked={eff('show_heatmap') !== false} onChange={(e) => setOpt('show_heatmap', e.target.checked)}
                          className="h-4 w-4 rounded border-stone-300 text-turf-700 focus:ring-turf-500" />
                        <span className="text-zinc-700 dark:text-stone-300">Zones d’influence (heatmap du joueur, si renseignée)</span>
                      </label>
                    )}

                    {has('bars') && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <SubLabel>Barres de profil <span className="normal-case tracking-normal font-sans text-zinc-400">(ex. Vitesse 90 %)</span></SubLabel>
                          <AddButton onClick={() => setOpt('player_profile_bars', [...(form.options.player_profile_bars ?? []), { label: '', pct: 50 }])}>Ajouter une barre</AddButton>
                        </div>
                        {(form.options.player_profile_bars ?? []).map((bar, bi) => (
                          <div key={bi} className="flex items-center gap-2">
                            <input type="text" value={bar.label} placeholder="Libellé (ex. Vitesse)" className={INPUT_BASE} maxLength={40}
                              onChange={(e) => { const next = [...(form.options.player_profile_bars ?? [])]; next[bi] = { ...next[bi], label: e.target.value }; setOpt('player_profile_bars', next) }} />
                            <input type="number" min={0} max={100} value={bar.pct} className={`${INPUT_BASE} w-20 tabular-nums`}
                              onChange={(e) => { const next = [...(form.options.player_profile_bars ?? [])]; next[bi] = { ...next[bi], pct: Math.max(0, Math.min(100, Number(e.target.value) || 0)) }; setOpt('player_profile_bars', next) }} />
                            <RemoveButton onClick={() => { const next = [...(form.options.player_profile_bars ?? [])]; next.splice(bi, 1); setOpt('player_profile_bars', next) }} />
                          </div>
                        ))}
                      </div>
                    )}
                  </Section>
                )}

                {/* PHOTO */}
                <Section title="Photo">
                  <Segmented value={eff('photo_source') ?? 'player'} onChange={(v) => setOpt('photo_source', v)}
                    options={[{ value: 'player', label: 'Photo du joueur' }, { value: 'custom', label: 'Photo personnalisée' }]} />
                  {eff('photo_source') !== 'custom' && selectedPlayer && (
                    <div className="flex items-start gap-3 text-xs text-zinc-600 dark:text-stone-400">
                      <Thumb src={selectedPlayer.photo_url} />
                      {selectedPlayer.photo_url ? (
                        <div className="flex-1 pt-1">
                          Utilise la photo de la fiche joueur.{' '}
                          <a href={`/admin/joueurs/${selectedPlayer.slug}/edit`} className="underline hover:text-zinc-900 dark:hover:text-stone-100">Modifier sur la fiche joueur</a>.
                        </div>
                      ) : (
                        <div className="flex-1 space-y-2">
                          <p className="text-zinc-700 dark:text-stone-300 leading-relaxed">
                            <span className="font-medium">Ce joueur n’a pas encore de photo.</span> L’ajouter ici l’enregistre sur sa fiche (visible aussi sur son profil public).
                          </p>
                          <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-turf-700 text-white hover:bg-turf-800 cursor-pointer transition">
                            <ImageIcon size={13} weight="bold" />
                            <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onUploadPlayerPhoto} disabled={uploadingPlayerPhoto} />
                            {uploadingPlayerPhoto ? 'Upload en cours…' : 'Ajouter une photo sur la fiche joueur'}
                          </label>
                        </div>
                      )}
                    </div>
                  )}
                  {eff('photo_source') === 'custom' && (
                    <div className="flex items-start gap-3">
                      <Thumb src={form.options.custom_photo_url ?? null} />
                      <div className="flex-1 space-y-2">
                        <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border border-stone-300 dark:border-stone-50/15 bg-white dark:bg-zinc-900/40 hover:bg-stone-100 dark:hover:bg-stone-50/5 cursor-pointer transition">
                          <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onUploadPhoto} disabled={uploadingPhoto} />
                          {uploadingPhoto ? 'Upload…' : 'Choisir une photo…'}
                        </label>
                        {form.options.custom_photo_url && (
                          <button type="button" onClick={() => setOpt('custom_photo_url', null)} className="block text-[0.7rem] text-zinc-500 hover:text-rose-700 dark:text-stone-400 dark:hover:text-rose-400 transition">
                            Retirer la photo
                          </button>
                        )}
                        <p className="text-[0.65rem] text-zinc-500 dark:text-stone-500">JPG / PNG / WebP, 6 Mo max. Un PNG détouré (fond transparent) passe devant le nom.</p>
                      </div>
                    </div>
                  )}

                  {has('photo_framing') && (
                    <div className="pt-3 border-t border-stone-200/70 dark:border-stone-50/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <SubLabel>Cadrage</SubLabel>
                        <button type="button" className="text-[0.65rem] font-medium text-zinc-500 hover:text-zinc-900 dark:text-stone-400 dark:hover:text-stone-100 transition"
                          onClick={() => setForm((f) => ({ ...f, options: { ...f.options, photo_fit: undefined, photo_zoom: undefined, photo_position_x: undefined, photo_position_y: undefined } }))}>
                          Réinitialiser
                        </button>
                      </div>
                      <Segmented value={eff('photo_fit') ?? 'cover'} onChange={(v) => setOpt('photo_fit', v)}
                        options={[{ value: 'cover', label: 'Remplir le cadre' }, { value: 'contain', label: 'Photo entière' }]} />
                      {([
                        { key: 'photo_zoom', label: 'Zoom', min: 100, max: 250, step: 5 },
                        { key: 'photo_position_x', label: 'Point focal horizontal', min: 0, max: 100, step: 1 },
                        { key: 'photo_position_y', label: 'Point focal vertical', min: 0, max: 100, step: 1 },
                      ] as const).map((s) => {
                        const value = Number(eff(s.key) ?? (s.key === 'photo_zoom' ? 100 : 50))
                        return (
                          <label key={s.key} className="block">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[0.65rem] font-mono uppercase tracking-[0.14em] text-zinc-500 dark:text-stone-400">{s.label}</span>
                              <span className="text-[0.7rem] font-mono tabular-nums text-zinc-700 dark:text-stone-300">{value}%</span>
                            </div>
                            <input type="range" min={s.min} max={s.max} step={s.step} value={value} onChange={(e) => setOpt(s.key, Number(e.target.value))}
                              className="w-full accent-turf-700 dark:accent-turf-300" />
                          </label>
                        )
                      })}
                      <p className="text-[0.65rem] text-zinc-500 dark:text-stone-500">Le recadrage est appliqué à l’image elle-même : le PDF reprend exactement ce cadrage, sans déformation.</p>
                    </div>
                  )}
                </Section>

                {/* TEXTES DE MARQUE */}
                <Section title="Textes de marque">
                  <div className="grid sm:grid-cols-2 gap-3">
                    {has('tagline') && <TextField label="Accroche sous le logo" value={form.options.tagline ?? ''} placeholder={String(composition?.defaults.tagline ?? '')} max={200} onChange={(v) => setOpt('tagline', v || null)} />}
                    {has('header_motto') && <TextField label="Devise d’en-tête" value={form.options.header_motto ?? ''} placeholder="ex. Respect · Ambition · Excellence" max={120} onChange={(v) => setOpt('header_motto', v || null)} />}
                    {has('motto') && <TextField label="Motto (bandeau du bas)" value={form.options.motto ?? ''} placeholder="DISCIPLINE • WORK • PASSION" max={120} onChange={(v) => setOpt('motto', v || null)} />}
                    {has('slogan') && <TextField label="Slogan cursif" value={form.options.slogan_cursive ?? ''} placeholder="Notre vision, ton avenir." max={160} onChange={(v) => setOpt('slogan_cursive', v || null)} />}
                  </div>
                </Section>

                {/* PROJET SPORTIF */}
                {has('project') && (
                  <Section title="Projet sportif" hint="intro, superviseur, partenaire, académies ciblées">
                    <label className="block">
                      <FieldLabel>Introduction du projet</FieldLabel>
                      <textarea value={form.options.projet_intro ?? ''} onChange={(e) => setOpt('projet_intro', e.target.value || null)} rows={3} maxLength={600}
                        placeholder="ex. Représenté par RENEFOOTBALL en collaboration avec…" className={`${INPUT_BASE} resize-y leading-relaxed`} />
                    </label>
                    {([['supervised_by', 'Supervisé par'], ['partner_agency', 'En collaboration avec']] as const).map(([k, title]) => (
                      <div key={k} className="space-y-2">
                        <SubLabel>{title}</SubLabel>
                        <div className="grid sm:grid-cols-2 gap-2">
                          <input type="text" value={form.options[k]?.name ?? ''} onChange={(e) => setOrg(k, { name: e.target.value || null })} placeholder="Nom" className={INPUT_BASE} maxLength={120} />
                          <input type="url" value={form.options[k]?.logo_url ?? ''} onChange={(e) => setOrg(k, { logo_url: e.target.value || null })} placeholder="URL du logo" className={INPUT_BASE} maxLength={500} />
                          <input type="text" value={form.options[k]?.country ?? ''} onChange={(e) => setOrg(k, { country: e.target.value || null })} placeholder="Pays" className={INPUT_BASE} maxLength={80} />
                          <input type="text" value={form.options[k]?.country_code ?? ''} onChange={(e) => setOrg(k, { country_code: e.target.value || null })} placeholder="Code pays (gb, fr…)" className={INPUT_BASE} maxLength={6} />
                        </div>
                        <input type="text" value={form.options[k]?.description ?? ''} onChange={(e) => setOrg(k, { description: e.target.value || null })} placeholder="Description courte (optionnelle)" className={INPUT_BASE} maxLength={300} />
                      </div>
                    ))}

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <SubLabel>Académies ciblées</SubLabel>
                        <AddButton onClick={() => setOpt('partner_academies', [...(form.options.partner_academies ?? []), { country: '', country_code: null, clubs: [] }])}>Ajouter un pays</AddButton>
                      </div>
                      {(form.options.partner_academies ?? []).length === 0 && <p className="text-[0.7rem] text-zinc-500 dark:text-stone-500">Aucun pays configuré.</p>}
                      {(form.options.partner_academies ?? []).map((group, gi) => {
                        const update = (patch: Partial<typeof group>) => {
                          const next = [...(form.options.partner_academies ?? [])]
                          next[gi] = { ...next[gi], ...patch }
                          setOpt('partner_academies', next)
                        }
                        return (
                          <div key={gi} className="rounded-lg border border-stone-200 dark:border-stone-50/10 bg-white/60 dark:bg-zinc-900/40 p-3 space-y-2">
                            <div className="flex items-center gap-2">
                              <input type="text" value={group.country} onChange={(e) => update({ country: e.target.value })} placeholder="Pays (ex. Angleterre)" className={INPUT_BASE} maxLength={80} />
                              <input type="text" value={group.country_code ?? ''} onChange={(e) => update({ country_code: e.target.value || null })} placeholder="Code (gb)" className={`${INPUT_BASE} w-28`} maxLength={6} />
                              <RemoveButton onClick={() => { const next = [...(form.options.partner_academies ?? [])]; next.splice(gi, 1); setOpt('partner_academies', next) }} />
                            </div>
                            <div className="space-y-1.5 pl-2">
                              {group.clubs.map((club, ci) => (
                                <div key={ci} className="flex items-center gap-2">
                                  <input type="text" value={club.name} placeholder="Nom du club" className={INPUT_BASE} maxLength={100}
                                    onChange={(e) => { const clubs = [...group.clubs]; clubs[ci] = { ...clubs[ci], name: e.target.value }; update({ clubs }) }} />
                                  <input type="url" value={club.logo_url ?? ''} placeholder="URL du logo" className={INPUT_BASE} maxLength={500}
                                    onChange={(e) => { const clubs = [...group.clubs]; clubs[ci] = { ...clubs[ci], logo_url: e.target.value || null }; update({ clubs }) }} />
                                  <RemoveButton onClick={() => { const clubs = [...group.clubs]; clubs.splice(ci, 1); update({ clubs }) }} />
                                </div>
                              ))}
                              <AddButton onClick={() => update({ clubs: [...group.clubs, { name: '', logo_url: null }] })}>Ajouter un club</AddButton>
                            </div>
                          </div>
                        )
                      })}
                      <p className="text-[0.65rem] text-zinc-500 dark:text-stone-500">
                        La liste complète reste enregistrée. Si elle ne tient pas lisiblement sur la page, le PDF en affiche une sélection avec « +N » (voir le rapport sous l’aperçu).
                      </p>
                    </div>
                  </Section>
                )}

                {/* QR */}
                {has('qr') && (
                  <Section title="QR code" hint="généré localement, affiché seulement si une adresse existe">
                    <label className="block">
                      <FieldLabel>Article lié</FieldLabel>
                      <select value={form.options.article_slug ?? ''} onChange={(e) => setOpt('article_slug', e.target.value || null)} className={INPUT_BASE}>
                        <option value="">Aucun article</option>
                        {articles.filter((a) => a.is_published).map((a) => <option key={a.id} value={a.slug}>{a.title}</option>)}
                      </select>
                    </label>
                    <TextField label="Vidéo YouTube" type="url" value={form.options.youtube_url ?? ''} placeholder="https://youtube.com/watch?v=…" max={500} onChange={(v) => setOpt('youtube_url', v || null)} error={errors['options.youtube_url']} />
                    <TextField label="URL personnalisée (prioritaire)" type="url" value={form.options.qr_custom_url ?? ''} placeholder="https://…" max={500} onChange={(v) => setOpt('qr_custom_url', v || null)} error={errors['options.qr_custom_url']} />
                    <p className="text-[0.65rem] text-zinc-500 dark:text-stone-500">Priorité : URL personnalisée, puis vidéo YouTube, puis article publié.</p>
                  </Section>
                )}

                {/* CONTACT */}
                {has('contact') && (
                  <Section title="Contact du pied de page" hint="laisser vide pour masquer une ligne">
                    <div className="grid sm:grid-cols-3 gap-3">
                      {(['instagram', 'email', 'phone'] as const).map((k) => (
                        <TextField key={k} label={{ instagram: 'Instagram', email: 'E-mail', phone: 'Téléphone' }[k]}
                          value={form.options.contact?.[k] ?? String(composition?.defaults.contact?.[k] ?? '')} max={k === 'email' ? 120 : 80}
                          onChange={(v) => setForm((f) => ({ ...f, options: { ...f.options, contact: { ...(composition?.defaults.contact ?? {}), ...(f.options.contact ?? {}), [k]: v } } }))} />
                      ))}
                    </div>
                  </Section>
                )}
              </>)}

              {/* DIFFUSION */}
              <Section title="Diffusion">
                <label className="inline-flex items-center gap-2 cursor-pointer text-sm">
                  <input type="checkbox" checked={form.is_published} onChange={(e) => setForm((f) => ({ ...f, is_published: e.target.checked }))}
                    className="h-4 w-4 rounded border-stone-300 text-turf-700 focus:ring-turf-500" />
                  <span className="text-zinc-700 dark:text-stone-300">Publier sur la fiche publique du joueur (sinon, conservé en interne)</span>
                </label>
                {existing?.is_published && existing.public_token && <PublicLink token={existing.public_token} onCopied={(ok) => ok ? toast.success('Lien public copié.') : toast.error('Impossible de copier le lien.')} />}
              </Section>

              {/* SAVE BAR */}
              <div className="sticky bottom-0 -mx-6 lg:-mx-10 px-6 lg:px-10 py-4 bg-stone-50/95 dark:bg-zinc-950/95 backdrop-blur border-t border-stone-200 dark:border-stone-50/10 flex items-center justify-end gap-2">
                <button type="button" onClick={() => navigate('/admin/presentations')}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-50/10 transition">
                  Annuler
                </button>
                <button type="button" onClick={openPreviewPdf} disabled={!preview?.pdfUrl}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-stone-300 dark:border-stone-50/15 bg-white dark:bg-zinc-900 hover:bg-stone-100 dark:hover:bg-stone-50/5 transition disabled:opacity-60">
                  <Eye size={14} weight="bold" />
                  Ouvrir l’aperçu PDF
                </button>
                <button type="submit" disabled={saving} className="btn btn-primary text-sm disabled:opacity-60 disabled:cursor-not-allowed">
                  {saving ? 'Génération et vérification…' : (creating && !existing ? 'Créer la présentation' : 'Enregistrer')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <PdfGenerationOverlay open={saving} />
    </div>
  )
}

// --------------------------------------------------------------------------- UI bits

function Section({ title, hint, action, children }: { title: string; hint?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-mono uppercase tracking-[0.18em] text-[0.7rem] text-zinc-500 dark:text-stone-400">
          {title}{hint && <span className="text-zinc-400 dark:text-stone-500 normal-case font-sans tracking-normal"> · {hint}</span>}
        </h3>
        {action}
      </div>
      {children}
    </section>
  )
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <span className="block text-[0.65rem] font-mono uppercase tracking-[0.16em] text-zinc-500 dark:text-stone-400 mb-1">{children}</span>
}

function SubLabel({ children }: { children: ReactNode }) {
  return <div className="text-[0.65rem] font-mono uppercase tracking-[0.14em] text-zinc-500 dark:text-stone-400">{children}</div>
}

function ChoiceCard({ active, onClick, compact = false, children }: { active: boolean; onClick: () => void; compact?: boolean; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={`text-left rounded-xl border ${compact ? 'p-2.5' : 'p-3'} transition ${active
        ? 'border-turf-700 dark:border-turf-300 ring-2 ring-turf-700/20 dark:ring-turf-300/20 bg-white dark:bg-zinc-900'
        : 'border-stone-200 dark:border-stone-50/10 bg-white/60 dark:bg-zinc-900/40 hover:border-stone-400 dark:hover:border-stone-50/25'}`}>
      {children}
    </button>
  )
}

function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: Array<{ value: T; label: string }> }) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-full border border-stone-300 dark:border-stone-50/15 p-0.5 text-xs">
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)}
          className={`px-3 py-1.5 rounded-full font-medium transition ${value === o.value
            ? 'bg-zinc-950 text-stone-50 dark:bg-stone-50 dark:text-zinc-950'
            : 'text-zinc-600 hover:text-zinc-900 dark:text-stone-400 dark:hover:text-stone-100'}`}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

function TextField({ label, value, onChange, placeholder, max, type = 'text', error }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; max: number; type?: string; error?: string }) {
  return (
    <label className="block">
      <FieldLabel>{label}</FieldLabel>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={INPUT_BASE} maxLength={max} />
      {error && <span className="mt-1 block text-[0.7rem] text-rose-600 dark:text-rose-400">{error}</span>}
    </label>
  )
}

function AddButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1 text-[0.7rem] font-medium text-turf-700 dark:text-turf-300 hover:underline">
      <Plus size={12} weight="bold" /> {children}
    </button>
  )
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label="Supprimer"
      className="shrink-0 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/15 rounded-md p-1.5 transition">
      <Trash size={12} weight="bold" />
    </button>
  )
}

function Thumb({ src }: { src: string | null }) {
  return (
    <div className="shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-stone-200 dark:bg-stone-50/5 border border-stone-300 dark:border-stone-50/10">
      {src ? <img src={src} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full grid place-items-center text-zinc-400"><Person size={22} /></div>}
    </div>
  )
}

function PublicLink({ token, onCopied }: { token: string; onCopied: (ok: boolean) => void }) {
  const publicUrl = `${window.location.origin}/p/${token}`
  const copy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(publicUrl)
      } else {
        const ta = document.createElement('textarea')
        ta.value = publicUrl
        ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      onCopied(true)
    } catch {
      onCopied(false)
    }
  }
  return (
    <div className="space-y-2">
      <SubLabel>Lien à envoyer au club</SubLabel>
      <div className="flex items-center gap-2 rounded-lg border border-stone-300 dark:border-stone-50/15 bg-white dark:bg-zinc-900 px-3 py-2">
        <span className="flex-1 text-xs font-mono truncate text-zinc-700 dark:text-stone-300" title={publicUrl}>{publicUrl}</span>
        <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-turf-700 text-white hover:bg-turf-800 transition">
          <Copy size={12} weight="bold" /> Copier
        </button>
        <a href={`/p/${token}`} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border border-stone-300 dark:border-stone-50/15 hover:bg-stone-100 dark:hover:bg-stone-50/5 transition">
          <Eye size={12} weight="bold" /> Voir
        </a>
      </div>
      <p className="text-[0.65rem] text-zinc-500 dark:text-stone-500">Le club arrive sur une page Rene Football avec le PDF intégré et un bouton de téléchargement.</p>
    </div>
  )
}
