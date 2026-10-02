import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  CheckCircle,
  Database,
  Globe,
  Heartbeat,
  Lightning,
  MagnifyingGlass,
  Package,
  Pulse,
  Target,
  Trophy,
  X,
} from '@phosphor-icons/react'
import { useToast } from '../../components/ToastProvider'

/**
 * "Centre de recherche" (Market Intelligence) — upsell page for the paid
 * API integration. Describes what the feature would unlock, shows the
 * actual third-party pricing (API-Football Oct 2026) and our integration
 * quote, then captures a lightweight interest signal.
 *
 * The actual integration is NOT built yet. Clicking "Je suis intéressé"
 * just surfaces a toast confirmation — the backend/dev work would start
 * only once the agency commits.
 */

interface PricingTier {
  name: string
  priceUsd: number
  priceEur: number
  requests: string
  tagline: string
  highlight?: boolean
  bullets: string[]
}

const API_TIERS: PricingTier[] = [
  {
    name: 'Pro',
    priceUsd: 19,
    priceEur: 18,
    requests: '7 500 req / jour',
    tagline: 'Suffisant pour un roster single-agence',
    highlight: true,
    bullets: [
      'Sync nightly complète de tous les joueurs',
      'Recherche à la demande illimitée en pratique',
      'Historique matchs + stats détaillées',
    ],
  },
  {
    name: 'Ultra',
    priceUsd: 29,
    priceEur: 27,
    requests: '75 000 req / jour',
    tagline: 'Multi-team + exploration intensive',
    bullets: [
      'Pour quand plusieurs scouts travaillent en parallèle',
      'Idéal pour balayer plusieurs ligues chaque jour',
      'Audit transfer market multi-pays',
    ],
  },
  {
    name: 'Mega',
    priceUsd: 39,
    priceEur: 37,
    requests: '150 000 req / jour',
    tagline: 'Pipeline data lake',
    bullets: [
      'Ingestion bulk pour analyse propriétaire',
      'Backups historiques avec snapshot quotidien',
      'Export CSV / Parquet pour outils BI externes',
    ],
  },
]

const FEATURES = [
  { Icon: MagnifyingGlass, title: 'Recherche mondiale', body: '~900 ligues couvertes, de la Premier League à la BGL Ligue luxembourgeoise.' },
  { Icon: Trophy,          title: 'Stats match détaillées', body: 'Buts, passes dé, minutes, cartons, xG, duels gagnés — par saison et par match.' },
  { Icon: Target,          title: 'Transfer market',     body: 'Historique transfers, valeur marchande, clauses, fin de contrat.' },
  { Icon: Heartbeat,       title: 'Blessures & suspensions', body: 'Mises à jour temps réel, idéal pour anticiper une opportunité de signature.' },
  { Icon: Pulse,           title: 'Compositions probables',  body: 'Pré-match + live : savoir qui joue avant tout le monde.' },
  { Icon: Globe,           title: 'Classements & calendrier', body: 'Résultats, standings, fixtures pour tous les championnats clients.' },
]

