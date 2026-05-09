/* Player domain — mirrors the backend Player model.
   Stats default to 0 server-side, so they're always present (no `undefined` checks needed). */

export type PlayerCategory = 'Gardien' | 'Defenseur' | 'Milieu' | 'Attaquant'
export type PreferredFoot = 'Droit' | 'Gauche' | 'Ambidextre'

export interface Player {
  slug: string
  name: string
  age: number
  height: string | null
  position: string
  category: PlayerCategory | string
  club: string | null
  nationality: string | null
  preferred_foot: PreferredFoot | string | null
  since: number | null
  photo_url: string | null
  bio: string | null

  matches_played: number
  goals: number
  assists: number

  minutes_played: number
  shots: number
  shots_on_target: number
  xg: number
  xa: number
  key_passes: number
  pass_accuracy: number
  dribbles_completed: number
  tackles: number
  interceptions: number
  duels_won: number
  yellow_cards: number
  red_cards: number
  clean_sheets: number
  saves: number

  /** Heatmap intensity grid: 4 rows × 6 cols, values 0-100. Player attacks left → right. */
  heatmap_grid?: number[][] | null

  is_published?: boolean
  created_at?: string
  updated_at?: string
}

/* Filter keys used by the public roster page. */
export type PositionFilter = 'Tous' | 'Gardien' | 'Defenseur' | 'Milieu' | 'Attaquant'
export type AgeFilter      = 'Tous' | 'U21' | '21-26' | '27+'
