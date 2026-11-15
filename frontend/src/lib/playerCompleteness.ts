import type { Player } from '../types/player'
import { isPlaceholderPhoto } from './playerImage'

/**
 * How complete a player's file is, out of 100. Each item is something the
 * public profile, the fiches or the announcements use; the weight says how
 * much it matters. `field` matches a data-field anchor in the player editor
 * so a missing item can take the admin straight to the input.
 */
export interface CompletenessItem {
  field: string
  label: string
  weight: number
  filled: boolean
}

export interface Completeness {
  pct: number
  items: CompletenessItem[]
  /** Missing items, most valuable first. */
  missing: CompletenessItem[]
}

export type CompletenessTone = 'red' | 'orange' | 'green'

type Input = Partial<Player>

const text = (v: unknown, min = 1) => typeof v === 'string' && v.trim().length >= min
const list = (v: unknown) => Array.isArray(v) && v.length > 0
const num = (v: unknown) => typeof v === 'number' && v > 0

export function playerCompleteness(p: Input): Completeness {
  const items: CompletenessItem[] = [
    // Identity - what every visitor and club sees first.
    { field: 'photo_url', label: 'Photo', weight: 12, filled: !isPlaceholderPhoto(p.photo_url) },
    { field: 'bio', label: 'Bio', weight: 10, filled: text(p.bio, 40) },
    { field: 'club', label: 'Club', weight: 6, filled: text(p.club) },
    { field: 'position', label: 'Poste', weight: 4, filled: text(p.position) },
    { field: 'nationality', label: 'Nationalité', weight: 4, filled: text(p.nationality) },
    { field: 'date_of_birth', label: 'Date de naissance', weight: 4, filled: text(p.date_of_birth) },
    { field: 'height', label: 'Taille', weight: 4, filled: text(p.height) },
    { field: 'preferred_foot', label: 'Pied fort', weight: 3, filled: text(p.preferred_foot) },
    { field: 'club_logo_url', label: 'Logo du club', weight: 3, filled: text(p.club_logo_url) },
    // Scouting profile - fills the fiches.
    { field: 'career_history', label: 'Parcours', weight: 5, filled: !!p.career_history?.some((c) => text(c.club)) },
    { field: 'playing_style', label: 'Style de jeu', weight: 4, filled: text(p.playing_style) },
    { field: 'best_position', label: 'Meilleur poste', weight: 3, filled: text(p.best_position) },
    { field: 'languages_spoken', label: 'Langues parlées', weight: 3, filled: list(p.languages_spoken) },
    { field: 'mental_strengths', label: 'Points forts mentaux', weight: 3, filled: list(p.mental_strengths) },
    { field: 'objective', label: 'Objectif', weight: 2, filled: text(p.objective) },
    { field: 'secondary_photo_url', label: 'Photo portrait secondaire', weight: 2, filled: text(p.secondary_photo_url) },
    // Season data.
    { field: 'matches_played', label: 'Matchs joués', weight: 8, filled: num(p.matches_played) },
    { field: 'minutes_played', label: 'Minutes jouées', weight: 5, filled: num(p.minutes_played) },
    { field: 'pass_accuracy', label: '% passes réussies', weight: 3, filled: num(p.pass_accuracy) },
    { field: 'heatmap', label: 'Heatmap', weight: 5, filled: Array.isArray(p.heatmap_grid) && p.heatmap_grid.length > 0 },
    { field: 'tracking', label: 'Données physiques', weight: 4, filled: num(p.distance_avg_km) || num(p.sprints_avg) },
    { field: 'tags', label: 'Tags & statut', weight: 3, filled: list(p.tags) },
  ]
  const pct = Math.round(items.reduce((acc, i) => acc + (i.filled ? i.weight : 0), 0))
  const missing = items.filter((i) => !i.filled).sort((a, b) => b.weight - a.weight)
  return { pct, items, missing }
}

export function completenessTone(pct: number): CompletenessTone {
  if (pct >= 80) return 'green'
  if (pct >= 50) return 'orange'
  return 'red'
}

export const TONE_CLASSES: Record<CompletenessTone, { bar: string; text: string; track: string }> = {
  red: { bar: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400', track: 'bg-rose-500/15' },
  orange: { bar: 'bg-orange-500', text: 'text-orange-600 dark:text-orange-400', track: 'bg-orange-500/15' },
  green: { bar: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', track: 'bg-emerald-500/15' },
}
