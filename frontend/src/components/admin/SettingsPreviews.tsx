import type { ReactNode } from 'react'
import {
  EnvelopeSimple,
  FacebookLogo,
  InstagramLogo,
  LinkedinLogo,
  MapPin,
  Phone,
  TiktokLogo,
  XLogo,
  YoutubeLogo,
} from '@phosphor-icons/react'
import type { Icon as PhosphorIcon } from '@phosphor-icons/react'
import type { AdminSettings } from '../../types/settings'

/**
 * Live previews shown beside the Réglages forms: what the visitor will see,
 * updated as the admin types (before saving).
 */

function filled(v: string | null | undefined): v is string {
  return typeof v === 'string' && v.trim() !== ''
}

export function PreviewPanel({ title, where, children }: { title: string; where: string; children: ReactNode }) {
  return (
    <div className="flex h-full min-h-0 flex-col rounded-2xl border border-stone-200 bg-white dark:border-stone-50/10 dark:bg-zinc-900/60">
      <div className="border-b border-stone-200 px-4 py-3 dark:border-stone-50/10">
        <div className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-zinc-500 dark:text-stone-400">Aperçu en direct</div>
        <div className="font-display text-sm font-semibold text-zinc-950 dark:text-stone-50">{title}</div>
        <div className="mt-0.5 text-[0.7rem] text-zinc-500 dark:text-stone-400">Visible sur : {where}</div>
      </div>
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto rounded-b-2xl bg-[radial-gradient(circle_at_1px_1px,rgba(120,113,108,0.18)_1px,transparent_0)] bg-[length:18px_18px] p-5 lg:p-8">
        {children}
      </div>
    </div>
  )
}

const SOCIALS: Array<{ key: keyof AdminSettings; label: string; Icon: PhosphorIcon }> = [
  { key: 'instagram_url', label: 'Instagram', Icon: InstagramLogo },
  { key: 'facebook_url', label: 'Facebook', Icon: FacebookLogo },
  { key: 'linkedin_url', label: 'LinkedIn', Icon: LinkedinLogo },
  { key: 'youtube_url', label: 'YouTube', Icon: YoutubeLogo },
  { key: 'tiktok_url', label: 'TikTok', Icon: TiktokLogo },
  { key: 'x_url', label: 'X', Icon: XLogo },
]

