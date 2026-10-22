import type { DustMarket, WeatherSnapshot, WeatherMarketForecast, DustFeedPayload } from '~/types/dust'
import { dedupeMarkets } from '~/utils/dustMarkets'

export function useDustMarkets() {
  const POLL_INTERVAL_MS = 5 * 60 * 1000
  const config = useRuntimeConfig()
  const publicConfig = config.public as Record<string, unknown>
  const ingestUrl = (publicConfig.ingestBackendUrl || publicConfig.NUXT_PUBLIC_INGEST_BACKEND_URL) as string | undefined

  const markets = ref<DustMarket[]>([])
  const weatherSnapshots = ref<Record<string, WeatherSnapshot>>({})
  const weatherMarketForecasts = ref<WeatherMarketForecast[]>([])
  const loading = ref(true)
  const error = ref<string | null>(null)
  const lastUpdated = ref<string | null>(null)
  const source = ref('Ingest backend')
  const status = ref<'idle' | 'loading' | 'live' | 'error'>('idle')
  const lastSyncAt = ref<string | null>(null)
  const hasLoadedOnce = ref(false)

  // HTTP et SSE appliquent le même contrat pour éviter des états divergents.
  function applyPayload(payload: DustFeedPayload) {
    const nextMarkets = dedupeMarkets(Array.isArray(payload?.markets) ? payload.markets : [])

    markets.value = nextMarkets
    weatherSnapshots.value = payload?.weatherSnapshots && typeof payload.weatherSnapshots === 'object' ? payload.weatherSnapshots : {}
    weatherMarketForecasts.value = Array.isArray(payload?.weatherMarketForecasts) ? payload.weatherMarketForecasts : []
    lastUpdated.value = payload.generatedAt || payload.summary?.generatedAtLocale as string || null
    source.value = payload.source || 'Ingest backend'
    lastSyncAt.value = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    status.value = nextMarkets.length ? 'live' : 'idle'
    error.value = nextMarkets.length ? null : 'No dust market data available yet.'
    hasLoadedOnce.value = true
  }

  async function loadFromBackend(options?: { silent?: boolean }) {
    const silent = !!options?.silent

    if (!ingestUrl) {
      error.value = 'NUXT_PUBLIC_INGEST_BACKEND_URL is not configured on the frontend.'
      loading.value = false
      return
    }

    if (!silent || !hasLoadedOnce.value) {
      loading.value = true
      status.value = 'loading'
    }
    error.value = null

    try {
      const stateRes = await fetch(`${ingestUrl.replace(/\/$/, '')}/state`, { cache: 'no-store' })

      // 204 = aucun état encore reçu par le bot — pas une erreur
      if (stateRes.status === 204) {
        markets.value = []
        weatherSnapshots.value = {}
        weatherMarketForecasts.value = []
        status.value = 'idle'
        error.value = 'No dust market data available yet.'
        hasLoadedOnce.value = true
        loading.value = false
        return
      }

      if (!stateRes.ok) {
        throw new Error(`Unable to load state (${stateRes.status})`)
      }

      const payload = await stateRes.json() as DustFeedPayload
      applyPayload(payload)
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error'
      error.value = message
      status.value = 'error'
      markets.value = []
      weatherSnapshots.value = {}
      weatherMarketForecasts.value = []
    } finally {
      loading.value = false
    }
  }

  onMounted(() => {
    void loadFromBackend()

    if (!ingestUrl) return

    const sseUrl = new URL('/events', ingestUrl).toString()
    const eventSource = typeof window !== 'undefined' ? new EventSource(sseUrl) : null
    let interval: ReturnType<typeof setInterval> | null = null

    const startPollingFallback = () => {
      if (interval) return
      interval = setInterval(() => {
        void loadFromBackend({ silent: true })
      }, POLL_INTERVAL_MS)
    }

    const stopPollingFallback = () => {
      if (!interval) return
      clearInterval(interval)
      interval = null
    }

    if (eventSource) {
      eventSource.onopen = () => {
        stopPollingFallback()
      }

      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as DustFeedPayload
          applyPayload(payload)
          loading.value = false
        } catch (e) {
          console.warn('Failed to parse SSE dust update', e)
        }
      }

      eventSource.onerror = () => {
        console.warn('SSE dust stream disconnected, enabling polling fallback')
        startPollingFallback()
      }
    } else {
      startPollingFallback()
    }

    onBeforeUnmount(() => {
      stopPollingFallback()
      eventSource?.close()
    })
  })

  return {
    markets,
    weatherSnapshots,
    weatherMarketForecasts,
    loading,
    error,
    lastUpdated,
    source,
    status,
    lastSyncAt,
    loadFromBackend
  }
}
