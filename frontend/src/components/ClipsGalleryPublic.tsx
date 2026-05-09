import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CaretLeft, CaretRight, X } from '@phosphor-icons/react'
import type { PlayerClip } from '../types/clip'

export interface ClipsGalleryPublicProps {
  clips: PlayerClip[]
}

const FR_DURATION = (sec: number | null): string => {
  if (sec == null) return ''
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function ClipsGalleryPublic({ clips }: ClipsGalleryPublicProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const open = openIndex != null ? clips[openIndex] : null

  // Keyboard nav (← →, Escape) when the lightbox is open.
  useEffect(() => {
    if (openIndex == null) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenIndex(null)
      else if (e.key === 'ArrowRight') setOpenIndex((i) => (i == null ? null : (i + 1) % clips.length))
      else if (e.key === 'ArrowLeft') setOpenIndex((i) => (i == null ? null : (i - 1 + clips.length) % clips.length))
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [openIndex, clips.length])

  if (clips.length === 0) return null

  return (
    <>
      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
        {clips.map((clip, idx) => (
          <li key={clip.id}>
            <button
              type="button"
              onClick={() => setOpenIndex(idx)}
              className="group block w-full text-left rounded-2xl overflow-hidden bg-stone-100 dark:bg-zinc-900 border border-stone-200/80 dark:border-stone-50/8 hover:border-zinc-400 dark:hover:border-stone-50/30 transition"
            >
              <div className="relative aspect-video bg-black">
                <img
                  src={clip.image_path}
                  alt={clip.title}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-premium group-hover:scale-[1.04]"
                />
                {clip.timestamp_seconds != null && (
                  <span className="absolute top-2 left-2 font-mono text-[0.7rem] tabular-nums text-stone-50 bg-zinc-950/60 backdrop-blur px-2 py-0.5 rounded-full">
                    {FR_DURATION(clip.timestamp_seconds)}
                  </span>
                )}
              </div>
              <div className="p-4">
                <div className="font-display font-medium text-base text-zinc-950 dark:text-stone-50 leading-tight line-clamp-2">
                  {clip.title}
                </div>
                {clip.video_source_label && (
                  <div className="mt-1.5 text-[0.7rem] font-mono uppercase tracking-wider text-zinc-500 dark:text-stone-500 truncate">
                    {clip.video_source_label}
                  </div>
                )}
              </div>
            </button>
          </li>
        ))}
      </ul>

      <AnimatePresence>
        {open && (
          <motion.div
            key="lightbox"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-zinc-950/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-8"
            onClick={() => setOpenIndex(null)}
          >
            <button
              type="button"
              aria-label="Fermer"
              onClick={(e) => { e.stopPropagation(); setOpenIndex(null) }}
              className="absolute top-4 right-4 grid place-items-center w-10 h-10 rounded-full bg-stone-50/10 hover:bg-stone-50/20 text-stone-50 backdrop-blur transition"
            >
              <X size={18} weight="bold" />
            </button>
            {clips.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Moment précédent"
                  onClick={(e) => { e.stopPropagation(); setOpenIndex((i) => (i == null ? null : (i - 1 + clips.length) % clips.length)) }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 grid place-items-center w-10 h-10 rounded-full bg-stone-50/10 hover:bg-stone-50/20 text-stone-50 backdrop-blur transition"
                >
                  <CaretLeft size={18} weight="bold" />
                </button>
                <button
                  type="button"
                  aria-label="Moment suivant"
                  onClick={(e) => { e.stopPropagation(); setOpenIndex((i) => (i == null ? null : (i + 1) % clips.length)) }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 grid place-items-center w-10 h-10 rounded-full bg-stone-50/10 hover:bg-stone-50/20 text-stone-50 backdrop-blur transition"
                >
                  <CaretRight size={18} weight="bold" />
                </button>
              </>
            )}
            <motion.figure
              key={open.id}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 240, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-5xl w-full"
            >
              <img
                src={open.image_path}
                alt={open.title}
                className="w-full max-h-[70dvh] object-contain rounded-xl bg-black"
              />
              <figcaption className="mt-4 text-center">
                <div className="font-display font-semibold text-lg lg:text-xl text-stone-50">
                  {open.title}
                </div>
                {open.video_source_label && (
                  <div className="mt-1 font-mono uppercase tracking-wider text-[0.65rem] text-stone-400">
                    {open.video_source_label} · {FR_DURATION(open.timestamp_seconds)}
                  </div>
                )}
                {open.notes && (
                  <p className="mt-3 text-sm text-stone-300 max-w-2xl mx-auto leading-relaxed">
                    {open.notes}
                  </p>
                )}
              </figcaption>
            </motion.figure>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
