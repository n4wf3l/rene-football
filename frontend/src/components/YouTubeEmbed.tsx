import { useState } from 'react'
import { motion } from 'framer-motion'
import { Play } from '@phosphor-icons/react'

/**
 * Facade YouTube — affiche le poster + bouton play, charge l'iframe seulement au clic.
 * Évite ~500ko de JS YouTube au premier paint et améliore le LCP.
 *
 * Utilise youtube-nocookie.com (mode privacy enhanced — pas de cookies tant qu'on n'a pas joué).
 */
interface YouTubeEmbedProps {
  videoId: string
  title: string
  poster?: string
}

function YouTubeEmbed({ videoId, title, poster }: YouTubeEmbedProps) {
  const [loaded, setLoaded] = useState(false)
  const posterUrl = poster || `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`
  const fallbackPoster = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-3xl bg-zinc-900 border border-stone-50/10 shadow-[0_30px_60px_-25px_rgba(0,0,0,0.55)] group">
      {!loaded ? (
        <button
          type="button"
          onClick={() => setLoaded(true)}
          aria-label={`Lire la vidéo : ${title}`}
          className="absolute inset-0 w-full h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-turf-300"
        >
          <img
            src={posterUrl}
            onError={(e) => { if (e.currentTarget.src !== fallbackPoster) e.currentTarget.src = fallbackPoster }}
            alt=""
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-premium group-hover:scale-[1.03]"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, rgba(10,10,10,0.18) 0%, rgba(10,10,10,0.32) 60%, rgba(10,10,10,0.65) 100%)',
            }}
          />

          <span className="absolute inset-0 grid place-items-center">
            <motion.span
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 320, damping: 22 }}
              className="relative grid place-items-center w-20 h-20 lg:w-24 lg:h-24 rounded-full bg-stone-50/95 text-zinc-950 shadow-[0_20px_50px_-15px_rgba(15,81,50,0.6)] backdrop-blur"
            >
              <span
                aria-hidden="true"
                className="absolute inset-0 rounded-full border border-stone-50/30 animate-ping opacity-60"
              />
              <Play size={32} weight="fill" className="ml-1" />
            </motion.span>
          </span>

          <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-3 text-stone-50">
            <div>
              <div className="font-mono uppercase tracking-[0.18em] text-[0.65rem] text-turf-300">
                Présentation
              </div>
              <div className="mt-1 font-display font-medium text-base lg:text-lg leading-tight max-w-[28ch]">
                {title}
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 rounded-full bg-stone-50/10 backdrop-blur px-3 py-1.5 border border-stone-50/15">
              <span className="w-1.5 h-1.5 rounded-full bg-turf-300 animate-pulse" />
              <span className="text-[0.7rem]">YouTube</span>
            </div>
          </div>
        </button>
      ) : (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
          title={title}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
        />
      )}
    </div>
  )
}

export default YouTubeEmbed
