import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { DownloadSimple, FilePdf, Image as ImageIcon, Trash, WarningCircle, X as XIcon } from '@phosphor-icons/react'
import { api, ApiError } from '../../api/client'
import type { Player } from '../../types/player'
import { isPlaceholderPhoto, playerImage } from '../../lib/playerImage'
import {
  ANNOUNCEMENT_HEIGHT,
  ANNOUNCEMENT_WIDTH,
  drawAnnouncement,
  ensureAnnouncementFonts,
  loadCanvasImage,
  type AnnouncementKind,
  type AnnouncementLang,
  type AnnouncementTheme,
  type SigningNature,
} from '../../lib/announcementCanvas'
import { dataUrlBytes, jpegToPdf } from '../../lib/jpegPdf'
import Skeleton from '../../components/Skeleton'
import { useToast } from '../../components/ToastProvider'

const KIND_LABEL: Record<AnnouncementKind, string> = { signature: 'Recrutement', extension: 'Prolongation' }
const NATURES: { key: SigningNature; label: string }[] = [
  { key: 'transfer', label: 'Transfert' },
  { key: 'loan', label: 'Prêt' },
  { key: 'free', label: 'Libre' },
  { key: 'first_pro', label: 'Premier contrat pro' },
]

function slugify(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 2000)
}

/**
 * Signing / contract-extension announcement for social media: a short form
 * on the left, the finished 4:5 visual on the right, downloaded as PNG or
 * PDF in one click. Opened from the fiche editor once a player is chosen
 * (/admin/presentations/annonce?joueur=slug&type=recrutement|prolongation).
 */
