<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { WeatherSnapshot, WeatherTradingSignal } from '~/composables/useDustMarkets'

interface DustLevel {
  price?: number | string
  size?: number | string
}

type DustAsk = DustLevel
type DustBid = DustLevel

interface DustMarket {
  id?: string | number | null
  slug?: string | null
  city?: string | null
  airport?: string | null
  outcome?: string | null
  date?: string | null
  resolutionSource?: string | null
  resolutionProvider?: string | null
  resolutionAirportCode?: string | null
  resolutionSourceMatchesAirport?: boolean | null
  groupItemTitle?: string | null
  link?: string | null
  asks?: DustAsk[]
  bids?: DustBid[]
  spread?: number | string | null
  currentPrice?: number | string | null
  bestAsk?: number | string | null
  bestBid?: number | string | null
  displaySpread?: string | null
  localTime?: string | null
  peakLabel?: string | null
  links?: MarketLink[] | null
  betmoardLinks?: string | null
  airportLinks?: string | null
  airportData?: { tz?: string | null, ignoreForTrading?: boolean | null } | null
}

interface MarketLink {
  label: string
  url: string
  source?: string
}

const QUICK_LINK_LABELS = ['NWS', 'WETHR', 'WU', 'BM EVENT']

const props = withDefaults(defineProps<{
  markets?: DustMarket[]
  loading?: boolean
  weatherSnapshots?: Record<string, WeatherSnapshot>
  weatherTradingSignals?: WeatherTradingSignal[]
}>(), {
  markets: () => [],
  loading: false,
  weatherSnapshots: () => ({}),
  weatherTradingSignals: () => []
})

const toast = useToast()

interface WeatherHoverPoint {
  airport: string
  x: number
  y: number
  timeLocal: string
  temperature: number
  kind?: 'observed' | 'forecast'
  label?: string
  color?: string
  chartWidth?: number
}

const hoveredWeatherPoint = ref<WeatherHoverPoint | null>(null)

function showWeatherPoint(airport: string, point: Omit<WeatherHoverPoint, 'airport'>) {
  hoveredWeatherPoint.value = { airport, ...point }
}

function weatherTooltipX(point: WeatherHoverPoint) {
  return point.x > (point.chartWidth || 320) * 0.7 ? point.x - 92 : point.x + 8
}

function weatherTooltipY(point: WeatherHoverPoint) {
  return Math.max(8, Math.min(112, point.y - 42))
}

