import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, MouseEvent as ReactMouseEvent } from 'react'
import { ArrowUUpLeft, FilmSlate, FloppyDisk, Pause, Play, X } from '@phosphor-icons/react'
import type { ClipAnnotation } from '../types/clip'

export interface ClipAnnotatorProps {
  /** Called when the user finalizes a clip. Receives a Blob (PNG), the merged
     annotations JSON (re-editable), the timestamp in seconds, the natural width/height,
     and a video-source label (free-text) the user typed. */
  onSave: (payload: {
    blob: Blob
    title: string
    timestamp: number
    width: number
    height: number
    annotations: ClipAnnotation[]
    videoSourceLabel: string
    notes: string
  }) => Promise<void>
  onCancel?: () => void
}

const STROKE_PALETTE: { key: string; rgb: string }[] = [
  { key: 'turf',   rgb: '#84b896' },
  { key: 'rose',   rgb: '#fb7185' },
  { key: 'amber',  rgb: '#f59e0b' },
  { key: 'white',  rgb: '#fafaf9' },
]

/* ───────────────────── Frame compositor ─────────────────────
   Render: the latest video frame painted into a hidden canvas, with all
   committed arrows drawn on top using fresh canvas ops every frame.
   When the user is mid-drag we additionally render a "preview" arrow.
   This keeps the React tree shallow and the canvas always authoritative. */
