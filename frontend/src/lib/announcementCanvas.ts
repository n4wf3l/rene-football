/**
 * Draws the agency's social announcements (a signing, a contract extension)
 * as a 1080 x 1350 Instagram post, straight in the browser: no designer and
 * no server round trip. The same canvas is exported as PNG or as a PDF.
 *
 * The look follows the home page spotlight card: studio backdrop behind the
 * player cut-out, one giant word behind the player, editorial type below.
 */

export type AnnouncementKind = 'signature' | 'extension'
export type SigningNature = 'transfer' | 'loan' | 'free' | 'first_pro'
export type AnnouncementTheme = 'light' | 'dark'
export type AnnouncementLang = 'fr' | 'en'

export interface AnnouncementInput {
  kind: AnnouncementKind
  nature: SigningNature
  theme: AnnouncementTheme
  lang: AnnouncementLang
  playerName: string
  position: string | null
  club: string
  until: string
  photo: HTMLImageElement | null
  clubLogo: HTMLImageElement | null
  agencyLogo: HTMLImageElement | null
}

export const ANNOUNCEMENT_WIDTH = 1080
export const ANNOUNCEMENT_HEIGHT = 1350

const W = ANNOUNCEMENT_WIDTH
const H = ANNOUNCEMENT_HEIGHT
const M = 64

const PALETTES = {
  light: {
    bgTop: '#f7f3ec', bg: '#ece4d6', ink: '#09090b', muted: '#52525b',
    accent: '#1d4ed8', giant: '#09090b', line: 'rgba(9,9,11,0.16)', placeholder: '#a1a1aa',
  },
  dark: {
    bgTop: '#14213d', bg: '#09090b', ink: '#fafaf9', muted: '#a8a29e',
    accent: '#93c5fd', giant: '#fafaf9', line: 'rgba(250,250,249,0.2)', placeholder: '#71717a',
  },
} as const

const TEXT = {
  fr: {
    official: 'Officiel',
    signed: 'Signé',
    extended: 'Prolonge',
    eyebrow: {
      transfer: 'Transfert officiel', loan: 'Prêt officiel', free: 'Signature officielle',
      first_pro: 'Premier contrat pro', extension: 'Prolongation de contrat',
    },
    clubLine: {
      transfer: (c: string) => `S’engage avec ${c}`,
      loan: (c: string) => `Prêté à ${c}`,
      free: (c: string) => `S’engage avec ${c}`,
      first_pro: (c: string) => `Signe pro à ${c}`,
      extension: (c: string) => `Prolonge avec ${c}`,
    },
    contractUntil: (u: string) => `Contrat jusqu’en ${u}`,
    loanUntil: (u: string) => `Prêt jusqu’en ${u}`,
    clubPlaceholder: 'Nom du club',
    represented: 'Représenté par Rene Football',
  },
  en: {
    official: 'Official',
    signed: 'Signed',
    extended: 'Extended',
    eyebrow: {
      transfer: 'Official transfer', loan: 'Official loan', free: 'Official signing',
      first_pro: 'First professional contract', extension: 'Contract extension',
    },
    clubLine: {
      transfer: (c: string) => `Signs for ${c}`,
      loan: (c: string) => `Joins ${c} on loan`,
      free: (c: string) => `Signs for ${c}`,
      first_pro: (c: string) => `Turns pro at ${c}`,
      extension: (c: string) => `Extends with ${c}`,
    },
    contractUntil: (u: string) => `Contract until ${u}`,
    loanUntil: (u: string) => `Loan until ${u}`,
    clubPlaceholder: 'Club name',
    represented: 'Represented by Rene Football',
  },
} as const

const DISPLAY = 'Outfit, "Geist", system-ui, sans-serif'
const SANS = 'Geist, system-ui, sans-serif'
const MONO = '"Geist Mono", ui-monospace, monospace'

/** Web fonts must be ready before drawing, or the canvas falls back. */
export async function ensureAnnouncementFonts(): Promise<void> {
  if (!('fonts' in document)) return
  await Promise.all([
    document.fonts.load(`800 200px ${DISPLAY}`),
    document.fonts.load(`700 100px ${DISPLAY}`),
    document.fonts.load(`600 40px ${SANS}`),
    document.fonts.load(`500 24px ${MONO}`),
  ]).catch(() => undefined)
}

