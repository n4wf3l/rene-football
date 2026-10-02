/**
 * Agency-wide config exposed by /api/settings. Fields that were left blank
 * in the admin editor are preserved as `null` so the public React code can
 * fall back on a sensible default (e.g. a "coming soon" placeholder on the
 * mentions légales page).
 */
export type SocialPlatform = 'instagram' | 'facebook' | 'linkedin' | 'youtube' | 'tiktok' | 'x'

export interface PublicContact {
  email: string | null
  phone: string | null
  office_city: string | null
}

export interface PublicLegal {
  legal_form: string | null
  rcs_number: string | null
  vat_number: string | null
  registered_office_address: string | null
  publication_director: string | null
}

export interface PublicSettings {
  social_links: Partial<Record<SocialPlatform, string>>
  contact: PublicContact
  legal: PublicLegal
}

/** Raw admin view — includes empty/null URLs so the form can bind directly. */
export interface AdminSettings {
  // Social URLs
  instagram_url: string | null
  facebook_url:  string | null
  linkedin_url:  string | null
  youtube_url:   string | null
  tiktok_url:    string | null
  x_url:         string | null
  // Legal identity
  legal_form:                string | null
  rcs_number:                string | null
  vat_number:                string | null
  registered_office_address: string | null
  publication_director:      string | null
  // Contact
  contact_email: string | null
  contact_phone: string | null
  office_city:   string | null
}
