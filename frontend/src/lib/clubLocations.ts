/**
 * Stadium / training-ground coordinates for the clubs our players are
 * listed at. Drives the "Depuis Luxembourg" route map on the home page.
 *
 * Matching is keyword based on the free-form `player.club` string (accents
 * stripped, lower-cased). A club that matches nothing is simply left off the
 * map - we never guess a location.
 */

export interface ClubLocation {
  /** Stable id, used to group several players at the same club. */
  id: string
  /** Compact name for narrow screens. */
  short: string
  /** Lower-case, accent-free fragments that identify the club. */
  keys: string[]
  lat: number
  lon: number
}

/** Agency base - Luxembourg City. */
export const LUXEMBOURG = { lat: 49.6116, lon: 6.1319 }

const CLUBS: ClubLocation[] = [
  { id: 'gladbach',   short: 'Gladbach',   keys: ['gladbach'],                  lat: 51.1745, lon: 6.3855 },
  { id: 'dortmund',   short: 'Dortmund',   keys: ['dortmund'],                  lat: 51.4926, lon: 7.4519 },
  { id: 'mechelen',   short: 'Mechelen',   keys: ['mechelen', 'malines'],       lat: 51.0370, lon: 4.4850 },
  { id: 'standard',   short: 'Standard',   keys: ['standard', 'liege', 'luik'], lat: 50.6097, lon: 5.5430 },
  { id: 'genk',       short: 'Genk',       keys: ['genk'],                      lat: 50.9915, lon: 5.5383 },
  { id: 'dudelange',  short: 'Dudelange',  keys: ['dudelange', 'f91'],          lat: 49.4757, lon: 6.0870 },
  { id: 'anderlecht', short: 'Anderlecht', keys: ['anderlecht'],                lat: 50.8343, lon: 4.2984 },
  { id: 'rwdm',       short: 'RWDM',       keys: ['rwdm', 'molenbeek'],         lat: 50.8554, lon: 4.3165 },
  { id: 'brugge',     short: 'Brugge',     keys: ['brugge', 'bruges'],          lat: 51.1934, lon: 3.1806 },
  { id: 'gent',       short: 'Gent',       keys: ['kaa gent', 'la gantoise'],   lat: 51.0164, lon: 3.7342 },
  { id: 'antwerp',    short: 'Antwerp',    keys: ['antwerp', 'anvers'],         lat: 51.2321, lon: 4.4720 },
  { id: 'ajax',       short: 'Ajax',       keys: ['ajax'],                      lat: 52.3143, lon: 4.9419 },
  { id: 'psv',        short: 'PSV',        keys: ['psv'],                       lat: 51.4417, lon: 5.4675 },
  { id: 'feyenoord',  short: 'Feyenoord',  keys: ['feyenoord'],                 lat: 51.8939, lon: 4.5231 },
  { id: 'schalke',    short: 'Schalke',    keys: ['schalke'],                   lat: 51.5546, lon: 7.0676 },
  { id: 'leverkusen', short: 'Leverkusen', keys: ['leverkusen'],                lat: 51.0383, lon: 7.0022 },
  { id: 'koln',       short: 'Köln',       keys: ['koln', 'cologne'],           lat: 50.9335, lon: 6.8750 },
  { id: 'metz',       short: 'Metz',       keys: ['fc metz'],                   lat: 49.1097, lon: 6.1594 },
]

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

/** Returns the club whose keyword appears first in the string, if any. */
export function locateClub(club: string | null | undefined): ClubLocation | null {
  if (!club) return null
  const haystack = normalize(club)
  let best: { loc: ClubLocation; at: number } | null = null
  for (const loc of CLUBS) {
    for (const key of loc.keys) {
      const at = haystack.indexOf(key)
      if (at >= 0 && (!best || at < best.at)) best = { loc, at }
    }
  }
  return best?.loc ?? null
}

/** Great-circle distance in km. */
export function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLon = (b.lon - a.lon) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}