/** Loads an image the canvas may export (CORS-enabled); null when it can't. */
export function loadCanvasImage(src: string | null | undefined): Promise<HTMLImageElement | null> {
  if (!src) return Promise.resolve(null)
  return new Promise((resolve) => {
    const img = new Image()
    if (!src.startsWith('blob:') && !src.startsWith('data:')) img.crossOrigin = 'anonymous'
    img.decoding = 'async'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

type Ctx = CanvasRenderingContext2D & { letterSpacing?: string }

function spaced(ctx: Ctx, px: number): void {
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${px}px`
}

function sizeToFit(ctx: Ctx, text: string, font: (s: number) => string, maxWidth: number, maxSize: number): number {
  ctx.font = font(100)
  const w = ctx.measureText(text).width
  return w > 0 ? Math.min(maxSize, (100 * maxWidth) / w) : maxSize
}

/** Splits a name over two lines at the word break that keeps lines closest. */
function splitTwoLines(ctx: Ctx, text: string): [string, string] {
  const words = text.split(/\s+/)
  let best: [string, string] = [text, '']
  let bestWidth = Infinity
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' ')
    const b = words.slice(i).join(' ')
    const w = Math.max(ctx.measureText(a).width, ctx.measureText(b).width)
    if (w < bestWidth) { bestWidth = w; best = [a, b] }
  }
  return best
}

function yearOf(until: string): string | null {
  return until.match(/\b(19|20)\d{2}\b/)?.[0] ?? null
}

/**
 * Fills the box like object-fit: cover, cropping mostly from the bottom. The
 * part of the photo above the box is kept, so a cut-out's hair is never
 * sliced flat under the header.
 */
function drawCover(ctx: Ctx, img: HTMLImageElement, x: number, y: number, w: number, h: number, focusY: number): void {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight)
  const dw = img.naturalWidth * scale
  const dh = img.naturalHeight * scale
  const dx = x + (w - dw) / 2
  const dy = y + (h - dh) * focusY
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, 0, w, y + h)
  ctx.clip()
  ctx.drawImage(img, dx, dy, dw, dh)
  ctx.restore()
}

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

export function drawAnnouncement(canvas: HTMLCanvasElement, input: AnnouncementInput): void {
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d') as Ctx | null
  if (!ctx) return
  const c = PALETTES[input.theme]
  const t = TEXT[input.lang]
  const locale = input.lang === 'fr' ? 'fr-FR' : 'en-GB'
  const upper = (s: string) => s.toLocaleUpperCase(locale)
  const isLoan = input.kind === 'signature' && input.nature === 'loan'
  const key = input.kind === 'extension' ? 'extension' : input.nature

  // Backdrop
  const bg = ctx.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, c.bgTop)
  bg.addColorStop(1, c.bg)
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // Giant word behind the player: SIGNÉ, or the new end year of a contract.
  const giant = upper(input.kind === 'extension' ? (yearOf(input.until) ?? t.extended) : t.signed)
  const giantFont = (s: number) => `800 ${s}px ${DISPLAY}`
  spaced(ctx, 0)
  const giantSize = sizeToFit(ctx, giant, giantFont, W - 40, 400)
  ctx.font = giantFont(giantSize)
  ctx.fillStyle = c.giant
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  const giantAscent = ctx.measureText(giant).actualBoundingBoxAscent
  ctx.fillText(giant, 20, 150 + giantAscent)

  // Player
  const photoTop = 150
  if (input.photo) {
    drawCover(ctx, input.photo, 0, photoTop, W, H - photoTop, 0.18)
  } else {
    ctx.font = `800 340px ${DISPLAY}`
    ctx.fillStyle = c.line
    ctx.textAlign = 'center'
    ctx.fillText(initials(input.playerName), W / 2, 760)
    ctx.textAlign = 'left'
  }

  // Fade into the backdrop so the text below always reads.
  const fade = ctx.createLinearGradient(0, H * 0.5, 0, H * 0.8)
  fade.addColorStop(0, hexA(c.bg, 0))
  fade.addColorStop(0.65, hexA(c.bg, 0.86))
  fade.addColorStop(1, hexA(c.bg, 1))
  ctx.fillStyle = fade
  ctx.fillRect(0, H * 0.5, W, H * 0.5)

  // Header: agency logo left, OFFICIEL right.
  if (input.agencyLogo) {
    const lh = 60
    const lw = (input.agencyLogo.naturalWidth / input.agencyLogo.naturalHeight) * lh
    ctx.drawImage(input.agencyLogo, M, 52, lw, lh)
  }
  ctx.font = `500 22px ${MONO}`
  spaced(ctx, 6)
  ctx.fillStyle = c.accent
  ctx.textAlign = 'right'
  ctx.fillText(upper(t.official), W - M, 92)
  ctx.textAlign = 'left'

  // Footer
  ctx.fillStyle = c.line
  ctx.fillRect(M, H - 104, W - 2 * M, 2)
  ctx.font = `500 20px ${MONO}`
  spaced(ctx, 4)
  ctx.fillStyle = c.muted
  ctx.fillText(upper(t.represented), M, H - 58)
  ctx.textAlign = 'right'
  spaced(ctx, 1)
  ctx.fillText('renefootball.com', W - M, H - 58)
  ctx.textAlign = 'left'

  // Text block, from the bottom up.
  const logoSpace = input.clubLogo ? 210 : 0
  const textMax = W - 2 * M - logoSpace

  const details = [
    input.until.trim() ? (isLoan ? t.loanUntil(input.until.trim()) : t.contractUntil(input.until.trim())) : '',
    input.position ?? '',
  ].filter(Boolean).map(upper).join('  ·  ')
  const detailsY = H - 150
  if (details) {
    ctx.font = `500 24px ${MONO}`
    spaced(ctx, 2)
    ctx.fillStyle = c.muted
    ctx.fillText(details, M, detailsY, W - 2 * M)
  }

  const club = input.club.trim()
  const clubText = club ? t.clubLine[key](club) : t.clubLine[key](t.clubPlaceholder)
  const clubFont = (s: number) => `600 ${s}px ${SANS}`
  spaced(ctx, 0)
  const clubSize = Math.max(28, sizeToFit(ctx, clubText, clubFont, textMax, 46))
  const clubY = (details ? detailsY - 58 : detailsY)
  ctx.font = clubFont(clubSize)
  ctx.fillStyle = club ? c.ink : c.placeholder
  ctx.fillText(clubText, M, clubY, textMax)

  const name = upper(input.playerName.trim())
  const nameFont = (s: number) => `700 ${s}px ${DISPLAY}`
  spaced(ctx, -1)
  let nameSize = sizeToFit(ctx, name, nameFont, textMax, 108)
  let lines: string[] = [name]
  if (nameSize < 72 && name.includes(' ')) {
    ctx.font = nameFont(100)
    lines = splitTwoLines(ctx, name)
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width))
    nameSize = Math.min(100, (100 * textMax) / widest)
  }
  ctx.font = nameFont(nameSize)
  ctx.fillStyle = c.ink
  const lineGap = nameSize * 0.94
  const lastNameY = clubY - clubSize - 22
  lines.forEach((line, i) => {
    ctx.fillText(line, M, lastNameY - (lines.length - 1 - i) * lineGap, textMax)
  })
  const nameTop = lastNameY - (lines.length - 1) * lineGap - nameSize * 0.74

  ctx.font = `500 22px ${MONO}`
  spaced(ctx, 6)
  ctx.fillStyle = c.accent
  ctx.fillText(upper(t.eyebrow[key]), M, nameTop - 26)
  spaced(ctx, 0)

  // Club crest in a white disc beside the text block.
  if (input.clubLogo) {
    const d = 172
    const cx = W - M - d / 2
    const cy = (nameTop - 26 + clubY) / 2 - 8
    ctx.save()
    ctx.shadowColor = 'rgba(9,9,11,0.18)'
    ctx.shadowBlur = 30
    ctx.shadowOffsetY = 10
    ctx.beginPath()
    ctx.arc(cx, cy, d / 2, 0, Math.PI * 2)
    ctx.fillStyle = '#ffffff'
    ctx.fill()
    ctx.restore()
    const inner = d * 0.66
    const img = input.clubLogo
    const s = Math.min(inner / img.naturalWidth, inner / img.naturalHeight)
    const iw = img.naturalWidth * s
    const ih = img.naturalHeight * s
    ctx.drawImage(img, cx - iw / 2, cy - ih / 2, iw, ih)
  }
}

function hexA(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`
}
