import type { PlayerClip } from './clip'

/* News articles - mirrors App\Models\Article.
   Optional Loop on a player + attached PlayerClip annotations + photo gallery. */

export const ARTICLE_CATEGORIES = [
  'Mercato',
  'Talents',
  'Profils',
  'Coulisses',
  'Agence',
] as const
export type ArticleCategory = typeof ARTICLE_CATEGORIES[number]

export interface ArticlePlayerLoop {
  id: number
  slug: string
  name: string
  photo_url: string | null
  position?: string
  club?: string | null
}

export interface ArticleImage {
  id: number
  article_id: number
  image_path: string
  caption: string | null
  sort_order: number
  created_at?: string
  updated_at?: string
}

export interface Article {
  id: number
  slug: string
  title: string
  excerpt: string | null
  content: string | null
  category: ArticleCategory | string
  cover_url: string | null
  featured: boolean
  player_id: number | null
  is_published: boolean
  published_at: string | null
  created_at?: string
  updated_at?: string

  player?: ArticlePlayerLoop | null
  images?: ArticleImage[]
  clips?: PlayerClip[]
}
