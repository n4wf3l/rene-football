import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import * as pdfjs from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { api, ApiError } from '../api/client'
import type { FicheRenderMeta, PresentationOptions } from '../types/presentation'

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

/**
 * Live preview of a presentation = the real PDF.
 *
 * Every change (debounced) is rendered server-side by the same engine that
 * produces the shared file — same layout, fonts, framing, density choices —
 * and the returned PDF is painted with pdf.js. What the admin sees is the
 * document itself, not an HTML approximation. Unsaved edits are sent as
 * options / overrides and never written to the database.
 */

export interface PresentationPreviewResult {
  /** Object URL of the last successfully rendered PDF (null while none). */
  pdfUrl: string | null
  layout: FicheRenderMeta | null
  /** Admin-facing message when the fiche cannot fit on one page. */
  error: string | null
  details: string[]
}

export interface PresentationPreviewProps {
  playerId: number | null
  options: PresentationOptions
  /** Unsaved bio typed in the editor (preview only). */
  bioOverride?: string | null
  /** Existing presentation id, so an attached external fiche is previewed. */
  presentationId?: number | null
  /** Bumps to force a re-render (e.g. after an upload). */
  refreshKey?: number
  onResult?: (r: PresentationPreviewResult) => void
}

const DEBOUNCE_MS = 700

export default function PresentationPreview({ playerId, options, bioOverride, presentationId, refreshKey = 0, onResult }: PresentationPreviewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [width, setWidth] = useState(0)
  const [pdfData, setPdfData] = useState<Uint8Array | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const urlRef = useRef<string | null>(null)
  const onResultRef = useRef(onResult)
  onResultRef.current = onResult

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const measure = () => setWidth(el.clientWidth)
    measure()
    const obs = new ResizeObserver(measure)
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // Debounced render request; stale responses are aborted.
  const payload = JSON.stringify({ playerId, options, bioOverride, presentationId, refreshKey })
  useEffect(() => {
    if (!playerId) {
      setPdfData(null)
      setError(null)
      return
    }
    const ctrl = new AbortController()
    const t = window.setTimeout(async () => {
      setLoading(true)
      try {
        const res = await api.post<{ pdf: string; layout: FicheRenderMeta }>(
          '/admin/presentations/preview-pdf',
          {
            player_id: playerId,
            options,
            overrides: bioOverride !== undefined && bioOverride !== null ? { bio: bioOverride } : undefined,
            presentation_id: presentationId ?? undefined,
          },
          { auth: true, signal: ctrl.signal },
        )
        const bytes = Uint8Array.from(atob(res.pdf), (c) => c.charCodeAt(0))
        if (urlRef.current) URL.revokeObjectURL(urlRef.current)
        urlRef.current = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }))
        setPdfData(bytes)
        setError(null)
        onResultRef.current?.({ pdfUrl: urlRef.current, layout: res.layout, error: null, details: [] })
      } catch (err: unknown) {
        if (ctrl.signal.aborted) return
        const msg = err instanceof Error ? err.message : 'Aperçu impossible.'
        const details = err instanceof ApiError && err.data && typeof err.data === 'object' && 'details' in err.data
          ? ((err.data as { details?: unknown }).details as string[] | undefined) ?? []
          : []
        setError(msg)
        onResultRef.current?.({ pdfUrl: urlRef.current, layout: null, error: msg, details })
      } finally {
        if (!ctrl.signal.aborted) setLoading(false)
      }
    }, DEBOUNCE_MS)
    return () => { ctrl.abort(); window.clearTimeout(t) }
    // payload captures every input that changes the render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload])

  useEffect(() => () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current) }, [])

  // Paint page 1 at device resolution.
  useEffect(() => {
    if (!pdfData || !width || !canvasRef.current) return
    let cancelled = false
    const task = pdfjs.getDocument({ data: pdfData.slice() })
    task.promise.then(async (doc) => {
      const page = await doc.getPage(1)
      if (cancelled) return
      const base = page.getViewport({ scale: 1 })
      const dpr = window.devicePixelRatio || 1
      const viewport = page.getViewport({ scale: (width / base.width) * dpr })
      const canvas = canvasRef.current
      if (!canvas) return
      canvas.width = Math.floor(viewport.width)
      canvas.height = Math.floor(viewport.height)
      canvas.style.width = `${width}px`
      canvas.style.height = `${(width * base.height) / base.width}px`
      await page.render({ canvas, viewport }).promise

    }).catch(() => { /* a newer render replaced this one */ })
    return () => { cancelled = true; task.destroy() }
  }, [pdfData, width])

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-lg overflow-hidden shadow-2xl border border-stone-300/70 dark:border-stone-50/15 bg-stone-200 dark:bg-zinc-900"
      style={{ aspectRatio: '210 / 297' }}
    >
      {pdfData && <canvas ref={canvasRef} className={`block transition-opacity ${loading || error ? 'opacity-40' : ''}`} />}
      {!pdfData && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-500 dark:text-stone-500 text-center px-6">
          {playerId ? (loading ? 'Génération du PDF…' : '') : 'Sélectionnez un joueur pour voir la fiche.'}
        </div>
      )}
      {loading && pdfData && (
        <div className="absolute top-2 right-2 px-2 py-1 rounded-md bg-black/60 text-stone-100 text-[0.6rem] font-mono uppercase tracking-wider">
          Rendu PDF…
        </div>
      )}
      {error && !loading && (
        <div className="absolute inset-x-3 bottom-3 rounded-lg bg-rose-600 text-white text-xs px-3 py-2 shadow-lg">
          {error}
        </div>
      )}
    </div>
  )
}
