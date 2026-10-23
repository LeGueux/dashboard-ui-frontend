import type { WeatherSnapshot } from '../types/dust'
import { stationDate } from './marketDate'

export type MarketWeatherSnapshot = WeatherSnapshot & {
  marketDate: string
  chartForecasts?: Pick<WeatherSnapshot, 'hourly' | 'forecastModels' | 'sparkline'>
}

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

  // L'aperçu du lendemain alimente uniquement les courbes, jamais les résumés du jour.
  // Il ne suffit pas à rendre disponible une journée sans relevé ni prévision propre.
  const nextDay = Date.parse(`${date}T00:00:00Z`) + 24 * 60 * 60 * 1000
  const nextDate = Number.isFinite(nextDay) ? new Date(nextDay).toISOString().slice(0, 10) : null
  const withinChartDates = (point: { timeLocal: string }) => {
    const pointDate = weatherCalendarDate(point.timeLocal, timeZone)
    return pointDate === date || pointDate === nextDate
  }
  const chartForecasts = {
    hourly: (snapshot.hourly || []).filter(withinChartDates),
    forecastModels: (snapshot.forecastModels || []).map(model => ({ ...model, hourly: model.hourly.filter(withinChartDates) }))
      .filter(model => model.hourly.length),
    sparkline: (snapshot.sparkline || []).filter(point => point.kind === 'forecast' && withinChartDates(point))
  }

  return {
    ...snapshot,
    tz: timeZone,
    marketDate: date,
    current,
    observedAt: currentMatchesDate ? snapshot.observedAt : latestObservation?.timeLocal,
    recentObservations,
    chartForecasts,
    hourly,
    forecastModels,
    sparkline
  }
}
