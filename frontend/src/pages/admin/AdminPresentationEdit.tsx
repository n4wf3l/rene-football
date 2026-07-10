import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  CheckCircle,
  Eye,
  Image as ImageIcon,
  Person,
  Plus,
  Trash,
  X as XIcon,
} from '@phosphor-icons/react'
import { api, ApiError, getToken } from '../../api/client'
import type { Player } from '../../types/player'
import type {
  Presentation,
  PresentationOptions,
  PresentationStatChoice,
  PresentationTemplate,
  PresentationTemplateKey,
} from '../../types/presentation'
import PdfGenerationOverlay from '../../components/PdfGenerationOverlay'
import PlayerSingleSelect from '../../components/PlayerSingleSelect'
import PresentationPreview from '../../components/PresentationPreview'
import Skeleton from '../../components/Skeleton'

interface PlayersResponse { data: (Player & { id: number })[] }
interface PresentationResponse { data: Presentation }
interface CatalogueArticleRow { id: number; slug: string; title: string; category: string; is_published: boolean }
interface CatalogueResponse {
  templates: PresentationTemplate[]
  stats: PresentationStatChoice[]
  articles?: CatalogueArticleRow[]
}

/**
 * Which optional sections each template actually renders. If a capability is
 * false, the editor hides that section entirely so the admin never wonders
 * why the option they filled in doesn't show up on the PDF.
 */
const TEMPLATE_CAPABILITIES: Record<PresentationTemplateKey, { previousClubs: boolean; externalLinks: boolean }> = {
  classic:  { previousClubs: true, externalLinks: true },
  magazine: { previousClubs: true, externalLinks: true },
  minimal:  { previousClubs: true, externalLinks: true },
  stadium:  { previousClubs: true, externalLinks: true },
}

const INPUT_BASE =
  'w-full rounded-lg border border-stone-300 bg-white text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 dark:border-stone-50/15 dark:bg-zinc-900 dark:text-stone-50 dark:placeholder:text-stone-500 dark:focus:border-turf-300 px-3 py-2 text-sm focus:outline-none transition'

interface ToastState { kind: 'success' | 'error'; message: string }

