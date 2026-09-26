import { Link } from 'react-router-dom'
import { ArrowLeft } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'

function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <section className="bg-stone-50 dark:bg-zinc-950 min-h-[70vh] py-24 lg:py-32">
      <div className="container-page">
        <div className="max-w-[60ch]">
          <span className="font-mono uppercase tracking-[0.2em] text-xs text-turf-700 dark:text-turf-300">
            {t('notFound.eyebrow')}
          </span>
          <h1 className="mt-3 font-display font-semibold text-4xl lg:text-6xl tracking-tightest text-zinc-950 dark:text-stone-50 leading-[1.05]">
            {t('notFound.title')}
          </h1>
          <p className="mt-6 text-base lg:text-lg text-zinc-600 dark:text-stone-400 leading-relaxed">
            {t('notFound.paragraph')}
          </p>
          <Link to="/" className="btn btn-outline mt-10">
            <ArrowLeft size={16} weight="bold" />
            {t('notFound.cta')}
          </Link>
        </div>
      </div>
    </section>
  )
}

export default NotFoundPage