function drawArrow(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number, x2: number, y2: number,
  color: string,
  width: number,
) {
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.hypot(dx, dy) || 1
  const headLen = Math.max(width * 4, Math.min(28, len * 0.25))
  const angle = Math.atan2(dy, dx)

  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = width

  // Shaft (stop short so the head sits flush)
  const shaftEnd = {
    x: x2 - Math.cos(angle) * headLen * 0.5,
    y: y2 - Math.sin(angle) * headLen * 0.5,
  }
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(shaftEnd.x, shaftEnd.y)
  ctx.stroke()

  // Head (filled triangle)
  ctx.beginPath()
  ctx.moveTo(x2, y2)
  ctx.lineTo(
    x2 - Math.cos(angle - Math.PI / 7) * headLen,
    y2 - Math.sin(angle - Math.PI / 7) * headLen,
  )
  ctx.lineTo(
    x2 - Math.cos(angle + Math.PI / 7) * headLen,
    y2 - Math.sin(angle + Math.PI / 7) * headLen,
  )
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

export default function ClipAnnotator({ onSave, onCancel }: ClipAnnotatorProps) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [paused, setPaused] = useState(false)
  const [arrows, setArrows] = useState<ClipAnnotation[]>([])
  const [strokeColor, setStrokeColor] = useState('#84b896')
  const [strokeWidth, setStrokeWidth] = useState(4)
  const [drag, setDrag] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null)
  const [title, setTitle] = useState('')
  const [videoLabel, setVideoLabel] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // Revoke blob URL on unmount / change.
  useEffect(() => {
    return () => { if (videoUrl) URL.revokeObjectURL(videoUrl) }
  }, [videoUrl])

  // Re-paint the canvas whenever something visual changed.
  useEffect(() => {
    paintCanvas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, arrows, drag])

  function paintCanvas() {
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video || !video.videoWidth) return
    const W = video.videoWidth
    const H = video.videoHeight
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Frame
    ctx.drawImage(video, 0, 0, W, H)

    // Committed arrows (ratios → px)
    arrows.forEach((a) => {
      drawArrow(
        ctx,
        a.x1 * W, a.y1 * H,
        a.x2 * W, a.y2 * H,
        a.color,
        a.width ?? 4,
      )
    })

    // Drag preview
    if (drag) {
      drawArrow(ctx, drag.x1, drag.y1, drag.x2, drag.y2, strokeColor, strokeWidth)
    }
  }

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (videoUrl) URL.revokeObjectURL(videoUrl)
    setVideoUrl(URL.createObjectURL(file))
    setArrows([])
    setPaused(false)
    setError(null)
  }

  function togglePlay() {
    const v = videoRef.current
    if (!v) return
    if (v.paused) { v.play(); setPaused(false) }
    else { v.pause(); setPaused(true); paintCanvas() }
  }

  // Translate a mouse event into canvas-pixel coordinates.
  function localCoords(e: ReactMouseEvent<HTMLCanvasElement>): { x: number; y: number } {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
  }

  function onCanvasMouseDown(e: ReactMouseEvent<HTMLCanvasElement>) {
    if (!paused) return
    const { x, y } = localCoords(e)
    setDrag({ x1: x, y1: y, x2: x, y2: y })
  }
  function onCanvasMouseMove(e: ReactMouseEvent<HTMLCanvasElement>) {
    if (!drag) return
    const { x, y } = localCoords(e)
    setDrag((d) => (d ? { ...d, x2: x, y2: y } : null))
  }
  function onCanvasMouseUp(_e: ReactMouseEvent<HTMLCanvasElement>) {
    if (!drag) return
    const canvas = canvasRef.current!
    // Only commit if the drag had non-trivial length.
    const len = Math.hypot(drag.x2 - drag.x1, drag.y2 - drag.y1)
    if (len > 8) {
      setArrows((prev) => [
        ...prev,
        {
          type: 'arrow',
          x1: drag.x1 / canvas.width,
          y1: drag.y1 / canvas.height,
          x2: drag.x2 / canvas.width,
          y2: drag.y2 / canvas.height,
          color: strokeColor,
          width: strokeWidth,
        },
      ])
    }
    setDrag(null)
  }

  function undo() { setArrows((a) => a.slice(0, -1)) }
  function clearAll() { setArrows([]) }

  async function save() {
    setError(null)
    if (!title.trim()) { setError('Donne un titre court à ce moment.'); return }
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video) return

    paintCanvas()
    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) { setError('Capture impossible. Réessaie.'); return }

    setSaving(true)
    try {
      await onSave({
        blob,
        title: title.trim(),
        timestamp: video.currentTime,
        width: canvas.width,
        height: canvas.height,
        annotations: arrows,
        videoSourceLabel: videoLabel.trim(),
        notes: notes.trim(),
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de l\'enregistrement.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Step 1 - pick a file */}
      {!videoUrl && (
        <label className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-stone-300 dark:border-stone-50/15 bg-white dark:bg-zinc-900/30 px-6 py-14 cursor-pointer hover:border-zinc-500 dark:hover:border-stone-50/30 transition">
          <FilmSlate size={28} weight="duotone" className="text-zinc-400 dark:text-stone-500" />
          <div className="text-sm font-medium text-zinc-900 dark:text-stone-100">
            Glisse une vidéo ou clique pour choisir
          </div>
          <div className="text-xs text-zinc-500 dark:text-stone-400 max-w-md text-center">
            La vidéo reste <span className="font-medium text-turf-700 dark:text-turf-300">dans ton navigateur</span> - seul le moment annoté final sera envoyé au serveur.
          </div>
          <input type="file" accept="video/*" onChange={onFile} className="hidden" />
        </label>
      )}

      {videoUrl && (
        <>
          {/* Hidden HTML5 video, paint source */}
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            preload="metadata"
            className="w-full max-h-[60dvh] rounded-2xl bg-black"
            onPause={() => { setPaused(true); paintCanvas() }}
            onPlay={() => setPaused(false)}
            onSeeked={() => paintCanvas()}
            onLoadedMetadata={() => paintCanvas()}
          />

          {/* Compositor canvas - only displayed when paused */}
          {paused && (
            <div className="space-y-3">
              <div className="relative rounded-2xl overflow-hidden bg-black">
                <canvas
                  ref={canvasRef}
                  className="w-full h-auto select-none cursor-crosshair"
                  onMouseDown={onCanvasMouseDown}
                  onMouseMove={onCanvasMouseMove}
                  onMouseUp={onCanvasMouseUp}
                  onMouseLeave={() => drag && setDrag(null)}
                />
              </div>

              {/* Toolbar */}
              <div className="flex flex-wrap items-center gap-2 rounded-xl bg-stone-100 dark:bg-zinc-900/50 px-3 py-2">
                <span className="text-[0.65rem] font-mono uppercase tracking-[0.18em] text-zinc-500 dark:text-stone-400 mr-2">
                  Couleur
                </span>
                {STROKE_PALETTE.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setStrokeColor(c.rgb)}
                    aria-label={`Couleur ${c.key}`}
                    className={`w-6 h-6 rounded-full transition ${
                      strokeColor === c.rgb
                        ? 'ring-2 ring-offset-2 ring-zinc-900 dark:ring-stone-50 dark:ring-offset-zinc-900'
                        : 'opacity-80 hover:opacity-100'
                    }`}
                    style={{ background: c.rgb }}
                  />
                ))}

                <span className="text-[0.65rem] font-mono uppercase tracking-[0.18em] text-zinc-500 dark:text-stone-400 ml-3 mr-2">
                  Trait
                </span>
                {[2, 4, 6, 9].map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setStrokeWidth(w)}
                    className={`grid place-items-center w-7 h-7 rounded-md text-[0.65rem] font-mono ${
                      strokeWidth === w
                        ? 'bg-zinc-950 text-stone-50 dark:bg-stone-50 dark:text-zinc-950'
                        : 'text-zinc-700 hover:bg-stone-200 dark:text-stone-300 dark:hover:bg-stone-50/10'
                    }`}
                  >
                    {w}
                  </button>
                ))}

                <div className="ml-auto flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={undo}
                    disabled={arrows.length === 0}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs border border-stone-300 dark:border-stone-50/15 hover:border-zinc-500 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    <ArrowUUpLeft size={12} weight="bold" />
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={clearAll}
                    disabled={arrows.length === 0}
                    className="px-2.5 py-1 rounded-md text-xs border border-stone-300 dark:border-stone-50/15 hover:border-rose-500 hover:text-rose-700 dark:hover:text-rose-400 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    Tout effacer
                  </button>
                </div>
              </div>

              <p className="text-[0.7rem] text-zinc-500 dark:text-stone-500">
                Astuce : <span className="font-medium">drag</span> sur la frame pour dessiner une flèche.
                Reprends la lecture à tout moment.
              </p>
            </div>
          )}

          {!paused && (
            <button
              type="button"
              onClick={togglePlay}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs border border-stone-300 dark:border-stone-50/15 hover:border-zinc-500 transition"
            >
              <Pause size={12} weight="bold" />
              Mettre en pause pour annoter
            </button>
          )}

          {paused && (
            <button
              type="button"
              onClick={togglePlay}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs border border-stone-300 dark:border-stone-50/15 hover:border-zinc-500 transition"
            >
              <Play size={12} weight="bold" />
              Reprendre la lecture
            </button>
          )}

          {/* Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-stone-200 dark:border-stone-50/10">
            <label className="block">
              <span className="block text-[0.65rem] font-mono uppercase tracking-[0.16em] text-zinc-500 dark:text-stone-400 mb-1">
                Titre du moment <span className="text-rose-700">*</span>
              </span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Appel diagonal sur la 2e mi-temps"
                maxLength={160}
                className="w-full rounded-lg border border-stone-300 bg-white text-sm text-zinc-900 dark:border-stone-50/15 dark:bg-zinc-900 dark:text-stone-50 px-3 py-2 focus:outline-none focus:border-zinc-900 dark:focus:border-stone-50/30"
              />
            </label>
            <label className="block">
              <span className="block text-[0.65rem] font-mono uppercase tracking-[0.16em] text-zinc-500 dark:text-stone-400 mb-1">
                Source vidéo <span className="text-zinc-400">(optionnel)</span>
              </span>
              <input
                type="text"
                value={videoLabel}
                onChange={(e) => setVideoLabel(e.target.value)}
                placeholder="Borussia vs Bayern · 67e min"
                maxLength={200}
                className="w-full rounded-lg border border-stone-300 bg-white text-sm text-zinc-900 dark:border-stone-50/15 dark:bg-zinc-900 dark:text-stone-50 px-3 py-2 focus:outline-none focus:border-zinc-900 dark:focus:border-stone-50/30"
              />
            </label>
            <label className="block md:col-span-2">
              <span className="block text-[0.65rem] font-mono uppercase tracking-[0.16em] text-zinc-500 dark:text-stone-400 mb-1">
                Notes scout <span className="text-zinc-400">(optionnel)</span>
              </span>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={2000}
                placeholder="Ce qu'on retient sur ce moment précis…"
                className="w-full rounded-lg border border-stone-300 bg-white text-sm text-zinc-900 dark:border-stone-50/15 dark:bg-zinc-900 dark:text-stone-50 px-3 py-2 focus:outline-none focus:border-zinc-900 dark:focus:border-stone-50/30"
              />
            </label>
          </div>

          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50/60 dark:bg-rose-500/10 dark:border-rose-500/30 px-3 py-2 text-xs text-rose-800 dark:text-rose-200">
              {error}
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={save}
              disabled={saving || !paused || !title.trim()}
              className="btn btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FloppyDisk size={14} weight="bold" />
              {saving ? 'Enregistrement…' : 'Enregistrer ce moment'}
            </button>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs text-zinc-600 dark:text-stone-400 hover:text-zinc-900 dark:hover:text-stone-50 transition"
              >
                <X size={12} weight="bold" />
                Annuler
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
