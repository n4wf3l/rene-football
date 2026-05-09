import { Link } from 'react-router-dom'
import { ArrowLeft } from '@phosphor-icons/react'

function NotFoundPage() {
  return (
    <section className="bg-stone-50 min-h-[70vh] py-24 lg:py-32">
      <div className="container-page">
        <div className="max-w-[60ch]">
          <span className="font-mono uppercase tracking-[0.2em] text-xs text-turf-700">
            Erreur 404
          </span>
          <h1 className="mt-3 font-display font-semibold text-4xl lg:text-6xl tracking-tightest text-zinc-950 leading-[1.05]">
            Cette page n'existe pas.
          </h1>
          <p className="mt-6 text-base lg:text-lg text-zinc-600 leading-relaxed">
            Le lien que vous avez suivi est peut-être obsolète. Revenez à
            l'accueil pour découvrir nos joueurs et nos actualités.
          </p>
          <Link to="/" className="btn btn-outline mt-10">
            <ArrowLeft size={16} weight="bold" />
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </section>
  )
}

export default NotFoundPage
