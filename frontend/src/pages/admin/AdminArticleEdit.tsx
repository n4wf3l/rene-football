import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent, ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  CheckCircle,
  ImageSquare,
  MagnifyingGlass,
  Plus,
  Star,
  Trash,
  X as XIcon,
} from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { api, ApiError } from '../../api/client'
import type { Article, ArticleImage, ArticleCategory } from '../../types/article'
import { ARTICLE_CATEGORIES } from '../../types/article'
import type { Player } from '../../types/player'
import type { PlayerClip } from '../../types/clip'
import Skeleton from '../../components/Skeleton'
import PlayerSingleSelect from '../../components/PlayerSingleSelect'

type ArticleFormState = Partial<Article>

const EMPTY_ARTICLE: ArticleFormState = {
  title: '',
  excerpt: '',
  content: '',
  category: 'Agence',
  cover_url: null,
  featured: false,
  player_id: null,
  is_published: true,
  published_at: null,
  images: [],
  clips: [],
}

interface ArticleResponse { data: Article }
interface PlayersResponse { data: Player[] }
interface ClipsResponse {
  data: (PlayerClip & { player?: { id: number; slug: string; name: string; photo_url: string | null } })[]
}

interface FieldRowProps {
  label: string
  hint?: string
  children: ReactNode
  error?: string
}

