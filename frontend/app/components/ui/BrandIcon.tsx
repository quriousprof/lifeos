import Image from 'next/image'
import { ICON } from '@/app/lib/icons'

// provider/brand slug → downloaded file in /public/brands (keep the real extension)
const BRAND: Record<string, string> = {
  gmail: 'gmail.png', calendar: 'googlecalendar.png', 'google calendar': 'googlecalendar.png',
  bitrefill: 'bitrefill.png', zcash: 'zcash.png', notion: 'notion.png', spotify: 'spotify.png',
  netflix: 'netflix.png', github: 'github.png', aws: 'amazonaws.png',
  'amazon web services': 'amazonaws.png', airalo: 'airalo.png', singtel: 'singtel.png',
  amazon: 'amazon.png', kindle: 'amazon.png',
  'blue bottle': 'bluebottle.png', 'blue bottle coffee': 'bluebottle.png',
}

/**
 * Renders a real, downloaded brand favicon. Non-brand slugs (e.g. `manual`)
 * fall back to the Phosphor user icon — never an authored SVG.
 */
export function BrandIcon({
  slug,
  size = 20,
  className,
}: {
  slug: string
  size?: number
  className?: string
}) {
  const file = BRAND[slug.trim().toLowerCase()]

  if (!file) {
    const Fallback = ICON.user
    return <Fallback size={size} className={className} aria-hidden="true" />
  }

  return (
    <Image
      src={`/brands/${file}`}
      alt=""
      width={size}
      height={size}
      className={className}
      unoptimized
    />
  )
}
