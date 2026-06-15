export interface DustMarket {
  id?: string | number | null
  slug?: string | null
  city?: string | null
  airport?: string | null
  outcome?: string | null
  date?: string | null
  groupItemTitle?: string | null
  link?: string | null
  asks?: { price?: number | string; size?: number | string }[]
  spread?: number | string | null
  currentPrice?: number | string | null
  bestAsk?: number | string | null
}

export interface DustFeedPayload {
  type?: string
  source?: string
  generatedAt?: string
  count?: number
  markets?: DustMarket[]
  summary?: Record<string, unknown>
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

export function useDustMarkets() {
  const POLL_INTERVAL_MS = 5 * 60 * 1000
  const config = useRuntimeConfig()
  const publicConfig = config.public as Record<string, unknown>
  const ingestUrl = (publicConfig.ingestBackendUrl || publicConfig.NUXT_PUBLIC_INGEST_BACKEND_URL) as string | undefined

  const markets = ref<DustMarket[]>([])
  const loading = ref(true)
  const error = ref<string | null>(null)
  const lastUpdated = ref<string | null>(null)
  const source = ref('Ingest backend')
  const status = ref<'idle' | 'loading' | 'live' | 'error'>('idle')
  const lastSyncAt = ref<string | null>(null)
  const hasLoadedOnce = ref(false)

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
      const nextMarkets = dedupeMarkets(Array.isArray(payload?.markets) ? payload.markets : [])

      markets.value = nextMarkets
      lastUpdated.value = payload.generatedAt || payload.summary?.generatedAtLocale as string || null
      source.value = payload.source || 'Ingest backend'
      lastSyncAt.value = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      status.value = nextMarkets.length ? 'live' : 'idle'
      error.value = nextMarkets.length ? null : 'No dust market data available yet.'
      hasLoadedOnce.value = true
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error'
      error.value = message
      status.value = 'error'
      markets.value = []
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
          const nextMarkets = dedupeMarkets(Array.isArray(payload?.markets) ? payload.markets : [])

          markets.value = nextMarkets
          lastUpdated.value = payload.generatedAt || payload.summary?.generatedAtLocale as string || null
          source.value = payload.source || 'Ingest backend'
          lastSyncAt.value = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          loading.value = false
          status.value = nextMarkets.length ? 'live' : 'idle'
          error.value = nextMarkets.length ? null : 'No dust market data available yet.'
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
    loading,
    error,
    lastUpdated,
    source,
    status,
    lastSyncAt,
    loadFromBackend
  }
}
