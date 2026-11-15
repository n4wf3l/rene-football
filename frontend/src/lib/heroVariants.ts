/**
 * Home page heroes the agency can choose from in Réglages. The order and the
 * keys mirror AppSetting::HERO_VARIANTS on the backend; the first is the
 * default. Labels and descriptions are admin-only (French).
 */
export const HERO_VARIANTS = ['spotlight', 'poster', 'mosaic', 'lineup', 'cover', 'marquee'] as const

export type HeroVariant = (typeof HERO_VARIANTS)[number]

export const DEFAULT_HERO: HeroVariant = 'spotlight'

export const HERO_META: Record<HeroVariant, { label: string; description: string }> = {
  spotlight: {
    label: 'Projecteur',
    description: 'Le titre à gauche, une carte beige qui fait défiler les joueurs à droite. La version actuelle.',
  },
  poster: {
    label: 'Affiche',
    description: 'Un joueur en très grand, son nom en fond géant, comme une affiche de match. Il change toutes les 6 secondes.',
  },
  mosaic: {
    label: 'Mosaïque',
    description: 'Tous les portraits en grille, un projecteur passe de joueur en joueur. Le vestiaire de l’agence.',
  },
  lineup: {
    label: 'Composition',
    description: 'Les joueurs placés sur un terrain tactique selon leur poste, qui se dessine à l’ouverture.',
  },
  cover: {
    label: 'Une',
    description: 'Couverture de magazine : titre immense sur toute la largeur et une rangée de portraits numérotés.',
  },
  marquee: {
    label: 'Défilé',
    description: 'Les noms des joueurs défilent en bandes géantes avec leurs portraits, sous le titre.',
  },
}

export function isHeroVariant(v: unknown): v is HeroVariant {
  return typeof v === 'string' && (HERO_VARIANTS as readonly string[]).includes(v)
}
