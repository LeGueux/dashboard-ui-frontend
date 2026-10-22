import type { WeatherSnapshot } from '../types/dust'
import { stationDate } from './marketDate'

export type MarketWeatherSnapshot = WeatherSnapshot & { marketDate: string }

export function weatherCalendarDate(value: string | null | undefined, timeZone?: string | null) {
  if (!value) return null
  // Les dates sans décalage sont déjà exprimées dans le fuseau de la station.
  if (/(?:Z|[+-]\d{2}:\d{2})$/i.test(value)) return stationDate(new Date(value), timeZone)
  return value.match(/^(\d{4}-\d{2}-\d{2})T\d{2}:\d{2}/)?.[1] || null
}

export function weatherForMarketDate(snapshot: WeatherSnapshot | null | undefined, date: string | null, timeZone = snapshot?.tz): MarketWeatherSnapshot | null {
  if (!snapshot || !date) return null
  const matchesDate = (point: { timeLocal: string }) => weatherCalendarDate(point.timeLocal, timeZone) === date
  const recentObservations = (snapshot.recentObservations || []).filter(matchesDate)
  const hourly = (snapshot.hourly || []).filter(matchesDate)
  const forecastModels = (snapshot.forecastModels || []).map(model => ({ ...model, hourly: model.hourly.filter(matchesDate) }))
    .filter(model => model.hourly.length)
  const sparkline = (snapshot.sparkline || []).filter(matchesDate)
  const currentMatchesDate = weatherCalendarDate(snapshot.observedAt, timeZone) === date
  const latestObservation = recentObservations.at(-1)
  // La température du jour ne sert jamais de valeur de remplacement pour un pari de la veille.
  const current = currentMatchesDate
    ? snapshot.current
    : latestObservation
      ? {
          temperature: latestObservation.temperature,
          condition: latestObservation.condition,
          conditionIcon: latestObservation.conditionIcon
        }
      : undefined
  if (!current && !recentObservations.length && !hourly.length && !forecastModels.length && !sparkline.length && !snapshot.disabled) return null

  return {
    ...snapshot,
    tz: timeZone,
    marketDate: date,
    current,
    observedAt: currentMatchesDate ? snapshot.observedAt : latestObservation?.timeLocal,
    recentObservations,
    hourly,
    forecastModels,
    sparkline
  }
}
