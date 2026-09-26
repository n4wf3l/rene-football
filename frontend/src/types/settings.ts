/**
 * Agency-wide config exposed by /api/settings. Fields that were left blank
 * in the admin editor are OMITTED from the map — no need to check for empty
 * strings when rendering.
 */
export type SocialPlatform = 'instagram' | 'facebook' | 'linkedin' | 'youtube' | 'tiktok' | 'x'

export interface PublicSettings {
  social_links: Partial<Record<SocialPlatform, string>>
}

/** Raw admin view — includes empty/null URLs so the form can bind directly. */
export interface AdminSettings {
  instagram_url: string | null
  facebook_url:  string | null
  linkedin_url:  string | null
  youtube_url:   string | null
  tiktok_url:    string | null
  x_url:         string | null
}
