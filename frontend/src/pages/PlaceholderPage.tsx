import { Link } from 'react-router-dom'
import { ArrowLeft } from '@phosphor-icons/react'

interface PlaceholderPageProps {
  title: string
  description: string
}

function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <section className="bg-stone-50 min-h-[70vh] py-24 lg:py-32">
      <div className="container-page max-w-page">
        <div className="max-w-[60ch]">
          <span className="eyebrow">Bientôt disponible</span>
          <h1 className="mt-3 font-display font-semibold text-4xl lg:text-6xl tracking-tightest text-zinc-950 leading-[1.05]">
            {title}
          </h1>
          <p className="mt-6 text-base lg:text-lg text-zinc-600 leading-relaxed">
            {description}
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

export default PlaceholderPage
