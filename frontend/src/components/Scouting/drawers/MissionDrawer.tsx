import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { X as XIcon } from '@phosphor-icons/react'
import { scoutingApi } from '../../../lib/scoutingApi'
import type { MissionStatus, ScoutAssignment } from '../../../types/scouting'
import { MISSION_STATUS_LABEL } from '../../../types/scouting'
import Skeleton from '../../Skeleton'
import { MissionStatusBadge, PriorityBadge } from '../badges'

interface Props { id: number; onClose: () => void }

function MissionDrawer({ id, onClose }: Props) {
  const [m, setM] = useState<ScoutAssignment | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const reload = async () => {
    const res = await scoutingApi.showMission(id)
    setM(res.data)
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    reload().catch(() => {}).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line
  }, [id])

  const setStatus = async (status: MissionStatus) => {
    setBusy(true)
    try {
      await scoutingApi.setMissionStatus(id, status)
      await reload()
    } finally { setBusy(false) }
  }

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-40 bg-zinc-950/40" />
      <motion.aside
        initial={{ x: 480 }} animate={{ x: 0 }} exit={{ x: 480 }}
        transition={{ type: 'spring', stiffness: 280, damping: 32 }}
        className="fixed top-0 right-0 h-[100dvh] w-full max-w-xl bg-stone-50 dark:bg-zinc-950 shadow-2xl flex flex-col z-50"
      >
        <header className="flex items-center justify-between px-6 h-16 border-b border-stone-200 dark:border-stone-50/8 bg-white dark:bg-zinc-900">
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-turf-700 dark:text-turf-300">Mission</div>
            <div className="font-display font-semibold text-lg text-zinc-950 dark:text-stone-50 truncate">{m?.title ?? '-'}</div>
          </div>
          <button type="button" onClick={onClose} className="grid place-items-center w-9 h-9 rounded-full text-zinc-500 hover:bg-stone-100 hover:text-zinc-900 dark:text-stone-400 dark:hover:bg-stone-50/8 dark:hover:text-stone-50 transition">
            <XIcon size={18} weight="bold" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {loading && <><Skeleton className="h-6 w-32" /><Skeleton className="h-40 w-full" /></>}
          {!loading && m && (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <MissionStatusBadge status={m.status} />
                <PriorityBadge priority={m.priority} />
                {m.due_date && <span className="text-xs text-zinc-500 dark:text-stone-400">Échéance : {new Date(m.due_date).toLocaleDateString('fr-FR')}</span>}
                {m.assignee && <span className="text-xs text-zinc-500 dark:text-stone-400">· Assigné à {m.assignee.name}</span>}
              </div>

              {m.match && (
                <Section label="Match">
                  <div className="rounded-xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-stone-50/8 p-3">
                    <div className="font-medium text-zinc-950 dark:text-stone-50">{m.match.home_team} - {m.match.away_team}</div>
                    <div className="text-xs text-zinc-500 dark:text-stone-400">{m.match.competition} · {new Date(m.match.kickoff_at).toLocaleString('fr-FR')}</div>
                  </div>
                </Section>
              )}

              {m.objective && (
                <Section label="Objectif">
                  <p className="text-sm text-zinc-700 dark:text-stone-300 whitespace-pre-line">{m.objective}</p>
                </Section>
              )}

              {m.checklist && m.checklist.length > 0 && (
                <Section label="Checklist">
                  <ul className="space-y-1.5">
                    {m.checklist.map((c) => (
                      <li key={c.key} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={!!c.done} readOnly className="accent-turf-700" />
                        <span className={c.done ? 'line-through text-zinc-400 dark:text-stone-500' : 'text-zinc-700 dark:text-stone-300'}>{c.label}</span>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              <Section label="Changer de statut">
                <div className="flex flex-wrap gap-1.5">
                  {(['a_faire', 'en_cours', 'rapport_soumis', 'a_completer', 'valide'] as MissionStatus[]).map((s) => {
                    const active = m.status === s
                    return (
                      <button
                        key={s}
                        type="button"
                        disabled={busy}
                        onClick={() => setStatus(s)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition disabled:opacity-50 ${
                          active
                            ? 'bg-zinc-950 border-zinc-950 text-stone-50 dark:bg-stone-50 dark:border-stone-50 dark:text-zinc-950'
                            : 'bg-white border-stone-300 text-zinc-700 hover:border-zinc-500 dark:bg-zinc-900 dark:border-stone-50/15 dark:text-stone-300 dark:hover:border-stone-50/40'
                        }`}
                      >
                        {MISSION_STATUS_LABEL[s]}
                      </button>
                    )
                  })}
                </div>
              </Section>
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

export default MissionDrawer