/** Mini footer: brand, the social icons that will show, contact lines. */
function FooterMock({ form }: { form: AdminSettings }) {
  const shown = SOCIALS.filter((s) => filled(form[s.key]))
  const contact = [
    { Icon: EnvelopeSimple, value: form.contact_email },
    { Icon: Phone, value: form.contact_phone },
    { Icon: MapPin, value: form.office_city },
  ].filter((c) => filled(c.value))
  return (
    <div className="overflow-hidden rounded-xl bg-zinc-950 p-6 text-stone-300 shadow-xl">
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <div className="font-display text-lg font-semibold text-stone-50">Rene <span className="text-turf-300">Football</span></div>
          <p className="mt-2 max-w-[32ch] text-xs leading-relaxed text-stone-400">Agence de football au Luxembourg. Représentation, transferts, scouting.</p>
          {shown.length > 0 ? (
            <ul className="mt-4 flex flex-wrap gap-2">
              {shown.map(({ key, Icon, label }) => (
                <li key={key} className="grid h-9 w-9 place-items-center rounded-full border border-stone-50/15 text-stone-100" title={label}>
                  <Icon size={16} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-[0.7rem] italic text-stone-500">Aucun réseau : la ligne d’icônes est masquée.</p>
          )}
        </div>
        <div>
          <div className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-stone-500">Contact</div>
          {contact.length > 0 ? (
            <ul className="mt-3 space-y-2 text-xs">
              {contact.map(({ Icon, value }, i) => (
                <li key={i} className="flex items-center gap-2 text-stone-200"><Icon size={14} className="shrink-0 text-turf-300" /><span className="truncate">{value}</span></li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-[0.7rem] italic text-stone-500">Aucune coordonnée renseignée.</p>
          )}
        </div>
      </div>
      <div className="mt-6 border-t border-stone-50/10 pt-3 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-stone-500">© {new Date().getFullYear()} Rene Football</div>
    </div>
  )
}

export function SocialPreview({ form }: { form: AdminSettings }) {
  return (
    <PreviewPanel title="Pied de page" where="toutes les pages (pied de page) et la page Contact">
      <FooterMock form={form} />
      <ul className="grid gap-2 sm:grid-cols-2">
        {SOCIALS.map(({ key, label, Icon }) => {
          const on = filled(form[key])
          return (
            <li key={key} className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-3 py-2.5 dark:border-stone-50/10 dark:bg-zinc-900">
              <Icon size={18} className={on ? 'text-zinc-950 dark:text-stone-50' : 'text-zinc-300 dark:text-stone-600'} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-zinc-900 dark:text-stone-100">{label}</span>
                <span className="block truncate text-[0.7rem] text-zinc-500 dark:text-stone-400">{on ? form[key] : 'Vide : icône masquée'}</span>
              </span>
              <span className={`rounded-full px-2 py-0.5 font-mono text-[0.58rem] uppercase tracking-wider ${on ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-stone-100 text-zinc-500 dark:bg-stone-50/5 dark:text-stone-400'}`}>
                {on ? 'Affiché' : 'Masqué'}
              </span>
            </li>
          )
        })}
      </ul>
    </PreviewPanel>
  )
}

export function LegalPreview({ form }: { form: AdminSettings }) {
  const rows: Array<[string, string | null]> = [
    ['Forme juridique', form.legal_form],
    ['RCS Luxembourg', form.rcs_number],
    ['TVA intracommunautaire', form.vat_number],
    ['Siège social', form.registered_office_address],
    ['Directeur de la publication', form.publication_director],
  ]
  const missing = rows.filter(([, v]) => !filled(v)).length
  return (
    <PreviewPanel title="Mentions légales" where="la page /mentions-legales (lien en pied de page)">
      <article className="mx-auto w-full max-w-2xl rounded-xl bg-white p-8 text-zinc-800 shadow-xl ring-1 ring-stone-200 dark:bg-zinc-950 dark:text-stone-200 dark:ring-stone-50/10">
        <div className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-turf-700 dark:text-turf-300">Informations légales</div>
        <h3 className="mt-2 font-display text-3xl font-semibold tracking-tight text-zinc-950 dark:text-stone-50">Mentions légales</h3>
        <h4 className="mt-6 font-display text-lg font-semibold text-zinc-950 dark:text-stone-50">1. Éditeur du site</h4>
        <p className="mt-2 text-sm">Le site renefootball.com est édité par <strong>Rene Football</strong>.</p>
        <dl className="mt-4 divide-y divide-stone-200 text-sm dark:divide-stone-50/10">
          {rows.map(([label, value]) => (
            <div key={label} className="grid grid-cols-[minmax(0,12rem)_1fr] gap-4 py-2.5">
              <dt className="text-zinc-500 dark:text-stone-400">{label}</dt>
              <dd className={filled(value) ? 'font-medium text-zinc-950 dark:text-stone-50' : 'italic text-amber-700 dark:text-amber-300'}>
                {filled(value) ? value : 'En cours d’enregistrement'}
              </dd>
            </div>
          ))}
        </dl>
      </article>
      <p className={`text-center text-xs ${missing ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
        {missing ? `${missing} information${missing > 1 ? 's' : ''} encore affichée${missing > 1 ? 's' : ''} « En cours d’enregistrement ».` : 'Toutes les informations légales sont renseignées.'}
      </p>
    </PreviewPanel>
  )
}

export function ContactPreview({ form }: { form: AdminSettings }) {
  const lines: Array<{ Icon: PhosphorIcon; label: string; value: string | null }> = [
    { Icon: EnvelopeSimple, label: 'Email', value: form.contact_email },
    { Icon: Phone, label: 'Téléphone', value: form.contact_phone },
    { Icon: MapPin, label: 'Bureau', value: form.office_city },
  ]
  return (
    <PreviewPanel title="Coordonnées" where="la page Contact, le pied de page et les mentions légales">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <div className="rounded-xl bg-white p-6 shadow-xl ring-1 ring-stone-200 dark:bg-zinc-950 dark:ring-stone-50/10">
          <div className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-turf-700 dark:text-turf-300">Page Contact</div>
          <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight text-zinc-950 dark:text-stone-50">Nous contacter</h3>
          <ul className="mt-5 space-y-3">
            {lines.map(({ Icon, label, value }) => (
              <li key={label} className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-turf-50 text-turf-800 dark:bg-turf-900/30 dark:text-turf-200"><Icon size={16} /></span>
                <span className="min-w-0">
                  <span className="block font-mono text-[0.6rem] uppercase tracking-wider text-zinc-500 dark:text-stone-400">{label}</span>
                  <span className={`block truncate text-sm ${filled(value) ? 'font-medium text-zinc-950 dark:text-stone-50' : 'italic text-zinc-400 dark:text-stone-500'}`}>
                    {filled(value) ? value : 'Non renseigné'}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <FooterMock form={form} />
      </div>
    </PreviewPanel>
  )
}
