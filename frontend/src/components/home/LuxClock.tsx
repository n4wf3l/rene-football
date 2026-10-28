import { memo, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

/** Live local time at the agency's base (Europe/Luxembourg). */
function LuxClockBase() {
  const { i18n } = useTranslation()
  const [now, setNow] = useState<Date>(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15_000)
    return () => clearInterval(id)
  }, [])

  const time = new Intl.DateTimeFormat(i18n.resolvedLanguage, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Luxembourg',
  }).format(now)

  return <time className="tabular-nums">{time}</time>
}

const LuxClock = memo(LuxClockBase)
export default LuxClock
