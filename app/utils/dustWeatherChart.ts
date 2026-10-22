import type { DustMarket, WeatherSnapshot, WeatherMarketForecast } from '~/types/dust'
import type { MarketWeatherSnapshot } from './marketWeather'
import { weatherTemperature, weatherLocalMinute, weatherAxisLabel, weatherDayStart, weatherModelStyle } from './dustWeather'

export function weatherBets(snapshot: WeatherSnapshot, markets: DustMarket[], forecasts: WeatherMarketForecast[]) {
  const unique = new Map<string, { title: string, outcome: string, temperatures: number[] }>()
  for (const market of markets) {
    const forecast = forecasts.find(item => item.airport === snapshot.airport && String(item.marketId) === String(market.id || market.slug))
    const title = market.groupItemTitle?.trim() || ''
    // Une plage fournit deux bornes ; le tiret séparateur ne doit pas devenir un signe négatif.
    const values = (title.replace(/(\d)\s*[-–]\s*(?=\d)/g, '$1 ').match(/-?\d+(?:[.,]\d+)?/g) || [])
      .map(value => Number(value.replace(',', '.'))).filter(Number.isFinite).slice(0, 2)
    if (!values.length && forecast?.threshold != null && Number.isFinite(forecast.threshold)) values.push(forecast.threshold)
    if (!values.length) continue
    const unit = title.match(/°\s*([CF])/i)?.[1]?.toUpperCase() || forecast?.unit || snapshot.unit
    // Toutes les bornes utilisent l'unité du graphique, même si le marché emploie l'autre unité.
    const temperatures = [...new Set(values.map(value => unit === snapshot.unit ? value : snapshot.unit === 'C' ? (value - 32) * 5 / 9 : value * 9 / 5 + 32))]
    const outcome = market.outcome || ''
    const key = `${temperatures.join('/')}:${outcome}:${title}`
    if (!unique.has(key)) unique.set(key, { title: title || weatherTemperature(temperatures[0], snapshot.unit), outcome, temperatures })
  }
  return [...unique.values()].sort((a, b) => a.temperatures[0]! - b.temperatures[0]!)
    .map((bet, index) => ({ ...bet, id: `B${index + 1}` }))
}

