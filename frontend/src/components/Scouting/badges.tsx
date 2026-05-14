import type { ReactNode } from 'react'
import {
  MISSION_STATUS_LABEL,
  PRIORITY_LABEL,
  REPORT_STATUS_LABEL,
  STAGE_LABEL,
  STATUS_LABEL,
  type MissionPriority,
  type MissionStatus,
  type ReportStatus,
  type ScoutingStatus,
  type ShortlistStage,
} from '../../types/scouting'

interface PillProps {
  tone: 'turf' | 'amber' | 'rose' | 'slate' | 'blue' | 'violet'
  children: ReactNode
  className?: string
}

function Pill({ tone, children, className = '' }: PillProps) {
  const palette: Record<PillProps['tone'], string> = {
    turf:   'bg-turf-50 text-turf-800 border-turf-200 dark:bg-turf-800/30 dark:text-turf-200 dark:border-turf-300/30',
    amber:  'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-800/30 dark:text-amber-200 dark:border-amber-300/30',
    rose:   'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-800/30 dark:text-rose-200 dark:border-rose-300/30',
    slate:  'bg-stone-100 text-zinc-600 border-stone-200 dark:bg-stone-50/5 dark:text-stone-400 dark:border-stone-50/10',
    blue:   'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-800/30 dark:text-blue-200 dark:border-blue-300/30',
    violet: 'bg-violet-50 text-violet-800 border-violet-200 dark:bg-violet-800/30 dark:text-violet-200 dark:border-violet-300/30',
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.65rem] font-mono uppercase tracking-wider border ${palette[tone]} ${className}`}>
      {children}
    </span>
  )
}

const STATUS_TONE: Record<ScoutingStatus, PillProps['tone']> = {
  decouvert: 'slate', watchlist: 'blue', shortlist_b: 'violet', shortlist_a: 'turf',
  valide: 'turf', rejete: 'rose', archive: 'slate',
}

export function StatusBadge({ status }: { status: ScoutingStatus }) {
  return <Pill tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Pill>
}

const REPORT_TONE: Record<ReportStatus, PillProps['tone']> = {
  draft: 'slate', submitted: 'amber', needs_changes: 'rose', validated: 'turf', archived: 'slate',
}

export function ReportStatusBadge({ status }: { status: ReportStatus }) {
  return <Pill tone={REPORT_TONE[status]}>{REPORT_STATUS_LABEL[status]}</Pill>
}

const MISSION_TONE: Record<MissionStatus, PillProps['tone']> = {
  a_faire: 'slate', en_cours: 'blue', rapport_soumis: 'amber', a_completer: 'rose', valide: 'turf',
}

export function MissionStatusBadge({ status }: { status: MissionStatus }) {
  return <Pill tone={MISSION_TONE[status]}>{MISSION_STATUS_LABEL[status]}</Pill>
}

const PRIORITY_TONE: Record<MissionPriority, PillProps['tone']> = {
  basse: 'slate', moyenne: 'blue', haute: 'amber', urgente: 'rose',
}

export function PriorityBadge({ priority }: { priority: MissionPriority }) {
  return <Pill tone={PRIORITY_TONE[priority]}>{PRIORITY_LABEL[priority]}</Pill>
}

const STAGE_TONE: Record<ShortlistStage, PillProps['tone']> = {
  watchlist: 'blue', shortlist_b: 'violet', shortlist_a: 'turf', valide: 'turf', rejete: 'rose',
}

export function StageBadge({ stage }: { stage: ShortlistStage }) {
  return <Pill tone={STAGE_TONE[stage]}>{STAGE_LABEL[stage]}</Pill>
}

interface ScoreBadgeProps {
  score: number | null | undefined
  label?: string
}

/**
 * Compact numeric score chip. Tone reflects the value bucket:
 *   >=80 turf (excellent), 65-79 amber, 50-64 slate, <50 rose.
 */
export function ScoreBadge({ score, label }: ScoreBadgeProps) {
  const v = score ?? null
  let tone: PillProps['tone'] = 'slate'
  if (v != null) {
    if (v >= 80) tone = 'turf'
    else if (v >= 65) tone = 'amber'
    else if (v >= 50) tone = 'slate'
    else tone = 'rose'
  }
  return (
    <Pill tone={tone}>
      {label ? <span className="text-zinc-500 dark:text-stone-400 mr-1">{label}</span> : null}
      <span className="font-mono tabular-nums">{v == null ? '—' : Math.round(v)}</span>
    </Pill>
  )
}

export function NextActionBadge({ action }: { action: string | null | undefined }) {
  if (!action) {
    return <Pill tone="rose" className="!normal-case !tracking-normal text-[0.7rem]">Action manquante</Pill>
  }
  return (
    <Pill tone="amber" className="!normal-case !tracking-normal !font-sans text-[0.7rem]" >
      <span className="max-w-[28ch] truncate inline-block align-middle">{action}</span>
    </Pill>
  )
}

export function CompletenessBar({ percent }: { percent: number | null | undefined }) {
  const p = Math.max(0, Math.min(100, percent ?? 0))
  let bar = 'bg-rose-500'
  if (p >= 80) bar = 'bg-turf-600'
  else if (p >= 60) bar = 'bg-amber-500'
  else if (p >= 40) bar = 'bg-stone-400'
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-1.5 rounded-full bg-stone-200 dark:bg-stone-50/10 overflow-hidden">
        <span className={`block h-full ${bar}`} style={{ width: `${p}%` }} />
      </div>
      <span className="font-mono tabular-nums text-[0.65rem] text-zinc-600 dark:text-stone-400 w-8 text-right">{p}%</span>
    </div>
  )
}