function Toast({ kind, message, onDismiss }: ToastState & { onDismiss: () => void }) {
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

const DEFAULT_OPTIONS: PresentationOptions = {
  accent_color: '#0f5132',
  secondary_color: '#84b896',
  text_color: '#0c0a09',
  background_color: '#fafaf9',
  tagline: '',
  selected_stats: [],
  show_heatmap: true,
  photo_source: 'player',
  custom_photo_url: null,
}

interface FormState {
  player_id: number | null
  template_key: PresentationTemplateKey
  title: string
  is_published: boolean
  options: PresentationOptions
}

export default function AdminPresentationEdit({ creating = false }: { creating?: boolean }) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [form, setForm] = useState<FormState>({
    player_id: null,
    template_key: 'classic',
    title: '',
    is_published: false,
    options: { ...DEFAULT_OPTIONS },
  })
  const [loading, setLoading] = useState(!creating)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [toast, setToast] = useState<ToastState | null>(null)

  const [players, setPlayers] = useState<(Player & { id: number })[]>([])
  const [templates, setTemplates] = useState<PresentationTemplate[]>([])
  const [statCatalogue, setStatCatalogue] = useState<PresentationStatChoice[]>([])
  const [articles, setArticles] = useState<CatalogueArticleRow[]>([])
  const [existing, setExisting] = useState<Presentation | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)

  const selectedPlayer = useMemo(
    () => players.find((p) => p.id === form.player_id) ?? null,
    [players, form.player_id],
  )

  // --- bootstrap ----------------------------------------------------------

  useEffect(() => {
    api.get<PlayersResponse>('/admin/players', { auth: true })
      .then((res) => setPlayers(res.data))
      .catch(() => { /* non-fatal */ })
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
          template_key: p.template_key,
          title: p.title,
          is_published: p.is_published,
          options: { ...DEFAULT_OPTIONS, ...(p.options ?? {}) },
        })
      })
      .catch(() => { if (!cancelled) setErrors({ _global: 'Présentation introuvable.' }) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id, creating])

  // Re-fetch the catalogue (stats depend on player category).
  useEffect(() => {
    const cat = selectedPlayer?.category || 'Milieu'
    api.get<CatalogueResponse>(`/admin/presentations/catalogue?category=${encodeURIComponent(cat)}`, { auth: true })
      .then((res) => { setTemplates(res.templates); setStatCatalogue(res.stats); setArticles(res.articles ?? []) })
      .catch(() => { /* non-fatal */ })
  }, [selectedPlayer?.category])

  // --- helpers ------------------------------------------------------------

  const showToast = (kind: ToastState['kind'], message: string) => {
    setToast({ kind, message })
    setTimeout(() => setToast(null), 3500)
  }

  const setOpt = <K extends keyof PresentationOptions>(k: K, v: PresentationOptions[K]) => {
    setForm((f) => ({ ...f, options: { ...f.options, [k]: v } }))
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

  const pickTemplate = (key: PresentationTemplateKey) => {
    const tpl = templates.find((t) => t.key === key)
    if (!tpl) { setForm((f) => ({ ...f, template_key: key })); return }
    // Adopt the template's color defaults if the user hasn't touched them yet,
    // but preserve any explicit customisation they already made.
    setForm((f) => {
      const merged: PresentationOptions = {
        ...f.options,
        accent_color:     tpl.defaults.accent_color     ?? f.options.accent_color,
        secondary_color:  tpl.defaults.secondary_color  ?? f.options.secondary_color,
        text_color:       tpl.defaults.text_color       ?? f.options.text_color,
        background_color: tpl.defaults.background_color ?? f.options.background_color,
      }
      return { ...f, template_key: key, options: merged }
    })
  }

  const onUploadPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    if (!file) return
    setPhotoFile(file)
    setUploadingPhoto(true)
    try {
      const fd = new FormData()
      fd.append('photo', file)
      const res = await api.post<{ url: string }>('/admin/presentations/upload-photo', fd, { auth: true })
      setOpt('custom_photo_url', res.url)
      setOpt('photo_source', 'custom')
      showToast('success', 'Photo uploadée.')
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Upload impossible.')
      setPhotoFile(null)
    } finally {
      setUploadingPhoto(false)
    }
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.player_id) { setErrors({ player_id: 'Choisissez un joueur.' }); return }
    if (!form.title.trim()) { setErrors({ title: 'Le titre est requis.' }); return }
    setSaving(true)
    setErrors({})
    try {
      const payload = {
        player_id: form.player_id,
        template_key: form.template_key,
        title: form.title,
        is_published: form.is_published,
        options: form.options,
      }
      let res: PresentationResponse
      if (creating) {
        res = await api.post<PresentationResponse>('/admin/presentations', payload, { auth: true })
      } else {
        res = await api.patch<PresentationResponse>(`/admin/presentations/${id}`, payload, { auth: true })
      }
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
        setErrors(flat)
        showToast('error', 'Vérifiez les champs en erreur.')
      } else {
        const msg = err instanceof Error ? err.message : 'Erreur d\'enregistrement.'
        setErrors({ _global: msg })
        showToast('error', msg)
      }
    } finally {
      setSaving(false)
    }
  }

  const onPreview = async () => {
    // Save first to make sure the preview reflects current state, then open the
    // server-rendered PDF in a new tab.
    if (!form.player_id || !form.title.trim()) {
      showToast('error', 'Joueur et titre requis pour l\'aperçu.')
      return
    }
    setSaving(true)
    setGeneratingPdf(true)
    try {
      const payload = {
        player_id: form.player_id,
        template_key: form.template_key,
        title: form.title,
        is_published: form.is_published,
        options: form.options,
      }
      let target: Presentation
      if (creating && !existing) {
        const res = await api.post<PresentationResponse>('/admin/presentations', payload, { auth: true })
        target = res.data
        setExisting(target)
        // Replace the URL so refreshing keeps the same draft.
        navigate(`/admin/presentations/${target.id}/edit`, { replace: true })
      } else {
        const targetId = existing?.id ?? Number(id)
        const res = await api.patch<PresentationResponse>(`/admin/presentations/${targetId}`, payload, { auth: true })
        target = res.data
        setExisting(target)
      }
      // A raw window.open on /api/... would send no Authorization header, so
      // Laravel's admin middleware would 302 to a non-existent `login` route
      // and crash. Fetch the PDF as a blob with the Bearer token, then hand
      // the object URL to a fresh tab.
      const token = getToken()
      const resp = await fetch(`/api/admin/presentations/${target.id}/preview`, {
        headers: token ? { Authorization: `Bearer ${token}`, Accept: 'application/pdf' } : { Accept: 'application/pdf' },
      })
      if (!resp.ok) throw new Error(`Aperçu impossible (HTTP ${resp.status})`)
      const blob = await resp.blob()
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener,noreferrer')
      // Release the blob URL after a short delay so the new tab has time to load it.
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Aperçu impossible.'
      showToast('error', msg)
    } finally {
      setSaving(false)
      setGeneratingPdf(false)
    }
  }

  const onDelete = async () => {
    if (!existing) return
    if (!confirm(`Supprimer définitivement « ${existing.title} » ?`)) return
    try {
      await api.delete(`/admin/presentations/${existing.id}`, { auth: true })
      navigate('/admin/presentations', { state: { toast: 'Présentation supprimée.' } })
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Suppression impossible.')
    }
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
        <h1 className="font-display font-semibold text-3xl text-zinc-950 dark:text-stone-50">
          Présentation introuvable
        </h1>
        <button type="button" onClick={() => navigate('/admin/presentations')} className="btn btn-primary text-sm mt-6">
          Retour à la liste
        </button>
      </div>
    )
  }

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
            <aside className="lg:col-span-2 lg:order-2 lg:sticky lg:top-0 lg:self-start lg:h-[calc(100dvh-4rem)] lg:flex lg:items-center mb-8 lg:mb-0">
              <div className="w-full lg:max-h-full lg:overflow-y-auto lg:pr-1 lg:py-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[0.65rem] font-mono uppercase tracking-[0.16em] text-zinc-500 dark:text-stone-400">
                    Aperçu live
                  </span>
                  <span className="text-[0.6rem] font-mono uppercase tracking-wider text-zinc-400 dark:text-stone-500">
                    A4 · {{ classic: 'Carte d\'identité', magazine: 'Magazine', minimal: 'Minimal', stadium: 'Stadium' }[form.template_key]}
                  </span>
                </div>
                <PresentationPreview
                  template={form.template_key}
                  player={selectedPlayer}
                  options={form.options}
                  title={form.title}
                  statCatalogue={statCatalogue}
                />
                <p className="mt-3 text-[0.65rem] text-zinc-500 dark:text-stone-500 leading-relaxed">
                  Reflète le recadrage de la photo, la palette et les stats sélectionnées. Le rendu PDF final
                  peut différer légèrement (typo serif, marges DomPDF).
                </p>
              </div>
            </aside>

      <form onSubmit={submit} className="lg:col-span-3 lg:order-1 space-y-10">
        {errors._global && (
          <div className="px-4 py-3 rounded-xl bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300 text-sm">
            {errors._global}
          </div>
        )}

        {/* JOUEUR + TITRE */}
        <section className="space-y-4">
          <h3 className="font-mono uppercase tracking-[0.18em] text-[0.7rem] text-zinc-500 dark:text-stone-400">Cible</h3>
          <div className="grid lg:grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-[0.65rem] font-mono uppercase tracking-[0.16em] text-zinc-500 dark:text-stone-400 mb-1">Joueur</span>
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
              <span className="block text-[0.65rem] font-mono uppercase tracking-[0.16em] text-zinc-500 dark:text-stone-400 mb-1">Titre du document</span>
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
        </section>

        {/* TEMPLATE */}
        <section className="space-y-4">
          <h3 className="font-mono uppercase tracking-[0.18em] text-[0.7rem] text-zinc-500 dark:text-stone-400">Template</h3>
          <div className="grid sm:grid-cols-3 gap-4">
            {templates.map((t) => {
              const active = form.template_key === t.key
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => pickTemplate(t.key)}
                  className={`text-left rounded-2xl border p-3 transition ${
                    active
                      ? 'border-turf-700 dark:border-turf-300 ring-2 ring-turf-700/20 dark:ring-turf-300/20 bg-white dark:bg-zinc-900'
                      : 'border-stone-200 dark:border-stone-50/10 bg-white/60 dark:bg-zinc-900/40 hover:border-stone-400 dark:hover:border-stone-50/25'
                  }`}
                >
                  <div className="aspect-[60/84] rounded-lg overflow-hidden bg-stone-100 dark:bg-zinc-950 mb-3"
                       dangerouslySetInnerHTML={{ __html: t.thumbnail }} />
                  <div className="font-display font-semibold text-sm text-zinc-950 dark:text-stone-50">{t.label}</div>
                  <p className="mt-1 text-xs text-zinc-600 dark:text-stone-400 leading-relaxed">{t.description}</p>
                </button>
              )
            })}
          </div>
        </section>

        {/* COULEURS */}
        <section className="space-y-4">
          <h3 className="font-mono uppercase tracking-[0.18em] text-[0.7rem] text-zinc-500 dark:text-stone-400">Palette</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {(['accent_color', 'secondary_color', 'text_color', 'background_color'] as const).map((k) => (
              <label key={k} className="block">
                <span className="block text-[0.65rem] font-mono uppercase tracking-[0.16em] text-zinc-500 dark:text-stone-400 mb-1">
                  {{ accent_color: 'Couleur principale', secondary_color: 'Couleur secondaire', text_color: 'Couleur du texte', background_color: 'Couleur de fond' }[k]}
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.options[k] ?? '#000000'}
                    onChange={(e) => setOpt(k, e.target.value)}
                    className="h-9 w-12 rounded cursor-pointer border border-stone-300 dark:border-stone-50/15 bg-white dark:bg-zinc-900"
                  />
                  <input
                    type="text"
                    value={form.options[k] ?? ''}
                    onChange={(e) => setOpt(k, e.target.value)}
                    className={`${INPUT_BASE} font-mono`}
                    maxLength={9}
                  />
                </div>
              </label>
            ))}
          </div>
          <label className="block">
            <span className="block text-[0.65rem] font-mono uppercase tracking-[0.16em] text-zinc-500 dark:text-stone-400 mb-1">
              Tagline <span className="text-zinc-400 dark:text-stone-500 normal-case font-sans tracking-normal">- accroche courte sous le nom</span>
            </span>
            <input
              type="text"
              value={form.options.tagline ?? ''}
              onChange={(e) => setOpt('tagline', e.target.value)}
              placeholder="ex. Avant-centre · Saison 2025/26"
              className={INPUT_BASE}
              maxLength={200}
            />
          </label>
        </section>

        {/* TYPOGRAPHIE */}
        <section className="space-y-4">
          <h3 className="font-mono uppercase tracking-[0.18em] text-[0.7rem] text-zinc-500 dark:text-stone-400">Typographie</h3>
          <div className="grid sm:grid-cols-3 gap-3">
            {([
              { key: 'editorial', label: 'Éditoriale', hint: 'Serif classique, direction sportive traditionnelle', style: { fontFamily: 'Georgia, "Times New Roman", serif' } },
              { key: 'sans',      label: 'Moderne',    hint: 'Sans-serif neutre, envoi corporate contemporain', style: { fontFamily: 'Inter, "Helvetica Neue", Helvetica, Arial, sans-serif' } },
              { key: 'grotesque', label: 'Impact',     hint: 'Bold serré, ambiance sportive marketing',        style: { fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', fontWeight: 800, letterSpacing: '-0.02em' } },
            ] as const).map((f) => {
              const active = (form.options.font_family ?? 'editorial') === f.key
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setOpt('font_family', f.key)}
                  className={`text-left rounded-xl border p-3 transition ${
                    active
                      ? 'border-turf-700 dark:border-turf-300 ring-2 ring-turf-700/20 dark:ring-turf-300/20 bg-white dark:bg-zinc-900'
                      : 'border-stone-200 dark:border-stone-50/10 bg-white/60 dark:bg-zinc-900/40 hover:border-stone-400 dark:hover:border-stone-50/25'
                  }`}
                >
                  <div className="text-[22px] leading-none text-zinc-950 dark:text-stone-50" style={f.style}>Aa</div>
                  <div className="mt-2 font-display font-semibold text-sm text-zinc-950 dark:text-stone-50">{f.label}</div>
                  <div className="text-[0.65rem] text-zinc-500 dark:text-stone-500 leading-relaxed mt-1">{f.hint}</div>
                </button>
              )
            })}
          </div>
          <div>
            <span className="block text-[0.65rem] font-mono uppercase tracking-[0.16em] text-zinc-500 dark:text-stone-400 mb-1.5">
              Taille de base
            </span>
            <div className="inline-flex items-center gap-0.5 rounded-full border border-stone-300 dark:border-stone-50/15 p-0.5 text-xs">
              {([
                { value: 'small' as const,  label: 'Compact' },
                { value: 'normal' as const, label: 'Normal' },
                { value: 'large' as const,  label: 'Confort' },
              ]).map((s) => {
                const active = (form.options.font_scale ?? 'normal') === s.value
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setOpt('font_scale', s.value)}
                    className={`px-3 py-1.5 rounded-full font-medium transition ${
                      active
                        ? 'bg-zinc-950 text-stone-50 dark:bg-stone-50 dark:text-zinc-950'
                        : 'text-zinc-600 hover:text-zinc-900 dark:text-stone-400 dark:hover:text-stone-100'
                    }`}
                  >
                    {s.label}
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        {/* PHOTO */}
        <section className="space-y-3">
          <h3 className="font-mono uppercase tracking-[0.18em] text-[0.7rem] text-zinc-500 dark:text-stone-400">Photo</h3>
          <div className="inline-flex items-center gap-0.5 rounded-full border border-stone-300 dark:border-stone-50/15 p-0.5 text-xs">
            {(['player', 'custom'] as const).map((src) => (
              <button
                key={src}
                type="button"
                onClick={() => setOpt('photo_source', src)}
                className={`px-3 py-1.5 rounded-full font-medium transition ${
                  form.options.photo_source === src
                    ? 'bg-zinc-950 text-stone-50 dark:bg-stone-50 dark:text-zinc-950'
                    : 'text-zinc-600 hover:text-zinc-900 dark:text-stone-400 dark:hover:text-stone-100'
                }`}
              >
                {src === 'player' ? 'Photo du joueur' : 'Photo personnalisée'}
              </button>
            ))}
          </div>
          {form.options.photo_source === 'player' && selectedPlayer && (
            <div className="flex items-center gap-3 text-xs text-zinc-600 dark:text-stone-400">
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-stone-200 dark:bg-stone-50/5">
                {selectedPlayer.photo_url ? (
                  <img src={selectedPlayer.photo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full grid place-items-center text-zinc-400"><Person size={18} weight="regular" /></div>
                )}
              </div>
              <span>Utilise la photo de la fiche joueur.</span>
            </div>
          )}
          {form.options.photo_source === 'custom' && (
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-stone-200 dark:bg-stone-50/5 border border-stone-300 dark:border-stone-50/10">
                {form.options.custom_photo_url ? (
                  <img src={form.options.custom_photo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full grid place-items-center text-zinc-400"><ImageIcon size={20} weight="regular" /></div>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border border-stone-300 dark:border-stone-50/15 bg-white dark:bg-zinc-900/40 hover:bg-stone-100 dark:hover:bg-stone-50/5 cursor-pointer transition">
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onUploadPhoto} disabled={uploadingPhoto} />
                  {uploadingPhoto ? 'Upload…' : (photoFile ? `Changer (${photoFile.name.slice(0, 24)})` : 'Choisir une photo…')}
                </label>
                {form.options.custom_photo_url && (
                  <button
                    type="button"
                    onClick={() => { setOpt('custom_photo_url', null); setPhotoFile(null) }}
                    className="block text-[0.7rem] text-zinc-500 hover:text-rose-700 dark:text-stone-400 dark:hover:text-rose-400 transition"
                  >
                    Retirer la photo
                  </button>
                )}
                <p className="text-[0.65rem] text-zinc-500 dark:text-stone-500">JPG / PNG / WebP - 6 Mo max.</p>
              </div>
            </div>
          )}

          {/* Cadrage de la photo */}
          <div className="pt-3 border-t border-stone-200/70 dark:border-stone-50/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[0.65rem] font-mono uppercase tracking-[0.16em] text-zinc-500 dark:text-stone-400">
                Cadrage <span className="text-zinc-400 dark:text-stone-500 normal-case font-sans tracking-normal">- ajustement dans le cadre</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setOpt('photo_fit', 'contain')
                  setOpt('photo_zoom', 100)
                  setOpt('photo_position_x', 50)
                  setOpt('photo_position_y', 50)
                }}
                className="text-[0.65rem] font-medium text-zinc-500 hover:text-zinc-900 dark:text-stone-400 dark:hover:text-stone-100 transition"
              >
                Réinitialiser
              </button>
            </div>

            {/* Mode d'affichage */}
            <div>
              <span className="block text-[0.65rem] font-mono uppercase tracking-[0.14em] text-zinc-500 dark:text-stone-400 mb-1.5">
                Mode d'affichage
              </span>
              <div className="inline-flex items-center gap-0.5 rounded-full border border-stone-300 dark:border-stone-50/15 p-0.5 text-xs">
                {([
                  { value: 'contain' as const, label: 'Photo entière', hint: 'toute la photo visible' },
                  { value: 'cover'   as const, label: 'Photo cadrée',  hint: 'remplit et coupe' },
                ]).map((m) => {
                  const active = (form.options.photo_fit ?? 'contain') === m.value
                  return (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setOpt('photo_fit', m.value)}
                      title={m.hint}
                      className={`px-3 py-1.5 rounded-full font-medium transition ${
                        active
                          ? 'bg-zinc-950 text-stone-50 dark:bg-stone-50 dark:text-zinc-950'
                          : 'text-zinc-600 hover:text-zinc-900 dark:text-stone-400 dark:hover:text-stone-100'
                      }`}
                    >
                      {m.label}
                    </button>
                  )
                })}
              </div>
              <p className="mt-1.5 text-[0.65rem] text-zinc-500 dark:text-stone-500">
                « Photo entière » = tout le joueur visible, letterbox si besoin. « Photo cadrée » = remplit le cadre en recadrant.
              </p>
            </div>
            {(
              [
                { key: 'photo_zoom',       label: 'Zoom',        min: 100, max: 250, step: 5,  suffix: '%' },
                { key: 'photo_position_x', label: 'Position X',  min: 0,   max: 100, step: 1,  suffix: '%' },
                { key: 'photo_position_y', label: 'Position Y',  min: 0,   max: 100, step: 1,  suffix: '%' },
              ] as const
            ).map((s) => {
              const fallback = s.key === 'photo_zoom' ? 100 : 50
              const value = (form.options[s.key] ?? fallback) as number
              return (
                <label key={s.key} className="block">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[0.65rem] font-mono uppercase tracking-[0.14em] text-zinc-500 dark:text-stone-400">
                      {s.label}
                    </span>
                    <span className="text-[0.7rem] font-mono tabular-nums text-zinc-700 dark:text-stone-300">
                      {value}{s.suffix}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={s.min}
                    max={s.max}
                    step={s.step}
                    value={value}
                    onChange={(e) => setOpt(s.key, Number(e.target.value))}
                    className="w-full accent-turf-700 dark:accent-turf-300"
                  />
                </label>
              )
            })}
          </div>
        </section>

        {/* STATS */}
        <section className="space-y-3">
          <h3 className="font-mono uppercase tracking-[0.18em] text-[0.7rem] text-zinc-500 dark:text-stone-400">
            Statistiques mises en avant <span className="text-zinc-400 dark:text-stone-500 normal-case font-sans tracking-normal">- max 4</span>
          </h3>
          {statCatalogue.length === 0 ? (
            <p className="text-xs text-zinc-500 dark:text-stone-500">Choisissez d'abord un joueur pour voir la liste des stats disponibles.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {statCatalogue.map((s) => {
                const active = (form.options.selected_stats ?? []).includes(s.key)
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => toggleStat(s.key)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition ${
                      active
                        ? 'bg-turf-800 text-stone-50 dark:bg-turf-300 dark:text-zinc-950'
                        : 'bg-stone-200/70 text-zinc-700 hover:bg-stone-300/70 dark:bg-stone-50/10 dark:text-stone-300 dark:hover:bg-stone-50/15'
                    }`}
                  >
                    {active && <CheckCircle size={12} weight="bold" />}
                    {s.label}
                  </button>
                )
              })}
            </div>
          )}
          <p className="text-[0.65rem] text-zinc-500 dark:text-stone-500">
            Si rien n'est sélectionné, le template choisit 4 stats par défaut selon la catégorie du joueur.
          </p>
        </section>

        {/* HEATMAP */}
        <section className="space-y-3">
          <h3 className="font-mono uppercase tracking-[0.18em] text-[0.7rem] text-zinc-500 dark:text-stone-400">Heatmap de possession</h3>
          <label className="inline-flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={!!form.options.show_heatmap}
              onChange={(e) => setOpt('show_heatmap', e.target.checked)}
              className="h-4 w-4 rounded border-stone-300 text-turf-700 focus:ring-turf-500"
            />
            <span className="text-zinc-700 dark:text-stone-300">Inclure la heatmap 4×6 du joueur dans la présentation</span>
          </label>
        </section>

        {/* ANCIENS CLUBS (Stadium uniquement) */}
        {TEMPLATE_CAPABILITIES[form.template_key].previousClubs && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-mono uppercase tracking-[0.18em] text-[0.7rem] text-zinc-500 dark:text-stone-400">
              Anciens clubs <span className="text-zinc-400 dark:text-stone-500 normal-case font-sans tracking-normal">- affichés en bas du template Stadium</span>
            </h3>
            <button
              type="button"
              onClick={() => {
                const next = [...(form.options.previous_clubs ?? []), { name: '', logo_url: '' }]
                setOpt('previous_clubs', next)
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-stone-300 dark:border-stone-50/15 bg-white dark:bg-zinc-900/40 hover:bg-stone-100 dark:hover:bg-stone-50/5 transition"
            >
              <Plus size={12} weight="bold" /> Ajouter un club
            </button>
          </div>
          {(form.options.previous_clubs ?? []).length === 0 ? (
            <p className="text-xs text-zinc-500 dark:text-stone-500">Aucun club ajouté. Cliquez sur « Ajouter un club ».</p>
          ) : (
            <ul className="space-y-2">
              {(form.options.previous_clubs ?? []).map((club, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={club.name}
                    onChange={(e) => {
                      const next = [...(form.options.previous_clubs ?? [])]
                      next[idx] = { ...next[idx], name: e.target.value }
                      setOpt('previous_clubs', next)
                    }}
                    placeholder="Nom du club"
                    className={`${INPUT_BASE} w-1/3`}
                    maxLength={100}
                  />
                  <input
                    type="text"
                    value={club.logo_url ?? ''}
                    onChange={(e) => {
                      const next = [...(form.options.previous_clubs ?? [])]
                      next[idx] = { ...next[idx], logo_url: e.target.value }
                      setOpt('previous_clubs', next)
                    }}
                    placeholder="URL logo (optionnel)"
                    className={`${INPUT_BASE} flex-1`}
                    maxLength={500}
                  />
                  {club.logo_url && (
                    <img src={club.logo_url} alt="" className="w-9 h-9 object-contain bg-white rounded p-1" />
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      const next = [...(form.options.previous_clubs ?? [])]
                      next.splice(idx, 1)
                      setOpt('previous_clubs', next)
                    }}
                    className="grid place-items-center w-8 h-8 rounded-lg text-zinc-500 hover:bg-rose-100 hover:text-rose-700 dark:text-stone-400 dark:hover:bg-rose-500/15 dark:hover:text-rose-400 transition"
                    aria-label="Retirer"
                  >
                    <XIcon size={14} weight="bold" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
        )}

        {/* LIENS EXTERNES (Stadium uniquement) */}
        {TEMPLATE_CAPABILITIES[form.template_key].externalLinks && (
        <section className="space-y-4">
          <h3 className="font-mono uppercase tracking-[0.18em] text-[0.7rem] text-zinc-500 dark:text-stone-400">
            Liens externes <span className="text-zinc-400 dark:text-stone-500 normal-case font-sans tracking-normal">- rendus en QR codes sur le template Stadium</span>
          </h3>
          <label className="block">
            <span className="block text-[0.65rem] font-mono uppercase tracking-[0.16em] text-zinc-500 dark:text-stone-400 mb-1">
              Article lié <span className="text-zinc-400 dark:text-stone-500 normal-case font-sans tracking-normal">- article publié sur notre plateforme</span>
            </span>
            <select
              value={form.options.article_slug ?? ''}
              onChange={(e) => setOpt('article_slug', e.target.value || null)}
              className={INPUT_BASE}
            >
              <option value="">Aucun article</option>
              {articles.filter((a) => a.is_published).map((a) => (
                <option key={a.id} value={a.slug}>{a.title}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="block text-[0.65rem] font-mono uppercase tracking-[0.16em] text-zinc-500 dark:text-stone-400 mb-1">
              Lien vidéo YouTube <span className="text-zinc-400 dark:text-stone-500 normal-case font-sans tracking-normal">- compilation, full match…</span>
            </span>
            <input
              type="url"
              value={form.options.youtube_url ?? ''}
              onChange={(e) => setOpt('youtube_url', e.target.value || null)}
              placeholder="https://youtube.com/watch?v=…"
              className={INPUT_BASE}
              maxLength={500}
            />
            {errors['options.youtube_url'] && (
              <span className="mt-1 block text-[0.7rem] text-rose-600 dark:text-rose-400">{errors['options.youtube_url']}</span>
            )}
          </label>
        </section>
        )}

        {/* PUBLICATION */}
        <section className="space-y-3">
          <h3 className="font-mono uppercase tracking-[0.18em] text-[0.7rem] text-zinc-500 dark:text-stone-400">Diffusion</h3>
          <label className="inline-flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={form.is_published}
              onChange={(e) => setForm((f) => ({ ...f, is_published: e.target.checked }))}
              className="h-4 w-4 rounded border-stone-300 text-turf-700 focus:ring-turf-500"
            />
            <span className="text-zinc-700 dark:text-stone-300">
              Publier sur la fiche publique du joueur (sinon, conservé en interne uniquement)
            </span>
          </label>
          {existing?.is_published && existing.public_token && (
            <p className="text-xs text-zinc-500 dark:text-stone-400">
              Lien public actuel :{' '}
              <a href={`/api/presentations/${existing.public_token}`} target="_blank" rel="noopener noreferrer" className="underline">
                /api/presentations/{existing.public_token.slice(0, 8)}…
              </a>
            </p>
          )}
        </section>

        {/* SAVE BAR */}
        <div className="sticky bottom-0 -mx-6 lg:-mx-10 px-6 lg:px-10 py-4 bg-stone-50/95 dark:bg-zinc-950/95 backdrop-blur border-t border-stone-200 dark:border-stone-50/10 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => navigate('/admin/presentations')}
            className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-50/10 transition"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onPreview}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-stone-300 dark:border-stone-50/15 bg-white dark:bg-zinc-900 hover:bg-stone-100 dark:hover:bg-stone-50/5 transition disabled:opacity-60"
          >
            <Eye size={14} weight="bold" />
            Aperçu PDF
          </button>
          <button
            type="submit"
            disabled={saving}
            className="btn btn-primary text-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? 'Enregistrement…' : (creating ? 'Créer la présentation' : 'Enregistrer')}
          </button>
        </div>
      </form>
          </div>
        </div>
      </div>

      {toast && <Toast {...toast} onDismiss={() => setToast(null)} />}
      <PdfGenerationOverlay open={generatingPdf} />
    </div>
  )
}
