import type { Icon as PhosphorIcon } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { EnvelopeSimple, MapPin, Phone } from '@phosphor-icons/react'
import BrandLogo from './BrandLogo'

const NAV_LINKS: { to: string; label: string }[] = [
  { to: '/',           label: 'Accueil' },
  { to: '/joueurs',    label: 'Joueurs' },
  { to: '/actualites', label: 'Actualités' },
  { to: '/a-propos',   label: 'À propos' },
  { to: '/contact',    label: 'Contact' },
]

const SERVICES: string[] = [
  'Représentation de joueurs',
  'Négociation de contrats',
  'Scouting & recrutement',
  'Gestion de carrière',
]

interface ContactEntry {
  Icon: PhosphorIcon
  label: string
  href: string | null
}

const CONTACT: ContactEntry[] = [
  { Icon: EnvelopeSimple, label: 'contact@renefootball.com', href: 'mailto:contact@renefootball.com' },
  { Icon: Phone,          label: '+352 661 24 18 47',         href: 'tel:+352661241847' },
  { Icon: MapPin,         label: 'Luxembourg-Ville · Luxembourg', href: null },
]

function Footer() {
  const year = new Date().getFullYear()

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
            Agence de football indépendante basée à Luxembourg, dédiée à la
            gestion de carrière, au scouting et à la représentation de joueurs
            professionnels à travers l'Europe.
          </p>
        </div>

        <div className="lg:col-span-2">
          <h4 className="font-mono uppercase tracking-[0.18em] text-[0.7rem] text-turf-700 dark:text-turf-300 mb-5">
            Navigation
          </h4>
          <ul className="space-y-3">
            {NAV_LINKS.map((l) => (
              <li key={l.to}>
                <Link
                  to={l.to}
                  className="text-sm text-zinc-600 hover:text-zinc-950 dark:text-stone-400 dark:hover:text-stone-50 transition-colors duration-200 ease-premium"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-2">
          <h4 className="font-mono uppercase tracking-[0.18em] text-[0.7rem] text-turf-700 dark:text-turf-300 mb-5">
            Services
          </h4>
          <ul className="space-y-3">
            {SERVICES.map((s) => (
              <li key={s} className="text-sm text-zinc-600 dark:text-stone-400">
                {s}
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-3">
          <h4 className="font-mono uppercase tracking-[0.18em] text-[0.7rem] text-turf-700 dark:text-turf-300 mb-5">
            Contact
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
          <p>© {year} Rene Football. Tous droits réservés.</p>
          <div className="flex gap-6">
            <Link to="/mentions-legales" className="hover:text-zinc-900 dark:hover:text-stone-300 transition">
              Mentions légales
            </Link>
            <Link to="/confidentialite" className="hover:text-zinc-900 dark:hover:text-stone-300 transition">
              Confidentialité
            </Link>
            <Link
              to="/admin/login"
              className="hover:text-turf-700 dark:hover:text-turf-300 transition"
            >
              Espace agence
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
