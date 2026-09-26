/** Mirrors App\Models\Partner. */
export interface Partner {
  slug: string
  name: string
  role: string | null
  logo_url: string | null
  website_url: string | null
  country_code: string | null
  country_label: string | null
  sort_order?: number
  is_published?: boolean
}
