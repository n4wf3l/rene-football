import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import type { Icon as PhosphorIcon } from '@phosphor-icons/react'
import {
  ArrowDownRight,
  ArrowUpRight,
  Browsers,
  Compass,
  Eye,
  Files,
  Newspaper,
  ShieldCheck,
  SoccerBall,
  UsersThree,
} from '@phosphor-icons/react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api, ApiError } from '../../api/client'
import Skeleton from '../../components/Skeleton'

/**
 * Fréquentation — anonymous audience of the public site (issue #1).
 *
 * Fed by GET /api/admin/analytics. "Visites" = one visitor counted once per
 * day (the server-side hash rotates daily), so the numbers can't follow an
 * individual across days.
 */

interface Analytics {
  range: { days: number; from: string; to: string }
  totals: { views: number; visits: number; pages_per_visit: number; prev_views: number; prev_visits: number }
  timeseries: { date: string; views: number; visits: number }[]
  top_pages: { path: string; views: number; visits: number }[]
  players: { slug: string; name: string; club: string | null; photo_url: string | null; views: number; visits: number; contacts: number }[]
  articles: { slug: string; title: string; views: number; visits: number }[]
  referrers: { host: string | null; visits: number }[]
}

const PERIODS = [
  { days: 7, label: '7 j' },
  { days: 30, label: '30 j' },
  { days: 90, label: '90 j' },
  { days: 365, label: '12 mois' },
] as const

const PAGE_LABELS: Record<string, string> = {
  '/': 'Accueil',
  '/joueurs': 'Joueurs',
  '/actualites': 'Actualités',
  '/a-propos': 'À propos',
  '/contact': 'Contact',
  '/mentions-legales': 'Mentions légales',
  '/confidentialite': 'Confidentialité',
  '/cookies': 'Cookies',
}

const SOURCE_LABELS: [RegExp, string][] = [
  [/(^|\.)instagram\.com$/, 'Instagram'],
  [/(^|\.)facebook\.com$/, 'Facebook'],
  [/(^|\.)linkedin\.com$|^lnkd\.in$/, 'LinkedIn'],
  [/^t\.co$|(^|\.)x\.com$|(^|\.)twitter\.com$/, 'X (Twitter)'],
  [/(^|\.)tiktok\.com$/, 'TikTok'],
  [/(^|\.)whatsapp\.com$|^wa\.me$/, 'WhatsApp'],
  [/(^|\.)google\.[a-z.]+$/, 'Google'],
  [/(^|\.)bing\.com$/, 'Bing'],
  [/(^|\.)duckduckgo\.com$/, 'DuckDuckGo'],
]

function sourceLabel(host: string | null): string {
  if (!host) return 'Accès direct'
  return SOURCE_LABELS.find(([re]) => re.test(host))?.[1] ?? host
}

/** Readable name for a path: known pages, then player / article names from the same response. */
function pageLabel(path: string, data: Analytics): string {
  if (PAGE_LABELS[path]) return PAGE_LABELS[path]
  const [, section, slug] = path.split('/')
  if (section === 'joueurs' && slug) {
    return `Joueur · ${data.players.find((p) => p.slug === slug)?.name ?? slug}`
  }
  if (section === 'actualites' && slug) {
    return `Article · ${data.articles.find((a) => a.slug === slug)?.title ?? slug}`
  }
  return path
}

const nf = new Intl.NumberFormat('fr-FR')

function shortDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

/** "+12 %" against the previous period of the same length; null when there's nothing to compare. */
function delta(current: number, previous: number): number | null {
  if (previous === 0) return null
  return Math.round(((current - previous) / previous) * 100)
}

const EYEBROW = 'font-mono uppercase tracking-[0.12em] text-[0.62rem] text-zinc-500 dark:text-stone-400'
const CARD = 'rounded-2xl bg-white border border-stone-200/70 dark:bg-zinc-900/60 dark:border-stone-50/[0.06]'

