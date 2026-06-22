import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  DndContext, DragOverlay, PointerSensor, useDraggable, useDroppable, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core'
import { motion } from 'framer-motion'
import { Calendar } from '@phosphor-icons/react'
import { scoutingApi } from '../../../lib/scoutingApi'
import type { MissionStatus, ScoutAssignment } from '../../../types/scouting'
import { MISSION_STATUS_LABEL } from '../../../types/scouting'
import Skeleton from '../../Skeleton'
import { MissionStatusBadge, PriorityBadge } from '../badges'

const COLUMNS: MissionStatus[] = ['a_faire', 'en_cours', 'rapport_soumis', 'a_completer', 'valide']

function MissionsView() {
  const [missions, setMissions] = useState<ScoutAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState<number | null>(null)
  const [, setParams] = useSearchParams()
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  useEffect(() => {
    let cancelled = false
    scoutingApi.listMissions()
      .then((res) => { if (!cancelled) setMissions(res.data) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const onDragStart = (e: DragStartEvent) => setActiveId(Number(e.active.id))
  const onDragEnd = async (e: DragEndEvent) => {
    setActiveId(null)
    const id = Number(e.active.id)
    const overId = e.over?.id as MissionStatus | undefined
    if (!overId || !COLUMNS.includes(overId)) return
    const mission = missions.find((m) => m.id === id)
    if (!mission || mission.status === overId) return

    const previous = missions
    setMissions((prev) => prev.map((m) => (m.id === id ? { ...m, status: overId } : m)))
    try {
      await scoutingApi.setMissionStatus(id, overId)
    } catch {
      setMissions(previous)
    }
  }

  const openMission = (id: number) => {
    const sp = new URLSearchParams(window.location.search)
    sp.set('mission', String(id))
    setParams(sp)
  }

  const active = activeId ? missions.find((m) => m.id === activeId) : null

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {COLUMNS.map((c) => <Skeleton key={c} className="h-64 rounded-2xl" />)}
        </div>
      ) : (
        <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 min-h-[60vh]">
            {COLUMNS.map((status) => (
              <Column key={status} status={status} missions={missions.filter((m) => m.status === status)} onOpen={openMission} />
            ))}
          </div>
          <DragOverlay>
            {active ? <Card mission={active} dragging /> : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  )
}

function Column({ status, missions, onOpen }: { status: MissionStatus; missions: ScoutAssignment[]; onOpen: (id: number) => void }) {
  const { isOver, setNodeRef } = useDroppable({ id: status })
  return (
    <div
      ref={setNodeRef}
      className={`rounded-2xl border p-3 flex flex-col transition-colors ${
        isOver
          ? 'border-turf-400 bg-turf-50 dark:bg-turf-900/20 dark:border-turf-300/30'
          : 'border-stone-200 bg-white/60 dark:bg-zinc-900/40 dark:border-stone-50/10'
      }`}
    >
      <header className="flex items-center justify-between mb-3">
        <MissionStatusBadge status={status} />
        <span className="text-[0.65rem] font-mono tabular-nums text-zinc-500 dark:text-stone-400">{missions.length}</span>
      </header>
      <div className="flex-1 space-y-2 overflow-y-auto">
        {missions.length === 0 && (
          <div className="text-xs text-zinc-400 dark:text-stone-500 text-center py-6">Vide</div>
        )}
        {missions.map((m) => (
          <DraggableCard key={m.id} mission={m} onOpen={() => onOpen(m.id)} />
        ))}
      </div>
    </div>
  )
}

function DraggableCard({ mission, onOpen }: { mission: ScoutAssignment; onOpen: () => void }) {
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({ id: mission.id })
  return (
    <motion.div
      ref={setNodeRef}
      style={{ opacity: isDragging ? 0 : 1 }}
      {...attributes}
      {...listeners}
      whileHover={{ scale: 1.005 }}
      onClick={onOpen}
      className="rounded-xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-stone-50/10 px-3 py-2.5 text-sm cursor-grab active:cursor-grabbing select-none"
    >
      <Card mission={mission} />
    </motion.div>
  )
}

function Card({ mission, dragging = false }: { mission: ScoutAssignment; dragging?: boolean }) {
  return (
    <div className={dragging ? 'rounded-xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-stone-50/10 px-3 py-2.5 text-sm shadow-diffusion w-72' : ''}>
      <div className="flex items-start gap-2 mb-1.5">
        <span className="flex-1 font-medium text-zinc-950 dark:text-stone-50 line-clamp-2">{mission.title}</span>
        <PriorityBadge priority={mission.priority} />
      </div>
      {mission.match && (
        <div className="text-[0.7rem] text-zinc-500 dark:text-stone-400 truncate">{mission.match.home_team} - {mission.match.away_team}</div>
      )}
      <div className="mt-1.5 flex items-center gap-2 text-[0.7rem] text-zinc-500 dark:text-stone-400">
        {mission.due_date && (
          <span className="inline-flex items-center gap-1">
            <Calendar size={11} />{new Date(mission.due_date).toLocaleDateString('fr-FR')}
          </span>
        )}
        {mission.assignee?.name && <span>· {mission.assignee.name}</span>}
      </div>
    </div>
  )
}

export default MissionsView
