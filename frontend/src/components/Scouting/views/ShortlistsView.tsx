import { useEffect, useState } from 'react'
import {
  DndContext, DragOverlay, PointerSensor, useDraggable, useDroppable, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core'
import { motion } from 'framer-motion'
import { useSearchParams } from 'react-router-dom'
import { scoutingApi } from '../../../lib/scoutingApi'
import type { ScoutingPlayer, Shortlist, ShortlistStage } from '../../../types/scouting'
import { STAGE_LABEL } from '../../../types/scouting'
import Skeleton from '../../Skeleton'
import { ScoreBadge, StageBadge } from '../badges'

const STAGES: ShortlistStage[] = ['watchlist', 'shortlist_b', 'shortlist_a', 'valide', 'rejete']

type PlayerWithPivot = ScoutingPlayer & {
  pivot: {
    id: number; rank: number; stage: ShortlistStage; reason: string | null;
    next_action: string | null; estimated_price: number | null;
    risk_level: string | null; confidence_score: number | null;
  }
}

function ShortlistsView() {
  const [, setParams] = useSearchParams()
  const [lists, setLists] = useState<Shortlist[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [detail, setDetail] = useState<Shortlist | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState<number | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  useEffect(() => {
    let cancelled = false
    scoutingApi.listShortlists()
      .then((res) => {
        if (cancelled) return
        setLists(res.data)
        if (res.data.length > 0 && !selected) setSelected(res.data[0].slug)
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line
  }, [])

  useEffect(() => {
    if (!selected) { setDetail(null); return }
    let cancelled = false
    scoutingApi.showShortlist(selected).then((res) => { if (!cancelled) setDetail(res.data) })
    return () => { cancelled = true }
  }, [selected])

  const players = (detail?.players ?? []) as unknown as PlayerWithPivot[]

  const onDragStart = (e: DragStartEvent) => setActiveId(Number(e.active.id))
  const onDragEnd = async (e: DragEndEvent) => {
    setActiveId(null)
    const entryId = Number(e.active.id)
    const overStage = e.over?.id as ShortlistStage | undefined
    if (!overStage || !STAGES.includes(overStage) || !detail) return

    const player = players.find((p) => p.pivot.id === entryId)
    if (!player || player.pivot.stage === overStage) return

    const previous = detail.players
    setDetail((d) => d ? {
      ...d,
      players: d.players?.map((pl) => pl.pivot.id === entryId ? ({ ...pl, pivot: { ...pl.pivot, stage: overStage } }) as any : pl),
    } : d)

    try {
      await scoutingApi.updateShortlistEntry(detail.slug, entryId, { stage: overStage })
    } catch {
      setDetail((d) => d ? { ...d, players: previous } : d)
    }
  }

  const openPlayer = (slug: string) => {
    const sp = new URLSearchParams(window.location.search)
    sp.set('player', slug)
    setParams(sp)
  }

  const active = activeId ? players.find((p) => p.pivot.id === activeId) : null

  if (loading) return <Skeleton className="h-72 rounded-2xl" />

  if (lists.length === 0) return (
    <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-stone-50/10 p-12 text-center">
      <p className="text-sm text-zinc-600 dark:text-stone-400">Aucune shortlist. Crée-en une depuis l'API admin scouting.</p>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {lists.map((l) => {
          const active = selected === l.slug
          return (
            <button
              key={l.slug}
              type="button"
              onClick={() => setSelected(l.slug)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                active
                  ? 'bg-zinc-950 border-zinc-950 text-stone-50 dark:bg-stone-50 dark:border-stone-50 dark:text-zinc-950'
                  : 'bg-white border-stone-300 text-zinc-700 hover:border-zinc-500 dark:bg-zinc-900 dark:border-stone-50/15 dark:text-stone-300 dark:hover:border-stone-50/40'
              }`}
            >
              {l.name}
              {l.need && <span className="ml-2 text-[0.65rem] text-zinc-400 dark:text-stone-500">· {l.need.position}</span>}
            </button>
          )
        })}
      </div>

      {detail && (
        <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 min-h-[60vh]">
            {STAGES.map((stage) => (
              <StageColumn
                key={stage}
                stage={stage}
                entries={players.filter((p) => p.pivot.stage === stage)}
                onOpenPlayer={openPlayer}
              />
            ))}
          </div>
          <DragOverlay>{active ? <PlayerCard player={active} dragging /> : null}</DragOverlay>
        </DndContext>
      )}
    </div>
  )
}

function StageColumn({ stage, entries, onOpenPlayer }: { stage: ShortlistStage; entries: PlayerWithPivot[]; onOpenPlayer: (slug: string) => void }) {
  const { isOver, setNodeRef } = useDroppable({ id: stage })
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
        <StageBadge stage={stage} />
        <span className="text-[0.65rem] font-mono tabular-nums text-zinc-500 dark:text-stone-400">{entries.length}</span>
      </header>
      <div className="flex-1 space-y-2 overflow-y-auto">
        {entries.length === 0 && (
          <div className="text-xs text-zinc-400 dark:text-stone-500 text-center py-6">{STAGE_LABEL[stage]} : vide</div>
        )}
        {entries.map((p) => (
          <DraggablePlayer key={p.pivot.id} player={p} onOpen={() => onOpenPlayer(p.slug)} />
        ))}
      </div>
    </div>
  )
}

function DraggablePlayer({ player, onOpen }: { player: PlayerWithPivot; onOpen: () => void }) {
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({ id: player.pivot.id })
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
      <PlayerCard player={player} />
    </motion.div>
  )
}

function PlayerCard({ player, dragging = false }: { player: PlayerWithPivot; dragging?: boolean }) {
  return (
    <div className={dragging ? 'rounded-xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-stone-50/10 px-3 py-2.5 text-sm shadow-diffusion w-64' : ''}>
      <div className="flex items-center gap-2">
        <img src={player.photo_url || ''} alt="" className="w-8 h-8 rounded-full object-cover bg-stone-200 dark:bg-stone-800" />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-zinc-950 dark:text-stone-50 truncate">{player.name}</div>
          <div className="text-[0.65rem] text-zinc-500 dark:text-stone-400 truncate">{player.position}</div>
        </div>
        <ScoreBadge score={player.score_global} />
      </div>
      {player.pivot.reason && (
        <p className="mt-1.5 text-[0.7rem] text-zinc-600 dark:text-stone-400 line-clamp-2">{player.pivot.reason}</p>
      )}
      {player.pivot.next_action && (
        <div className="mt-1.5 text-[0.7rem] text-amber-700 dark:text-amber-300 truncate">→ {player.pivot.next_action}</div>
      )}
    </div>
  )
}

export default ShortlistsView
