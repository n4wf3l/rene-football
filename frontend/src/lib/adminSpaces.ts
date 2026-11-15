/**
 * The back-office has two spaces: running the agency's website ("Site") and
 * the sporting work ("Sportif": data analysis, scouting, research). Each has
 * its own menu; URLs stay the same, the space follows the page.
 */
export type AdminSpace = 'site' | 'sport'

const SPORT_PREFIXES = ['/admin/sportif', '/admin/analyse', '/admin/scouting', '/admin/recherche']

export const SPACE_HOME: Record<AdminSpace, string> = {
  site: '/admin',
  sport: '/admin/sportif',
}

export function spaceOf(pathname: string): AdminSpace {
  return SPORT_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ? 'sport' : 'site'
}

const LAST_KEY = 'rene_admin_space_last'

/** Remembers the page last opened in a space (path + query). */
export function rememberSpacePage(path: string): void {
  try {
    const all = JSON.parse(localStorage.getItem(LAST_KEY) || '{}') as Partial<Record<AdminSpace, string>>
    all[spaceOf(path.split('?')[0])] = path
    localStorage.setItem(LAST_KEY, JSON.stringify(all))
  } catch { /* private mode */ }
}

/** Where switching to a space leads: the page left there, else its home. */
export function spaceEntry(space: AdminSpace): string {
  try {
    const all = JSON.parse(localStorage.getItem(LAST_KEY) || '{}') as Partial<Record<AdminSpace, string>>
    const last = all[space]
    if (last && last.startsWith('/admin') && spaceOf(last.split('?')[0]) === space) return last
  } catch { /* private mode */ }
  return SPACE_HOME[space]
}