function formatCents(value?: number | string | null) {
  const n = Number(value ?? 0)
  if (!Number.isFinite(n)) return '—'
  const rounded = Math.round(n * 1000) / 10
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}¢`
}

function isYes(outcome?: string | null) {
  return String(outcome || '').trim().toLowerCase() === 'yes'
}

// Formate une date (ISO ou texte) en français lisible : "16 juin à 16:17"
function formatFrDate(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

function formatBetDateLabel(value?: string | null) {
  if (!value) return null

  const raw = String(value).trim()
  if (!raw) return null

  const parsed = new Date(raw)
  if (!Number.isNaN(parsed.getTime())) {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit'
    }).format(parsed)
  }

  const fallback = raw.replace(/\s+/g, ' ').trim()
  return fallback || null
}

// Horloge live (mise à jour chaque seconde, côté client uniquement)
// now reste null au SSR pour garantir un rendu identique à l'hydratation client
const now = ref<Date | null>(null)
let clock: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  now.value = new Date()
  clock = setInterval(() => {
    now.value = new Date()
  }, 1000)
})

onBeforeUnmount(() => {
  if (clock) clearInterval(clock)
})

// Extrait h/m/s pour un fuseau horaire donné
function tzParts(tz: string, date: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).formatToParts(date)

  const get = (t: string) => Number(parts.find(p => p.type === t)?.value || 0)
  let h = get('hour')
  if (h === 24) h = 0
  return { h, m: get('minute'), s: get('second') }
}

// Heure locale courante de la ville (HH:MM)
function cityTime(tz?: string | null, fallback?: string | null) {
  if (!tz || !now.value) return fallback || '—'
  const { h, m } = tzParts(tz, now.value)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// Temps restant avant minuit dans le fuseau de la ville
function timeToMidnight(tz?: string | null) {
  if (!tz || !now.value) return null
  const { h, m, s } = tzParts(tz, now.value)
  const remaining = 86400 - (h * 3600 + m * 60 + s)
  const hh = Math.floor(remaining / 3600)
  const mm = Math.floor((remaining % 3600) / 60)
  const ss = remaining % 60
  return {
    label: hh > 0 ? `${hh}h ${String(mm).padStart(2, '0')}m` : `${mm}m ${String(ss).padStart(2, '0')}s`,
    urgent: remaining <= 3600
  }
}

function formatSpread(value?: number | string | null) {
  const n = Number(value ?? 0)
  if (!Number.isFinite(n)) return '—'
  return `${(n * 100).toFixed(1)}¢`
}

function formatShares(value?: number | string | null) {
  const n = Number(value ?? 0)
  if (!Number.isFinite(n)) return '0'

  if (Number.isInteger(n)) {
    return n.toLocaleString('fr-FR')
  }

  return n.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

function formatUsd(price?: number | string | null, size?: number | string | null) {
  const value = Number(price ?? 0) * Number(size ?? 0)
  if (!Number.isFinite(value)) return '$0.00'

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)
}

function netYieldAfterFeesValue(price?: number | string | null, size?: number | string | null) {
  const p = Number(price ?? 0)
  const shares = Number(size ?? 0)

  if (!Number.isFinite(p) || !Number.isFinite(shares) || shares <= 0 || p <= 0 || p >= 1) {
    return null
  }

  const feeRate = 0.05
  return shares * (1 - p) - shares * feeRate * p * (1 - p)
}

function formatNetYieldAfterFees(price?: number | string | null, size?: number | string | null) {
  const netYield = netYieldAfterFeesValue(price, size)
  if (netYield === null) return ''

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })

  return `${netYield >= 0 ? '+' : '-'}${formatter.format(Math.abs(netYield))}`
}

// Extrait la température du seuil ("18°C", "26°C or higher") pour trier les markets
function thresholdValue(title?: string | null) {
  const match = String(title || '').match(/-?\d+(?:\.\d+)?/)
  return match ? Number(match[0]) : Number.POSITIVE_INFINITY
}

// Prépare les niveaux d'asks triés (meilleur prix d'abord) avec ratio de profondeur
const MAX_LEVELS = 3

interface BookLevel {
  price: number
  size: number
  depth: number
}

interface OrderBook {
  asks: BookLevel[]
  bids: BookLevel[]
}

// Construit le carnet d'ordres : max 3 asks (en haut, meilleur ask le plus bas)
// + max 3 bids (en bas, meilleur bid le plus haut), depth bars partagées.
function orderBook(market: DustMarket): OrderBook {
  const clean = (levels?: DustLevel[]) => (levels || [])
    .map(l => ({ price: Number(l.price ?? 0), size: Number(l.size ?? 0) }))
    .filter(l => Number.isFinite(l.price) && l.price > 0 && l.size > 0)

  // Asks : on garde les 3 meilleurs (prix les plus bas), affichés du + haut au + bas
  const asks = clean(market.asks)
    .sort((a, b) => a.price - b.price)
    .slice(0, MAX_LEVELS)
    .reverse()

  // Bids : on garde les 3 meilleurs (prix les plus hauts), affichés du + haut au + bas
  const bids = clean(market.bids)
    .sort((a, b) => b.price - a.price)
    .slice(0, MAX_LEVELS)

  const maxSize = [...asks, ...bids].reduce((m, l) => Math.max(m, l.size), 0) || 1
  const withDepth = (l: { price: number, size: number }) => ({
    ...l,
    depth: Math.max(6, Math.round((l.size / maxSize) * 100))
  })

  return { asks: asks.map(withDepth), bids: bids.map(withDepth) }
}

function dedupeMarkets(markets: DustMarket[] = []) {
  const unique = new Map<string, DustMarket>()

  for (const market of markets) {
    const key = [market.id ?? '', market.slug ?? '', market.airport ?? '', market.city ?? '', market.outcome ?? '', market.date ?? '', market.groupItemTitle ?? '']
      .filter(Boolean)
      .join('::')

    if (!unique.has(key)) {
      unique.set(key, market)
    }
  }

  return Array.from(unique.values())
}

interface CityGroup {
  city: string
  airport: string
  peakLabel: string | null
  localTime: string | null
  dateLabel: string | null
  tz: string | null
  minRemainingSeconds: number
  urgentCount: number
  markets: DustMarket[]
}

function weatherForGroup(group: CityGroup) {
  return props.weatherSnapshots[group.airport] || null
}

function signalForGroup(group: CityGroup) {
  const marketIds = new Set(group.markets.map(market => String(market.id || market.slug || '')))
  const rank: Record<WeatherTradingSignal['status'], number> = { risk: 4, watch: 3, safe: 2, unknown: 1 }
  return props.weatherTradingSignals
    .filter(signal => signal.airport === group.airport && marketIds.has(String(signal.marketId || '')))
    .sort((a, b) => rank[b.status] - rank[a.status] || b.confidence - a.confidence)[0] || null
}

function weatherTemperature(value: number | null | undefined, unit: 'C' | 'F' = 'C') {
  return Number.isFinite(Number(value)) ? `${Math.round(Number(value) * 10) / 10}°${unit}` : '—'
}

function weatherConditionLabel(value?: string | null) {
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

function weatherHour(value?: string | null, tz?: string | null) {
  if (!value) return '—'
  const hasExplicitOffset = /(?:Z|[+-]\d{2}:\d{2})$/i.test(value)
  const parsed = hasExplicitOffset ? new Date(value) : new Date(Number.NaN)
  if (!Number.isNaN(parsed.getTime()) && tz) {
    return new Intl.DateTimeFormat('fr-FR', { timeZone: tz, hour: '2-digit', minute: '2-digit' }).format(parsed)
  }
  return String(value).slice(11, 16) || value
}

function weatherFreshness(snapshot: WeatherSnapshot) {
  if (snapshot.stale) return 'ancien'
  const fetched = new Date(snapshot.fetchedAt).getTime()
  if (!now.value) return 'a jour'
  const reference = now.value.getTime()
  if (!Number.isFinite(fetched)) return 'fraicheur inconnue'
  const minutes = Math.max(0, Math.round((reference - fetched) / 60_000))
  return minutes < 1 ? 'a l\'instant' : `il y a ${minutes} min`
}

function signalTone(status: WeatherTradingSignal['status']) {
  if (status === 'safe') return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
  if (status === 'watch') return 'border-amber-400/30 bg-amber-400/10 text-amber-200'
  if (status === 'risk') return 'border-rose-400/30 bg-rose-400/10 text-rose-200'
  return 'border-slate-400/30 bg-slate-400/10 text-slate-300'
}

function weatherSignalLabel(signal: WeatherTradingSignal) {
  return signal.reason.replace(/\s*·\s*fallback Open-Meteo/i, '')
}

function hasMetarObservations(snapshot: WeatherSnapshot) {
  return snapshot.recentObservations?.some(observation => observation.source === 'metar') || false
}

function weatherLocalMinute(value: string, timeZone?: string | null) {
  const explicitOffset = /(?:Z|[+-]\d{2}:\d{2})$/i.test(value)
  if (explicitOffset && timeZone) {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return null
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false
    }).formatToParts(date)
    const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find(item => item.type === type)?.value)
    const hour = part('hour') === 24 ? 0 : part('hour')
    return Date.UTC(part('year'), part('month') - 1, part('day'), hour, part('minute')) / 60_000
  }
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
  if (!match) return null
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5])) / 60_000
}

function weatherAxisLabel(localMinute: number) {
  const date = new Date(localMinute * 60_000)
  return `${String(date.getUTCHours()).padStart(2, '0')}:00`
}

const compactWeatherChart = useMediaQuery('(max-width: 767px)')

function sparklinePaths(snapshot: WeatherSnapshot) {
  const chartWidth = compactWeatherChart.value ? 320 : 520
  const chartLeft = compactWeatherChart.value ? 34 : 42
  const chartRight = chartWidth - 10
  const plotWidth = chartRight - chartLeft
  const gridXs = Array.from({ length: 5 }, (_, index) => chartLeft + (plotWidth * index) / 4)
  type ChartPoint = { timeLocal: string, temperature: number, kind?: 'observed' | 'forecast', label?: string, color?: string, modelId?: string }
  const basePoints: ChartPoint[] = (snapshot.sparkline || [])
    .filter(point => Number.isFinite(point.temperature))
    .map(point => ({ ...point, temperature: Number(point.temperature) }))
  const observations = basePoints.filter(point => point.kind === 'observed')
  const fallbackForecast = basePoints.filter(point => point.kind === 'forecast')
  const modelRows: ChartPoint[] = (snapshot.forecastModels || []).flatMap(model => model.hourly.slice(0, 12)
    .filter(point => Number.isFinite(point.temperature))
    .map(point => ({ ...point, temperature: Number(point.temperature), kind: 'forecast' as const, label: model.label, color: model.color, modelId: model.id })))
  const points = [...observations, ...(modelRows.length ? modelRows : fallbackForecast)]
  const empty = { observed: '', forecast: '', spread: '', modelPaths: [], points: [], observedPoints: [], forecastPoints: [], axisPoints: [], boundaryX: null, peakPoint: null, min: null, middle: null, max: null, consensusMax: null, spreadMax: null, chartWidth, chartLeft, chartRight, labelX: chartLeft - 5, gridXs }
  if (points.length < 2) return empty
  const values = points.map(point => point.temperature)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const localMinutes = points.map(point => weatherLocalMinute(point.timeLocal, snapshot.tz)).filter((value): value is number => value !== null)
  const validTimeline = localMinutes.length === points.length && new Set(localMinutes).size > 1
  const firstMinute = validTimeline ? Math.min(...localMinutes) : 0
  const lastMinute = validTimeline ? Math.max(...localMinutes) : points.length - 1
  const minuteRange = lastMinute - firstMinute || 1
  const coords = points.map((point, index) => ({
    ...point,
    x: chartLeft + ((validTimeline ? weatherLocalMinute(point.timeLocal, snapshot.tz)! - firstMinute : index) / minuteRange) * plotWidth,
    y: 135 - ((point.temperature - min) / range) * 110,
    chartWidth
  }))
  const path = (items: typeof coords) => items.map((point, index) => `${index ? 'L' : 'M'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ')
  const observedPoints = coords.filter(point => point.kind === 'observed')
  const rawForecastPoints = coords.filter(point => point.kind === 'forecast')
  const grouped = new Map<string, typeof rawForecastPoints>()
  for (const point of rawForecastPoints) grouped.set(point.timeLocal, [...(grouped.get(point.timeLocal) || []), point])
  const forecastPoints = [...grouped.entries()].map(([timeLocal, rows]) => ({
    timeLocal, kind: 'forecast' as const, label: 'Consensus', color: '#e2e8f0',
    temperature: rows.reduce((sum, row) => sum + row.temperature, 0) / rows.length,
    x: rows[0]!.x,
    y: 135 - (((rows.reduce((sum, row) => sum + row.temperature, 0) / rows.length) - min) / range) * 110,
    chartWidth
  })).sort((a, b) => a.x - b.x)
  const peakPoint = observedPoints.reduce<(typeof observedPoints)[number] | null>((peak, point) => !peak || point.temperature > peak.temperature ? point : peak, null)
  const forecastPathPoints = observedPoints.length && forecastPoints.length
    ? [observedPoints.at(-1)!, ...forecastPoints]
    : forecastPoints
  const modelPaths = (snapshot.forecastModels || []).map((model) => {
    const modelPoints = coords.filter(point => point.modelId === model.id).sort((a, b) => a.x - b.x)
    const linked = observedPoints.length && modelPoints.length ? [observedPoints.at(-1)!, ...modelPoints] : modelPoints
    return { ...model, path: path(linked), points: modelPoints }
  }).filter(model => model.path)
  const spreadRows = [...grouped.values()].filter(rows => rows.length > 1).map(rows => ({
    x: rows[0]!.x,
    top: 135 - ((Math.max(...rows.map(row => row.temperature)) - min) / range) * 110,
    bottom: 135 - ((Math.min(...rows.map(row => row.temperature)) - min) / range) * 110
  })).sort((a, b) => a.x - b.x)
  const spread = spreadRows.length > 1
    ? `M ${spreadRows.map(row => `${row.x.toFixed(1)} ${row.top.toFixed(1)}`).join(' L ')} L ${spreadRows.slice().reverse().map(row => `${row.x.toFixed(1)} ${row.bottom.toFixed(1)}`).join(' L ')} Z`
    : ''
  const desiredStep = minuteRange <= 8 * 60 ? 2 * 60 : minuteRange <= 16 * 60 ? 3 * 60 : 6 * 60
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
    forecast: path(forecastPathPoints), spread, modelPaths,
    points: [...observedPoints, ...forecastPoints],
    observedPoints,
    forecastPoints,
    axisPoints,
    boundaryX: forecastPoints[0]?.x ?? null,
    peakPoint,
    min,
    middle: min + range / 2,
    max,
    consensusMax: forecastPoints.length ? Math.max(...forecastPoints.map(point => point.temperature)) : null,
    spreadMax: spreadRows.length ? Math.max(...[...grouped.values()].map(rows => Math.max(...rows.map(row => row.temperature)) - Math.min(...rows.map(row => row.temperature)))) : null,
    chartWidth, chartLeft, chartRight, labelX: chartLeft - 5, gridXs
  }
}

