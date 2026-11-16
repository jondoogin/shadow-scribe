import { useEffect, useState } from 'react'

// Folio's sky: phases of the local day.
export const SKY_PHASES = ['dawn', 'day', 'dusk', 'night']

export function phaseForHour(h) {
  if (h >= 5 && h < 8) return 'dawn'
  if (h >= 8 && h < 17) return 'day'
  if (h >= 17 && h < 21) return 'dusk'
  return 'night'
}

export const SKY = {
  dawn:  { label: 'Dawn',  grad: 'linear-gradient(180deg, #F6C9C0 0%, #FBD9B5 45%, #FFF1DC 100%)', disc: '#FFB27A', y: 78 },
  day:   { label: 'Day',   grad: 'linear-gradient(180deg, #8EC5F5 0%, #BFE0FA 50%, #EAF5FD 100%)', disc: '#FFF3C4', y: 30 },
  dusk:  { label: 'Dusk',  grad: 'linear-gradient(180deg, #3D2C6B 0%, #B8507A 45%, #F59A6A 80%, #FBC98E 100%)', disc: '#FFD08A', y: 70 },
  night: { label: 'Night', grad: 'linear-gradient(180deg, #070B1F 0%, #15204A 55%, #2B3566 100%)', disc: '#F2EEDC', y: 28 },
}

export function useSkyPhase(override) {
  const [hour, setHour] = useState(() => new Date().getHours())
  useEffect(() => {
    const t = setInterval(() => setHour(new Date().getHours()), 60_000)
    return () => clearInterval(t)
  }, [])
  return override || phaseForHour(hour)
}

export function skyLabel(phase) { return SKY[phase].label }
