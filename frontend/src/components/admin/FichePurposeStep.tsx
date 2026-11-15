import { Link } from 'react-router-dom'
import { ArrowRight, ArrowsClockwise, FileText, Handshake } from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import type { Player } from '../../types/player'
import { playerImage } from '../../lib/playerImage'

interface FichePurposeStepProps {
  player: Player
  onPresentation: () => void
  onChangePlayer: () => void
}

interface Option {
  title: string
  body: string
  format: string
  Icon: Icon
}

const PRESENTATION: Option = {
  title: 'Présentation',
  body: 'Fiche du joueur pour les clubs et recruteurs : profil, statistiques, parcours.',
  format: 'PDF A4',
  Icon: FileText,
}

const ANNOUNCEMENTS: (Option & { type: string })[] = [
  {
    type: 'recrutement',
    title: 'Recrutement',
    body: 'Annonce de sa signature dans un club, prête à publier.',
    format: 'Image 4:5 · PDF',
    Icon: Handshake,
  },
  {
    type: 'prolongation',
    title: 'Prolongation',
    body: 'Annonce de la prolongation de son contrat, prête à publier.',
    format: 'Image 4:5 · PDF',
    Icon: ArrowsClockwise,
  },
]

function Row({ option }: { option: Option }) {
  const { Icon } = option
  return (
    <>
      <span className="grid place-items-center w-12 h-12 rounded-xl bg-stone-100 text-zinc-800 dark:bg-stone-50/5 dark:text-stone-200 shrink-0 transition group-hover:bg-zinc-950 group-hover:text-stone-50 dark:group-hover:bg-stone-50 dark:group-hover:text-zinc-950">
        <Icon size={22} weight="regular" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2 flex-wrap">
          <span className="font-display font-semibold text-lg text-zinc-950 dark:text-stone-50">{option.title}</span>
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-turf-700 dark:text-turf-300">{option.format}</span>
        </span>
        <span className="mt-0.5 block text-sm text-zinc-500 dark:text-stone-400">{option.body}</span>
      </span>
      <ArrowRight size={18} weight="bold" className="text-zinc-300 dark:text-stone-600 shrink-0 transition group-hover:translate-x-0.5 group-hover:text-zinc-900 dark:group-hover:text-stone-100" />
    </>
  )
}

const ROW = 'group w-full flex items-center gap-4 rounded-2xl border border-stone-200 dark:border-stone-50/10 px-4 py-4 text-left hover:border-zinc-400 dark:hover:border-stone-50/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-turf-500/60 transition'

/**
 * Second step of a new document, once the player is chosen: what is it for?
 * A presentation stays in this editor; a signing or an extension opens the
 * announcement page, which makes a ready-to-post visual.
 */
export default function FichePurposeStep({ player, onPresentation, onChangePlayer }: FichePurposeStepProps) {
  const q = (type: string) => `/admin/presentations/annonce?joueur=${encodeURIComponent(player.slug)}&type=${type}`

  return (
    <div
      className="relative w-full rounded-lg overflow-hidden shadow-2xl border border-stone-300/70 dark:border-stone-50/15 bg-white dark:bg-zinc-900 flex flex-col"
      style={{ aspectRatio: '210 / 297' }}
    >
      <div className="px-6 sm:px-10 pt-8 sm:pt-12">
        <span className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-turf-700 dark:text-turf-300">
          Étape 2 · Document
        </span>
        <div className="mt-4 flex items-center gap-3">
          <img src={playerImage(player)} alt="" className="w-12 h-12 rounded-full object-cover object-top bg-stone-200 dark:bg-zinc-800" />
          <div className="min-w-0 flex-1">
            <div className="font-medium text-zinc-950 dark:text-stone-50 truncate">{player.name}</div>
            <div className="text-[0.65rem] font-mono uppercase tracking-wider text-zinc-500 dark:text-stone-500 truncate">
              {[player.position, player.club].filter(Boolean).join(' · ')}
            </div>
          </div>
          <button type="button" onClick={onChangePlayer} className="text-xs font-medium text-turf-700 dark:text-turf-300 hover:underline shrink-0">
            Changer
          </button>
        </div>
        <h2 className="mt-8 font-display font-semibold text-2xl sm:text-3xl tracking-tight text-zinc-950 dark:text-stone-50">
          C’est pour quoi ?
        </h2>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-6 sm:px-10 py-6 space-y-3">
        <button type="button" onClick={onPresentation} className={ROW} autoFocus>
          <Row option={PRESENTATION} />
        </button>
        {ANNOUNCEMENTS.map((o) => (
          <Link key={o.type} to={q(o.type)} className={ROW}>
            <Row option={o} />
          </Link>
        ))}
      </div>
    </div>
  )
}
