export interface DustMarket {
  id?: string | number | null
  slug?: string | null
  city?: string | null
  airport?: string | null
  outcome?: string | null
  date?: string | null
  groupItemTitle?: string | null
  link?: string | null
  asks?: Array<{ price?: number | string; size?: number | string }>
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

export function useDustMarkets() {
  const config = useRuntimeConfig()
  const publicConfig = config.public as Record<string, unknown>
  const ingestUrl = (publicConfig.ingestBackendUrl || publicConfig.INGEST_BACKEND_URL || publicConfig.NUXT_PUBLIC_INGEST_BACKEND_URL) as string | undefined

  const markets = ref<DustMarket[]>([])
  const loading = ref(true)
  const error = ref<string | null>(null)
  const lastUpdated = ref<string | null>(null)
  const source = ref('Koyeb ingest backend')

  async function loadFromBackend() {
    if (!ingestUrl) {
      error.value = 'INGEST_BACKEND_URL is not configured on the frontend.'
      loading.value = false
      return
    }

    loading.value = true
    error.value = null

    try {
      const stateRes = await fetch(`${ingestUrl.replace(/\/$/, '')}/state`, { cache: 'no-store' })
      if (!stateRes.ok) {
        throw new Error(`Unable to load state (${stateRes.status})`)
      }

      const payload = await stateRes.json() as DustFeedPayload
      const nextMarkets = Array.isArray(payload?.markets) ? payload.markets : []

      markets.value = nextMarkets
      lastUpdated.value = payload.generatedAt || payload.summary?.generatedAtLocale as string || null
      source.value = payload.source || 'Koyeb ingest backend'
      error.value = nextMarkets.length ? null : 'No dust market data available yet.'
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error'
      error.value = message
      markets.value = []
    } finally {
      loading.value = false
    }
  }

  onMounted(() => {
    void loadFromBackend()
    const interval = setInterval(() => {
      void loadFromBackend()
    }, 60_000)

    onBeforeUnmount(() => clearInterval(interval))
  })

  return {
    markets,
    loading,
    error,
    lastUpdated,
    source,
    loadFromBackend
  }
}
