import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { X as XIcon, Warning } from '@phosphor-icons/react'
import { scoutingApi } from '../../../lib/scoutingApi'
import type { RecruitmentNeed, Shortlist } from '../../../types/scouting'
import Skeleton from '../../Skeleton'
import { PriorityBadge } from '../badges'

interface Props { slug: string; onClose: () => void }

function NeedDrawer({ slug, onClose }: Props) {
  const [need, setNeed] = useState<RecruitmentNeed | null>(null)
  const [shortlists, setShortlists] = useState<Shortlist[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    scoutingApi.showNeed(slug)
      .then((res) => {
        if (cancelled) return
        setNeed(res.data)
        setShortlists(res.shortlists)
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [slug])

  const playersTotal = shortlists.reduce((acc, s) => acc + (s.players?.length ?? 0), 0)

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-40 bg-zinc-950/40" />
      <motion.aside
        initial={{ x: 480 }} animate={{ x: 0 }} exit={{ x: 480 }}
        transition={{ type: 'spring', stiffness: 280, damping: 32 }}
        className="fixed top-0 right-0 h-[100dvh] w-full max-w-xl bg-stone-50 dark:bg-zinc-950 shadow-2xl flex flex-col z-50"
      >
        <header className="flex items-center justify-between px-6 h-16 border-b border-stone-200 dark:border-stone-50/10 bg-white dark:bg-zinc-900">
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-turf-700 dark:text-turf-300">Besoin de recrutement</div>
            <div className="font-display font-semibold text-lg text-zinc-950 dark:text-stone-50 truncate">{need?.title ?? '-'}</div>
          </div>
          <button type="button" onClick={onClose} className="grid place-items-center w-9 h-9 rounded-full text-zinc-500 hover:bg-stone-100 hover:text-zinc-900 dark:text-stone-400 dark:hover:bg-stone-50/10 dark:hover:text-stone-50 transition">
            <XIcon size={18} weight="bold" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {loading && <Skeleton className="h-40" />}
          {!loading && need && (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <PriorityBadge priority={need.priority} />
                <span className="text-xs text-zinc-500 dark:text-stone-400">{need.position} · {need.category} · Saison {need.season ?? '-'}</span>
                {need.deadline && <span className="text-xs text-zinc-500 dark:text-stone-400">Deadline {new Date(need.deadline).toLocaleDateString('fr-FR')}</span>}
              </div>

              {need.profile_description && (
                <Section label="Profil"><p className="text-sm text-zinc-700 dark:text-stone-300 whitespace-pre-line">{need.profile_description}</p></Section>
              )}

              <div className="grid grid-cols-2 gap-2">
                <Metric label="Budget" value={need.budget_min && need.budget_max ? `${Math.round(need.budget_min/1000)}k - ${Math.round(need.budget_max/1000)}k €` : '-'} />
                <Metric label="Âge" value={need.age_min && need.age_max ? `${need.age_min} - ${need.age_max} ans` : '-'} />
                <Metric label="Pied fort" value={need.preferred_foot ?? '-'} />
                <Metric label="Profils liés" value={String(playersTotal)} />
              </div>

              {playersTotal < 3 && need.status === 'actif' && (
                <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-400/30 px-4 py-3 flex items-start gap-2">
                  <Warning size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-900 dark:text-amber-200">
                    Couverture faible - seulement {playersTotal} profil{playersTotal > 1 ? 's' : ''} lié{playersTotal > 1 ? 's' : ''} à ce besoin.
                    Envisage d'élargir la veille ou de créer une mission scout.
                  </p>
                </div>
              )}

              {shortlists.length > 0 && (
                <Section label="Shortlists liées">
                  <ul className="space-y-2">
                    {shortlists.map((s) => (
                      <li key={s.id} className="rounded-xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-stone-50/10 p-3">
                        <div className="font-medium text-sm text-zinc-950 dark:text-stone-50">{s.name}</div>
                        <div className="text-xs text-zinc-500 dark:text-stone-400">{s.players?.length ?? 0} joueurs</div>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}
            </>
          )}
        </div>
      </motion.aside>
    </>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[0.65rem] font-mono uppercase tracking-[0.16em] text-zinc-500 dark:text-stone-400 mb-1.5">{label}</div>
      {children}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-stone-50/10 p-3">
      <div className="text-[0.6rem] font-mono uppercase tracking-[0.16em] text-zinc-500 dark:text-stone-400">{label}</div>
      <div className="mt-1 text-sm text-zinc-950 dark:text-stone-50">{value}</div>
    </div>
  )
}

export default NeedDrawer
