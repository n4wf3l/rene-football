import { Helmet } from 'react-helmet-async'

interface SeoProps {
  /** Page-specific title. The " · Rene Football" suffix is appended
   *  automatically unless `bareTitle` is set. */
  title: string
  /** Short summary shown in SERPs + as og:description / twitter:description. */
  description: string
  /** Absolute or root-relative path for the canonical + og:url. Defaults to
   *  the current window location so React Router pages get it for free. */
  path?: string
  /** Skip appending " · Rene Football" — useful for the homepage where the
   *  brand is already inside the title. */
  bareTitle?: boolean
  /** og:type override (default `website`; use `article` on article pages,
   *  `profile` on player detail pages). */
  ogType?: 'website' | 'article' | 'profile'
  /** Absolute URL to a page-specific OG image (falls back to the base logo). */
  image?: string
  /** Set to true to prevent indexing (search results, admin previews, etc.). */
  noindex?: boolean
}

const BASE_URL = 'https://renefootball.com'
const DEFAULT_IMAGE = `${BASE_URL}/logo-black.png`

/**
 * Per-route SEO block. Emits Open Graph + Twitter Card + canonical + robots
 * meta so social scrapers and Google get the right per-page info once
 * React has hydrated. The static baseline in `index.html` covers non-JS
 * crawlers — these tags override for JS-capable ones.
 */
export default function Seo({
  title,
  description,
  path,
  bareTitle = false,
  ogType = 'website',
  image = DEFAULT_IMAGE,
  noindex = false,
}: SeoProps) {
  const fullTitle = bareTitle ? title : `${title} · Rene Football`
  const url = path
    ? (path.startsWith('http') ? path : `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`)
    : (typeof window !== 'undefined' ? window.location.href.split('#')[0].split('?')[0] : BASE_URL)

  return (
    <Helmet prioritizeSeoTags>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex, follow" />}

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content="Rene Football" />
      <meta property="og:locale" content="fr_FR" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  )
}
