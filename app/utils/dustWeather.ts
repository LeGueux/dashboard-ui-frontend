import type { WeatherObservation, WeatherSnapshot, WeatherMarketForecast } from '~/types/dust'
import type { MarketWeatherSnapshot } from './marketWeather'

const weatherHourFormatters = new Map<string, Intl.DateTimeFormat>()
const weatherMinuteFormatters = new Map<string, Intl.DateTimeFormat>()

export function weatherTemperature(value: number | null | undefined, unit: 'C' | 'F' = 'C') {
  return value != null && Number.isFinite(Number(value)) ? `${Math.round(Number(value) * 10) / 10}°${unit}` : '—'
}

export function metarTemperature(observation: WeatherObservation, unit: 'C' | 'F' = 'C') {
  if (observation.temperature === null || !Number.isFinite(Number(observation.temperature))) return '—'
  const temperature = Math.round(Number(observation.temperature) * 10) / 10
  return `${observation.temperaturePrecision === 'tenth' ? temperature.toFixed(1) : temperature}°${unit}`
}

export function weatherConditionLabel(value?: string | null) {
  const raw = String(value || '').trim().toUpperCase()
  if (!raw) return 'Condition inconnue'
  const labels: Record<string, string> = {
    'CAVOK': 'Bonnes conditions',
    'CLR': 'Ciel dégagé',
    'SKC': 'Ciel dégagé',
    'FEW': 'Peu nuageux',
    'SCT': 'Nuages épars',
    'BKN': 'Très nuageux',
    'OVC': 'Couvert',
    'BR': 'Brume',
    'FG': 'Brouillard',
    'RA': 'Pluie',
    '-RA': 'Pluie faible',
    '+RA': 'Pluie forte',
    'TS': 'Orage',
    'SHRA': 'Averses de pluie'
  }
  return labels[raw] || 'Condition inconnue'
}

export function weatherHour(value?: string | null, tz?: string | null) {
  if (!value) return '—'
  const hasExplicitOffset = /(?:Z|[+-]\d{2}:\d{2})$/i.test(value)
  const parsed = hasExplicitOffset ? new Date(value) : new Date(Number.NaN)
  if (!Number.isNaN(parsed.getTime()) && tz) {
    let formatter = weatherHourFormatters.get(tz)
    if (!formatter) {
      formatter = new Intl.DateTimeFormat('fr-FR', { timeZone: tz, hour: '2-digit', minute: '2-digit' })
      weatherHourFormatters.set(tz, formatter)
    }
    return formatter.format(parsed)
  }
  return String(value).slice(11, 16) || value
}

export function weatherForecastLabel(forecast: WeatherMarketForecast) {
  return forecast.reason.replace(/\s*·\s*fallback Open-Meteo/i, '')
}

export function hasMetarObservations(snapshot: WeatherSnapshot) {
  return snapshot.recentObservations?.some(observation => observation.source === 'metar') || false
}

export function calculateDailyMaximumTemperature(snapshot: MarketWeatherSnapshot) {
  const dayStart = weatherDayStart(snapshot)
  if (dayStart === null) return null

  const observations = (snapshot.recentObservations || [])
    .map(observation => ({
      ...observation,
      localMinute: weatherLocalMinute(observation.timeLocal, snapshot.tz)
    }))
    .filter(observation => observation.localMinute !== null && observation.temperature !== null && Number.isFinite(Number(observation.temperature)))

  if (!observations.length) return null

  const temperatures = observations
    .filter(observation => observation.localMinute! >= dayStart && observation.localMinute! < dayStart + 24 * 60)
    .map(observation => Number(observation.temperature))

  return temperatures.length ? Math.max(...temperatures) : null
}

export function weatherLocalMinute(value: string, timeZone?: string | null) {
  const explicitOffset = /(?:Z|[+-]\d{2}:\d{2})$/i.test(value)
  if (explicitOffset && timeZone) {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return null
    let formatter = weatherMinuteFormatters.get(timeZone)
    if (!formatter) {
      formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: false
      })
      weatherMinuteFormatters.set(timeZone, formatter)
    }
    const parts = formatter.formatToParts(date)
    const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find(item => item.type === type)?.value)
    const hour = part('hour') === 24 ? 0 : part('hour')
    return Date.UTC(part('year'), part('month') - 1, part('day'), hour, part('minute')) / 60_000
  }
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
  if (!match) return null
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5])) / 60_000
}

export function weatherAxisLabel(localMinute: number) {
  const date = new Date(localMinute * 60_000)
  return `${String(date.getUTCHours()).padStart(2, '0')}:00`
}

export function weatherDayStart(snapshot: MarketWeatherSnapshot) {
  return Date.parse(`${snapshot.marketDate}T00:00:00Z`) / 60_000
}

export function weatherModelStyle(index: number) {
  // Les motifs restent distincts en niveaux de gris ; les teintes pâles du flux sont remplacées.
  return [
    { color: '#8b78a6', dash: '10 5', legend: 'repeating-linear-gradient(to right, #8b78a6 0 10px, transparent 10px 15px)' },
    { color: '#578a82', dash: '2 5', legend: 'repeating-linear-gradient(to right, #578a82 0 2px, transparent 2px 7px)' },
    { color: '#8a8d5f', dash: '10 4 2 4', legend: 'repeating-linear-gradient(to right, #8a8d5f 0 10px, transparent 10px 14px, #8a8d5f 14px 16px, transparent 16px 20px)' }
  ][index % 3]!
}

export function betTemperatureGap(temperatures: number[], reference: number | null | undefined, unit: 'C' | 'F') {
  if (reference == null || !Number.isFinite(reference)) return '—'
  return temperatures.map((temperature) => {
    const delta = Math.round((temperature - reference) * 10) / 10
    return `${delta > 0 ? '+' : ''}${delta}°${unit}`
  }).join(' / ')
}

export function temperatureTrend(snapshot: WeatherSnapshot) {
  const observations = (snapshot.recentObservations || []).filter(point => Number.isFinite(point.temperature))
  if (observations.length < 2) return null
  const latest = observations.at(-1)!
  const previous = observations.at(-2)!
  const delta = Math.round((Number(latest.temperature) - Number(previous.temperature)) * 10) / 10
  if (delta > 0.2) return { icon: '↑', label: 'En hausse', delta }
  if (delta < -0.2) return { icon: '↓', label: 'En baisse', delta }
  return { icon: '→', label: 'Stable', delta: 0 }
}

export function weatherPeakLabel(snapshot: MarketWeatherSnapshot | null, timeZone?: string | null) {
  if (!snapshot) return null
  // Le pic non daté du bot peut provenir d'une source bloquée sur la veille.
  const measured = (snapshot.recentObservations || []).filter(point => point.temperature != null && Number.isFinite(point.temperature))
  const predicted = (snapshot.hourly || []).filter(point => point.temperature != null && Number.isFinite(point.temperature))
  const points = measured.length ? measured : predicted
  const peak = points.reduce<(typeof points)[number] | null>((max, point) => !max || point.temperature! > max.temperature! ? point : max, null)
  return peak ? `${weatherTemperature(peak.temperature, snapshot.unit)} à ${weatherHour(peak.timeLocal, timeZone)} (${measured.length ? 'mesuré' : 'prévu'})` : null
}
