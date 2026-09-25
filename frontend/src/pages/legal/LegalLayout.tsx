import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

/**
 * Shared shell for the 3 legal pages so they read consistently and share a
 * sidebar of cross-links. Kept dark-agnostic (theme-adaptive) so a visitor
 * arriving from the light navbar doesn't hit a jarring dark hero.
 */
export interface LegalPage {
  to: string
  label: string
}

const NAV: LegalPage[] = [
  { to: '/mentions-legales', label: 'Mentions légales' },
  { to: '/confidentialite',  label: 'Confidentialité' },
  { to: '/cookies',          label: 'Cookies' },
]

interface LegalLayoutProps {
  title: string
  updatedAt: string
  intro?: ReactNode
  children: ReactNode
}

export default function LegalLayout({ title, updatedAt, intro, children }: LegalLayoutProps) {
  return (
    <section className="bg-stone-50 dark:bg-zinc-950 py-16 lg:py-24">
      <div className="container-page grid lg:grid-cols-12 gap-10 items-start">
        <aside className="lg:col-span-3 lg:sticky lg:top-24">
          <div className="text-[0.62rem] uppercase tracking-[0.28em] font-mono text-turf-700 dark:text-turf-300 mb-3">
            Informations légales
          </div>
          <nav aria-label="Pages légales" className="flex flex-col gap-1">
            {NAV.map((p) => (
              <Link
                key={p.to}
                to={p.to}
                className="text-sm rounded-lg px-3 py-2 text-zinc-700 hover:text-zinc-950 hover:bg-stone-100 dark:text-stone-300 dark:hover:text-stone-50 dark:hover:bg-stone-50/5 transition-colors"
              >
                {p.label}
              </Link>
            ))}
          </nav>
          <div className="mt-6 text-[0.65rem] text-zinc-500 dark:text-stone-500">
            Dernière mise à jour : {updatedAt}
          </div>
        </aside>

        <article className="lg:col-span-9 max-w-[70ch]">
          <h1 className="font-display font-semibold text-3xl lg:text-5xl tracking-tightest text-zinc-950 dark:text-stone-50 leading-[1.05]">
            {title}
          </h1>
          {intro && <div className="mt-6 text-base lg:text-lg text-zinc-600 dark:text-stone-400 leading-relaxed">{intro}</div>}
          <div className="mt-10 space-y-10 text-sm text-zinc-700 dark:text-stone-300 leading-relaxed [&_h2]:font-display [&_h2]:font-semibold [&_h2]:text-xl [&_h2]:tracking-tight [&_h2]:text-zinc-950 dark:[&_h2]:text-stone-50 [&_h2]:mb-3 [&_h3]:font-semibold [&_h3]:text-base [&_h3]:text-zinc-950 dark:[&_h3]:text-stone-50 [&_h3]:mb-2 [&_h3]:mt-4 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_li]:leading-relaxed [&_a]:text-turf-800 dark:[&_a]:text-turf-300 [&_a]:underline [&_a]:underline-offset-2 [&_dl]:mt-2 [&_dt]:font-medium [&_dt]:text-zinc-950 dark:[&_dt]:text-stone-100 [&_dd]:text-zinc-600 dark:[&_dd]:text-stone-400 [&_dd]:mb-2 [&_code]:font-mono [&_code]:text-[0.85em] [&_code]:text-turf-800 dark:[&_code]:text-turf-300 [&_code]:bg-turf-50 dark:[&_code]:bg-turf-500/10 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded">
            {children}
          </div>
        </article>
      </div>
    </section>
  )
}
