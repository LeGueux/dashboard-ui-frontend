import type { CityGroup, WeatherSnapshot, WeatherMarketForecast } from '~/types/dust'
import { calendarDateLabel, stationDate } from '~/utils/marketDate'
import { weatherForMarketDate } from '~/utils/marketWeather'
import { weatherPeakLabel } from '~/utils/dustWeather'

export function useDustStation(props: { group: CityGroup, snapshot?: WeatherSnapshot, forecasts: WeatherMarketForecast[] }) {
  const { now } = useDustClock()
  const weather = computed(() => weatherForMarketDate(props.snapshot, props.group.date, props.group.tz))
  const peakLabel = computed(() => weatherPeakLabel(weather.value, props.group.tz))
  // La comparaison du jour reste stable entre deux ticks et attend le montage du client.
  const localDate = computed(() => now.value ? stationDate(now.value, props.group.tz) : null)
  const mounted = computed(() => now.value !== null)
  const dateGuard = computed(() => {
    if (!mounted.value) return null
    const group = props.group
    const localDateLabel = localDate.value ? calendarDateLabel(localDate.value) : 'inconnue'
    const dateLabel = group.dateLabel || 'inconnue'
    const timeZone = group.tz
    let warning = null
    if (!group.date || !timeZone) {
      warning = { title: 'Date du pari non vérifiable', details: `Pari : ${dateLabel} · Jour local : ${localDateLabel}${timeZone ? ` (${timeZone})` : ' · Fuseau de la station indisponible'}.` }
    } else if (!weather.value && props.snapshot) {
      warning = { title: 'Météo indisponible pour cette date', details: `Pari : ${dateLabel} · Aucun relevé ni prévision disponible pour cette journée à ${group.city} (${timeZone}).` }
    }
    return { localDateLabel, marketMatchesToday: group.date === localDate.value, canShowChart: !!weather.value && !warning, warning }
  })

  const forecast = computed(() => {
    // Le résumé transmis par le bot porte sur son jour de collecte, sans historique par marché.
    const snapshot = props.snapshot
    if (!snapshot || !dateGuard.value?.marketMatchesToday || props.group.date !== stationDate(new Date(snapshot.fetchedAt), props.group.tz)) return null
    const marketIds = new Set(props.group.markets.map(market => String(market.id || market.slug || '')))
    const forecast = props.forecasts
      .find(forecast => forecast.airport === props.group.airport && marketIds.has(String(forecast.marketId || ''))) || null
    const datedWeather = weather.value
    if (!forecast || !datedWeather) return null
    // Le résumé ne doit pas réintroduire une température courante datée de la veille.
    const temperatures = [...(datedWeather.hourly || []).map(point => point.temperature), datedWeather.current?.temperature]
      .filter((value): value is number => value != null && Number.isFinite(value))
    if (!temperatures.length) return null
    const forecastMax = Math.max(...temperatures)
    const margin = forecast.threshold === null ? null : Math.round((forecastMax - forecast.threshold) * 10) / 10
    return {
      ...forecast,
      forecastMax,
      margin,
      reason: `Max prévu ${forecastMax.toFixed(1)}°${datedWeather.unit}${margin === null ? '' : `, marge ${margin >= 0 ? '+' : ''}${margin.toFixed(1)}°${datedWeather.unit}`}`
    }
  })

  return { weather, peakLabel, dateGuard, forecast }
}
