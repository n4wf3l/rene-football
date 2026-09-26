import type { Icon as PhosphorIcon } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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
import BrandLogo from './BrandLogo'
import { useAuth } from '../auth/AuthContext'
import { useAppSettings } from '../lib/useAppSettings'
import type { SocialPlatform } from '../types/settings'

const NAV_LINKS: { to: string; key: 'nav.home' | 'nav.players' | 'nav.news' | 'nav.about' | 'nav.contact' }[] = [
  { to: '/',           key: 'nav.home' },
  { to: '/joueurs',    key: 'nav.players' },
  { to: '/actualites', key: 'nav.news' },
  { to: '/a-propos',   key: 'nav.about' },
  { to: '/contact',    key: 'nav.contact' },
]

const SERVICE_KEYS = [
  'footer.servicesList.representation',
  'footer.servicesList.contracts',
  'footer.servicesList.scouting',
  'footer.servicesList.career',
] as const

interface ContactEntry {
  Icon: PhosphorIcon
  label: string
  href: string | null
}

const CONTACT: ContactEntry[] = [
  { Icon: EnvelopeSimple, label: 'renefootball.p@gmail.com', href: 'mailto:renefootball.p@gmail.com' },
  { Icon: Phone,          label: '+352 691 712 574',         href: 'tel:+352691712574' },
  { Icon: MapPin,         label: 'Luxembourg-Ville · Luxembourg', href: null },
]

const SOCIAL_META: Array<{ key: SocialPlatform; Icon: PhosphorIcon; label: string }> = [
  { key: 'instagram', Icon: InstagramLogo, label: 'Instagram' },
  { key: 'facebook',  Icon: FacebookLogo,  label: 'Facebook'  },
  { key: 'linkedin',  Icon: LinkedinLogo,  label: 'LinkedIn'  },
  { key: 'youtube',   Icon: YoutubeLogo,   label: 'YouTube'   },
  { key: 'tiktok',    Icon: TiktokLogo,    label: 'TikTok'    },
  { key: 'x',         Icon: XLogo,         label: 'X'         },
]

function Footer() {
  const { t } = useTranslation()
  const year = new Date().getFullYear()
  const { user, isAuthenticated } = useAuth()
  const isAdmin = isAuthenticated && Boolean(user?.is_admin)
  const { settings } = useAppSettings()
  const socials = SOCIAL_META.filter((s) => Boolean(settings.social_links[s.key]))

  return (
    <footer className="bg-stone-100 text-zinc-700 border-t border-stone-200 dark:bg-zinc-950 dark:text-stone-300 dark:border-stone-50/5">
      <div className="container-page py-16 lg:py-20 grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-5">
          <Link to="/" className="inline-flex items-center gap-3 text-zinc-950 dark:text-stone-50">
            <BrandLogo size={36} />
            <span className="font-display font-semibold tracking-tight text-[1.05rem]">
              Rene <span className="text-turf-700 dark:text-turf-300">Football</span>
            </span>
          </Link>
          <p className="mt-5 max-w-[42ch] text-sm text-zinc-600 dark:text-stone-400 leading-relaxed">
            {t('footer.brand')}
          </p>

          {socials.length > 0 && (
            <ul className="mt-6 flex items-center gap-2" aria-label={t('footer.socials')}>
              {socials.map(({ key, Icon, label }) => (
                <li key={key}>
                  <a
                    href={settings.social_links[key]}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    title={label}
                    className="grid place-items-center w-9 h-9 rounded-full border border-stone-300 text-zinc-600 hover:border-turf-700 hover:text-turf-700 dark:border-stone-50/15 dark:text-stone-400 dark:hover:border-turf-300 dark:hover:text-turf-300 transition-colors ease-premium"
                  >
                    <Icon size={16} weight="regular" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="lg:col-span-2">
          <h4 className="font-mono uppercase tracking-[0.18em] text-[0.7rem] text-turf-700 dark:text-turf-300 mb-5">
            {t('footer.navigation')}
          </h4>
          <ul className="space-y-3">
            {NAV_LINKS.map((l) => (
              <li key={l.to}>
                <Link
                  to={l.to}
                  className="text-sm text-zinc-600 hover:text-zinc-950 dark:text-stone-400 dark:hover:text-stone-50 transition-colors duration-200 ease-premium"
                >
                  {t(l.key)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-2">
          <h4 className="font-mono uppercase tracking-[0.18em] text-[0.7rem] text-turf-700 dark:text-turf-300 mb-5">
            {t('footer.services')}
          </h4>
          <ul className="space-y-3">
            {SERVICE_KEYS.map((k) => (
              <li key={k} className="text-sm text-zinc-600 dark:text-stone-400">
                {t(k)}
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-3">
          <h4 className="font-mono uppercase tracking-[0.18em] text-[0.7rem] text-turf-700 dark:text-turf-300 mb-5">
            {t('footer.contact')}
          </h4>
          <ul className="space-y-3">
            {CONTACT.map(({ Icon, label, href }) => (
              <li key={label} className="flex items-center gap-2.5 text-sm text-zinc-600 dark:text-stone-400">
                <Icon size={15} weight="regular" className="text-zinc-400 dark:text-stone-500 shrink-0" />
                {href ? (
                  <a
                    href={href}
                    className="hover:text-zinc-950 dark:hover:text-stone-50 transition-colors duration-200 ease-premium"
                  >
                    {label}
                  </a>
                ) : (
                  <span>{label}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-stone-200 dark:border-stone-50/5">
        <div className="container-page py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-zinc-500 dark:text-stone-500">
          <p>{t('footer.copyright', { year })}</p>
          <div className="flex gap-6">
            <Link to="/mentions-legales" className="hover:text-zinc-900 dark:hover:text-stone-300 transition">
              {t('footer.legal.mentions')}
            </Link>
            <Link to="/confidentialite" className="hover:text-zinc-900 dark:hover:text-stone-300 transition">
              {t('footer.legal.privacy')}
            </Link>
            <Link to="/cookies" className="hover:text-zinc-900 dark:hover:text-stone-300 transition">
              {t('footer.legal.cookies')}
            </Link>
            <Link
              to={isAdmin ? '/admin' : '/admin/login'}
              className="hover:text-turf-700 dark:hover:text-turf-300 transition"
            >
              {isAdmin ? t('nav.adminDashboard') : t('nav.adminLogin')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
