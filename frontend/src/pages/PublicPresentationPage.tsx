import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { DownloadSimple, FilePdf, Person, User } from '@phosphor-icons/react'
import { api, ApiError } from '../api/client'

/**
 * Public landing page for a shared presentation link.
 *
 * The URL /p/:token is what the agency actually sends to a club. It wraps
 * the raw PDF in a branded frame (agency name, player identity, agent, date,
 * download button) so a club recipient gets context instead of a naked PDF.
 * The PDF itself is served by GET /api/presentations/{token} — this page
 * embeds it in an iframe and also offers a direct download.
 */

interface Meta {
  title: string
  template_key: string
  generated_at: string | null
  pdf_url: string
  player: {
    name: string
    position: string | null
    club: string | null
    photo_url: string | null
  } | null
  agent: string | null
}

const TEMPLATE_LABEL: Record<string, string> = {
  classic:   "Carte d'identité",
  signature: 'Signature',
  magazine:  'Magazine',
  minimal:   'Minimal',
  stadium:   'Stadium',
}

function fmtDate(value: string | null): string {
  if (!value) return ''
  const d = new Date(value)
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

export default function PublicPresentationPage() {
  const { token } = useParams<{ token: string }>()
  const [meta, setMeta] = useState<Meta | null>(null)
  const [error, setError] = useState<'gone' | 'unknown' | null>(null)

  useEffect(() => {
    if (!token) { setError('unknown'); return }
    api.get<{ data: Meta }>(`/presentations/${token}/meta`)
      .then((res) => setMeta(res.data))
      .catch((err: unknown) => {
        setError(err instanceof ApiError && err.status === 404 ? 'gone' : 'unknown')
      })
  }, [token])

  if (error) {
    return (
      <div className="min-h-screen grid place-items-center bg-stone-100 dark:bg-zinc-950 px-6">
        <div className="max-w-md text-center space-y-4">
          <FilePdf size={48} weight="regular" className="mx-auto text-zinc-400 dark:text-stone-600" />
          <h1 className="font-display font-semibold text-2xl text-zinc-950 dark:text-stone-50">
            {error === 'gone' ? 'Présentation introuvable' : 'Une erreur est survenue'}
          </h1>
          <p className="text-sm text-zinc-600 dark:text-stone-400">
            {error === 'gone'
              ? 'Ce lien n\'est plus valide ou la présentation a été retirée par l\'agence.'
              : 'Impossible de charger la présentation. Vérifiez votre connexion et réessayez.'}
          </p>
          <a href="/" className="inline-block text-xs font-medium text-turf-700 dark:text-turf-300 hover:underline">
            Retour au site Rene Football
          </a>
        </div>
      </div>
    )
  }

  if (!meta) {
    return (
      <div className="min-h-screen grid place-items-center bg-stone-100 dark:bg-zinc-950">
        <div className="text-xs font-mono uppercase tracking-[0.2em] text-zinc-500 dark:text-stone-500 animate-pulse">
          Chargement…
        </div>
      </div>
    )
  }

  const downloadName = meta.player
    ? `presentation-${meta.player.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`
    : 'presentation.pdf'

  return (
    <div className="min-h-screen flex flex-col bg-stone-100 dark:bg-zinc-950">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-zinc-900 border-b border-stone-200 dark:border-stone-50/10"
      >
        <div className="max-w-5xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            {meta.player?.photo_url ? (
              <img src={meta.player.photo_url} alt="" className="w-11 h-11 rounded-full object-cover ring-2 ring-turf-600/20" />
            ) : (
              <div className="w-11 h-11 rounded-full bg-stone-200 dark:bg-stone-50/10 grid place-items-center text-zinc-500">
                <Person size={18} weight="regular" />
              </div>
            )}
            <div className="min-w-0">
              <div className="text-[0.6rem] font-mono uppercase tracking-[0.18em] text-turf-700 dark:text-turf-300">
                Rene Football · Présentation joueur
              </div>
              <div className="font-display font-semibold text-lg text-zinc-950 dark:text-stone-50 truncate">
                {meta.player?.name ?? meta.title}
              </div>
              <div className="text-xs text-zinc-500 dark:text-stone-400 truncate">
                {[meta.player?.position, meta.player?.club].filter(Boolean).join(' · ')}
              </div>
            </div>
          </div>

          <a
            href={meta.pdf_url}
            download={downloadName}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-turf-700 text-white hover:bg-turf-800 text-sm font-medium transition shadow-sm"
          >
            <DownloadSimple size={16} weight="bold" />
            Télécharger le PDF
          </a>
        </div>

        <div className="max-w-5xl mx-auto px-6 pb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.65rem] font-mono uppercase tracking-[0.14em] text-zinc-500 dark:text-stone-500">
          {meta.agent && (
            <span className="inline-flex items-center gap-1.5">
              <User size={11} weight="bold" />
              Envoyée par {meta.agent}
            </span>
          )}
          {meta.generated_at && <span>· Générée le {fmtDate(meta.generated_at)}</span>}
          <span>· Template {TEMPLATE_LABEL[meta.template_key] ?? meta.template_key}</span>
        </div>
      </motion.header>

      {/* PDF viewer */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.05 }}
          className="w-full h-[calc(100vh-11rem)] min-h-[520px] rounded-xl overflow-hidden shadow-xl border border-stone-200 dark:border-stone-50/10 bg-white"
        >
          <iframe
            title={meta.title}
            src={`${meta.pdf_url}#toolbar=1&navpanes=0&scrollbar=1`}
            className="w-full h-full"
          />
        </motion.div>
      </main>

      <footer className="max-w-5xl mx-auto w-full px-6 py-4 text-[0.65rem] font-mono uppercase tracking-[0.18em] text-zinc-400 dark:text-stone-600 text-center">
        Document confidentiel · Rene Football
      </footer>
    </div>
  )
}
