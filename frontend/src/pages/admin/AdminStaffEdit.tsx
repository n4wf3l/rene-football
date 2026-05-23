import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle, Person, Trash, X as XIcon } from '@phosphor-icons/react'
import { api, ApiError } from '../../api/client'
import type { StaffMember } from '../../types/staff'
import Skeleton from '../../components/Skeleton'

type StaffFormState = Partial<StaffMember>

const EMPTY_STAFF: StaffFormState = {
  name: '',
  role: '',
  bio: '',
  photo_url: null,
  is_published: true,
}

interface StaffResponse { data: StaffMember }

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

export default function AdminStaffEdit({ creating = false }: { creating?: boolean }) {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()

  const [form, setForm] = useState<StaffFormState | null>(creating ? EMPTY_STAFF : null)
  const [loading, setLoading] = useState(!creating)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [toast, setToast] = useState<ToastState | null>(null)

  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoRemove, setPhotoRemove] = useState(false)

  useEffect(() => {
    if (creating) { setForm(EMPTY_STAFF); setLoading(false); return }
    if (!slug) return
    let cancelled = false
    setLoading(true)
    api.get<StaffResponse>(`/admin/staff/${slug}`, { auth: true })
      .then((res) => { if (!cancelled) setForm(res.data) })
      .catch((err: unknown) => {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 404) setErrors({ _global: 'Membre introuvable.' })
        else setErrors({ _global: 'Erreur de chargement.' })
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [slug, creating])

  useEffect(() => {
    if (!photoFile) { setPhotoPreview(null); return }
    const url = URL.createObjectURL(photoFile)
    setPhotoPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [photoFile])

  const set = <K extends keyof StaffFormState>(key: K, value: StaffFormState[K]) =>
    setForm((f) => (f ? ({ ...f, [key]: value } as StaffFormState) : f))

  const showToast = (kind: ToastState['kind'], message: string) => {
    setToast({ kind, message })
    setTimeout(() => setToast(null), 3500)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form) return
    setSaving(true)
    setErrors({})
    try {
      const useMultipart = Boolean(photoFile) || photoRemove
      let res: StaffResponse

      if (useMultipart) {
        const fd = new FormData()
        if (!creating) fd.append('_method', 'PUT')
        fd.append('name', form.name ?? '')
        fd.append('role', form.role ?? '')
        if (form.bio) fd.append('bio', form.bio)
        fd.append('is_published', form.is_published ? '1' : '0')
        if (photoFile) fd.append('photo', photoFile)
        if (photoRemove) fd.append('photo_remove', '1')

        res = creating
          ? await api.post<StaffResponse>('/admin/staff', fd, { auth: true })
          : await api.post<StaffResponse>(`/admin/staff/${form.slug}`, fd, { auth: true })
      } else {
        const payload = {
          name: form.name,
          role: form.role,
          bio: form.bio,
          is_published: form.is_published,
        }
        res = creating
          ? await api.post<StaffResponse>('/admin/staff', payload, { auth: true })
          : await api.put<StaffResponse>(`/admin/staff/${form.slug}`, payload, { auth: true })
      }

      navigate('/admin/equipe', {
        state: { toast: creating ? `« ${res.data.name} » créé.` : `« ${res.data.name} » mis à jour.` },
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

  const onDelete = async () => {
    if (!form?.slug) return
    if (!confirm(`Supprimer définitivement « ${form.name} » ?`)) return
    try {
      await api.delete(`/admin/staff/${form.slug}`, { auth: true })
      navigate('/admin/equipe', { state: { toast: 'Membre supprimé.' } })
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Suppression impossible.')
    }
  }

  if (loading) {
    return (
      <div className="px-6 lg:px-10 py-8 max-w-3xl w-full mx-auto space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <div className="grid grid-cols-2 gap-3 mt-8">
          {[0,1,2,3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      </div>
    )
  }

  if (!form || errors._global === 'Membre introuvable.') {
    return (
      <div className="px-6 lg:px-10 py-12 max-w-3xl w-full mx-auto text-center">
        <h1 className="font-display font-semibold text-3xl text-zinc-950 dark:text-stone-50">
          {errors._global ?? 'Membre introuvable'}
        </h1>
        <button type="button" onClick={() => navigate('/admin/equipe')} className="btn btn-primary text-sm mt-6">
          Retour à la liste
        </button>
      </div>
    )
  }

  return (
    <div className="bg-stone-50 dark:bg-zinc-950 min-h-[100dvh] flex flex-col">
      <div className="sticky top-0 z-10 flex items-center justify-between px-6 h-16 border-b border-stone-200 bg-white dark:bg-zinc-900 dark:border-stone-50/8">
        <div className="min-w-0">
          <div className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-turf-700 dark:text-turf-300">
            {creating ? 'Nouveau membre' : 'Édition'}
          </div>
          <div className="font-display font-semibold text-lg text-zinc-950 dark:text-stone-50 truncate">
            {form.name || 'Membre sans nom'}
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
            onClick={() => navigate('/admin/equipe')}
            className="grid place-items-center w-9 h-9 rounded-full text-zinc-500 hover:bg-stone-100 hover:text-zinc-900 dark:text-stone-400 dark:hover:bg-stone-50/8 dark:hover:text-stone-50 transition"
            aria-label="Retour à la liste"
          >
            <XIcon size={18} weight="bold" />
          </button>
        </div>
      </div>

      <form onSubmit={submit} className="flex-1 overflow-y-auto px-6 lg:px-10 py-8 max-w-3xl w-full mx-auto space-y-8">
        {errors._global && (
          <div className="px-4 py-3 rounded-xl bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300 text-sm">
            {errors._global}
          </div>
        )}

        {/* Identité */}
        <section className="space-y-4">
          <h3 className="font-mono uppercase tracking-[0.18em] text-[0.7rem] text-zinc-500 dark:text-stone-400">Identité</h3>

          <label className="block">
            <span className="block text-[0.65rem] font-mono uppercase tracking-[0.16em] text-zinc-500 dark:text-stone-400 mb-1">Nom complet</span>
            <input
              type="text"
              value={form.name ?? ''}
              onChange={(e) => set('name', e.target.value)}
              required
              maxLength={160}
              className={INPUT_BASE}
            />
            {errors.name && <span className="mt-1 block text-[0.7rem] text-rose-600 dark:text-rose-400">{errors.name}</span>}
          </label>

          <label className="block">
            <span className="block text-[0.65rem] font-mono uppercase tracking-[0.16em] text-zinc-500 dark:text-stone-400 mb-1">
              Rôle <span className="text-zinc-400 dark:text-stone-500 normal-case font-sans tracking-normal">- ex. Fondatrice · Agent FIFA</span>
            </span>
            <input
              type="text"
              value={form.role ?? ''}
              onChange={(e) => set('role', e.target.value)}
              required
              maxLength={200}
              className={INPUT_BASE}
            />
            {errors.role && <span className="mt-1 block text-[0.7rem] text-rose-600 dark:text-rose-400">{errors.role}</span>}
          </label>

          <label className="block">
            <span className="block text-[0.65rem] font-mono uppercase tracking-[0.16em] text-zinc-500 dark:text-stone-400 mb-1">Bio courte</span>
            <textarea
              rows={4}
              value={form.bio ?? ''}
              onChange={(e) => set('bio', e.target.value)}
              maxLength={2000}
              className={INPUT_BASE}
              placeholder="Une phrase ou deux qui expliquent ce qu'apporte la personne."
            />
            {errors.bio && <span className="mt-1 block text-[0.7rem] text-rose-600 dark:text-rose-400">{errors.bio}</span>}
          </label>
        </section>

        {/* Photo */}
        <section className="space-y-4">
          <h3 className="font-mono uppercase tracking-[0.18em] text-[0.7rem] text-zinc-500 dark:text-stone-400">Photo</h3>
          <div className="flex items-start gap-4">
            <div className="shrink-0 relative w-24 h-24 rounded-full overflow-hidden bg-stone-200 dark:bg-stone-50/5 border border-stone-300 dark:border-stone-50/10">
              {photoPreview ? (
                <img src={photoPreview} alt="" className="absolute inset-0 w-full h-full object-cover" />
              ) : photoRemove ? (
                <div className="absolute inset-0 grid place-items-center text-[0.65rem] text-zinc-500 dark:text-stone-500 text-center px-2">(à retirer)</div>
              ) : form.photo_url ? (
                <img src={form.photo_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 grid place-items-center text-zinc-400 dark:text-stone-500">
                  <Person size={28} weight="regular" />
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
              <p className="text-[0.65rem] text-zinc-500 dark:text-stone-500">JPG, PNG ou WebP - 4&nbsp;Mo max.</p>
            </div>
          </div>
        </section>

        {/* Publication */}
        <section className="space-y-3">
          <h3 className="font-mono uppercase tracking-[0.18em] text-[0.7rem] text-zinc-500 dark:text-stone-400">Publication</h3>
          <label className="inline-flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={Boolean(form.is_published)}
              onChange={(e) => set('is_published', e.target.checked)}
              className="h-4 w-4 rounded border-stone-300 text-turf-700 focus:ring-turf-500"
            />
            <span className="text-zinc-700 dark:text-stone-300">Afficher ce membre sur la page « À propos »</span>
          </label>
        </section>

        {/* Save bar */}
        <div className="sticky bottom-0 -mx-6 lg:-mx-10 px-6 lg:px-10 py-4 bg-stone-50/95 dark:bg-zinc-950/95 backdrop-blur border-t border-stone-200 dark:border-stone-50/8 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => navigate('/admin/equipe')}
            className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-50/8 transition"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving}
            className="btn btn-primary text-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? 'Enregistrement…' : (creating ? 'Créer le membre' : 'Enregistrer')}
          </button>
        </div>
      </form>

      {toast && <Toast {...toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}
