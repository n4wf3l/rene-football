/**
 * Resolves the image URL to render for a player card.
 *
 * Why this exists : the seeder used to inject `https://picsum.photos/...` URLs
 * as default photos, and every render against this external CDN added 3-10s of
 * latency per card (and parallel requests stacked badly). This helper :
 *
 *   1. Returns the real photo when one was uploaded by the admin (e.g.
 *      `/storage/players/xxx.jpg`) or pasted as an external URL.
 *   2. Treats picsum.photos URLs as "no real photo" → falls back to an inline
 *      SVG data URI showing the player's initials. Zero network request, zero
 *      external dependency, instant paint.
 *
 * Used everywhere a player avatar is rendered on the public site.
 */

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/** Deterministic 0-359 hue from a slug — same player always gets the same color. */
function hashHue(seed: string): number {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return h % 360
}

/** Tiny SVG data URI showing the player's initials on a brand-tinted background.
 *  Inline → no HTTP request, no decode pause, no layout shift. */
function placeholderDataUri(name: string, slug: string): string {
  const text = initials(name)
  const hue = hashHue(slug)
  // Stadium-dark background, brand-tinted foreground. Cheap on the eye, plays
  // well with the agency's editorial palette in both light and dark mode.
  const bg = `hsl(${hue}, 18%, 14%)`
  const fg = `hsl(${hue}, 32%, 78%)`
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">' +
      `<rect width="200" height="200" fill="${bg}"/>` +
      `<text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" ` +
        `fill="${fg}" font-family="-apple-system,system-ui,sans-serif" ` +
        `font-size="86" font-weight="600" letter-spacing="-2">${text}</text>` +
    '</svg>'
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

/** True when the URL is missing or points at the legacy picsum placeholder. */
export function isPlaceholderPhoto(url?: string | null): boolean {
  if (!url) return true
  return url.startsWith('https://picsum.photos/') || url.startsWith('http://picsum.photos/')
}

export interface PlayerImageInput {
  name: string
  slug: string
  photo_url?: string | null
}

/** Returns the URL to set on `<img src>` for a player avatar. */
export function playerImage(player: PlayerImageInput): string {
  if (!isPlaceholderPhoto(player.photo_url)) return player.photo_url!
  return placeholderDataUri(player.name, player.slug)
}
