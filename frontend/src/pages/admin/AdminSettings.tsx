import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { motion } from 'framer-motion'
import {
  CheckCircle,
  FacebookLogo,
  InstagramLogo,
  LinkedinLogo,
  TiktokLogo,
  XLogo,
  YoutubeLogo,
} from '@phosphor-icons/react'
import type { Icon as PhosphorIcon } from '@phosphor-icons/react'
import { api, ApiError } from '../../api/client'
import { invalidateAppSettings } from '../../lib/useAppSettings'
import type { AdminSettings } from '../../types/settings'
import Skeleton from '../../components/Skeleton'

interface AdminSettingsResponse { data: AdminSettings }

const EMPTY: AdminSettings = {
  instagram_url: '',
  facebook_url:  '',
  linkedin_url:  '',
  youtube_url:   '',
  tiktok_url:    '',
  x_url:         '',
}

const FIELDS: Array<{
  key: keyof AdminSettings
  label: string
  Icon: PhosphorIcon
  placeholder: string
}> = [
  { key: 'instagram_url', label: 'Instagram', Icon: InstagramLogo, placeholder: 'https://instagram.com/renefootball' },
  { key: 'facebook_url',  label: 'Facebook',  Icon: FacebookLogo,  placeholder: 'https://facebook.com/renefootball' },
  { key: 'linkedin_url',  label: 'LinkedIn',  Icon: LinkedinLogo,  placeholder: 'https://linkedin.com/company/rene-football' },
  { key: 'youtube_url',   label: 'YouTube',   Icon: YoutubeLogo,   placeholder: 'https://youtube.com/@renefootball' },
  { key: 'tiktok_url',    label: 'TikTok',    Icon: TiktokLogo,    placeholder: 'https://tiktok.com/@renefootball' },
  { key: 'x_url',         label: 'X (Twitter)', Icon: XLogo,       placeholder: 'https://x.com/renefootball' },
]

const INPUT_BASE =
  'w-full rounded-lg border border-stone-300 bg-white text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 dark:border-stone-50/15 dark:bg-zinc-900 dark:text-stone-50 dark:placeholder:text-stone-500 dark:focus:border-turf-300 px-3 py-2 text-sm focus:outline-none transition'

export default function AdminSettings() {
  const [form, setForm] = useState<AdminSettings>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof AdminSettings, string>>>({})
  const [savedAt, setSavedAt] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    api.get<AdminSettingsResponse>('/admin/settings', { auth: true })
      .then((res) => {
        if (cancelled) return
        setForm({
          instagram_url: res.data.instagram_url ?? '',
          facebook_url:  res.data.facebook_url  ?? '',
          linkedin_url:  res.data.linkedin_url  ?? '',
          youtube_url:   res.data.youtube_url   ?? '',
          tiktok_url:    res.data.tiktok_url    ?? '',
          x_url:         res.data.x_url         ?? '',
        })
      })
      .catch(() => { /* non-fatal — the singleton lazy-creates on save */ })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setErrors({})
    try {
      const res = await api.put<AdminSettingsResponse>('/admin/settings', form, { auth: true })
      setForm({
        instagram_url: res.data.instagram_url ?? '',
        facebook_url:  res.data.facebook_url  ?? '',
        linkedin_url:  res.data.linkedin_url  ?? '',
        youtube_url:   res.data.youtube_url   ?? '',
        tiktok_url:    res.data.tiktok_url    ?? '',
        x_url:         res.data.x_url         ?? '',
      })
      // Clear the public cache so the footer / contact page refetch on next mount.
      invalidateAppSettings()
      setSavedAt(Date.now())
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 422) {
        const flat: Partial<Record<keyof AdminSettings, string>> = {}
        const data = err.data as { errors?: Record<string, unknown> } | null | undefined
        Object.entries(data?.errors ?? {}).forEach(([k, v]) => {
          flat[k as keyof AdminSettings] = Array.isArray(v) ? String(v[0]) : String(v)
        })
        setErrors(flat)
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="px-6 lg:px-10 py-8 max-w-3xl w-full mx-auto space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <div className="space-y-3 mt-8">
          {[0,1,2,3,4,5].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-stone-50 dark:bg-zinc-950 min-h-[100dvh]">
      <div className="px-6 lg:px-10 py-8 max-w-3xl w-full mx-auto">
        <div className="mb-8">
          <div className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-turf-700 dark:text-turf-300 mb-1">
            Réglages
          </div>
          <h1 className="font-display font-semibold text-2xl lg:text-3xl text-zinc-950 dark:text-stone-50 tracking-tight">
            Réseaux sociaux
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-stone-400 max-w-[62ch] leading-relaxed">
            Collez l'URL complète (https://…) de chaque réseau. Un champ vide
            masque l'icône sur le footer et sur la page Contact — rien n'est
            affiché aux visiteurs tant qu'aucun lien n'est saisi.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {FIELDS.map(({ key, label, Icon, placeholder }) => (
            <label key={key} className="block">
              <span className="mb-1.5 flex items-center gap-2 text-[0.7rem] font-mono uppercase tracking-[0.16em] text-zinc-500 dark:text-stone-400">
                <Icon size={13} weight="regular" />
                {label}
              </span>
              <input
                type="url"
                value={form[key] ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                className={INPUT_BASE}
                maxLength={500}
              />
              {errors[key] && (
                <span className="mt-1 block text-[0.7rem] text-rose-600 dark:text-rose-400">{errors[key]}</span>
              )}
            </label>
          ))}

          <div className="pt-4 flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary text-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            {savedAt && !saving && (
              <motion.span
                key={savedAt}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                className="inline-flex items-center gap-1.5 text-xs text-turf-700 dark:text-turf-300"
              >
                <CheckCircle size={14} weight="bold" /> Enregistré. Actualisez le site pour voir.
              </motion.span>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