// La géométrie dépend uniquement des données et de la largeur, jamais de l’horloge.
export function buildWeatherChart(snapshot: MarketWeatherSnapshot, markets: DustMarket[], forecasts: WeatherMarketForecast[], chartWidth: number) {
  const bets = weatherBets(snapshot, markets, forecasts)
  const chartLeft = 48
  const chartRight = chartWidth - 14
  const plotWidth = chartRight - chartLeft
  const chartTop = 36
  const chartBottom = 268
  type ChartPoint = { timeLocal: string, temperature: number, kind?: 'observed' | 'forecast', label?: string, color?: string, modelId?: string, primary?: boolean }
  const basePoints: ChartPoint[] = (snapshot.sparkline || [])
    .filter(point => Number.isFinite(point.temperature))
    .map(point => ({ ...point, temperature: Number(point.temperature) }))
  const dayStart = weatherDayStart(snapshot)
  const dayEnd = dayStart === null ? null : dayStart + 24 * 60
  // En début de journée, le flux peut aussi contenir des relevés de la veille pour le tableau METAR.
  const observations = basePoints.filter((point) => {
    if (point.kind !== 'observed' || dayStart === null) return false
    const minute = weatherLocalMinute(point.timeLocal, snapshot.tz)
    return minute !== null && minute >= dayStart && minute < dayStart + 24 * 60
  }).sort((a, b) => weatherLocalMinute(a.timeLocal, snapshot.tz)! - weatherLocalMinute(b.timeLocal, snapshot.tz)!)
  const fallbackForecast = basePoints.filter(point => point.kind === 'forecast')
  const primaryRows: ChartPoint[] = (snapshot.hourly?.length ? snapshot.hourly.slice(0, 12) : fallbackForecast.slice(0, 12))
    .filter(point => Number.isFinite(point.temperature))
    .map(point => ({ ...point, temperature: Number(point.temperature), kind: 'forecast' as const, label: snapshot.sourceLabel, color: '#5b86a4', primary: true }))
  const modelRows: ChartPoint[] = (snapshot.forecastModels || []).flatMap((model, index) => model.hourly.slice(0, 12)
    .filter(point => Number.isFinite(point.temperature))
    .map(point => ({ ...point, temperature: Number(point.temperature), kind: 'forecast' as const, label: model.label, color: weatherModelStyle(index).color, modelId: model.id })))
  const forecastRows = [...primaryRows, ...modelRows]
  const points = [...observations, ...(forecastRows.length ? forecastRows : fallbackForecast)]
  const empty = { observed: '', forecast: '', primaryForecast: '', spread: '', modelPaths: [], points: [], observedPoints: [], forecastPoints: [], primaryPoints: [], axisPoints: [], yAxisPoints: [], betLines: [] as { temperature: number, y: number, labelY: number, label: string }[], bets, primaryMax: null as number | null, boundaryX: null, midnightX: null as number | null, afterMidnightX: null as number | null, midnightLabelX: null as number | null, betChartRight: chartRight, peakPoint: null, min: null, middle: null, max: null, consensusMax: null, spreadMax: null, chartWidth, chartLeft, chartRight, labelX: chartLeft - 5 }
  if (points.length < 2) return empty
  // Les seuils participent à l'échelle pour qu'un bet au-dessus du maximum reste visible.
  const values = [...points.map(point => point.temperature), ...bets.flatMap(bet => bet.temperatures)]
  const dataMin = Math.min(...values)
  const dataMax = Math.max(...values)
  const baseTemperatureStep = snapshot.unit === 'F' ? 5 : 2
  const temperatureStep = Math.max(baseTemperatureStep, Math.ceil((dataMax - dataMin) / (5 * baseTemperatureStep)) * baseTemperatureStep)
  let min = Math.floor(dataMin / temperatureStep) * temperatureStep
  let max = Math.ceil(dataMax / temperatureStep) * temperatureStep

  // Conserve une échelle lisible même lorsque toutes les températures sont identiques.
  if (min === max) {
    min -= temperatureStep
    max += temperatureStep
  }

  const range = max - min
  const scaleTemperatureY = (temperature: number) => chartBottom - ((temperature - min) / range) * (chartBottom - chartTop)
  const thresholds = new Map<number, string[]>()
  for (const bet of bets) {
    for (const temperature of bet.temperatures) thresholds.set(temperature, [...(thresholds.get(temperature) || []), bet.id])
  }
  let previousLabelY = chartTop - 20
  const betLines = [...thresholds].sort(([a], [b]) => b - a).map(([temperature, ids], index) => {
    const y = scaleTemperatureY(temperature)
    // Les libellés gardent un espacement lisible même si deux bets sont très proches.
    const labelY = Math.max(Math.min(y - 6, chartBottom - 6 - (thresholds.size - index - 1) * 20), previousLabelY + 20)
    previousLabelY = labelY
    return { temperature, y, labelY, label: ids.join(' / ') }
  })
  const yAxisPoints = Array.from(
    { length: Math.round(range / temperatureStep) + 1 },
    (_, index) => {
      const value = min + index * temperatureStep
      return { value, y: scaleTemperatureY(value) }
    }
  )
  const localMinutes = points.map(point => weatherLocalMinute(point.timeLocal, snapshot.tz)).filter((value): value is number => value !== null)
  const validTimeline = localMinutes.length === points.length && new Set(localMinutes).size > 1
  const firstMinute = validTimeline ? Math.min(...localMinutes) : 0
  const lastMinute = validTimeline ? Math.max(...localMinutes) : points.length - 1
  const minuteRange = lastMinute - firstMinute || 1
  // La limite est le prochain minuit de la station, dans le même repère local que les courbes.
  const scaleMinuteX = (minute: number) => chartLeft + ((minute - firstMinute) / minuteRange) * plotWidth
  const midnightX = validTimeline && dayEnd !== null && dayEnd >= firstMinute && dayEnd <= lastMinute ? scaleMinuteX(dayEnd) : null
  const afterMidnightX = validTimeline && dayEnd !== null && dayEnd < lastMinute ? scaleMinuteX(Math.max(firstMinute, dayEnd)) : null
  const betChartRight = validTimeline && dayEnd !== null ? scaleMinuteX(Math.max(firstMinute, Math.min(lastMinute, dayEnd))) : chartRight
  const coords = points.map((point, index) => ({
    ...point,
    x: chartLeft + ((validTimeline ? weatherLocalMinute(point.timeLocal, snapshot.tz)! - firstMinute : index) / minuteRange) * plotWidth,
    y: scaleTemperatureY(point.temperature),
    chartWidth
  }))
  const path = (items: typeof coords) => items.map((point, index) => `${index ? 'L' : 'M'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ')
  const observedPoints = coords.filter(point => point.kind === 'observed')
  const rawForecastPoints = coords.filter(point => point.kind === 'forecast' && point.modelId)
  const primaryPoints = coords.filter(point => point.primary)
  // Les prévisions du lendemain restent visibles, mais ne gonflent pas le maximum du jour.
  const withinBetDay = (point: ChartPoint) => {
    const minute = weatherLocalMinute(point.timeLocal, snapshot.tz)
    return minute !== null && dayStart !== null && dayEnd !== null && minute >= dayStart && minute < dayEnd
  }
  const dailyPrimaryPoints = primaryPoints.filter(withinBetDay)
  const grouped = new Map<string, typeof rawForecastPoints>()
  for (const point of rawForecastPoints) grouped.set(point.timeLocal, [...(grouped.get(point.timeLocal) || []), point])
  const forecastPoints = [...grouped.entries()].map(([timeLocal, rows]) => ({
    timeLocal, kind: 'forecast' as const, label: 'Moyenne des modèles', color: '#e2e8f0',
    temperature: rows.reduce((sum, row) => sum + row.temperature, 0) / rows.length,
    x: rows[0]!.x,
    y: scaleTemperatureY(rows.reduce((sum, row) => sum + row.temperature, 0) / rows.length),
    chartWidth
  })).sort((a, b) => a.x - b.x)
  const dailyForecastPoints = forecastPoints.filter(withinBetDay)
  const peakPoint = observedPoints.reduce<(typeof observedPoints)[number] | null>((peak, point) => !peak || point.temperature > peak.temperature ? point : peak, null)
  const forecastPathPoints = observedPoints.length && forecastPoints.length
    ? [observedPoints.at(-1)!, ...forecastPoints]
    : forecastPoints
  const primaryPathPoints = observedPoints.length && primaryPoints.length
    ? [observedPoints.at(-1)!, ...primaryPoints]
    : primaryPoints
  const modelPaths = (snapshot.forecastModels || []).map((model, index) => {
    const modelPoints = coords.filter(point => point.modelId === model.id).sort((a, b) => a.x - b.x)
    const linked = observedPoints.length && modelPoints.length ? [observedPoints.at(-1)!, ...modelPoints] : modelPoints
    return { ...model, ...weatherModelStyle(index), path: path(linked), points: modelPoints }
  }).filter(model => model.path)
  const spreadRows = [...grouped.values()].filter(rows => rows.length > 1).map(rows => ({
    x: rows[0]!.x,
    top: scaleTemperatureY(Math.max(...rows.map(row => row.temperature))),
    bottom: scaleTemperatureY(Math.min(...rows.map(row => row.temperature)))
  })).sort((a, b) => a.x - b.x)
  const spread = spreadRows.length > 1
    ? `M ${spreadRows.map(row => `${row.x.toFixed(1)} ${row.top.toFixed(1)}`).join(' L ')} L ${spreadRows.slice().reverse().map(row => `${row.x.toFixed(1)} ${row.bottom.toFixed(1)}`).join(' L ')} Z`
    : ''
  // Le nombre d'heures affichées dépend de la place disponible pour un texte de 13 px.
  const maxTicks = Math.max(2, Math.floor(plotWidth / 72))
  const desiredStep = [60, 120, 180, 240, 360, 480, 720, 1440].find(step => step >= minuteRange / maxTicks) || 1440
  const firstTick = Math.ceil(firstMinute / desiredStep) * desiredStep
  const axisPoints = validTimeline
    ? Array.from({ length: Math.max(0, Math.floor((lastMinute - firstTick) / desiredStep) + 1) }, (_, index) => {
        const minute = firstTick + index * desiredStep
        return { x: chartLeft + ((minute - firstMinute) / minuteRange) * plotWidth, label: weatherAxisLabel(minute), timeLocal: String(minute) }
      })
    : coords
        .filter((_point, index) => index % Math.max(1, Math.ceil(coords.length / 4)) === 0 || index === coords.length - 1)
        .map(point => ({ ...point, label: null }))
  return {
    observed: path(observedPoints),
    forecast: path(forecastPathPoints), primaryForecast: path(primaryPathPoints), spread, modelPaths,
    points: [...observedPoints, ...primaryPoints],
    observedPoints,
    forecastPoints,
    primaryPoints,
    primaryMax: dailyPrimaryPoints.length ? Math.max(...dailyPrimaryPoints.map(point => point.temperature)) : null,
    bets,
    betLines: betChartRight > chartLeft ? betLines : [],
    axisPoints,
    yAxisPoints,
    boundaryX: primaryPoints[0]?.x ?? forecastPoints[0]?.x ?? null,
    midnightX,
    afterMidnightX,
    midnightLabelX: midnightX === null ? null : Math.max(chartLeft + 75, Math.min(chartRight - 75, midnightX)),
    betChartRight,
    peakPoint,
    min,
    middle: min + range / 2,
    max,
    consensusMax: dailyForecastPoints.length ? Math.max(...dailyForecastPoints.map(point => point.temperature)) : null,
    spreadMax: spreadRows.length ? Math.max(...[...grouped.values()].map(rows => Math.max(...rows.map(row => row.temperature)) - Math.min(...rows.map(row => row.temperature)))) : null,
    chartWidth, chartLeft, chartRight, labelX: chartLeft - 5
  }
}
