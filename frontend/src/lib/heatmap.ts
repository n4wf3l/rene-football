/**
 * Heatmap data utilities - keep the PHP seeder (`PlayerSeeder::PRESETS`) and this
 * file in sync. Grid orientation: 4 rows × 6 cols, intensity 0-100, the player
 * always attacks left-to-right (col 0 = own goal, col 5 = opp goal). Row 0 is the
 * upper wing of the rendered pitch, row 3 the lower wing.
 */

export const ROWS = 4
export const COLS = 6
export type HeatmapGrid = number[][]

const PRESETS: Record<string, HeatmapGrid> = {
  'Gardien': [
    [0,  5,  0,  0,  0,  0],
    [55, 90, 8,  0,  0,  0],
    [55, 90, 8,  0,  0,  0],
    [0,  5,  0,  0,  0,  0],
  ],
  'Defenseur central': [
    [0,  30, 20, 5,  0,  0],
    [10, 90, 75, 40, 5,  0],
    [10, 90, 75, 40, 5,  0],
    [0,  30, 20, 5,  0,  0],
  ],
  'Lateral droit': [
    [0,  0,  0,  0,  0,  0],
    [0,  0,  0,  0,  0,  0],
    [10, 40, 55, 40, 15, 0],
    [30, 80, 90, 75, 30, 5],
  ],
  'Lateral gauche': [
    [30, 80, 90, 75, 30, 5],
    [10, 40, 55, 40, 15, 0],
    [0,  0,  0,  0,  0,  0],
    [0,  0,  0,  0,  0,  0],
  ],
  'Milieu defensif': [
    [0,  5,  30, 30, 5,  0],
    [10, 55, 90, 80, 30, 5],
    [10, 55, 90, 80, 30, 5],
    [0,  5,  30, 30, 5,  0],
  ],
  'Milieu offensif': [
    [0,  5,  25, 45, 25, 5],
    [5,  25, 75, 90, 55, 15],
    [5,  25, 75, 90, 55, 15],
    [0,  5,  25, 45, 25, 5],
  ],
  'Meneur de jeu': [
    [0,  5,  30, 50, 30, 5],
    [5,  25, 70, 90, 60, 20],
    [5,  25, 70, 90, 60, 20],
    [0,  5,  30, 50, 30, 5],
  ],
  'Ailier droit': [
    [0,  0,  0,  0,  0,  0],
    [0,  0,  0,  5,  5,  0],
    [0,  5,  15, 40, 55, 25],
    [0,  15, 40, 75, 90, 50],
  ],
  'Ailier gauche': [
    [0,  15, 40, 75, 90, 50],
    [0,  5,  15, 40, 55, 25],
    [0,  0,  0,  5,  5,  0],
    [0,  0,  0,  0,  0,  0],
  ],
  'Attaquant': [
    [0,  0,  5,  20, 45, 25],
    [0,  5,  15, 55, 95, 75],
    [0,  5,  15, 55, 95, 75],
    [0,  0,  5,  20, 45, 25],
  ],
  'Avant-centre': [
    [0,  0,  5,  15, 45, 30],
    [0,  0,  10, 50, 95, 80],
    [0,  0,  10, 50, 95, 80],
    [0,  0,  5,  15, 45, 30],
  ],
  default: [
    [5,  15, 25, 25, 15, 5],
    [10, 40, 60, 60, 40, 10],
    [10, 40, 60, 60, 40, 10],
    [5,  15, 25, 25, 15, 5],
  ],
}

/** Match PHP `crc32` on lowercased ASCII slugs (good enough for our deterministic noise). */
function crc32(str: string): number {
  let crc = 0xffffffff
  for (let i = 0; i < str.length; i++) {
    crc = crc ^ str.charCodeAt(i)
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

export function emptyGrid(): HeatmapGrid {
  return Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => 0))
}

export function isValidGrid(grid: unknown): grid is HeatmapGrid {
  if (!Array.isArray(grid) || grid.length !== ROWS) return false
  return grid.every((row) =>
    Array.isArray(row) &&
    row.length === COLS &&
    row.every((v) => typeof v === 'number' && v >= 0 && v <= 100),
  )
}

/**
 * Build a deterministic, position-typed heatmap with a slug-based noise.
 * Mirrors the PHP `PlayerSeeder::generateHeatmap` so server-rendered and
 * admin-regenerated grids look identical.
 */
export function heatmapFromPosition(position: string, slug: string): HeatmapGrid {
  const preset = PRESETS[position] ?? PRESETS.default
  const seed = crc32(slug)
  return preset.map((row, i) =>
    row.map((val, j) => {
      const delta = (Math.trunc(seed * (i + 2) * (j * 7 + 3)) % 31) - 15
      if (val === 0) {
        return Math.max(0, Math.min(15, Math.abs(delta) - 8))
      }
      return Math.max(0, Math.min(100, val + delta))
    }),
  )
}

export function setCell(grid: HeatmapGrid, row: number, col: number, value: number): HeatmapGrid {
  return grid.map((r, i) =>
    i === row ? r.map((v, j) => (j === col ? Math.max(0, Math.min(100, value)) : v)) : r,
  )
}
