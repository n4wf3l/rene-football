/* Mirrors the App\Models\Appearance backend shape. Dates come as ISO strings. */
export interface Appearance {
  id: number
  player_id: number
  match_date: string         // YYYY-MM-DD
  competition: string
  opponent: string
  home: boolean
  score_team: number
  score_opponent: number
  minutes_played: number
  goals: number
  assists: number
  shots: number
  shots_on_target: number
  yellow_card: boolean
  red_card: boolean
  rating: number | null      // 0..10
  notes: string | null
  created_at?: string
  updated_at?: string
}