export default function AdminAnnouncement() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  const slug = params.get('joueur')

  const [player, setPlayer] = useState<Player | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [kind, setKind] = useState<AnnouncementKind>(params.get('type') === 'prolongation' ? 'extension' : 'signature')
  const [nature, setNature] = useState<SigningNature>('transfer')
  const [club, setClub] = useState('')
  const [until, setUntil] = useState('')
  const [theme, setTheme] = useState<AnnouncementTheme>('light')
  const [lang, setLang] = useState<AnnouncementLang>('fr')
  const [clubLogoSrc, setClubLogoSrc] = useState<string | null>(null)
  const [images, setImages] = useState<{ photo: HTMLImageElement | null; agency: HTMLImageElement | null; crest: HTMLImageElement | null }>({ photo: null, agency: null, crest: null })
  const [crestFailed, setCrestFailed] = useState(false)
  const [ready, setReady] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const logoInputRef = useRef<HTMLInputElement | null>(null)
  const uploadedUrl = useRef<string | null>(null)

  // Player
  useEffect(() => {
    if (!slug) { setLoadError('Aucun joueur choisi.'); return }
    let cancelled = false
    api.get<{ data: Player }>(`/admin/players/${slug}`, { auth: true })
      .then((res) => { if (!cancelled) setPlayer(res.data) })
      .catch((err: unknown) => {
        if (cancelled) return
        setLoadError(err instanceof ApiError && err.status === 404 ? 'Joueur introuvable.' : 'Chargement du joueur impossible.')
      })
    return () => { cancelled = true }
  }, [slug])

  // Sensible defaults per announcement: an extension is with the current club.
  useEffect(() => {
    if (!player) return
    const year = new Date().getFullYear()
    if (kind === 'extension') {
      setClub((c) => c || player.club || '')
      setUntil((u) => u || String(year + 2))
      if (!uploadedUrl.current) setClubLogoSrc((s) => s ?? player.club_logo_url ?? null)
    } else {
      setUntil((u) => u || String(year + 3))
    }
  }, [player, kind])

  // Images: the full-size photo, the agency logo for the theme, the crest.
  useEffect(() => {
    if (!player) return
    let cancelled = false
    const photoSrc = isPlaceholderPhoto(player.photo_url) ? null : player.photo_url
    Promise.all([
      ensureAnnouncementFonts(),
      loadCanvasImage(photoSrc).then((img) => img ?? loadCanvasImage(player.photo_display_url)),
      loadCanvasImage(theme === 'dark' ? '/logo-white.png' : '/logo-black.png'),
    ]).then(([, photo, agency]) => {
      if (cancelled) return
      setImages((i) => ({ ...i, photo, agency }))
      setReady(true)
    })
    return () => { cancelled = true }
  }, [player, theme])

  useEffect(() => {
    let cancelled = false
    setCrestFailed(false)
    loadCanvasImage(clubLogoSrc).then((crest) => {
      if (cancelled) return
      setImages((i) => ({ ...i, crest }))
      if (clubLogoSrc && !crest) setCrestFailed(true)
    })
    return () => { cancelled = true }
  }, [clubLogoSrc])

  useEffect(() => () => { if (uploadedUrl.current) URL.revokeObjectURL(uploadedUrl.current) }, [])

  // Draw
  useEffect(() => {
    if (!player || !ready || !canvasRef.current) return
    drawAnnouncement(canvasRef.current, {
      kind, nature, theme, lang, club, until,
      playerName: player.name,
      position: player.position || null,
      photo: images.photo,
      clubLogo: images.crest,
      agencyLogo: images.agency,
    })
  }, [player, ready, kind, nature, theme, lang, club, until, images])

  function onLogoFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Choisissez une image (PNG, JPG, WebP ou SVG).'); return }
    if (uploadedUrl.current) URL.revokeObjectURL(uploadedUrl.current)
    uploadedUrl.current = URL.createObjectURL(file)
    setClubLogoSrc(uploadedUrl.current)
  }

  function removeLogo() {
    if (uploadedUrl.current) URL.revokeObjectURL(uploadedUrl.current)
    uploadedUrl.current = null
    setClubLogoSrc(null)
  }

  const canExport = !!player && ready && club.trim().length > 0
  const fileBase = player ? `rene-football_${kind === 'extension' ? 'prolongation' : 'signature'}_${slugify(player.name)}` : 'rene-football'

  function exportPng() {
    const canvas = canvasRef.current
    if (!canvas || !canExport) return
    try {
      canvas.toBlob((blob) => {
        if (!blob) { toast.error('Export de l’image impossible.'); return }
        download(blob, `${fileBase}.png`)
        toast.success('Image téléchargée.')
      }, 'image/png')
    } catch {
      toast.error('Export impossible : une image (logo du club ?) bloque l’export. Importez-la depuis votre ordinateur.')
    }
  }

  function exportPdf() {
    const canvas = canvasRef.current
    if (!canvas || !canExport) return
    try {
      const jpeg = dataUrlBytes(canvas.toDataURL('image/jpeg', 0.93))
      download(jpegToPdf(jpeg, canvas.width, canvas.height), `${fileBase}.pdf`)
      toast.success('PDF téléchargé.')
    } catch {
      toast.error('Export impossible : une image (logo du club ?) bloque l’export. Importez-la depuis votre ordinateur.')
    }
  }

  const backToChoice = slug ? `/admin/presentations/nouvelle?joueur=${encodeURIComponent(slug)}` : '/admin/presentations/nouvelle'

  return (
    <div className="bg-stone-50 dark:bg-zinc-950 h-[100dvh] flex flex-col">
      <div className="z-10 shrink-0 flex items-center justify-between gap-3 px-4 lg:px-6 h-16 border-b border-stone-200 bg-white dark:bg-zinc-900 dark:border-stone-50/10">
        <div className="min-w-0">
          <div className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-turf-700 dark:text-turf-300">
            Annonce · {KIND_LABEL[kind]}
          </div>
          <div className="font-display font-semibold text-lg text-zinc-950 dark:text-stone-50 truncate">
            {player?.name ?? 'Annonce'}
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button type="button" onClick={() => navigate('/admin/presentations')}
            className="hidden sm:inline-flex px-3 py-2 rounded-lg text-sm font-medium text-zinc-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-50/10 transition">
            Annuler
          </button>
          <button type="button" onClick={exportPdf} disabled={!canExport}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-stone-300 dark:border-stone-50/15 bg-white dark:bg-zinc-900 hover:bg-stone-100 dark:hover:bg-stone-50/5 transition disabled:opacity-50 disabled:cursor-not-allowed">
            <FilePdf size={15} weight="bold" />
            <span className="hidden md:inline">PDF</span>
          </button>
          <button type="button" onClick={exportPng} disabled={!canExport}
            className="btn btn-primary text-sm px-4 py-2 inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            <DownloadSimple size={15} weight="bold" />
            Télécharger l’image
          </button>
          <button type="button" onClick={() => navigate('/admin/presentations')}
            className="grid place-items-center w-9 h-9 rounded-full text-zinc-500 hover:bg-stone-100 hover:text-zinc-900 dark:text-stone-400 dark:hover:bg-stone-50/10 dark:hover:text-stone-50 transition"
            aria-label="Retour à la liste">
            <XIcon size={18} weight="bold" />
          </button>
        </div>
      </div>

      {loadError ? (
        <div className="flex-1 grid place-items-center px-6 text-center">
          <div>
            <p className="font-display font-semibold text-2xl text-zinc-950 dark:text-stone-50">{loadError}</p>
            <Link to="/admin/presentations/nouvelle" className="btn btn-primary text-sm mt-6 inline-flex">Choisir un joueur</Link>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden lg:grid lg:grid-cols-[360px_minmax(0,1fr)] xl:grid-cols-[400px_minmax(0,1fr)]">
          {/* LEFT - what the visual says */}
          <aside className="lg:overflow-y-auto lg:border-r border-stone-200 dark:border-stone-50/10 bg-white dark:bg-zinc-900/40 px-5 lg:pl-16 py-6 space-y-8">
            {player ? (
              <div className="flex items-center gap-3">
                <img src={playerImage(player)} alt="" className="w-11 h-11 rounded-full object-cover object-top bg-stone-200 dark:bg-zinc-800" />
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm text-zinc-950 dark:text-stone-50 truncate">{player.name}</div>
                  <div className="text-[0.65rem] font-mono uppercase tracking-wider text-zinc-500 dark:text-stone-500 truncate">
                    {[player.position, player.club].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <Link to={backToChoice} className="text-xs font-medium text-turf-700 dark:text-turf-300 hover:underline shrink-0">Changer</Link>
              </div>
            ) : (
              <Skeleton className="h-11 w-full" />
            )}

            {player && isPlaceholderPhoto(player.photo_url) && (
              <div className="flex gap-2 rounded-xl bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200 px-3 py-2.5 text-xs leading-relaxed">
                <WarningCircle size={15} weight="bold" className="shrink-0 mt-px" />
                <span>
                  Ce joueur n’a pas de photo. <Link to={`/admin/joueurs/${player.slug}/edit`} className="underline font-medium">Ajoutez-la dans sa fiche</Link> pour un vrai visuel.
                </span>
              </div>
            )}

            <Group title="Annonce">
              <Segmented
                value={kind}
                onChange={(k) => setKind(k)}
                options={[{ key: 'signature', label: 'Recrutement' }, { key: 'extension', label: 'Prolongation' }]}
              />
              {kind === 'signature' && (
                <div className="flex flex-wrap gap-1.5">
                  {NATURES.map((n) => (
                    <button key={n.key} type="button" onClick={() => setNature(n.key)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${nature === n.key
                        ? 'bg-zinc-950 text-stone-50 border-zinc-950 dark:bg-stone-50 dark:text-zinc-950 dark:border-stone-50'
                        : 'border-stone-300 text-zinc-700 hover:border-zinc-500 dark:border-stone-50/15 dark:text-stone-300 dark:hover:border-stone-50/40'}`}>
                      {n.label}
                    </button>
                  ))}
                </div>
              )}
            </Group>

            <Group title="Club">
              <label className="block">
                <Label>{kind === 'signature' ? 'Nouveau club' : 'Club'}</Label>
                <input type="text" value={club} onChange={(e) => setClub(e.target.value)} maxLength={60}
                  placeholder="ex. KV Mechelen"
                  className="w-full rounded-xl border border-stone-300 dark:border-stone-50/15 bg-white dark:bg-zinc-900 px-3 py-2.5 text-sm text-zinc-900 dark:text-stone-100 focus:outline-none focus:border-zinc-500 dark:focus:border-stone-50/40" />
                {!club.trim() && <span className="mt-1 block text-[0.7rem] text-zinc-500 dark:text-stone-400">Le nom du club est nécessaire pour télécharger.</span>}
              </label>
              <div>
                <Label>Logo du club · optionnel</Label>
                <div className="flex items-center gap-3">
                  <div className="grid place-items-center w-14 h-14 rounded-full bg-white border border-stone-200 dark:border-stone-50/15 overflow-hidden shrink-0">
                    {images.crest
                      ? <img src={images.crest.src} alt="" className="w-10 h-10 object-contain" />
                      : <ImageIcon size={18} className="text-zinc-400" />}
                  </div>
                  <button type="button" onClick={() => logoInputRef.current?.click()}
                    className="px-3 py-2 rounded-lg text-xs font-medium border border-stone-300 dark:border-stone-50/15 hover:bg-stone-100 dark:hover:bg-stone-50/5 transition text-zinc-800 dark:text-stone-200">
                    {clubLogoSrc ? 'Remplacer' : 'Importer le logo'}
                  </button>
                  {clubLogoSrc && (
                    <button type="button" onClick={removeLogo} aria-label="Retirer le logo"
                      className="grid place-items-center w-8 h-8 rounded-lg text-zinc-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition">
                      <Trash size={15} weight="bold" />
                    </button>
                  )}
                  <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={onLogoFile} />
                </div>
                <p className="mt-1.5 text-[0.7rem] text-zinc-500 dark:text-stone-400">
                  {crestFailed ? 'Ce logo ne peut pas être utilisé dans le visuel : importez-le depuis votre ordinateur.' : 'Un PNG à fond transparent rend le mieux.'}
                </p>
              </div>
            </Group>

            <Group title="Contrat">
              <label className="block">
                <Label>{kind === 'signature' && nature === 'loan' ? 'Prêt jusqu’en' : 'Contrat jusqu’en'}</Label>
                <input type="text" value={until} onChange={(e) => setUntil(e.target.value)} maxLength={24}
                  placeholder="2028 ou juin 2028"
                  className="w-full rounded-xl border border-stone-300 dark:border-stone-50/15 bg-white dark:bg-zinc-900 px-3 py-2.5 text-sm text-zinc-900 dark:text-stone-100 focus:outline-none focus:border-zinc-500 dark:focus:border-stone-50/40" />
                <span className="mt-1 block text-[0.7rem] text-zinc-500 dark:text-stone-400">Laissez vide pour ne pas afficher la durée.</span>
              </label>
            </Group>

            <Group title="Style">
              <div>
                <Label>Fond</Label>
                <Segmented value={theme} onChange={setTheme} options={[{ key: 'light', label: 'Beige' }, { key: 'dark', label: 'Sombre' }]} />
              </div>
              <div>
                <Label>Langue du visuel</Label>
                <Segmented value={lang} onChange={setLang} options={[{ key: 'fr', label: 'Français' }, { key: 'en', label: 'English' }]} />
              </div>
            </Group>
          </aside>

          {/* CENTRE - the finished post */}
          <main className="bg-stone-200/70 dark:bg-black/40 lg:overflow-y-auto px-4 py-6 lg:px-10 lg:py-8">
            <div className="mx-auto w-full space-y-3" style={{ maxWidth: 'min(620px, calc((100dvh - 10rem) * 0.8))' }}>
              <div className="flex items-center justify-between text-[0.65rem] font-mono uppercase tracking-[0.16em] text-zinc-500 dark:text-stone-400">
                <span>Post Instagram 4:5</span>
                <span>{ANNOUNCEMENT_WIDTH} × {ANNOUNCEMENT_HEIGHT} px</span>
              </div>
              <div className="relative rounded-lg overflow-hidden shadow-2xl border border-stone-300/70 dark:border-stone-50/15 bg-stone-100 dark:bg-zinc-900" style={{ aspectRatio: '4 / 5' }}>
                <canvas ref={canvasRef} className={`block w-full h-full transition-opacity duration-300 ${ready ? 'opacity-100' : 'opacity-0'}`} />
                {!ready && <Skeleton className="absolute inset-0 h-full w-full rounded-none" />}
              </div>
            </div>
          </main>
        </div>
      )}
    </div>
  )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="font-mono uppercase tracking-[0.18em] text-[0.7rem] text-zinc-500 dark:text-stone-400">{title}</h3>
      {children}
    </section>
  )
}

function Label({ children }: { children: ReactNode }) {
  return <span className="block text-[0.65rem] font-mono uppercase tracking-[0.16em] text-zinc-500 dark:text-stone-400 mb-1">{children}</span>
}

function Segmented<K extends string>({ value, onChange, options }: { value: K; onChange: (k: K) => void; options: { key: K; label: string }[] }) {
  return (
    <div className="inline-flex rounded-full border border-stone-300 dark:border-stone-50/15 p-1 gap-1">
      {options.map((o) => (
        <button key={o.key} type="button" onClick={() => onChange(o.key)}
          className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition ${value === o.key
            ? 'bg-zinc-950 text-stone-50 dark:bg-stone-50 dark:text-zinc-950'
            : 'text-zinc-600 hover:text-zinc-950 dark:text-stone-300 dark:hover:text-stone-50'}`}>
          {o.label}
        </button>
      ))}
    </div>
  )
}
