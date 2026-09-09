<script setup lang="ts">
const { markets, weatherSnapshots, weatherTradingSignals, loading, status, lastSyncAt, error } = useDustMarkets()

const runtime = useRuntimeConfig()
const appVersion = runtime.public.appVersion as string

const airportCount = computed(() => new Set(
  markets.value
    .map(market => market.airport)
    .filter((airport): airport is string => Boolean(airport))
).size)

const statusLabel = computed(() => {
  if (status.value === 'live') return 'Live feed OK'
  if (status.value === 'loading') return 'Chargement...'
  if (status.value === 'error') return 'Erreur de connexion'
  return 'En attente'
})

const statusTone = computed(() => {
  if (status.value === 'live') return 'text-emerald-200 border-emerald-300/30 bg-emerald-300/10'
  if (status.value === 'loading') return 'text-sky-200 border-sky-300/30 bg-sky-300/10'
  if (status.value === 'error') return 'text-rose-200 border-rose-300/30 bg-rose-300/10'
  return 'text-slate-200 border-white/15 bg-white/5'
})

const statusDotTone = computed(() => {
  if (status.value === 'live') return 'bg-emerald-300'
  if (status.value === 'loading') return 'bg-sky-300'
  if (status.value === 'error') return 'bg-rose-300'
  return 'bg-slate-300'
})

const shortStatusLabel = computed(() => {
  if (status.value === 'live') return 'Live'
  if (status.value === 'loading') return 'Sync'
  if (status.value === 'error') return 'Erreur'
  return 'Pause'
})
</script>

<template>
  <UDashboardPanel id="home">
    <template #header>
      <UDashboardNavbar
        class="border-b border-white/10 bg-slate-950/90 backdrop-blur-xl"
        :ui="{
          root: 'min-h-16 px-3 sm:px-5',
          title: 'min-w-0',
          right: 'gap-2 sm:gap-3'
        }"
      >
        <template #title>
          <div class="flex min-w-0 items-center gap-2.5">
            <span class="grid size-9 shrink-0 place-items-center rounded-xl border border-cyan-300/20 bg-gradient-to-br from-cyan-400/20 to-emerald-400/10 shadow-[0_0_24px_rgba(34,211,238,0.08)]">
              <UIcon name="i-lucide-cloud-sun" class="size-5 text-cyan-200" />
            </span>
            <span class="min-w-0 leading-tight">
              <span class="block truncate text-sm font-bold tracking-tight text-white sm:text-base">
                Dust Weather
              </span>
              <span class="hidden truncate text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400 sm:block">
                Terminal marchés météo
              </span>
            </span>
          </div>
        </template>

        <template #right>
          <div class="flex min-w-0 items-center gap-1.5 text-xs sm:gap-2">
            <span
              class="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 font-semibold"
              :class="statusTone"
              :title="error || statusLabel"
            >
              <span class="relative flex size-2">
                <span
                  v-if="status === 'live'"
                  class="absolute inline-flex size-full animate-ping rounded-full opacity-50"
                  :class="statusDotTone"
                />
                <span class="relative inline-flex size-2 rounded-full" :class="statusDotTone" />
              </span>
              <span class="hidden sm:inline">{{ statusLabel }}</span>
              <span class="sm:hidden">{{ shortStatusLabel }}</span>
            </span>

            <span class="hidden items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-slate-300 lg:inline-flex">
              <span class="inline-flex items-center gap-1">
                <UIcon name="i-lucide-map-pin" class="size-3.5 text-cyan-300" />
                <strong class="font-semibold tabular-nums text-white">{{ airportCount }}</strong> villes
              </span>
              <span class="h-3 w-px bg-white/10" />
              <span><strong class="font-semibold tabular-nums text-white">{{ markets.length }}</strong> marchés</span>
            </span>

            <span class="hidden items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-slate-400 md:inline-flex">
              <UIcon
                name="i-lucide-refresh-cw"
                class="size-3.5"
                :class="{ 'animate-spin': status === 'loading' }"
              />
              <span>Sync</span>
              <strong class="font-mono font-medium tabular-nums text-slate-200">{{ lastSyncAt || '—' }}</strong>
            </span>

            <UButton
              to="/weather-links"
              color="primary"
              variant="soft"
              size="sm"
              icon="i-lucide-book-open"
              aria-label="Ouvrir le wiki météo"
              class="shrink-0"
            >
              <span class="hidden xl:inline">Wiki météo</span>
            </UButton>

            <span class="hidden font-mono text-[10px] tabular-nums text-slate-500 2xl:inline">v{{ appVersion }}</span>
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <HomeDustMarkets
        :markets="markets"
        :weather-snapshots="weatherSnapshots"
        :weather-trading-signals="weatherTradingSignals"
        :loading="loading"
      />
    </template>
  </UDashboardPanel>
</template>
