/* Staff member - mirrors App\Models\StaffMember. Used on the public
   "À propos / L'équipe" section and managed via the admin CRUD. */

export interface StaffMember {
  id: number
  slug: string
  name: string
  role: string
  bio: string | null
  photo_url: string | null
  sort_order: number
  is_published: boolean
  created_at?: string
  updated_at?: string
}
