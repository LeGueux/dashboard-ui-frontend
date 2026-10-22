export interface DustLevel {
  price?: number | string
  size?: number | string
}

export interface MarketLink {
  label: string
  url: string
  source?: string
}

export interface DustMarket {
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
  asks?: DustLevel[]
  bids?: DustLevel[]
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
  airportData?: { code?: string | null, tz?: string | null, unit?: 'C' | 'F' | null, ignoreForTrading?: boolean | null } | null
}

export interface WeatherObservation {
  timeLocal: string
  temperature: number | null
  temperaturePrecision?: 'tenth' | 'whole'
  humidity?: number | null
  dewPoint?: number | null
  windSpeed?: number | null
  windGust?: number | null
  windDirection?: string | null
  pressure?: number | null
  visibility?: number | null
  flightCategory?: string | null
  cloudCover?: string | null
  condition?: string | null
  conditionIcon?: string | null
  source?: 'metar' | 'wethr' | 'nws' | 'weather-com' | 'unknown'
  rawText?: string | null
  validated?: boolean
}

export interface WeatherHourlyPoint {
  timeLocal: string
  temperature: number | null
  condition?: string | null
  conditionIcon?: string | null
}

export interface WeatherForecastModel {
  id: string
  label: string
  color: string
  hourly: WeatherHourlyPoint[]
}

export interface WeatherSnapshot {
  airport: string
  city?: string | null
  tz?: string | null
  unit: 'C' | 'F'
  source: 'nws' | 'wunderground-weather-com' | 'wunderground-link' | 'open-meteo' | 'unknown'
  sourceLabel: string
  sourceUrl?: string | null
  reason?: string | null
  error?: string | null
  disabled?: boolean
  disabledReason?: string | null
  fetchedAt: string
  observedAt?: string | null
  stale: boolean
  nextRefreshAt?: string | null
  current?: {
    temperature: number | null
    feelsLike?: number | null
    condition?: string | null
    conditionIcon?: string | null
    humidity?: number | null
    windSpeed?: number | null
    windDirection?: string | null
    pressure?: number | null
  }
  recentObservations?: WeatherObservation[]
  hourly?: WeatherHourlyPoint[]
  forecastModels?: WeatherForecastModel[]
  sparkline?: Array<{ timeLocal: string, temperature: number, kind?: 'observed' | 'forecast' }>
}

export interface WeatherMarketForecast {
  marketId: string | number | null
  airport: string
  threshold: number | null
  unit: 'C' | 'F'
  outcome: 'Yes' | 'No' | string | null
  forecastMax: number | null
  margin: number | null
  reason: string
}

export interface DustFeedPayload {
  type?: string
  source?: string
  generatedAt?: string
  count?: number
  markets?: DustMarket[]
  weatherSnapshots?: Record<string, WeatherSnapshot>
  weatherMarketForecasts?: WeatherMarketForecast[]
  summary?: Record<string, unknown>
}

export interface CityGroup {
  key: string
  city: string
  airport: string
  date: string | null
  localTime: string | null
  dateLabel: string | null
  tz: string | null
  markets: DustMarket[]
}
