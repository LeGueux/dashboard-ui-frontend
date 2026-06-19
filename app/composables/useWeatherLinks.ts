export interface WeatherLink {
  label: string
  url: string
  source: string
}

export interface AirportWeatherLinks {
  code: string
  city?: string
  tz?: string | null
  links: WeatherLink[]
  ignoreForTrading?: boolean
  airportData?: {
    code?: string | null
    tz?: string | null
    unit?: string | null
    tradingMinLocalHour?: number | null
    tradingMinLocalMinute?: number | null
    dustMinLocalHour?: number | null
    dustMinLocalMinute?: number | null
    ignoreForTrading?: boolean | null
  } | null
  lastUpdated?: string
}

export interface WeatherLinksPayload {
  type?: string
  airports?: AirportWeatherLinks[]
  updatedAt?: string
}

export function useWeatherLinks() {
  const config = useRuntimeConfig()
  const publicConfig = config.public as Record<string, unknown>
  const ingestUrl = (publicConfig.ingestBackendUrl || publicConfig.NUXT_PUBLIC_INGEST_BACKEND_URL) as string | undefined

  const links = ref<AirportWeatherLinks[]>([])
  const loading = ref(true)
  const error = ref<string | null>(null)
  const totalAirports = ref(0)

  async function loadWeatherLinks() {
    if (!ingestUrl) {
      error.value = 'NUXT_PUBLIC_INGEST_BACKEND_URL is not configured'
      loading.value = false
      return
    }

    loading.value = true
    error.value = null

    try {
      const res = await fetch(`${ingestUrl.replace(/\/$/, '')}/weather-links`, { cache: 'no-store' })

      if (!res.ok && res.status !== 204) {
        throw new Error(`Unable to load weather links (${res.status})`)
      }

      const payload = await res.json() as WeatherLinksPayload
      const nextLinks = Array.isArray(payload?.airports) ? payload.airports : []

      links.value = nextLinks
      totalAirports.value = nextLinks.length
      loading.value = false
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load weather links'
      loading.value = false
    }
  }

  const searchQuery = ref('')
  const filteredLinks = computed(() => {
    if (!searchQuery.value) return links.value
    const q = searchQuery.value.toLowerCase()
    return links.value.filter(
      airport => airport.code.toLowerCase().includes(q) || airport.city?.toLowerCase().includes(q)
    )
  })

  onMounted(() => {
    loadWeatherLinks()
  })

  return {
    links: readonly(links),
    filteredLinks: readonly(filteredLinks),
    searchQuery,
    loading: readonly(loading),
    error: readonly(error),
    totalAirports: readonly(totalAirports),
    refresh: loadWeatherLinks,
  }
}
