import type { HeroVariant } from '../../../lib/heroVariants'
import type { HeroData } from './HeroParts'
import SpotlightHero from './SpotlightHero'
import PosterHero from './PosterHero'
import MosaicHero from './MosaicHero'
import LineupHero from './LineupHero'
import CoverHero from './CoverHero'
import MarqueeHero from './MarqueeHero'

const HEROES: Record<HeroVariant, (props: HeroData) => React.JSX.Element> = {
  spotlight: SpotlightHero,
  poster: PosterHero,
  mosaic: MosaicHero,
  lineup: LineupHero,
  cover: CoverHero,
  marquee: MarqueeHero,
}

/** The home page hero chosen in Réglages. */
export default function HomeHero({ variant, ...data }: HeroData & { variant: HeroVariant }) {
  const Hero = HEROES[variant] ?? SpotlightHero
  return <Hero {...data} />
}
