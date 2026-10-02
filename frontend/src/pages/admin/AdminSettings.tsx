import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { motion } from 'framer-motion'
import {
  AddressBook,
  Buildings,
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
import { useToast } from '../../components/ToastProvider'

interface AdminSettingsResponse { data: AdminSettings }

type TabKey = 'social' | 'legal' | 'contact'

const EMPTY: AdminSettings = {
  instagram_url: '',
  facebook_url:  '',
  linkedin_url:  '',
  youtube_url:   '',
  tiktok_url:    '',
  x_url:         '',
  legal_form: '',
  rcs_number: '',
  vat_number: '',
  registered_office_address: '',
  publication_director: '',
  contact_email: '',
  contact_phone: '',
  office_city: '',
}

const SOCIAL_FIELDS: Array<{ key: keyof AdminSettings; label: string; Icon: PhosphorIcon; placeholder: string }> = [
  { key: 'instagram_url', label: 'Instagram',    Icon: InstagramLogo, placeholder: 'https://instagram.com/renefootball' },
  { key: 'facebook_url',  label: 'Facebook',     Icon: FacebookLogo,  placeholder: 'https://facebook.com/renefootball' },
  { key: 'linkedin_url',  label: 'LinkedIn',     Icon: LinkedinLogo,  placeholder: 'https://linkedin.com/company/rene-football' },
  { key: 'youtube_url',   label: 'YouTube',      Icon: YoutubeLogo,   placeholder: 'https://youtube.com/@renefootball' },
  { key: 'tiktok_url',    label: 'TikTok',       Icon: TiktokLogo,    placeholder: 'https://tiktok.com/@renefootball' },
  { key: 'x_url',         label: 'X (Twitter)',  Icon: XLogo,         placeholder: 'https://x.com/renefootball' },
]

const INPUT_BASE =
  'w-full rounded-lg border border-stone-300 bg-white text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 dark:border-stone-50/15 dark:bg-zinc-900 dark:text-stone-50 dark:placeholder:text-stone-500 dark:focus:border-turf-300 px-3 py-2 text-sm focus:outline-none transition'

const TAB_META: Record<TabKey, { label: string; Icon: PhosphorIcon; hint: string }> = {
  social: {
    label: 'Réseaux sociaux',
    Icon: InstagramLogo,
    hint: 'URL affichées dans le footer et sur la page Contact. Vide = icône masquée.',
  },
  legal: {
    label: 'Identité juridique',
    Icon: Buildings,
    hint: 'Mentions légales. Remplir à mesure que l\'enregistrement administratif de l\'agence avance — les champs vides affichent "En cours d\'enregistrement" sur la page publique.',
  },
  contact: {
    label: 'Coordonnées',
    Icon: AddressBook,
    hint: 'Email, téléphone, ville. Propagés automatiquement au footer, à la page Contact et aux mentions légales.',
  },
}

export default function AdminSettings() {
  const toast = useToast()
  const [tab, setTab] = useState<TabKey>('social')
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
        setForm(hydrate(res.data))
      })
      .catch(() => { /* non-fatal — the singleton lazy-creates on save */ })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const set = <K extends keyof AdminSettings>(key: K, value: AdminSettings[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    if (errors[key]) setErrors((e) => ({ ...e, [key]: '' }))
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setErrors({})
    try {
      const res = await api.put<AdminSettingsResponse>('/admin/settings', form, { auth: true })
      setForm(hydrate(res.data))
      invalidateAppSettings()
      setSavedAt(Date.now())
      toast.success('Réglages enregistrés.')
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 422) {
        const flat: Partial<Record<keyof AdminSettings, string>> = {}
        const data = err.data as { errors?: Record<string, unknown> } | null | undefined
        Object.entries(data?.errors ?? {}).forEach(([k, v]) => {
          flat[k as keyof AdminSettings] = Array.isArray(v) ? String(v[0]) : String(v)
        })
        setErrors(flat)
        toast.error('Certains champs sont invalides. Corrigez et réessayez.')
      } else {
        const msg = err instanceof Error ? err.message : 'Enregistrement impossible.'
        toast.error(msg)
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
          {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-stone-50 dark:bg-zinc-950 min-h-[100dvh]">
      <div className="px-6 lg:px-10 py-8 max-w-3xl w-full mx-auto">
        <header className="mb-6">
          <div className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-turf-700 dark:text-turf-300 mb-1">
            Réglages
          </div>
          <h1 className="font-display font-semibold text-2xl lg:text-3xl text-zinc-950 dark:text-stone-50 tracking-tight">
            Configuration de l'agence
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-stone-400 max-w-[62ch] leading-relaxed">
            Centralise tout ce qui doit pouvoir changer sans toucher au code : réseaux sociaux,
            identité juridique affichée dans les mentions légales, coordonnées de contact
            propagées partout sur le site public.
          </p>
        </header>

        {/* Tab bar */}
        <nav className="mb-6 flex flex-wrap gap-1 rounded-xl border border-stone-200 dark:border-stone-50/10 bg-white dark:bg-zinc-900 p-1" role="tablist">
          {(Object.keys(TAB_META) as TabKey[]).map((k) => {
            const active = tab === k
            const { label, Icon } = TAB_META[k]
            return (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(k)}
                className={`relative inline-flex items-center gap-2 flex-1 min-w-[140px] justify-center px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  active
                    ? 'bg-zinc-950 text-stone-50 dark:bg-stone-50 dark:text-zinc-950'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-stone-100 dark:text-stone-400 dark:hover:text-stone-50 dark:hover:bg-stone-50/5'
                }`}
              >
                <Icon size={13} weight="regular" />
                {label}
              </button>
            )
          })}
        </nav>

        {/* Section hint */}
        <p className="mb-5 text-xs text-zinc-500 dark:text-stone-500 leading-relaxed">
          {TAB_META[tab].hint}
        </p>

        <form onSubmit={submit} className="space-y-5">
          {tab === 'social' && (
            <div className="space-y-4">
              {SOCIAL_FIELDS.map(({ key, label, Icon, placeholder }) => (
                <FieldInput
                  key={key}
                  type="url"
                  id={String(key)}
                  label={label}
                  icon={<Icon size={13} weight="regular" />}
                  value={form[key] ?? ''}
                  onChange={(v) => set(key, v)}
                  placeholder={placeholder}
                  error={errors[key]}
                  maxLength={500}
                />
              ))}
            </div>
          )}

          {tab === 'legal' && (
            <div className="space-y-4">
              <FieldInput
                id="legal_form"
                label="Forme juridique"
                value={form.legal_form ?? ''}
                onChange={(v) => set('legal_form', v)}
                placeholder="SARL, SA, SARL-S, indépendant en nom propre…"
                error={errors.legal_form}
                maxLength={120}
              />
              <div className="grid sm:grid-cols-2 gap-4">
                <FieldInput
                  id="rcs_number"
                  label="Numéro RCS Luxembourg"
                  value={form.rcs_number ?? ''}
                  onChange={(v) => set('rcs_number', v)}
                  placeholder="B123456"
                  error={errors.rcs_number}
                  maxLength={60}
                />
                <FieldInput
                  id="vat_number"
                  label="Numéro TVA intracom."
                  value={form.vat_number ?? ''}
                  onChange={(v) => set('vat_number', v)}
                  placeholder="LU12345678"
                  error={errors.vat_number}
                  maxLength={40}
                />
              </div>
              <FieldInput
                id="registered_office_address"
                label="Siège social"
                value={form.registered_office_address ?? ''}
                onChange={(v) => set('registered_office_address', v)}
                placeholder="12 rue de la Gare, L-1611 Luxembourg"
                error={errors.registered_office_address}
                maxLength={500}
              />
              <FieldInput
                id="publication_director"
                label="Directeur de la publication"
                value={form.publication_director ?? ''}
                onChange={(v) => set('publication_director', v)}
                placeholder="Nom complet du responsable légal"
                error={errors.publication_director}
                maxLength={160}
              />
            </div>
          )}

          {tab === 'contact' && (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <FieldInput
                  type="email"
                  id="contact_email"
                  label="Email de contact"
                  value={form.contact_email ?? ''}
                  onChange={(v) => set('contact_email', v)}
                  placeholder="contact@renefootball.com"
                  error={errors.contact_email}
                  maxLength={160}
                />
                <FieldInput
                  type="tel"
                  id="contact_phone"
                  label="Téléphone"
                  value={form.contact_phone ?? ''}
                  onChange={(v) => set('contact_phone', v)}
                  placeholder="+352 691 712 574"
                  error={errors.contact_phone}
                  maxLength={40}
                />
              </div>
              <FieldInput
                id="office_city"
                label="Ville / zone d'activité (affichage public)"
                value={form.office_city ?? ''}
                onChange={(v) => set('office_city', v)}
                placeholder="Luxembourg-Ville, Grand-Duché de Luxembourg"
                error={errors.office_city}
                maxLength={200}
              />
            </div>
          )}

          <div className="pt-4 flex items-center gap-3 flex-wrap">
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
                <CheckCircle size={14} weight="bold" /> Enregistré. Les pages publiques se mettent à jour au prochain chargement.
              </motion.span>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

/** Normalise null/undefined → empty string so controlled inputs are happy. */
function hydrate(data: AdminSettings): AdminSettings {
  const out: AdminSettings = { ...EMPTY }
  for (const key of Object.keys(EMPTY) as Array<keyof AdminSettings>) {
    out[key] = data[key] ?? ''
  }
  return out
}

interface FieldInputProps {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  error?: string
  maxLength?: number
  type?: 'text' | 'url' | 'email' | 'tel'
  icon?: React.ReactNode
}

function FieldInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  error,
  maxLength,
  type = 'text',
  icon,
}: FieldInputProps) {
  return (
    <label htmlFor={id} className="block">
      <span className="mb-1.5 flex items-center gap-2 text-[0.7rem] font-mono uppercase tracking-[0.16em] text-zinc-500 dark:text-stone-400">
        {icon}
        {label}
      </span>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={INPUT_BASE}
        maxLength={maxLength}
      />
      {error && (
        <span className="mt-1 block text-[0.7rem] text-rose-600 dark:text-rose-400">{error}</span>
      )}
    </label>
  )
}