export default function AdminMarketIntelligence() {
  const navigate = useNavigate()
  const toast = useToast()
  const [acknowledged, setAcknowledged] = useState(false)

  const handleInterested = () => {
    setAcknowledged(true)
    toast.success('Intérêt enregistré. L\'équipe tech revient vers vous avec un devis détaillé sous 48h.')
  }

  const handleDecline = () => {
    navigate('/admin')
  }

  return (
    <div className="px-6 lg:px-10 py-10 max-w-[1200px] mx-auto">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-stone-200 dark:border-stone-50/10 bg-gradient-to-br from-white via-stone-50 to-turf-50/50 dark:from-zinc-900 dark:via-zinc-900 dark:to-turf-900/20 p-6 lg:p-10 relative overflow-hidden"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-60"
          style={{ background: 'radial-gradient(circle, rgba(30, 64, 175, 0.25), transparent 70%)' }}
        />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/60 bg-amber-50 dark:border-amber-400/30 dark:bg-amber-500/10 px-3 py-1 text-[0.65rem] font-mono uppercase tracking-[0.18em] text-amber-900 dark:text-amber-200 mb-5">
            <Lightning size={11} weight="fill" />
            Feature Pro — non activée
          </div>
          <h1 className="font-display font-semibold text-3xl lg:text-5xl tracking-tightest text-zinc-950 dark:text-stone-50 leading-[1.05] max-w-[18ch]">
            Centre de recherche
          </h1>
          <p className="mt-4 text-base lg:text-lg text-zinc-600 dark:text-stone-400 max-w-[62ch] leading-relaxed">
            Interrogez une base de données mondiale de joueurs, clubs et compétitions
            directement depuis le back-office. Recherche à la volée, enrichissement
            automatique des fiches, veille transfers et blessures en temps réel.
          </p>
          <p className="mt-4 text-sm text-zinc-500 dark:text-stone-500 max-w-[62ch] leading-relaxed">
            Ce module s'appuie sur une API tierce <strong className="text-zinc-700 dark:text-stone-300">payante</strong> (voir les tarifs plus bas).
            Il n'est pas inclus dans la plateforme de base. Si l'agence est intéressée,
            on prépare un devis d'intégration et vous choisissez le palier qui vous
            convient.
          </p>
        </div>
      </motion.div>

      {/* Features showcase */}
      <section className="mt-10">
        <h2 className="eyebrow mb-5 inline-block">Ce que ça débloque</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(({ Icon, title, body }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i, type: 'spring', stiffness: 180, damping: 22 }}
              className="rounded-2xl border border-stone-200 dark:border-stone-50/10 bg-white dark:bg-zinc-900 p-5"
            >
              <div className="grid place-items-center w-10 h-10 rounded-xl bg-turf-50 border border-turf-100 text-turf-800 dark:bg-turf-800/30 dark:border-turf-300/20 dark:text-turf-200 mb-3">
                <Icon size={18} weight="regular" />
              </div>
              <div className="font-display font-semibold text-sm text-zinc-950 dark:text-stone-50 mb-1">{title}</div>
              <p className="text-xs text-zinc-600 dark:text-stone-400 leading-relaxed">{body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Pricing section */}
      <section className="mt-12">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-6">
          <div>
            <span className="eyebrow">Abonnement API</span>
            <h2 className="mt-2 font-display font-semibold text-2xl lg:text-3xl tracking-tight text-zinc-950 dark:text-stone-50">
              Tarifs API-Football — Octobre 2026
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-stone-400">
              Facturation mensuelle, sans engagement. Tous les paliers incluent 100 % des endpoints
              (recherche, stats, transfers, blessures, lineups).
            </p>
          </div>
          <a
            href="https://www.api-football.com/pricing"
            target="_blank"
            rel="noreferrer noopener"
            className="text-xs text-turf-700 dark:text-turf-300 hover:underline inline-flex items-center gap-1 font-mono uppercase tracking-wider"
          >
            Source officielle <ArrowRight size={11} weight="bold" />
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {API_TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`relative rounded-2xl border p-6 flex flex-col ${
                tier.highlight
                  ? 'border-turf-500/40 bg-gradient-to-b from-turf-50 to-white dark:from-turf-800/20 dark:to-zinc-900 shadow-diffusion'
                  : 'border-stone-200 bg-white dark:border-stone-50/10 dark:bg-zinc-900'
              }`}
            >
              {tier.highlight && (
                <div className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-turf-800 text-stone-50 text-[0.6rem] font-mono uppercase tracking-wider px-2.5 py-1">
                  <CheckCircle size={10} weight="fill" /> Recommandé
                </div>
              )}
              <div className="font-display font-semibold text-xl text-zinc-950 dark:text-stone-50">{tier.name}</div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-display font-bold text-4xl tracking-tightest text-zinc-950 dark:text-stone-50 tabular-nums">
                  ${tier.priceUsd}
                </span>
                <span className="text-xs text-zinc-500 dark:text-stone-500">/ mois</span>
              </div>
              <div className="mt-1 text-[0.7rem] font-mono text-zinc-500 dark:text-stone-500">
                ≈ {tier.priceEur} € HT
              </div>
              <div className="mt-4 rounded-lg bg-stone-100 dark:bg-stone-50/5 border border-stone-200 dark:border-stone-50/10 px-3 py-2 text-xs text-zinc-700 dark:text-stone-300 font-mono tabular-nums">
                {tier.requests}
              </div>
              <p className="mt-3 text-xs text-zinc-600 dark:text-stone-400 italic">{tier.tagline}</p>
              <ul className="mt-4 space-y-2 text-xs text-zinc-700 dark:text-stone-300 leading-relaxed flex-1">
                {tier.bullets.map((b) => (
                  <li key={b} className="flex gap-2">
                    <CheckCircle size={13} weight="fill" className="text-turf-700 dark:text-turf-300 mt-0.5 shrink-0" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Integration cost */}
      <section className="mt-12">
        <h2 className="eyebrow mb-5 inline-block">Intégration technique</h2>
        <div className="rounded-2xl border border-stone-200 dark:border-stone-50/10 bg-zinc-950 text-stone-100 p-6 lg:p-8 relative overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-20 -right-20 w-72 h-72 rounded-full opacity-60"
            style={{ background: 'radial-gradient(circle, rgba(30, 64, 175, 0.4), transparent 70%)' }}
          />
          <div className="relative grid lg:grid-cols-[1fr_auto] gap-6 items-center">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Package size={18} weight="regular" className="text-turf-300" />
                <span className="text-[0.65rem] font-mono uppercase tracking-[0.18em] text-turf-300">
                  Devis intégration dev
                </span>
              </div>
              <h3 className="font-display font-semibold text-2xl lg:text-3xl text-stone-50 tracking-tight">
                1 500 € HT — forfait unique
              </h3>
              <p className="mt-2 text-sm text-stone-400 max-w-[55ch] leading-relaxed">
                Mise en place technique complète, ~2 jours de dev senior. Inclus :
              </p>
              <ul className="mt-4 space-y-2 text-sm text-stone-200 max-w-[60ch]">
                {[
                  'Mapping admin : lier chaque joueur du roster à son identifiant API',
                  'Sync automatique quotidienne (stats, blessures, valeur marchande)',
                  'Interface de recherche globale avec import en 1 clic',
                  'Résolution de conflits (si l\'API et l\'agence divergent sur une donnée)',
                  'Tests unitaires + documentation de l\'intégration',
                  'Garantie 30 jours (bug fixes gratuits)',
                ].map((item) => (
                  <li key={item} className="flex gap-2">
                    <CheckCircle size={14} weight="fill" className="text-turf-300 mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="shrink-0 rounded-xl bg-stone-50/5 border border-stone-50/10 p-5 min-w-[220px]">
              <div className="text-[0.65rem] font-mono uppercase tracking-[0.18em] text-stone-400 mb-2">
                Coût total an 1
              </div>
              <div className="font-display font-bold text-3xl tabular-nums text-stone-50">
                ~1 720 €
              </div>
              <div className="mt-1 text-xs text-stone-400">
                1 500 € intégration + 216 € abonnement Pro (12 mois)
              </div>
              <div className="mt-4 pt-4 border-t border-stone-50/10 text-[0.65rem] font-mono uppercase tracking-[0.18em] text-stone-400 mb-1">
                Récurrent an 2+
              </div>
              <div className="font-display font-semibold text-xl tabular-nums text-stone-50">
                216 € / an
              </div>
              <div className="mt-1 text-xs text-stone-400">
                Juste l'abonnement Pro
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Alternatives note */}
      <section className="mt-10 rounded-2xl border border-stone-200/80 dark:border-stone-50/10 bg-stone-50/50 dark:bg-zinc-900/40 p-5">
        <div className="flex items-start gap-3">
          <Database size={18} weight="regular" className="text-zinc-500 dark:text-stone-400 mt-0.5 shrink-0" />
          <div>
            <h3 className="font-semibold text-sm text-zinc-950 dark:text-stone-100 mb-1">
              Pourquoi pas une API gratuite ?
            </h3>
            <p className="text-xs text-zinc-600 dark:text-stone-400 leading-relaxed">
              Les tiers vraiment gratuits (football-data.org, API-Football free tier à 100 req/jour)
              ne couvrent soit que les 5 grands championnats européens, soit sont rate-limités
              à un point qui bloque toute utilisation pro. Transfermarkt n'offre pas d'API publique
              et son scraping viole leurs conditions d'utilisation (risque juridique).
              Pour un usage agence sérieux, le palier Pro à $19/mois reste le meilleur rapport
              qualité/prix du marché.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-12">
        {!acknowledged ? (
          <div className="rounded-3xl border border-stone-200 dark:border-stone-50/10 bg-white dark:bg-zinc-900 p-6 lg:p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
            <div>
              <h2 className="font-display font-semibold text-xl text-zinc-950 dark:text-stone-50 mb-1">
                On lance l'intégration ?
              </h2>
              <p className="text-sm text-zinc-600 dark:text-stone-400 max-w-[55ch]">
                Si l'agence est intéressée, l'équipe tech revient avec un devis détaillé
                et un planning de mise en place sous 48h ouvrées. Sinon aucun engagement,
                vous pouvez repasser plus tard.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 shrink-0 w-full lg:w-auto">
              <button
                type="button"
                onClick={handleInterested}
                className="btn bg-turf-800 text-stone-50 hover:bg-turf-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] text-sm px-5 w-full sm:w-auto"
              >
                <CheckCircle size={14} weight="fill" />
                Je suis intéressé
              </button>
              <button
                type="button"
                onClick={handleDecline}
                className="btn btn-ghost text-sm px-5 w-full sm:w-auto"
              >
                <X size={14} weight="bold" />
                Pas intéressé
              </button>
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 240, damping: 24 }}
            className="rounded-3xl border border-turf-500/40 bg-gradient-to-br from-turf-50 via-white to-turf-50/50 dark:from-turf-800/20 dark:via-zinc-900 dark:to-turf-900/10 p-6 lg:p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5"
          >
            <div className="flex items-start gap-4">
              <div className="grid place-items-center w-11 h-11 rounded-full bg-turf-800 text-stone-50 shrink-0">
                <CheckCircle size={20} weight="fill" />
              </div>
              <div>
                <h2 className="font-display font-semibold text-xl text-zinc-950 dark:text-stone-50 mb-1">
                  Intérêt enregistré, merci !
                </h2>
                <p className="text-sm text-zinc-600 dark:text-stone-400">
                  L'équipe tech revient vers vous avec un devis détaillé sous 48 heures ouvrées.
                  En attendant, aucune action nécessaire de votre côté.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="btn btn-ghost text-sm px-5 shrink-0"
            >
              Retour au tableau de bord
              <ArrowRight size={13} weight="bold" />
            </button>
          </motion.div>
        )}
      </section>
    </div>
  )
}