function temperatureTrend(snapshot: WeatherSnapshot) {
  const observations = (snapshot.recentObservations || []).filter(point => Number.isFinite(point.temperature))
  if (observations.length < 2) return null
  const latest = observations.at(-1)!
  const previous = observations.at(-2)!
  const delta = Math.round((Number(latest.temperature) - Number(previous.temperature)) * 10) / 10
  if (delta > 0.2) return { icon: '↑', label: 'En hausse', delta }
  if (delta < -0.2) return { icon: '↓', label: 'En baisse', delta }
  return { icon: '→', label: 'Stable', delta: 0 }
}

const hideOnly999Asks = ref(false)

const cInput = ref('')
const fInput = ref('')

const fFromC = computed(() => {
  const raw = String(cInput.value ?? '').trim()
  if (!raw) return ''
  const c = Number(raw)
  if (!Number.isFinite(c)) return ''
  return ((c * 9) / 5 + 32).toFixed(1)
})

const cFromF = computed(() => {
  const raw = String(fInput.value ?? '').trim()
  if (!raw) return ''
  const f = Number(raw)
  if (!Number.isFinite(f)) return ''
  return (((f - 32) * 5) / 9).toFixed(1)
})

function remainingSecondsForTimezone(tz?: string | null) {
  if (!tz || !now.value) return Number.POSITIVE_INFINITY
  const { h, m, s } = tzParts(tz, now.value)
  return 86400 - (h * 3600 + m * 60 + s)
}

function bestAskCents(market: DustMarket) {
  const ask = Number(market.bestAsk ?? market.asks?.[0]?.price ?? Number.POSITIVE_INFINITY)
  return Number.isFinite(ask) ? ask * 100 : Number.POSITIVE_INFINITY
}

function hasOnly999Asks(market: DustMarket) {
  const activeAskPrices = (market.asks || [])
    .filter(ask => Number.isFinite(Number(ask.price)) && Number(ask.size) > 0)
    .map((ask) => {
      const price = Number(ask.price)
      return price <= 1 ? price * 100 : price
    })

  return activeAskPrices.length > 0
    && activeAskPrices.every(price => Number(price.toFixed(3)) === 99.9)
}

function marketSort(a: DustMarket, b: DustMarket) {
  const yesA = isYes(a.outcome) ? 0 : 1
  const yesB = isYes(b.outcome) ? 0 : 1
  if (yesA !== yesB) return yesA - yesB

  const remainingA = remainingSecondsForTimezone(a.airportData?.tz)
  const remainingB = remainingSecondsForTimezone(b.airportData?.tz)
  if (remainingA !== remainingB) return remainingA - remainingB

  const askA = bestAskCents(a)
  const askB = bestAskCents(b)
  if (askA !== askB) return askA - askB

  return thresholdValue(a.groupItemTitle) - thresholdValue(b.groupItemTitle)
}

const groups = computed<CityGroup[]>(() => {
  const cards = dedupeMarkets(props.markets || [])
  const filteredCards = cards.filter((market) => {
    if (hideOnly999Asks.value && hasOnly999Asks(market)) return false
    return true
  })
  const map = new Map<string, CityGroup>()

  for (const market of filteredCards) {
    const city = market.city || 'Ville inconnue'
    if (!map.has(city)) {
      map.set(city, {
        city,
        airport: market.airport || '',
        peakLabel: market.peakLabel || null,
        localTime: market.localTime || null,
        dateLabel: formatBetDateLabel(market.date),
        tz: market.airportData?.tz || null,
        minRemainingSeconds: Number.POSITIVE_INFINITY,
        urgentCount: 0,
        markets: []
      })
    }

    const group = map.get(city)!
    group.markets.push(market)

    if (!group.dateLabel && market.date) {
      group.dateLabel = formatBetDateLabel(market.date)
    }

    const remaining = remainingSecondsForTimezone(market.airportData?.tz)
    if (remaining < group.minRemainingSeconds) group.minRemainingSeconds = remaining
    if (remaining <= 3600) group.urgentCount += 1
  }

  const list = Array.from(map.values()).sort((a, b) => {
    if (a.minRemainingSeconds !== b.minRemainingSeconds) return a.minRemainingSeconds - b.minRemainingSeconds

    const aBest = Math.min(...a.markets.map(bestAskCents))
    const bBest = Math.min(...b.markets.map(bestAskCents))
    if (aBest !== bBest) return aBest - bBest

    return a.city.localeCompare(b.city)
  })

  for (const group of list) {
    group.markets.sort(marketSort)
  }

  return list
})