function FieldRow({ label, hint, children, error }: FieldRowProps) {
  return (
    <label className="block">
      <span className="block text-[0.65rem] font-mono uppercase tracking-[0.16em] text-zinc-500 dark:text-stone-400 mb-1">
        {label}{hint ? <span className="text-zinc-400 dark:text-stone-500 normal-case font-sans tracking-normal ml-1">- {hint}</span> : null}
      </span>
      {children}
      {error && <span className="mt-1 block text-[0.7rem] text-rose-600 dark:text-rose-400">{error}</span>}
    </label>
  )
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

/** Local-side staged uploads for new gallery images (file + caption + preview URL). */
interface StagedImage {
  id: string
  file: File
  caption: string
  previewUrl: string
}

function toDateInput(value: string | null | undefined): string {
  if (!value) return ''
  // Accept either YYYY-MM-DD or full ISO; trim to YYYY-MM-DDTHH:mm.
  const d = new Date(value)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function AdminArticleEdit({ creating = false }: { creating?: boolean }) {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()

  const [form, setForm] = useState<ArticleFormState | null>(creating ? EMPTY_ARTICLE : null)
  const [loading, setLoading] = useState(!creating)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [toast, setToast] = useState<ToastState | null>(null)

  // Cover file state - separate from form so we can show a preview without
  // mutating the persisted cover_url until save.
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [coverRemove, setCoverRemove] = useState(false)

  // Existing gallery image IDs to remove on save (kept local until submit).
  const [imagesToRemove, setImagesToRemove] = useState<number[]>([])
  // Staged new gallery images (not yet uploaded).
  const [stagedImages, setStagedImages] = useState<StagedImage[]>([])

  // Roster + all clips for the pickers.
  const [players, setPlayers] = useState<Player[]>([])
  const [allClips, setAllClips] = useState<ClipsResponse['data']>([])
  const [clipPickerOpen, setClipPickerOpen] = useState(false)

  // Locked-in clip ordering (we keep clip_id list ordered locally).
  const [attachedClipIds, setAttachedClipIds] = useState<number[]>([])

  // -------------------- bootstrap --------------------

  useEffect(() => {
    if (creating) {
      setForm(EMPTY_ARTICLE)
      setLoading(false)
      return
    }
    if (!slug) return
    let cancelled = false
    setLoading(true)
    api.get<ArticleResponse>(`/admin/articles/${slug}`, { auth: true })
      .then((res) => {
        if (cancelled) return
        setForm(res.data)
        setAttachedClipIds((res.data.clips ?? []).map((c) => c.id))
      })
      .catch((err: unknown) => {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 404) {
          setErrors({ _global: 'Article introuvable.' })
        } else {
          setErrors({ _global: 'Erreur de chargement.' })
        }
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [slug, creating])

  // Fetch the roster + every clip across the whole site for the pickers.
  useEffect(() => {
    api.get<PlayersResponse>('/admin/players', { auth: true })
      .then((res) => setPlayers(res.data))
      .catch(() => { /* non-fatal */ })
    api.get<ClipsResponse>('/admin/clips', { auth: true })
      .then((res) => setAllClips(res.data))
      .catch(() => { /* non-fatal */ })
  }, [])

  // Generate object URL for the cover preview; revoke on swap/unmount.
  useEffect(() => {
    if (!coverFile) { setCoverPreview(null); return }
    const url = URL.createObjectURL(coverFile)
    setCoverPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [coverFile])

  // Revoke staged-image previews when they leave the queue.
  useEffect(() => {
    return () => {
      stagedImages.forEach((s) => URL.revokeObjectURL(s.previewUrl))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const set = <K extends keyof ArticleFormState>(key: K, value: ArticleFormState[K]) =>
    setForm((f) => (f ? ({ ...f, [key]: value } as ArticleFormState) : f))

  const showToast = (kind: ToastState['kind'], message: string) => {
    setToast({ kind, message })
    setTimeout(() => setToast(null), 3500)
  }

  // -------------------- gallery helpers --------------------

  const onPickGalleryFiles = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    const staged: StagedImage[] = files.map((file) => ({
      id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`,
      file,
      caption: '',
      previewUrl: URL.createObjectURL(file),
    }))
    setStagedImages((prev) => [...prev, ...staged])
    e.target.value = '' // allow re-picking the same file later
  }

  const removeStagedImage = (id: string) => {
    setStagedImages((prev) => {
      const target = prev.find((s) => s.id === id)
      if (target) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((s) => s.id !== id)
    })
  }

  const updateStagedCaption = (id: string, caption: string) => {
    setStagedImages((prev) => prev.map((s) => (s.id === id ? { ...s, caption } : s)))
  }

  const toggleRemoveExistingImage = (img: ArticleImage) => {
    setImagesToRemove((prev) =>
      prev.includes(img.id) ? prev.filter((x) => x !== img.id) : [...prev, img.id],
    )
  }

  // -------------------- clip picker helpers --------------------

  const attachedClips = useMemo(() => {
    const byId = new Map(allClips.map((c) => [c.id, c]))
    return attachedClipIds
      .map((id) => byId.get(id))
      .filter((c): c is ClipsResponse['data'][number] => Boolean(c))
  }, [allClips, attachedClipIds])

  const toggleClip = (id: number) => {
    setAttachedClipIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  const moveClip = (id: number, dir: -1 | 1) => {
    setAttachedClipIds((prev) => {
      const i = prev.indexOf(id)
      if (i < 0) return prev
      const j = i + dir
      if (j < 0 || j >= prev.length) return prev
      const next = prev.slice()
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  // -------------------- submit --------------------

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form) return
    setSaving(true)
    setErrors({})
    try {
      const fd = new FormData()
      if (!creating) fd.append('_method', 'PUT')

      fd.append('title', form.title ?? '')
      fd.append('category', form.category ?? 'Agence')
      if (form.excerpt) fd.append('excerpt', form.excerpt)
      if (form.content) fd.append('content', form.content)
      if (form.player_id != null) fd.append('player_id', String(form.player_id))
      fd.append('featured', form.featured ? '1' : '0')
      fd.append('is_published', form.is_published ? '1' : '0')
      if (form.published_at) fd.append('published_at', form.published_at)

      if (coverFile) fd.append('cover', coverFile)
      if (coverRemove) fd.append('cover_remove', '1')

      // Always send clip_ids (even when empty) on update so the controller
      // knows the user explicitly cleared / reordered the list.
      fd.append('clip_ids', JSON.stringify(attachedClipIds))

      if (imagesToRemove.length > 0) {
        fd.append('image_remove_ids', JSON.stringify(imagesToRemove))
      }

      stagedImages.forEach((s, i) => {
        fd.append('gallery_images[]', s.file)
        fd.append(`gallery_captions[${i}]`, s.caption)
      })

      const res: ArticleResponse = creating
        ? await api.post<ArticleResponse>('/admin/articles', fd, { auth: true })
        : await api.post<ArticleResponse>(`/admin/articles/${form.slug}`, fd, { auth: true })

      stagedImages.forEach((s) => URL.revokeObjectURL(s.previewUrl))
      navigate('/admin/articles', {
        state: {
          toast: creating
            ? `« ${res.data.title} » créé.`
            : `« ${res.data.title} » mis à jour.`,
        },
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
        const message = err instanceof Error ? err.message : 'Erreur d\'enregistrement.'
        setErrors({ _global: message })
        showToast('error', message)
      }
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async () => {
    if (!form?.slug) return
    if (!confirm(`Supprimer définitivement l'article « ${form.title} » ?`)) return
    try {
      await api.delete(`/admin/articles/${form.slug}`, { auth: true })
      navigate('/admin/articles')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Suppression impossible.'
      showToast('error', message)
    }
  }

  // -------------------- render --------------------

  if (loading) {
    return (
      <div className="px-6 lg:px-10 py-8 max-w-5xl w-full mx-auto space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <div className="grid grid-cols-2 gap-3 mt-8">
          {[0,1,2,3,4,5].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      </div>
    )
  }

  if (!form || errors._global === 'Article introuvable.') {
    return (
      <div className="px-6 lg:px-10 py-12 max-w-3xl w-full mx-auto text-center">
        <h1 className="font-display font-semibold text-3xl text-zinc-950 dark:text-stone-50">
          {errors._global ?? 'Article introuvable'}
        </h1>
        <button
          type="button"
          onClick={() => navigate('/admin/articles')}
          className="btn btn-primary text-sm mt-6"
        >
          Retour à la liste
        </button>
      </div>
    )
  }

  // Selected player slug for the loop picker.
  const loopSlug = form.player_id != null
    ? players.find((p) => (p as Player & { id?: number }).id === form.player_id)?.slug ?? null
    : null

  const pickedClipIdsSet = new Set(attachedClipIds)
  const existingImages: ArticleImage[] = form.images ?? []

  return (
    <div className="bg-stone-50 dark:bg-zinc-950 min-h-[100dvh] flex flex-col">
      <div className="sticky top-0 z-10 flex items-center justify-between px-6 h-16 border-b border-stone-200 bg-white dark:bg-zinc-900 dark:border-stone-50/10">
        <div className="min-w-0">
          <div className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-turf-700 dark:text-turf-300">
            {creating ? 'Nouvel article' : 'Édition'}
          </div>
          <div className="font-display font-semibold text-lg text-zinc-950 dark:text-stone-50 truncate">
            {form.title || 'Article sans titre'}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!creating && (
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-rose-700 hover:bg-rose-100 dark:text-rose-400 dark:hover:bg-rose-500/15 transition"
            >
              <Trash size={14} weight="bold" />
              Supprimer
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate('/admin/articles')}
            className="grid place-items-center w-9 h-9 rounded-full text-zinc-500 hover:bg-stone-100 hover:text-zinc-900 dark:text-stone-400 dark:hover:bg-stone-50/10 dark:hover:text-stone-50 transition"
            aria-label="Retour à la liste"
          >
            <XIcon size={18} weight="bold" />
          </button>
        </div>
      </div>

      <form onSubmit={submit} className="flex-1 overflow-y-auto px-6 lg:px-10 py-8 max-w-5xl w-full mx-auto space-y-10">

        {errors._global && (
          <div className="px-4 py-3 rounded-xl bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300 text-sm">
            {errors._global}
          </div>
        )}

        {/* IDENTITÉ */}
        <section className="space-y-4">
          <h3 className="font-mono uppercase tracking-[0.18em] text-[0.7rem] text-zinc-500 dark:text-stone-400">Identité</h3>
          <FieldRow label="Titre" error={errors.title}>
            <input
              type="text"
              value={form.title ?? ''}
              onChange={(e) => set('title', e.target.value)}
              required
              maxLength={200}
              className={INPUT_BASE}
            />
          </FieldRow>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <FieldRow label="Catégorie" error={errors.category}>
              <select
                value={form.category ?? 'Agence'}
                onChange={(e) => set('category', e.target.value as ArticleCategory)}
                className={INPUT_BASE}
              >
                {ARTICLE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </FieldRow>
            <FieldRow label="Date de publication" hint="laisser vide = automatique à la publication">
              <input
                type="datetime-local"
                value={toDateInput(form.published_at)}
                onChange={(e) => set('published_at', e.target.value || null)}
                className={INPUT_BASE}
              />
            </FieldRow>
          </div>
          <FieldRow label="Accroche" hint="résumé court (1-2 phrases)" error={errors.excerpt}>
            <textarea
              rows={2}
              value={form.excerpt ?? ''}
              onChange={(e) => set('excerpt', e.target.value)}
              maxLength={500}
              className={INPUT_BASE}
            />
          </FieldRow>
        </section>

        {/* COVER */}
        <section className="space-y-4">
          <h3 className="font-mono uppercase tracking-[0.18em] text-[0.7rem] text-zinc-500 dark:text-stone-400">Image de couverture</h3>
          <div className="flex items-start gap-4">
            <div className="shrink-0 relative w-40 h-24 rounded-xl overflow-hidden bg-stone-200 dark:bg-stone-50/5 border border-stone-300 dark:border-stone-50/10">
              {coverPreview ? (
                <img src={coverPreview} alt="" className="absolute inset-0 w-full h-full object-cover" />
              ) : coverRemove ? (
                <div className="absolute inset-0 grid place-items-center text-[0.65rem] text-zinc-500 dark:text-stone-500 text-center px-2">
                  (à retirer)
                </div>
              ) : form.cover_url ? (
                <img src={form.cover_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 grid place-items-center text-zinc-400 dark:text-stone-500">
                  <ImageSquare size={20} weight="regular" />
                </div>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border border-stone-300 dark:border-stone-50/15 bg-white dark:bg-zinc-900/40 hover:bg-stone-100 dark:hover:bg-stone-50/5 cursor-pointer transition">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null
                    setCoverFile(file)
                    if (file) setCoverRemove(false)
                  }}
                />
                {coverFile ? `Changer (${coverFile.name.slice(0, 24)})` : 'Choisir une image…'}
              </label>
              {(coverFile || form.cover_url) && !coverRemove && (
                <button
                  type="button"
                  onClick={() => {
                    setCoverFile(null)
                    setCoverRemove(Boolean(form.cover_url) && !coverFile)
                  }}
                  className="block text-[0.7rem] text-zinc-500 hover:text-rose-700 dark:text-stone-400 dark:hover:text-rose-400 transition"
                >
                  {coverFile ? 'Annuler le fichier choisi' : 'Retirer la couverture actuelle'}
                </button>
              )}
              {coverRemove && (
                <button
                  type="button"
                  onClick={() => setCoverRemove(false)}
                  className="block text-[0.7rem] text-zinc-500 hover:text-zinc-900 dark:text-stone-400 dark:hover:text-stone-100 transition"
                >
                  Annuler le retrait
                </button>
              )}
              <p className="text-[0.65rem] text-zinc-500 dark:text-stone-500">
                JPG, PNG ou WebP - 6&nbsp;Mo max.
              </p>
            </div>
          </div>
        </section>

        {/* LOOP */}
        <section className="space-y-4">
          <h3 className="font-mono uppercase tracking-[0.18em] text-[0.7rem] text-zinc-500 dark:text-stone-400">
            Loop sur un joueur <span className="text-zinc-400 dark:text-stone-500 normal-case font-sans tracking-normal">- optionnel</span>
          </h3>
          <p className="text-xs text-zinc-500 dark:text-stone-400">
            Liez l'article à un joueur du roster. Sa fiche pourra mettre l'article en avant, et le filtre « par joueur » fonctionnera côté public.
          </p>
          <PlayerSingleSelect
            players={players}
            selectedSlug={loopSlug}
            onChange={(s) => {
              if (!s) { set('player_id', null); return }
              const found = (players as (Player & { id?: number })[]).find((p) => p.slug === s)
              set('player_id', found?.id ?? null)
            }}
            placeholder="Aucun joueur attaché"
          />
        </section>

        {/* CONTENT */}
        <section className="space-y-4">
          <h3 className="font-mono uppercase tracking-[0.18em] text-[0.7rem] text-zinc-500 dark:text-stone-400">Contenu</h3>
          <FieldRow label="Texte" hint="markdown léger autorisé (gras avec **…**, listes avec - …)">
            <textarea
              rows={14}
              value={form.content ?? ''}
              onChange={(e) => set('content', e.target.value)}
              className={`${INPUT_BASE} font-mono text-xs leading-relaxed`}
            />
          </FieldRow>
        </section>

        {/* GALERIE */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-mono uppercase tracking-[0.18em] text-[0.7rem] text-zinc-500 dark:text-stone-400">Galerie photos</h3>
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-stone-300 dark:border-stone-50/15 bg-white dark:bg-zinc-900/40 hover:bg-stone-100 dark:hover:bg-stone-50/5 cursor-pointer transition">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={onPickGalleryFiles}
              />
              <Plus size={12} weight="bold" />
              Ajouter des photos
            </label>
          </div>

          {existingImages.length === 0 && stagedImages.length === 0 && (
            <p className="text-xs text-zinc-500 dark:text-stone-500">
              Aucune photo encore. Cliquez sur « Ajouter des photos » pour en glisser dans la galerie.
            </p>
          )}

          {existingImages.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {existingImages.map((img) => {
                const flagged = imagesToRemove.includes(img.id)
                return (
                  <div
                    key={img.id}
                    className={`group relative rounded-xl overflow-hidden border transition ${
                      flagged
                        ? 'border-rose-500/60 opacity-60'
                        : 'border-stone-200 dark:border-stone-50/10'
                    }`}
                  >
                    <div className="aspect-[4/3] bg-stone-200 dark:bg-stone-50/5">
                      <img src={img.image_path} alt="" className="w-full h-full object-cover" />
                    </div>
                    {img.caption && (
                      <div className="px-2 py-1 text-[0.65rem] text-zinc-600 dark:text-stone-400 truncate">
                        {img.caption}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleRemoveExistingImage(img)}
                      className={`absolute top-2 right-2 grid place-items-center w-7 h-7 rounded-full transition ${
                        flagged
                          ? 'bg-rose-600 text-white'
                          : 'bg-white/90 text-zinc-700 hover:bg-rose-600 hover:text-white dark:bg-zinc-900/90 dark:text-stone-300'
                      }`}
                      title={flagged ? 'Annuler le retrait' : 'Retirer'}
                    >
                      {flagged ? <Plus size={12} weight="bold" /> : <Trash size={12} weight="bold" />}
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {stagedImages.length > 0 && (
            <div className="space-y-3">
              <div className="text-[0.65rem] font-mono uppercase tracking-[0.16em] text-turf-700 dark:text-turf-300">
                À uploader ({stagedImages.length})
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {stagedImages.map((s) => (
                  <div key={s.id} className="rounded-xl overflow-hidden border border-turf-700/40 dark:border-turf-300/40">
                    <div className="aspect-[4/3] bg-stone-200 dark:bg-stone-50/5 relative">
                      <img src={s.previewUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeStagedImage(s.id)}
                        className="absolute top-2 right-2 grid place-items-center w-7 h-7 rounded-full bg-white/90 text-zinc-700 hover:bg-rose-600 hover:text-white dark:bg-zinc-900/90 dark:text-stone-300 transition"
                        title="Retirer de la file"
                      >
                        <XIcon size={12} weight="bold" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={s.caption}
                      onChange={(e) => updateStagedCaption(s.id, e.target.value)}
                      placeholder="Légende (optionnelle)"
                      className="w-full px-2 py-1.5 text-xs border-t border-stone-200 dark:border-stone-50/10 bg-white dark:bg-zinc-900 focus:outline-none"
                      maxLength={200}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* CLIPS */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-mono uppercase tracking-[0.18em] text-[0.7rem] text-zinc-500 dark:text-stone-400">
              Captures d'annotations <span className="text-zinc-400 dark:text-stone-500 normal-case font-sans tracking-normal">- attachées</span>
            </h3>
            <button
              type="button"
              onClick={() => setClipPickerOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-stone-300 dark:border-stone-50/15 bg-white dark:bg-zinc-900/40 hover:bg-stone-100 dark:hover:bg-stone-50/5 transition"
            >
              <Plus size={12} weight="bold" />
              {clipPickerOpen ? 'Fermer le sélecteur' : 'Choisir des captures'}
            </button>
          </div>

          {attachedClips.length === 0 && (
            <p className="text-xs text-zinc-500 dark:text-stone-500">
              Aucune capture attachée. Vous pouvez réutiliser n'importe quelle annotation déjà créée dans Data analyse.
            </p>
          )}

          {attachedClips.length > 0 && (
            <ol className="space-y-2">
              {attachedClips.map((c, i) => (
                <li
                  key={c.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-50/10 bg-white dark:bg-zinc-900"
                >
                  <span className="text-[0.65rem] font-mono text-zinc-400 dark:text-stone-500 tabular-nums w-5 text-right shrink-0">
                    {i + 1}
                  </span>
                  <img
                    src={c.image_path}
                    alt=""
                    className="w-16 h-10 object-cover rounded-md shrink-0 bg-stone-200 dark:bg-stone-50/5"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-zinc-950 dark:text-stone-50 truncate">{c.title}</div>
                    <div className="text-[0.65rem] font-mono uppercase tracking-wider text-zinc-500 dark:text-stone-500 truncate">
                      {c.player?.name ?? '-'}
                      {c.video_source_label ? ` · ${c.video_source_label}` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => moveClip(c.id, -1)}
                      disabled={i === 0}
                      className="grid place-items-center w-7 h-7 rounded-md text-zinc-500 hover:bg-stone-100 hover:text-zinc-900 dark:text-stone-400 dark:hover:bg-stone-50/10 dark:hover:text-stone-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
                      aria-label="Monter"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveClip(c.id, 1)}
                      disabled={i === attachedClips.length - 1}
                      className="grid place-items-center w-7 h-7 rounded-md text-zinc-500 hover:bg-stone-100 hover:text-zinc-900 dark:text-stone-400 dark:hover:bg-stone-50/10 dark:hover:text-stone-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
                      aria-label="Descendre"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleClip(c.id)}
                      className="grid place-items-center w-7 h-7 rounded-md text-zinc-500 hover:bg-rose-100 hover:text-rose-700 dark:text-stone-400 dark:hover:bg-rose-500/15 dark:hover:text-rose-400 transition"
                      aria-label="Détacher"
                    >
                      <XIcon size={12} weight="bold" />
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          )}

          {clipPickerOpen && (
            <ClipPicker
              clips={allClips}
              picked={pickedClipIdsSet}
              onToggle={toggleClip}
              onClose={() => setClipPickerOpen(false)}
            />
          )}
        </section>

        {/* PUBLICATION */}
        <section className="space-y-3">
          <h3 className="font-mono uppercase tracking-[0.18em] text-[0.7rem] text-zinc-500 dark:text-stone-400">Publication</h3>
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={Boolean(form.is_published)}
                onChange={(e) => set('is_published', e.target.checked)}
                className="h-4 w-4 rounded border-stone-300 text-turf-700 focus:ring-turf-500"
              />
              <span className="text-zinc-700 dark:text-stone-300">Publier l'article (visible publiquement)</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={Boolean(form.featured)}
                onChange={(e) => set('featured', e.target.checked)}
                className="h-4 w-4 rounded border-stone-300 text-amber-500 focus:ring-amber-400"
              />
              <span className="text-zinc-700 dark:text-stone-300 inline-flex items-center gap-1">
                <Star size={12} weight={form.featured ? 'fill' : 'regular'} className="text-amber-500" />
                Mettre à la une
              </span>
            </label>
          </div>
        </section>

        {/* SAVE BAR */}
        <div className="sticky bottom-0 -mx-6 lg:-mx-10 px-6 lg:px-10 py-4 bg-stone-50/95 dark:bg-zinc-950/95 backdrop-blur border-t border-stone-200 dark:border-stone-50/10 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => navigate('/admin/articles')}
            className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-50/10 transition"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving}
            className="btn btn-primary text-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? 'Enregistrement…' : (creating ? 'Créer l\'article' : 'Enregistrer')}
          </button>
        </div>
      </form>

      {toast && <Toast {...toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}

interface ClipPickerProps {
  clips: ClipsResponse['data']
  picked: Set<number>
  onToggle: (id: number) => void
  onClose: () => void
}

function ClipPicker({ clips, picked, onToggle, onClose }: ClipPickerProps) {
  const [query, setQuery] = useState('')
  const [playerSlug, setPlayerSlug] = useState<string | null>(null)

  const playerOptions = useMemo(() => {
    const seen = new Map<string, { slug: string; name: string }>()
    clips.forEach((c) => {
      if (c.player) seen.set(c.player.slug, { slug: c.player.slug, name: c.player.name })
    })
    return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  }, [clips])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return clips.filter((c) => {
      if (playerSlug && c.player?.slug !== playerSlug) return false
      if (!q) return true
      return `${c.title} ${c.video_source_label ?? ''} ${c.player?.name ?? ''}`.toLowerCase().includes(q)
    })
  }, [clips, query, playerSlug])

  return (
    <div className="rounded-2xl border border-stone-200 dark:border-stone-50/10 bg-white dark:bg-zinc-900 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-stone-200 dark:border-stone-50/10">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-xs">
            <MagnifyingGlass size={13} weight="regular" className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filtrer les captures"
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-stone-300 bg-white text-sm dark:bg-zinc-950 dark:border-stone-50/10 dark:text-stone-50 focus:outline-none focus:border-zinc-900 dark:focus:border-stone-50/30"
            />
          </div>
          <select
            value={playerSlug ?? ''}
            onChange={(e) => setPlayerSlug(e.target.value || null)}
            className="rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-xs font-mono uppercase tracking-wider text-zinc-700 dark:bg-zinc-950 dark:border-stone-50/10 dark:text-stone-300 focus:outline-none"
          >
            <option value="">Tous les joueurs</option>
            {playerOptions.map((p) => (
              <option key={p.slug} value={p.slug}>{p.name}</option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid place-items-center w-7 h-7 rounded-md text-zinc-500 hover:bg-stone-100 hover:text-zinc-900 dark:text-stone-400 dark:hover:bg-stone-50/10 dark:hover:text-stone-50 transition"
          aria-label="Fermer"
        >
          <XIcon size={14} weight="bold" />
        </button>
      </div>
      <div className="max-h-96 overflow-y-auto p-3">
        {filtered.length === 0 ? (
          <p className="px-3 py-8 text-center text-xs text-zinc-500 dark:text-stone-500">
            Aucune capture ne correspond.
          </p>
        ) : (
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {filtered.map((c) => {
              const isPicked = picked.has(c.id)
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onToggle(c.id)}
                    className={`w-full text-left rounded-xl overflow-hidden border transition ${
                      isPicked
                        ? 'border-turf-700 dark:border-turf-300 ring-2 ring-turf-700/30 dark:ring-turf-300/30'
                        : 'border-stone-200 dark:border-stone-50/10 hover:border-stone-400 dark:hover:border-stone-50/25'
                    }`}
                  >
                    <div className="aspect-[4/3] bg-stone-200 dark:bg-stone-50/5 relative">
                      <img src={c.image_path} alt="" className="absolute inset-0 w-full h-full object-cover" />
                      {isPicked && (
                        <div className="absolute top-1.5 left-1.5 grid place-items-center w-6 h-6 rounded-full bg-turf-700 text-white shadow">
                          <CheckCircle size={14} weight="bold" />
                        </div>
                      )}
                    </div>
                    <div className="px-2 py-1.5 bg-white dark:bg-zinc-900">
                      <div className="text-[0.7rem] font-medium text-zinc-950 dark:text-stone-50 truncate">{c.title}</div>
                      <div className="text-[0.6rem] font-mono uppercase tracking-wider text-zinc-500 dark:text-stone-500 truncate">
                        {c.player?.name ?? '-'}
                      </div>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