export default function AdminFrequentation() {
  const [days, setDays] = useState(30)
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    api.get<Analytics>(`/admin/analytics?days=${days}`, { auth: true, signal: controller.signal })
      .then(setData)
      .catch((e) => {
        if (controller.signal.aborted) return
        setError(e instanceof ApiError ? e.message : 'Chargement impossible.')
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [days])

  const totals = data?.totals
  const topPlayer = data?.players[0]
  const empty = !!data && data.totals.views === 0

  return (
    <div className="px-6 lg:px-10 py-10 space-y-6 lg:space-y-8 max-w-[1400px]">
      <motion.header initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
        className="flex flex-wrap items-end justify-between gap-4"
      >
        <div>
          <span className="font-mono uppercase tracking-[0.12em] text-[0.62rem] font-medium text-turf-700 dark:text-turf-300">
            Fréquentation
          </span>
          <h1 className="mt-2 font-display font-semibold text-[1.75rem] lg:text-[2rem] tracking-tight text-zinc-950 dark:text-stone-50">
            Qui regarde le site
          </h1>
          <p className="mt-2 text-[0.92rem] text-zinc-600 dark:text-stone-300 max-w-[62ch] leading-relaxed">
            Pages vues, joueurs et articles qui attirent, et d'où viennent les visiteurs du site public.
          </p>
        </div>
        <div className="flex gap-1 rounded-xl border border-stone-300 dark:border-stone-50/15 bg-white dark:bg-zinc-900 p-1" role="group" aria-label="Période">
          {PERIODS.map((p) => (
            <button
              key={p.days}
              type="button"
              onClick={() => setDays(p.days)}
              aria-pressed={days === p.days}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                days === p.days
                  ? 'bg-zinc-950 text-stone-50 dark:bg-stone-50 dark:text-zinc-950'
                  : 'text-zinc-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-50/5'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </motion.header>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-400/20 dark:bg-red-500/10 dark:text-red-200">
          {error}
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi icon={Eye} label="Pages vues" loading={loading} value={totals ? nf.format(totals.views) : '—'}
          change={totals ? delta(totals.views, totals.prev_views) : null} />
        <Kpi icon={UsersThree} label="Visites" loading={loading} value={totals ? nf.format(totals.visits) : '—'}
          change={totals ? delta(totals.visits, totals.prev_visits) : null} hint="Un visiteur compté une fois par jour" />
        <Kpi icon={Files} label="Pages par visite" loading={loading}
          value={totals ? totals.pages_per_visit.toLocaleString('fr-FR') : '—'} />
        <Kpi icon={SoccerBall} label="Joueur le plus consulté" loading={loading}
          value={topPlayer ? topPlayer.name : '—'} small
          hint={topPlayer ? `${nf.format(topPlayer.views)} vues${topPlayer.club ? ` · ${topPlayer.club}` : ''}` : undefined} />
      </div>

      {empty && !loading && (
        <div className={`${CARD} border-dashed px-6 py-10 text-center`}>
          <Eye size={22} weight="duotone" className="mx-auto text-zinc-400 dark:text-stone-500" />
          <p className="mt-3 font-display font-semibold text-zinc-900 dark:text-stone-100">Aucune visite sur cette période</p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-stone-400 max-w-[52ch] mx-auto">
            Les visites du site public s'affichent ici au fil de l'eau. Essayez une période plus longue.
          </p>
        </div>
      )}

      {!empty && (
        <>
          {/* Daily chart */}
          <section className={`${CARD} p-5`}>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <span className={EYEBROW}>Évolution par jour</span>
              <div className="flex items-center gap-4 text-[0.7rem] text-zinc-500 dark:text-stone-400">
                <span className="inline-flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm bg-turf-600" />Pages vues</span>
                <span className="inline-flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm bg-turf-300" />Visites</span>
              </div>
            </div>
            <div className="h-64 text-zinc-700 dark:text-stone-300">
              {loading || !data ? <Skeleton className="w-full h-full" /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.timeseries} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="fq-views" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563eb" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="currentColor" strokeOpacity={0.08} vertical={false} />
                    <XAxis dataKey="date" tickFormatter={shortDate} minTickGap={24}
                      tick={{ fontSize: 10, fill: 'currentColor', fillOpacity: 0.55 }} tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} width={32}
                      tick={{ fontSize: 10, fill: 'currentColor', fillOpacity: 0.55 }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ background: 'rgba(24, 24, 27, 0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: '#a1a1aa' }}
                      itemStyle={{ color: '#fafafa' }}
                      labelFormatter={(d) => shortDate(String(d))}
                      formatter={(v, name) => [nf.format(Number(v ?? 0)), name === 'views' ? 'Pages vues' : 'Visites']}
                    />
                    <Area type="monotone" dataKey="views" stroke="#2563eb" strokeWidth={2} fill="url(#fq-views)" />
                    <Area type="monotone" dataKey="visits" stroke="#93c5fd" strokeWidth={2} fill="transparent" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>

          <div className="grid lg:grid-cols-2 gap-4">
            <RankCard icon={SoccerBall} title="Joueurs les plus consultés" loading={loading} total={totals?.views}
              footnote="« Demande » = formulaire club ou média citant le joueur sur la période."
              rows={(data?.players ?? []).map((p) => ({
                key: p.slug,
                label: (
                  <Link to={`/admin/joueurs/${p.slug}/edit`} className="flex items-center gap-2.5 min-w-0 hover:text-turf-700 dark:hover:text-turf-300">
                    {p.photo_url
                      ? <img src={p.photo_url} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" />
                      : <span className="w-6 h-6 rounded-full bg-stone-200 dark:bg-stone-50/[0.06] shrink-0" />}
                    <span className="truncate">{p.name}</span>
                  </Link>
                ),
                value: p.views,
                extra: p.contacts > 0 ? `${p.contacts} demande${p.contacts > 1 ? 's' : ''}` : undefined,
              }))} />
            <RankCard icon={Newspaper} title="Articles les plus lus" loading={loading} total={totals?.views}
              rows={(data?.articles ?? []).map((a) => ({
                key: a.slug,
                label: (
                  <Link to={`/admin/articles/${a.slug}/edit`} className="truncate hover:text-turf-700 dark:hover:text-turf-300">
                    {a.title}
                  </Link>
                ),
                value: a.views,
              }))} />
            <RankCard icon={Compass} title="D'où viennent les visiteurs" loading={loading} unit="visites"
              rows={(data?.referrers ?? []).map((r) => ({ key: r.host ?? 'direct', label: sourceLabel(r.host), value: r.visits }))} />
            <RankCard icon={Browsers} title="Pages les plus vues" loading={loading} total={totals?.views}
              rows={(data?.top_pages ?? []).map((p) => ({ key: p.path, label: <span className="truncate" title={p.path}>{data ? pageLabel(p.path, data) : p.path}</span>, value: p.views }))} />
          </div>
        </>
      )}

      <p className="flex items-start gap-2 text-[0.72rem] text-zinc-500 dark:text-stone-400 max-w-[80ch] leading-relaxed">
        <ShieldCheck size={14} weight="duotone" className="shrink-0 mt-px text-turf-700 dark:text-turf-300" />
        Compteur anonyme hébergé chez nous : aucun cookie, adresse IP jamais enregistrée, identifiant
        renouvelé chaque jour. Les robots et l'espace admin ne sont pas comptés. Données conservées 13 mois.
      </p>
    </div>
  )
}

/* ─────────────────────────── KPI tile ─────────────────────────── */

interface KpiProps {
  icon: PhosphorIcon
  label: string
  value: string
  loading: boolean
  change?: number | null
  hint?: string
  small?: boolean
}

function Kpi({ icon: Icon, label, value, loading, change, hint, small }: KpiProps) {
  return (
    <div className={`${CARD} p-5 min-w-0`}>
      <div className="flex items-start justify-between gap-2">
        <span className={EYEBROW}>{label}</span>
        <span className="grid place-items-center w-8 h-8 rounded-lg bg-turf-50 text-turf-700 dark:bg-turf-900/35 dark:text-turf-300 shrink-0">
          <Icon size={15} weight="duotone" />
        </span>
      </div>
      {loading ? <Skeleton className="mt-3 h-8 w-24" /> : (
        <div className={`mt-3 font-display font-semibold leading-none tracking-tight text-zinc-950 dark:text-stone-50 tabular-nums truncate ${small ? 'text-xl' : 'text-[2rem]'}`}>
          {value}
        </div>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 min-h-[1rem]">
        {!loading && change != null && change !== 0 && (
          <span className={`inline-flex items-center gap-0.5 text-[0.7rem] font-medium tabular-nums ${
            change > 0 ? 'text-turf-700 dark:text-turf-300' : 'text-amber-700 dark:text-amber-300'
          }`}>
            {change > 0 ? <ArrowUpRight size={11} weight="bold" /> : <ArrowDownRight size={11} weight="bold" />}
            {change > 0 ? '+' : ''}{change} %
            <span className="font-normal text-zinc-500 dark:text-stone-400">vs période préc.</span>
          </span>
        )}
        {hint && <span className="text-[0.7rem] text-zinc-500 dark:text-stone-400 truncate">{hint}</span>}
      </div>
    </div>
  )
}

/* ─────────────────────────── Ranked list ─────────────────────────── */

interface RankRow {
  key: string
  label: ReactNode
  value: number
  extra?: string
}

interface RankCardProps {
  icon: PhosphorIcon
  title: string
  rows: RankRow[]
  loading: boolean
  unit?: string
  /** Small explanation shown under the list. */
  footnote?: string
  /** Denominator of the % column; defaults to the sum of the listed rows. */
  total?: number
}

function RankCard({ icon: Icon, title, rows, loading, unit = 'vues', footnote, total: totalProp }: RankCardProps) {
  const max = Math.max(...rows.map((r) => r.value), 1)
  const total = totalProp ?? rows.reduce((s, r) => s + r.value, 0)
  return (
    <article className={`${CARD} overflow-hidden`}>
      <header className="flex items-center justify-between gap-2 px-4 py-3 border-b border-stone-200/60 dark:border-stone-50/[0.05]">
        <div className="flex items-center gap-2 min-w-0">
          <Icon size={13} weight="duotone" className="text-turf-700 dark:text-turf-300 shrink-0" />
          <h2 className="font-mono uppercase tracking-[0.14em] text-[0.62rem] text-zinc-700 dark:text-stone-200 truncate">{title}</h2>
        </div>
      </header>
      {loading ? (
        <div className="p-4 space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-7 w-full" />)}</div>
      ) : rows.length === 0 ? (
        <div className="px-4 py-8 text-center text-xs text-zinc-500 dark:text-stone-500">Pas encore de données sur cette période.</div>
      ) : (
        <ol className="divide-y divide-stone-200/70 dark:divide-stone-50/[0.05]">
          {rows.map((r, i) => (
            <li key={r.key} className="relative">
              <div aria-hidden className="absolute inset-y-0 left-0 bg-turf-500/[0.08] dark:bg-turf-500/[0.12] pointer-events-none"
                style={{ width: `${(r.value / max) * 100}%` }} />
              <div className="relative flex items-center gap-3 px-3 py-2 text-[0.8rem] text-zinc-900 dark:text-stone-100">
                <span className="w-5 shrink-0 text-[0.7rem] font-mono tabular-nums text-zinc-500 dark:text-stone-500">{i + 1}</span>
                <div className="min-w-0 flex-1 flex items-center">{r.label}</div>
                {r.extra && (
                  <span className="shrink-0 text-[0.6rem] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-turf-50 text-turf-700 border border-turf-200/70 dark:bg-turf-900/30 dark:text-turf-200 dark:border-turf-400/20">
                    {r.extra}
                  </span>
                )}
                <span className="shrink-0 font-mono tabular-nums text-zinc-900 dark:text-stone-50">
                  {nf.format(r.value)}
                  <span className="ml-1 text-[0.6rem] text-zinc-500 dark:text-stone-500">{unit}</span>
                </span>
                <span className="hidden sm:inline w-10 shrink-0 text-right text-[0.65rem] font-mono tabular-nums text-zinc-500 dark:text-stone-500">
                  {total > 0 ? `${Math.round((r.value / total) * 100)} %` : ''}
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
      {footnote && !loading && rows.length > 0 && (
        <p className="px-4 py-2.5 border-t border-stone-200/60 dark:border-stone-50/[0.05] text-[0.65rem] text-zinc-500 dark:text-stone-500">
          {footnote}
        </p>
      )}
    </article>
  )
}