// Villes pliées (Set vide = toutes dépliées par défaut)
const collapsed = ref<Set<string>>(new Set())

function toggleCity(city: string) {
  const next = new Set(collapsed.value)
  if (next.has(city)) {
    next.delete(city)
  } else {
    next.add(city)
  }
  collapsed.value = next
}

function isCollapsed(city: string) {
  return collapsed.value.has(city)
}

function parseMarkdownLinks(raw: string, source: MarketLink['source']): MarketLink[] {
  const links: MarketLink[] = []
  const regex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g
  let match: RegExpExecArray | null = regex.exec(raw)

  while (match) {
    const label = match[1]
    const url = match[2]

    if (label && url) {
      links.push({
        label,
        url,
        source
      })
    }

    match = regex.exec(raw)
  }

  return links
}

function getMarketLinks(market: DustMarket): MarketLink[] {
  const marketUrl = typeof market.link === 'string' && market.link.trim() ? market.link.trim() : ''

  if (Array.isArray(market.links) && market.links.length > 0) {
    const baseLinks: MarketLink[] = marketUrl
      ? [{ label: 'POLYMARKET', url: marketUrl, source: 'polymarket' }]
      : []

    const sanitized = market.links
      .filter(link => !!link?.label && !!link?.url)
      .map(link => ({
        label: link.label,
        url: link.url,
        source: link.source || 'airport'
      }))

    const uniqueStructured = new Map<string, MarketLink>()
    for (const link of [...baseLinks, ...sanitized]) {
      if (!uniqueStructured.has(link.url)) {
        uniqueStructured.set(link.url, link)
      }
    }

    return Array.from(uniqueStructured.values())
  }

  const all = [
    ...(marketUrl ? [{ label: 'POLYMARKET', url: marketUrl, source: 'polymarket' as const }] : []),
    ...parseMarkdownLinks(market.betmoardLinks || '', 'betmoar'),
    ...parseMarkdownLinks(market.airportLinks || '', 'airport')
  ]

  const unique = new Map<string, MarketLink>()
  for (const link of all) {
    if (!unique.has(link.url)) {
      unique.set(link.url, link)
    }
  }

  return Array.from(unique.values())
}

function getGroupLinks(group: CityGroup) {
  const unique = new Map<string, MarketLink>()

  for (const market of group.markets) {
    for (const link of getMarketLinks(market)) {
      if (!unique.has(link.url)) {
        unique.set(link.url, link)
      }
    }
  }

  return Array.from(unique.values())
}

function hasGroupLinks(group: CityGroup) {
  return getGroupLinks(group).length > 0
}

async function copyLinkToClipboard(link: MarketLink) {
  try {
    await navigator.clipboard.writeText(link.url)
    toast.add({
      title: 'Lien copie',
      description: `${link.label} ajoute au presse-papiers.`
    })
  } catch {
    toast.add({
      title: 'Copie impossible',
      description: 'Le navigateur a bloque l\'acces au presse-papiers.',
      color: 'error'
    })
  }
}

function buildLinkMenuItems(links: MarketLink[]): DropdownMenuItem[] {
  if (!links.length) {
    return [{
      label: 'Aucun lien disponible'
    }]
  }

  const sorted = [...links].sort((a, b) => a.label.localeCompare(b.label))

  return sorted.map(link => ({
    label: link.label,
    icon: link.source === 'betmoar' ? 'i-lucide-chart-line' : link.source === 'polymarket' ? 'i-lucide-store' : 'i-lucide-cloud',
    children: [{
      label: 'Ouvrir dans un nouvel onglet',
      icon: 'i-lucide-external-link',
      href: link.url,
      target: '_blank',
      rel: 'noopener noreferrer'
    }, {
      label: 'Copier le lien',
      icon: 'i-lucide-copy',
      onSelect() {
        void copyLinkToClipboard(link)
      }
    }],
    trailingIcon: 'i-lucide-chevron-right'
  }))
}

function getLinkMenuItemsForGroup(group: CityGroup) {
  return buildLinkMenuItems(getGroupLinks(group))
}

function normalizeLinkLabel(label?: string | null) {
  return String(label || '').trim().toUpperCase()
}

function getQuickLinksForGroup(group: CityGroup) {
  const links = getGroupLinks(group)
  const quick: MarketLink[] = []

  for (const targetLabel of QUICK_LINK_LABELS) {
    const target = normalizeLinkLabel(targetLabel)
    const match = links.find(link => normalizeLinkLabel(link.label) === target)
    if (match) quick.push(match)
  }

  return quick
}

function getResolutionBadgeForGroup(group: CityGroup) {
  const market = group.markets.find(item => item.resolutionSource)
  if (!market?.resolutionSource) return null

  let provider = market.resolutionProvider?.toLowerCase() || ''
  if (!provider) {
    try {
      provider = new URL(market.resolutionSource).hostname.toLowerCase()
    } catch {
      provider = ''
    }
  }

  const label = provider.includes('wunderground')
    ? 'WU'
    : provider.includes('weather.gov')
      ? 'NWS'
      : 'SOURCE'

  return {
    label,
    matchesAirportCode: market.resolutionSourceMatchesAirport
  }
}
</script>

