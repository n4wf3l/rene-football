import { useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, Image as ImageIcon, Plus, Trash, X as XIcon } from '@phosphor-icons/react'
import { api, ApiError } from '../../api/client'
import { invalidatePartnersCache } from '../../lib/usePublicPartners'
import type { Partner } from '../../types/partner'
import Skeleton from '../../components/Skeleton'

interface ListResponse { data: Partner[] }
interface OneResponse  { data: Partner }

interface FormState {
  name: string
  role: string
  website_url: string
  country_code: string
  country_label: string
  is_published: boolean
}

const EMPTY_FORM: FormState = {
  name: '',
  role: '',
  website_url: '',
  country_code: '',
  country_label: '',
  is_published: true,
}

const INPUT =
  'w-full rounded-lg border border-stone-300 bg-white text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 dark:border-stone-50/15 dark:bg-zinc-900 dark:text-stone-50 dark:placeholder:text-stone-500 dark:focus:border-turf-300 px-3 py-2 text-sm focus:outline-none transition'

export default function AdminPartners() {
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)
  const [editingSlug, setEditingSlug] = useState<string | null>(null) // null = list, 'new' = create form, other = edit
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; message: string } | null>(null)

  const refresh = async () => {
    setLoading(true)
    try {
      const res = await api.get<ListResponse>('/admin/partners', { auth: true })
      setPartners(res.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void refresh() }, [])

  const showToast = (kind: 'success' | 'error', message: string) => {
    setToast({ kind, message })
    setTimeout(() => setToast(null), 3500)
  }

  const openNew = () => {
    setForm(EMPTY_FORM)
    setLogoFile(null)
    setErrors({})
    setEditingSlug('new')
  }

  const openEdit = (p: Partner) => {
    setForm({
      name: p.name,
      role: p.role ?? '',
      website_url: p.website_url ?? '',
      country_code: p.country_code ?? '',
      country_label: p.country_label ?? '',
      is_published: p.is_published ?? true,
    })
    setLogoFile(null)
    setErrors({})
    setEditingSlug(p.slug)
  }

  const cancelEdit = () => {
    setEditingSlug(null)
    setForm(EMPTY_FORM)
    setLogoFile(null)
    setErrors({})
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setErrors({ name: 'Le nom est requis.' }); return }
    setSaving(true)
    setErrors({})
    try {
      const fd = new FormData()
      fd.append('name', form.name)
      if (form.role) fd.append('role', form.role)
      if (form.website_url) fd.append('website_url', form.website_url)
      if (form.country_code) fd.append('country_code', form.country_code)
      if (form.country_label) fd.append('country_label', form.country_label)
      fd.append('is_published', form.is_published ? '1' : '0')
      if (logoFile) fd.append('logo', logoFile)

      let res: OneResponse
      if (editingSlug === 'new') {
        res = await api.post<OneResponse>('/admin/partners', fd, { auth: true })
      } else {
        res = await api.post<OneResponse>(`/admin/partners/${editingSlug}`, fd, { auth: true })
      }
      invalidatePartnersCache()
      showToast('success', editingSlug === 'new' ? 'Partenaire créé.' : 'Partenaire mis à jour.')
      cancelEdit()
      await refresh()
      // Give the toast time to render + then re-highlight the row
      void res
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
        showToast('error', err instanceof Error ? err.message : "Erreur d'enregistrement.")
      }
    } finally {
      setSaving(false)
    }
  }

  const removePartner = async (p: Partner) => {
    if (!confirm(`Supprimer « ${p.name} » ?`)) return
    try {
      await api.delete(`/admin/partners/${p.slug}`, { auth: true })
      invalidatePartnersCache()
      showToast('success', 'Partenaire supprimé.')
      await refresh()
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Suppression impossible.')
    }
  }

  const removeLogo = async (p: Partner) => {
    if (!p.logo_url) return
    if (!confirm(`Retirer le logo de « ${p.name} » ?`)) return
    try {
      const fd = new FormData()
      fd.append('logo_remove', '1')
      await api.post<OneResponse>(`/admin/partners/${p.slug}`, fd, { auth: true })
      invalidatePartnersCache()
      await refresh()
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Suppression du logo impossible.')
    }
  }

  return (
    <div className="bg-stone-50 dark:bg-zinc-950 min-h-[100dvh]">
      <div className="px-6 lg:px-10 py-8 max-w-5xl w-full mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <div className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-turf-700 dark:text-turf-300 mb-1">
              Partenaires
            </div>
            <h1 className="font-display font-semibold text-2xl lg:text-3xl text-zinc-950 dark:text-stone-50 tracking-tight">
              Réseaux et partenaires
            </h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-stone-400 max-w-[62ch] leading-relaxed">
              Logos affichés en bas de la page « À propos ». Un partenaire non
              publié est masqué du site. Le logo est optionnel : à défaut le
              nom s'affiche seul.
            </p>
          </div>
          {editingSlug === null && (
            <button
              type="button"
              onClick={openNew}
              className="btn btn-primary text-sm inline-flex items-center gap-1.5"
            >
              <Plus size={14} weight="bold" />
              Nouveau partenaire
            </button>
          )}
        </div>

        {/* Form (create or edit) */}
        {editingSlug !== null && (
          <form onSubmit={submit} className="mb-8 rounded-2xl border border-stone-200/80 dark:border-stone-50/10 bg-white dark:bg-zinc-900/40 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-semibold text-lg text-zinc-950 dark:text-stone-50">
                {editingSlug === 'new' ? 'Nouveau partenaire' : `Modifier « ${form.name} »`}
              </h2>
              <button type="button" onClick={cancelEdit} aria-label="Annuler" className="grid place-items-center w-8 h-8 rounded-full text-zinc-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-50/10 transition">
                <XIcon size={16} weight="bold" />
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="block text-[0.65rem] font-mono uppercase tracking-[0.16em] text-zinc-500 dark:text-stone-400 mb-1">Nom *</span>
                <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={INPUT} required maxLength={160} />
                {errors.name && <span className="mt-1 block text-[0.7rem] text-rose-600 dark:text-rose-400">{errors.name}</span>}
              </label>
              <label className="block">
                <span className="block text-[0.65rem] font-mono uppercase tracking-[0.16em] text-zinc-500 dark:text-stone-400 mb-1">Rôle / tagline</span>
                <input type="text" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} placeholder="Partenaire stratégique UK" className={INPUT} maxLength={200} />
              </label>
              <label className="block sm:col-span-2">
                <span className="block text-[0.65rem] font-mono uppercase tracking-[0.16em] text-zinc-500 dark:text-stone-400 mb-1">Site web (optionnel)</span>
                <input type="url" value={form.website_url} onChange={(e) => setForm((f) => ({ ...f, website_url: e.target.value }))} placeholder="https://wnrssport.com" className={INPUT} maxLength={500} />
                {errors.website_url && <span className="mt-1 block text-[0.7rem] text-rose-600 dark:text-rose-400">{errors.website_url}</span>}
              </label>
              <label className="block">
                <span className="block text-[0.65rem] font-mono uppercase tracking-[0.16em] text-zinc-500 dark:text-stone-400 mb-1">Code pays (2 lettres)</span>
                <input type="text" value={form.country_code} onChange={(e) => setForm((f) => ({ ...f, country_code: e.target.value.toLowerCase() }))} placeholder="gb" className={INPUT} maxLength={4} />
              </label>
              <label className="block">
                <span className="block text-[0.65rem] font-mono uppercase tracking-[0.16em] text-zinc-500 dark:text-stone-400 mb-1">Pays (libellé)</span>
                <input type="text" value={form.country_label} onChange={(e) => setForm((f) => ({ ...f, country_label: e.target.value }))} placeholder="United Kingdom" className={INPUT} maxLength={80} />
              </label>
            </div>

            <label className="block">
              <span className="block text-[0.65rem] font-mono uppercase tracking-[0.16em] text-zinc-500 dark:text-stone-400 mb-1">Logo (PNG/JPG/WebP/SVG, 4 Mo max)</span>
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border border-stone-300 dark:border-stone-50/15 bg-white dark:bg-zinc-900/40 hover:bg-stone-100 dark:hover:bg-stone-50/5 cursor-pointer transition">
                  <ImageIcon size={13} weight="bold" />
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/svg+xml"
                    className="hidden"
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setLogoFile(e.target.files?.[0] ?? null)}
                  />
                  {logoFile ? `Choisi (${logoFile.name.slice(0, 28)})` : 'Choisir un fichier'}
                </label>
                {logoFile && (
                  <button type="button" onClick={() => setLogoFile(null)} className="text-[0.7rem] text-zinc-500 hover:text-rose-700 dark:text-stone-400 dark:hover:text-rose-400 transition">
                    Annuler
                  </button>
                )}
              </div>
            </label>

            <label className="inline-flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" checked={form.is_published} onChange={(e) => setForm((f) => ({ ...f, is_published: e.target.checked }))} className="h-4 w-4 rounded border-stone-300 text-turf-700 focus:ring-turf-500" />
              <span className="text-zinc-700 dark:text-stone-300">Publier (visible sur le site)</span>
            </label>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button type="button" onClick={cancelEdit} className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-50/10 transition">
                Annuler
              </button>
              <button type="submit" disabled={saving} className="btn btn-primary text-sm disabled:opacity-60">
                {saving ? 'Enregistrement…' : (editingSlug === 'new' ? 'Créer' : 'Enregistrer')}
              </button>
            </div>
          </form>
        )}

        {/* List */}
        {loading && partners.length === 0 ? (
          <div className="space-y-3">
            {[0,1,2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : partners.length === 0 ? (
          <div className="text-center py-16 text-sm text-zinc-500 dark:text-stone-400">
            Aucun partenaire pour l'instant. Cliquez « Nouveau partenaire » pour en ajouter.
          </div>
        ) : (
          <ul className="rounded-2xl border border-stone-200/80 dark:border-stone-50/10 bg-white dark:bg-zinc-900/40 divide-y divide-stone-200/80 dark:divide-stone-50/10 overflow-hidden">
            {partners.map((p) => (
              <li key={p.slug} className="flex items-center gap-4 px-4 py-3">
                <div className="w-14 h-14 shrink-0 rounded-lg overflow-hidden bg-stone-100 dark:bg-stone-50/5 grid place-items-center border border-stone-200/60 dark:border-stone-50/10">
                  {p.logo_url ? (
                    <img src={p.logo_url} alt={p.name} className="max-w-full max-h-full object-contain p-1.5" />
                  ) : (
                    <ImageIcon size={18} weight="regular" className="text-zinc-400 dark:text-stone-500" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-zinc-950 dark:text-stone-50 truncate">{p.name}</span>
                    {!p.is_published && (
                      <span className="text-[0.6rem] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
                        Brouillon
                      </span>
                    )}
                  </div>
                  <div className="text-[0.7rem] text-zinc-500 dark:text-stone-400 truncate">
                    {p.role ?? '—'}{p.country_label ? ` · ${p.country_label}` : ''}
                    {p.website_url ? ` · ${p.website_url}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {p.logo_url && (
                    <button type="button" onClick={() => removeLogo(p)} title="Retirer le logo" className="grid place-items-center w-8 h-8 rounded-md text-zinc-500 hover:bg-stone-100 hover:text-zinc-900 dark:text-stone-400 dark:hover:bg-stone-50/10 dark:hover:text-stone-50 transition">
                      <ImageIcon size={14} weight="regular" />
                    </button>
                  )}
                  <button type="button" onClick={() => openEdit(p)} className="px-3 py-1.5 rounded-md text-xs font-medium border border-stone-300 dark:border-stone-50/15 bg-white dark:bg-zinc-900/60 hover:bg-stone-100 dark:hover:bg-stone-50/5 transition">
                    Éditer
                  </button>
                  <button type="button" onClick={() => removePartner(p)} title="Supprimer" className="grid place-items-center w-8 h-8 rounded-md text-rose-700 hover:bg-rose-100 dark:text-rose-400 dark:hover:bg-rose-500/15 transition">
                    <Trash size={14} weight="regular" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-diffusion text-sm ${
            toast.kind === 'success' ? 'bg-turf-800 text-stone-50' : 'bg-red-600 text-white'
          }`}
        >
          <CheckCircle size={16} weight="bold" />
          <span>{toast.message}</span>
        </motion.div>
      )}
    </div>
  )
}
