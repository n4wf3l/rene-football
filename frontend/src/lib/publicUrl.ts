/**
 * Absolute base URL of the public site, used for SEO canonical links and
 * social preview image URLs (og:image, twitter:image).
 *
 * Reads `VITE_PUBLIC_URL` at build time so staging can point to its own
 * hostname without editing code. Trailing slash is stripped so callers
 * can concat with `path.startsWith('/') ? path : '/'+path`.
 *
 * If unset (typical local dev), falls back to the production domain — SEO
 * meta on a dev machine doesn't actually reach a crawler, so a "wrong"
 * canonical is harmless there.
 */
export const PUBLIC_BASE_URL: string =
  (import.meta.env.VITE_PUBLIC_URL as string | undefined)?.replace(/\/+$/, '')
  || 'https://renefootball.com'

/** Build an absolute URL from a root-relative path (or pass through http(s) URLs). */
export function toPublicUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl
  return `${PUBLIC_BASE_URL}${pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`}`
}