<template>
  <UCard
    class="border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 shadow-xl shadow-slate-950/30"
  >
    <template #header>
      <div class="flex flex-col gap-2 border-b border-white/10 pb-3">
        <div>
          <p class="text-[10px] uppercase tracking-[0.35em] text-emerald-300/80">
            Dust feed
          </p>
          <h2 class="mt-1 text-xl font-semibold text-white">
            Markets sélectionnés
          </h2>
          <p class="mt-1 text-xs text-slate-300">
            Vue compacte des opportunités dust envoyées par le bot.
          </p>
        </div>

        <div class="mt-1 flex flex-wrap gap-1.5 text-xs">
          <UButton
            size="xs"
            :color="!hideOnly999Asks ? 'primary' : 'neutral'"
            :variant="!hideOnly999Asks ? 'solid' : 'soft'"
            title="Affiche tous les marchés disponibles, sans filtre."
            aria-label="Filtre Tous: affiche tous les marchés"
            @click="hideOnly999Asks = false"
          >
            Tous
          </UButton>
          <UButton
            size="xs"
            :color="hideOnly999Asks ? 'error' : 'neutral'"
            :variant="hideOnly999Asks ? 'solid' : 'soft'"
            title="Masque les températures dont tous les asks disponibles sont à 99.9 cents."
            :aria-pressed="hideOnly999Asks"
            aria-label="Masquer les températures avec uniquement des asks à 99.9 cents"
            @click="hideOnly999Asks = !hideOnly999Asks"
          >
            Hide 99.9 only
          </UButton>
        </div>

        <details class="group mt-2 rounded-lg border border-white/10 bg-black/15">
          <summary class="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-xs text-slate-200">
            <span class="inline-flex items-center gap-1">
              <UIcon name="i-lucide-sliders-horizontal" class="size-3.5" />
              Aide & outils
            </span>
            <UIcon name="i-lucide-chevron-down" class="size-4 transition-transform group-open:rotate-180" />
          </summary>

          <div class="border-t border-white/10 p-3 text-xs text-slate-300">
            <div class="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
              <div class="rounded-md border border-white/10 bg-white/5 p-2.5">
                <p class="font-semibold text-slate-100">
                  Affichage
                </p>
                <div class="mt-2 space-y-1">
                  <p class="text-slate-300">
                    <span class="rounded bg-primary/15 px-1 py-0.5 text-primary">Tous</span>:
                    affiche tous les marchés sans filtre.
                  </p>
                  <p class="text-slate-300">
                    <span class="rounded bg-rose-400/15 px-1 py-0.5 text-rose-200">Hide 99.9 only</span>:
                    masque les marchés dont tous les asks sont à 99.9¢.
                  </p>
                  <p class="text-slate-300">
                    <span
                      class="rounded bg-violet-400/15 px-1 py-0.5 text-violet-200"
                    >Tri</span>: Yes/No, puis temps
                    restant avant minuit, puis meilleur ask.
                  </p>
                </div>
              </div>

              <div class="space-y-2">
                <div class="rounded-md border border-white/10 bg-white/5 p-2.5">
                  <p class="mb-1 text-slate-100">
                    °C → °F
                  </p>
                  <UInput
                    v-model="cInput"
                    size="xs"
                    type="number"
                    placeholder="°C"
                  />
                  <p class="mt-1 text-slate-400">
                    Résultat: <span class="font-semibold text-white">{{ fFromC ? `${fFromC}
                      °F` : '—' }}</span>
                  </p>
                </div>

                <div class="rounded-md border border-white/10 bg-white/5 p-2.5">
                  <p class="mb-1 text-slate-100">
                    °F → °C
                  </p>
                  <UInput
                    v-model="fInput"
                    size="xs"
                    type="number"
                    placeholder="°F"
                  />
                  <p class="mt-1 text-slate-400">
                    Résultat: <span class="font-semibold text-white">{{ cFromF ? `${cFromF}
                      °C` : '—' }}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </details>
      </div>
    </template>

    <div
      v-if="loading"
      class="flex items-center gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-4 text-emerald-100"
    >
      <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin" />
      Chargement des markets dust…
    </div>

    <div
      v-else-if="!groups.length"
      class="rounded-2xl border border-dashed border-white/10 bg-white/5 p-10 text-center text-slate-300"
    >
      <UIcon name="i-lucide-sparkles" class="mx-auto mb-3 size-8 text-emerald-300" />
      Aucun market dust n'est encore disponible. Le bot Discord devra en envoyer pour alimenter cette vue.
    </div>

    <div v-else class="grid grid-cols-1 items-start gap-3 xl:grid-cols-2">
      <section
        v-for="group in groups"
        :key="group.city"
        class="overflow-hidden rounded-xl border border-white/5 bg-white/5 sm:rounded-2xl sm:border-white/10"
      >
        <div class="flex w-full flex-col gap-2 px-3 py-2.5 sm:px-4 sm:py-3">
          <button
            type="button"
            class="flex w-full min-w-0 flex-1 items-center justify-between gap-2.5 rounded-md text-left transition hover:bg-white/5"
            @click="toggleCity(group.city)"
          >
            <div class="flex min-w-0 items-center gap-3">
              <UIcon
                :name="isCollapsed(group.city) ? 'i-lucide-chevron-right' : 'i-lucide-chevron-down'"
                class="size-4 shrink-0 text-slate-400"
              />
              <div class="min-w-0">
                <h3 class="text-sm font-semibold text-balance break-words text-white">
                  {{ group.city }}
                  <span v-if="group.airport" class="ml-1 text-[11px] font-normal text-slate-400">{{ group.airport
                  }}</span>
                  <span
                    v-if="getResolutionBadgeForGroup(group)"
                    :title="`Source de resolution : ${getResolutionBadgeForGroup(group)!.label}`"
                    class="ml-1.5 inline-flex select-none items-center rounded px-1.5 py-0.5 align-middle text-[9px] font-bold tracking-wide"
                    :class="getResolutionBadgeForGroup(group)!.matchesAirportCode === false
                      ? 'border border-rose-400/40 bg-rose-400/15 text-rose-200'
                      : 'border border-violet-400/40 bg-violet-400/15 text-violet-200'"
                  >
                    {{ getResolutionBadgeForGroup(group)!.label }}
                  </span>
                </h3>
                <div class="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                  <p v-if="group.peakLabel" class="break-words text-[11px] text-slate-400">
                    Peak {{ group.peakLabel }}
                  </p>
                  <span v-if="group.dateLabel" class="inline-flex items-center rounded-full bg-white/5 px-1.5 py-0.5 text-[11px] font-medium text-slate-300">
                    {{ group.dateLabel }}
                  </span>
                </div>
              </div>
            </div>
            <div class="flex shrink-0 items-center gap-3">
              <div class="text-right leading-none">
                <p class="font-mono text-lg font-bold tabular-nums text-white">
                  {{ cityTime(group.tz, group.localTime) }}
                </p>
                <p
                  v-if="timeToMidnight(group.tz)"
                  class="mt-0.5 text-[11px] font-medium tabular-nums"
                  :class="timeToMidnight(group.tz)!.urgent ? 'text-rose-300' : 'text-amber-300/80'"
                >
                  <UIcon name="i-lucide-moon" class="-mt-0.5 mr-0.5 inline-block size-3" />minuit dans {{
                    timeToMidnight(group.tz)!.label }}
                </p>
              </div>
              <div class="flex items-center gap-1.5">
                <UBadge
                  v-if="group.urgentCount > 0"
                  color="warning"
                  variant="subtle"
                  class="shrink-0 rounded-full"
                >
                  ⏳ {{
                    group.urgentCount }}
                </UBadge>
              </div>
            </div>
          </button>

          <div class="flex w-full items-center justify-between gap-2 pl-7">
            <div class="flex min-w-0 flex-wrap items-center gap-1.5">
              <UButton
                v-for="quickLink in getQuickLinksForGroup(group)"
                :key="`${group.city}-quick-${quickLink.label}`"
                color="primary"
                variant="soft"
                size="xs"
                :to="quickLink.url"
                target="_blank"
                rel="noopener noreferrer"
                :title="`Ouvrir ${quickLink.label}`"
                class="h-6 px-2"
              >
                {{ quickLink.label }}
              </UButton>
            </div>

            <UDropdownMenu
              v-if="hasGroupLinks(group)"
              :items="getLinkMenuItemsForGroup(group)"
              :content="{ align: 'end', side: 'bottom', collisionPadding: 12 }"
              :ui="{ content: 'w-72' }"
            >
              <UButton
                color="neutral"
                variant="soft"
                size="xs"
                icon="i-lucide-link-2"
                class="h-6 px-2"
              />
            </UDropdownMenu>
          </div>
        </div>

        <div
          v-if="!isCollapsed(group.city)"
          class="space-y-1.5 border-t border-white/5 p-2 sm:space-y-2 sm:border-white/10 sm:p-3"
        >
          <div
            v-if="group.markets.some(m => m.airportData?.ignoreForTrading)"
            class="rounded-lg border-l-4 border-amber-500 bg-amber-500/15 p-2.5 text-xs text-amber-200"
          >
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-alert-triangle" class="size-4 flex-shrink-0" />
              <span class="font-semibold">Ville marquée IGNORE FOR TRADING</span>
            </div>
          </div>

          <div
            v-if="!weatherForGroup(group)"
            class="flex items-center gap-2 rounded-lg border border-dashed border-white/20 bg-black/10 px-2.5 py-2 text-[11px] text-slate-200"
          >
            <UIcon name="i-lucide-cloud-off" class="size-3.5 shrink-0" />
            Meteo indisponible
          </div>

          <div
            v-else-if="!weatherForGroup(group)!.disabled"
            class="min-w-0 rounded-lg border border-sky-300/10 bg-gradient-to-br from-sky-400/8 via-slate-950/30 to-amber-400/5 p-2.5"
          >
            <div class="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2.5">
              <div class="flex min-w-[72px] items-center gap-2">
                <span class="text-2xl" role="img" :aria-label="weatherConditionLabel(weatherForGroup(group)!.current?.condition)">
                  {{ weatherForGroup(group)!.current?.conditionIcon || '🌡️' }}
                </span>
                <div>
                  <p class="font-mono text-lg font-bold leading-none tabular-nums text-amber-100">
                    {{ weatherTemperature(weatherForGroup(group)!.current?.temperature, weatherForGroup(group)!.unit) }}
                  </p>
                  <p class="mt-1 max-w-40 text-[10px] font-medium leading-tight text-slate-100" :title="weatherConditionLabel(weatherForGroup(group)!.current?.condition)">
                    {{ weatherConditionLabel(weatherForGroup(group)!.current?.condition) }}
                  </p>
                </div>
              </div>

              <div class="col-span-2 row-start-2 min-w-0">
                <div v-if="weatherForGroup(group)!.hourly?.length" class="flex gap-1 overflow-x-auto pb-1">
                  <div
                    v-for="point in weatherForGroup(group)!.hourly!.slice(0, 6)"
                    :key="`hourly-${group.airport}-${point.timeLocal}`"
                    class="min-w-14 flex-1 rounded bg-white/5 px-1 py-1 text-center"
                    :title="weatherConditionLabel(point.condition)"
                  >
                    <p class="truncate text-[9px] font-medium tabular-nums text-slate-200">
                      {{ weatherHour(point.timeLocal, group.tz) }}
                    </p>
                    <p class="my-0.5 text-xs leading-none">
                      {{ point.conditionIcon || '🌤️' }}
                    </p>
                    <p class="truncate text-[10px] font-semibold tabular-nums text-slate-100">
                      {{ weatherTemperature(point.temperature, weatherForGroup(group)!.unit).replace(weatherForGroup(group)!.unit, '') }}
                    </p>
                  </div>
                </div>
                <p v-else class="flex h-full items-center text-[10px] text-slate-300">
                  Prevision horaire indisponible
                </p>
              </div>

              <div class="col-start-2 row-start-1 flex min-w-0 max-w-44 flex-wrap items-center justify-end gap-1 self-start">
                <a
                  v-if="weatherForGroup(group)!.sourceUrl"
                  :href="weatherForGroup(group)!.sourceUrl || undefined"
                  :title="weatherForGroup(group)!.reason || weatherForGroup(group)!.sourceLabel"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="rounded-full border border-sky-400/25 bg-sky-400/10 px-1.5 py-0.5 text-[9px] font-semibold text-sky-200 hover:bg-sky-400/20"
                >
                  {{ weatherForGroup(group)!.sourceLabel }}
                </a>
                <span v-else class="rounded-full border border-slate-400/20 bg-white/5 px-1.5 py-0.5 text-[9px] text-slate-300">
                  {{ weatherForGroup(group)!.sourceLabel }}
                </span>
                <span
                  class="rounded-full border px-1.5 py-0.5 text-[9px]"
                  :class="weatherForGroup(group)!.stale ? 'border-slate-400/30 bg-slate-400/10 text-slate-300' : 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200'"
                  :title="weatherForGroup(group)!.nextRefreshAt ? `Prochain refresh: ${formatFrDate(weatherForGroup(group)!.nextRefreshAt)}` : ''"
                >
                  {{ weatherFreshness(weatherForGroup(group)!) }}
                </span>
                <span
                  v-if="signalForGroup(group)"
                  class="max-w-full rounded-full border px-1.5 py-0.5 text-[9px] font-semibold"
                  :class="signalTone(signalForGroup(group)!.status)"
                  :title="signalForGroup(group)!.reason"
                >
                  {{ signalForGroup(group)!.status.toUpperCase() }} {{ signalForGroup(group)!.confidence }}%
                </span>
              </div>
            </div>

            <p
              v-if="weatherForGroup(group)!.source === 'open-meteo' && weatherForGroup(group)!.reason"
              class="mt-1.5 flex items-start gap-1 text-[9px] font-medium text-sky-100"
              :title="weatherForGroup(group)!.reason || ''"
            >
              <UIcon name="i-lucide-info" class="mt-0.5 size-3 shrink-0" />
              Prévisions principales indisponibles
            </p>

            <div v-if="weatherForGroup(group)!.sparkline && weatherForGroup(group)!.sparkline!.length > 1" class="mt-2 min-w-0 rounded-lg border border-white/10 bg-[#111315] px-2 pt-2">
              <div class="flex items-center justify-between gap-2 px-1 text-[9px] font-medium text-slate-200">
                <span class="uppercase tracking-wide">Température aujourd’hui</span>
                <div class="flex items-center gap-2">
                  <span v-if="weatherForGroup(group)!.forecastModels?.length" class="font-mono tabular-nums text-sky-200">
                    {{ weatherForGroup(group)!.forecastModels!.length }} modèles · écart {{ weatherTemperature(sparklinePaths(weatherForGroup(group)!).spreadMax, weatherForGroup(group)!.unit) }}
                  </span>
                  <span v-if="temperatureTrend(weatherForGroup(group)!)" class="font-semibold text-white">
                    {{ temperatureTrend(weatherForGroup(group)!)!.icon }} {{ temperatureTrend(weatherForGroup(group)!)!.label }}
                  </span>
                  <span v-if="sparklinePaths(weatherForGroup(group)!).peakPoint" class="font-mono tabular-nums text-amber-100">
                    Max mesuré {{ weatherTemperature(sparklinePaths(weatherForGroup(group)!).peakPoint!.temperature, weatherForGroup(group)!.unit) }}
                  </span>
                </div>
              </div>
              <svg
                :viewBox="`0 0 ${sparklinePaths(weatherForGroup(group)!).chartWidth} 168`"
                class="h-auto w-full overflow-visible"
                role="img"
                aria-label="Evolution de temperature observee puis prevue"
                @pointerleave="hoveredWeatherPoint = null"
              >
                <line
                  v-for="y in [25, 80, 135]"
                  :key="`grid-y-${y}`"
                  :x1="sparklinePaths(weatherForGroup(group)!).chartLeft"
                  :y1="y"
                  :x2="sparklinePaths(weatherForGroup(group)!).chartRight"
                  :y2="y"
                  stroke="currentColor"
                  class="text-white/15"
                />
                <line
                  v-for="x in sparklinePaths(weatherForGroup(group)!).gridXs"
                  :key="`grid-x-${x}`"
                  :x1="x"
                  y1="25"
                  :x2="x"
                  y2="135"
                  stroke="currentColor"
                  class="text-white/10"
                />
                <text
                  :x="sparklinePaths(weatherForGroup(group)!).labelX"
                  y="28"
                  text-anchor="end"
                  fill="currentColor"
                  class="text-[7px] font-medium text-slate-300"
                >
                  {{ weatherTemperature(sparklinePaths(weatherForGroup(group)!).max, weatherForGroup(group)!.unit) }}
                </text>
                <text
                  :x="sparklinePaths(weatherForGroup(group)!).labelX"
                  y="83"
                  text-anchor="end"
                  fill="currentColor"
                  class="text-[7px] font-medium text-slate-300"
                >
                  {{ weatherTemperature(sparklinePaths(weatherForGroup(group)!).middle, weatherForGroup(group)!.unit) }}
                </text>
                <text
                  :x="sparklinePaths(weatherForGroup(group)!).labelX"
                  y="138"
                  text-anchor="end"
                  fill="currentColor"
                  class="text-[7px] font-medium text-slate-300"
                >
                  {{ weatherTemperature(sparklinePaths(weatherForGroup(group)!).min, weatherForGroup(group)!.unit) }}
                </text>
                <line
                  v-if="sparklinePaths(weatherForGroup(group)!).boundaryX != null"
                  :x1="sparklinePaths(weatherForGroup(group)!).boundaryX!"
                  y1="18"
                  :x2="sparklinePaths(weatherForGroup(group)!).boundaryX!"
                  y2="141"
                  stroke="currentColor"
                  stroke-dasharray="2 3"
                  class="text-slate-200/50"
                />
                <text
                  v-if="sparklinePaths(weatherForGroup(group)!).boundaryX != null"
                  :x="sparklinePaths(weatherForGroup(group)!).boundaryX!"
                  y="14"
                  text-anchor="middle"
                  fill="currentColor"
                  class="text-[7px] font-semibold text-slate-200"
                >
                  Maintenant
                </text>
                <path
                  v-if="sparklinePaths(weatherForGroup(group)!).observed"
                  :d="sparklinePaths(weatherForGroup(group)!).observed"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="text-amber-300"
                />
                <path
                  v-if="sparklinePaths(weatherForGroup(group)!).spread"
                  :d="sparklinePaths(weatherForGroup(group)!).spread"
                  fill="#38bdf8"
                  fill-opacity="0.10"
                  stroke="none"
                />
                <path
                  v-for="model in sparklinePaths(weatherForGroup(group)!).modelPaths"
                  :key="`model-${model.id}`"
                  :d="model.path"
                  fill="none"
                  :stroke="model.color"
                  stroke-width="1.35"
                  stroke-dasharray="3 3"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  opacity="0.82"
                />
                <path
                  v-if="sparklinePaths(weatherForGroup(group)!).forecast"
                  :d="sparklinePaths(weatherForGroup(group)!).forecast"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.4"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="text-slate-100"
                />
                <circle
                  v-for="point in sparklinePaths(weatherForGroup(group)!).observedPoints"
                  :key="`observed-dot-${point.timeLocal}`"
                  :cx="point.x"
                  :cy="point.y"
                  r="2.8"
                  fill="currentColor"
                  stroke="#111315"
                  stroke-width="1.5"
                  class="text-amber-300"
                />
                <circle
                  v-if="sparklinePaths(weatherForGroup(group)!).peakPoint"
                  :cx="sparklinePaths(weatherForGroup(group)!).peakPoint!.x"
                  :cy="sparklinePaths(weatherForGroup(group)!).peakPoint!.y"
                  r="4.5"
                  fill="#111315"
                  stroke="currentColor"
                  stroke-width="2"
                  class="text-amber-200"
                />
                <text
                  v-for="point in sparklinePaths(weatherForGroup(group)!).axisPoints"
                  :key="`axis-${point.timeLocal}`"
                  :x="point.x"
                  y="158"
                  text-anchor="middle"
                  fill="currentColor"
                  class="text-[8px] font-medium text-slate-200"
                >
                  {{ point.label || weatherHour(point.timeLocal, group.tz) }}
                </text>
                <circle
                  v-for="point in sparklinePaths(weatherForGroup(group)!).points"
                  :key="`hover-${point.kind}-${point.timeLocal}`"
                  :cx="point.x"
                  :cy="point.y"
                  r="9"
                  fill="transparent"
                  class="cursor-crosshair"
                  tabindex="0"
                  :aria-label="`${weatherHour(point.timeLocal, group.tz)}, ${weatherTemperature(point.temperature, weatherForGroup(group)!.unit)}, ${point.kind === 'observed' ? 'mesuré' : 'prévision'}`"
                  @pointerenter="showWeatherPoint(group.airport, point)"
                  @focus="showWeatherPoint(group.airport, point)"
                  @blur="hoveredWeatherPoint = null"
                  @click="showWeatherPoint(group.airport, point)"
                />
                <g v-if="hoveredWeatherPoint?.airport === group.airport" class="pointer-events-none">
                  <line
                    :x1="hoveredWeatherPoint.x"
                    y1="20"
                    :x2="hoveredWeatherPoint.x"
                    y2="139"
                    stroke="currentColor"
                    stroke-dasharray="3 3"
                    class="text-white/60"
                  />
                  <circle
                    :cx="hoveredWeatherPoint.x"
                    :cy="hoveredWeatherPoint.y"
                    r="4"
                    fill="#111315"
                    stroke="white"
                    stroke-width="2"
                  />
                  <rect
                    :x="weatherTooltipX(hoveredWeatherPoint)"
                    :y="weatherTooltipY(hoveredWeatherPoint)"
                    width="84"
                    height="34"
                    rx="4"
                    fill="#020617"
                    stroke="#94a3b8"
                    stroke-width="0.8"
                  />
                  <text
                    :x="weatherTooltipX(hoveredWeatherPoint) + 6"
                    :y="weatherTooltipY(hoveredWeatherPoint) + 12"
                    fill="white"
                    class="text-[8px] font-semibold"
                  >
                    {{ weatherHour(hoveredWeatherPoint.timeLocal, group.tz) }} · {{ hoveredWeatherPoint.kind === 'observed' ? 'Mesuré' : (hoveredWeatherPoint.label || 'Consensus') }}
                  </text>
                  <text
                    :x="weatherTooltipX(hoveredWeatherPoint) + 6"
                    :y="weatherTooltipY(hoveredWeatherPoint) + 26"
                    fill="#fde68a"
                    class="text-[11px] font-bold"
                  >
                    {{ weatherTemperature(hoveredWeatherPoint.temperature, weatherForGroup(group)!.unit) }}
                  </text>
                </g>
              </svg>
              <div class="flex flex-wrap items-center justify-between gap-1 border-t border-white/15 px-1 py-1.5 text-[9px] font-medium text-slate-200">
                <div class="flex items-center gap-2">
                  <span v-if="weatherForGroup(group)!.recentObservations?.length" class="inline-flex items-center gap-1"><span class="h-0.5 w-3 bg-amber-300" /> Mesuré</span>
                  <span v-if="weatherForGroup(group)!.forecastModels?.length" class="inline-flex flex-wrap items-center gap-2">
                    <span v-for="model in weatherForGroup(group)!.forecastModels" :key="model.id" class="inline-flex items-center gap-1">
                      <span class="w-3 border-t border-dashed" :style="{ borderColor: model.color }" /> {{ model.label }}
                    </span>
                    <span class="inline-flex items-center gap-1"><span class="w-3 border-t-2 border-slate-100" /> Consensus</span>
                  </span>
                  <span v-else-if="weatherForGroup(group)!.hourly?.length" class="inline-flex items-center gap-1"><span class="w-3 border-t-2 border-dashed border-sky-300" /> Prévision</span>
                </div>
                <span v-if="signalForGroup(group)" class="min-w-0 truncate" :title="signalForGroup(group)!.reason">{{ weatherSignalLabel(signalForGroup(group)!) }}</span>
              </div>
            </div>

            <section v-if="weatherForGroup(group)!.recentObservations?.length" class="mt-2 min-w-0 border-t border-white/10 pt-2">
              <div class="flex items-center justify-between gap-2 px-1 py-1 text-[9px] font-semibold uppercase tracking-wide text-slate-200">
                <span>8 derniers relevés METAR</span>
                <span
                  v-if="hasMetarObservations(weatherForGroup(group)!)"
                  class="rounded border border-emerald-400/25 bg-emerald-400/10 px-1 py-0.5 text-emerald-200"
                >
                  Station météo
                </span>
              </div>
              <div class="mt-1.5 grid grid-cols-2 gap-1.5 sm:grid-cols-4 2xl:grid-cols-8">
                <div
                  v-for="observation in weatherForGroup(group)!.recentObservations!.slice(-8)"
                  :key="`obs-${group.airport}-${observation.timeLocal}`"
                  class="min-w-0 rounded-md border border-white/10 bg-[#111315] px-2 py-1.5 text-[9px] tabular-nums"
                  :title="weatherConditionLabel(observation.condition || observation.cloudCover)"
                >
                  <div class="flex items-center justify-between gap-2">
                    <span class="font-semibold text-slate-100">{{ weatherHour(observation.timeLocal, group.tz) }}</span>
                  </div>
                  <div class="mt-1 min-w-0">
                    <p class="text-sm font-bold text-amber-100">
                      {{ weatherTemperature(observation.temperature, weatherForGroup(group)!.unit) }}
                    </p>
                    <p class="mt-0.5 min-w-0 truncate text-[8px] font-medium text-slate-200">
                      {{ weatherConditionLabel(observation.condition || observation.cloudCover) }}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <p v-if="weatherForGroup(group)!.source === 'unknown' || weatherForGroup(group)!.error" class="mt-1.5 text-[10px] font-medium text-slate-200">
              Donnees structurees indisponibles<span v-if="weatherForGroup(group)!.reason"> · {{ weatherForGroup(group)!.reason }}</span>
            </p>
          </div>

          <article
            v-for="market in group.markets"
            :key="market.id || market.slug || `${market.city}-${market.groupItemTitle}-${market.outcome}`"
            class="rounded-lg border border-white/10 p-2.5 transition sm:rounded-xl sm:p-3"
            :class="isYes(market.outcome)
              ? 'bg-emerald-400/5 sm:border-emerald-400/30 sm:hover:border-emerald-400/50'
              : 'bg-rose-400/5 sm:border-rose-400/30 sm:hover:border-rose-400/50'"
          >
            <div class="flex items-center justify-between gap-3">
              <div class="flex min-w-0 items-center gap-2">
                <span
                  class="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                  :class="isYes(market.outcome)
                    ? 'bg-emerald-400/15 text-emerald-300'
                    : 'bg-rose-400/15 text-rose-300'"
                >{{ market.outcome || '—' }}</span>
                <h4 class="truncate text-sm font-semibold text-white">
                  {{ market.groupItemTitle || 'Seuil' }}
                </h4>
              </div>

              <div class="flex shrink-0 items-center gap-1.5 text-xs">
                <span
                  class="rounded-full px-2 py-0.5 font-semibold"
                  :class="isYes(market.outcome)
                    ? 'bg-emerald-400/15 text-emerald-300'
                    : 'bg-rose-400/15 text-rose-300'"
                >{{ formatCents(market.bestAsk) }}</span>
              </div>
            </div>

            <!-- Order book : asks (rouge) en haut, séparateur, bids (vert) en bas -->
            <div class="mt-2 grid grid-cols-1 overflow-hidden rounded-md border border-white/10 bg-black/10 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
              <!-- Asks (max 3) : meilleur ask juste au-dessus du séparateur -->
              <section class="min-w-0 bg-rose-400/[0.025]">
                <div class="flex items-center justify-between border-b border-white/5 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-rose-300/80">
                  <span>Asks</span>
                  <span>Prix · Qté · Valeur</span>
                </div>
                <template v-if="orderBook(market).asks.length">
                  <div
                    v-for="(level, i) in orderBook(market).asks"
                    :key="`ask-${i}`"
                    class="relative grid grid-cols-[auto_1fr_auto] items-center gap-3 px-2 py-1 text-[11px] tabular-nums"
                  >
                    <span class="absolute inset-y-0 right-0 bg-rose-400/15" :style="{ width: `${level.depth}%` }" />
                    <span class="relative font-semibold text-rose-300">{{ formatCents(level.price) }}</span>
                    <span class="relative text-right text-slate-300">{{ formatShares(level.size) }}</span>
                    <div class="relative flex flex-col items-end text-right">
                      <span class="text-slate-400">{{ formatUsd(level.price, level.size) }}</span>
                      <span class="text-[10px]" :class="(netYieldAfterFeesValue(level.price, level.size) ?? 0) >= 0 ? 'text-emerald-300' : 'text-rose-300'">
                        {{ formatNetYieldAfterFees(level.price, level.size) }}
                      </span>
                    </div>
                  </div>
                </template>
                <div v-else class="px-2 py-1 text-[11px] italic text-slate-500">
                  Pas d'asks
                </div>
              </section>

              <!-- Séparateur bids / asks -->
              <div
                class="flex items-center justify-center border-y border-white/10 px-2 py-1 text-[9px] uppercase tracking-wider text-slate-400 md:w-20 md:border-x md:border-y-0"
              >
                <span v-if="market.displaySpread || market.spread" class="text-center">Spread {{ market.displaySpread
                  || formatSpread(market.spread) }}</span>
              </div>

              <!-- Bids (max 3) : meilleur bid juste sous le séparateur -->
              <section class="min-w-0 bg-emerald-400/[0.025]">
                <div class="flex items-center justify-between border-b border-white/5 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-emerald-300/80">
                  <span>Bids</span>
                  <span>Prix · Qté · Valeur</span>
                </div>
                <template v-if="orderBook(market).bids.length">
                  <div
                    v-for="(level, i) in orderBook(market).bids"
                    :key="`bid-${i}`"
                    class="relative grid grid-cols-[auto_1fr_auto] items-center gap-3 px-2 py-1 text-[11px] tabular-nums"
                  >
                    <span class="absolute inset-y-0 right-0 bg-emerald-400/15" :style="{ width: `${level.depth}%` }" />
                    <span class="relative font-semibold text-emerald-300">{{ formatCents(level.price) }}</span>
                    <span class="relative text-right text-slate-300">{{ formatShares(level.size) }}</span>
                    <span class="relative text-right text-slate-400">{{ formatUsd(level.price, level.size)
                    }}</span>
                  </div>
                </template>
                <div v-else class="px-2 py-1 text-[11px] italic text-slate-500">
                  No bids
                </div>
              </section>
            </div>
          </article>
        </div>
      </section>
    </div>
  </UCard>
</template>
