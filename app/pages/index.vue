<script setup lang="ts">
const { markets, weatherSnapshots, weatherMarketForecasts, loading, status, lastSyncAt, error } = useDustMarkets()
const runtime = useRuntimeConfig()
const { dashboardLayout } = useDashboardLayout()
const pageTitle = computed(() => ({
  weather: 'Veille des températures',
  dossiers: 'Dossiers de veille'
})[dashboardLayout.value])
const airportCount = computed(() => new Set(markets.value.map(market => market.airport).filter(Boolean)).size)
const statusLabel = computed(() => {
  if (status.value === 'live') return 'Flux connecté'
  if (status.value === 'loading') return 'Synchronisation'
  if (status.value === 'error') return 'Connexion interrompue'
  return 'En attente'
})
</script>

<template>
  <main class="observatory">
    <DossierNavigation v-if="dashboardLayout === 'dossiers'" />
    <header v-else class="workspace-nav">
      <NuxtLink to="/" class="wordmark" aria-label="Dust, tableau de veille">
        <UIcon name="i-lucide-cloud-sun" class="size-6" />
        <span>DUST<span class="wordmark-sub">OBSERVATOIRE MÉTÉO</span></span>
      </NuxtLink>
      <nav class="workspace-tabs" aria-label="Navigation principale">
        <NuxtLink to="/" aria-current="page">Tableau de veille</NuxtLink>
        <NuxtLink to="/weather-links">Stations & sources</NuxtLink>
      </nav>
      <span class="workspace-version">v{{ runtime.public.appVersion }}</span>
    </header>
    <div class="workspace-content">
      <div class="page-heading">
        <div>
          <p class="eyebrow">
            OBSERVATIONS / PRÉVISIONS / MARCHÉS
          </p>
          <h1>{{ pageTitle }}</h1>
          <p class="page-description">
            {{ airportCount }} villes suivies · {{ markets.length }} marchés actifs
          </p>
        </div>
        <div class="feed-status" :class="{ 'feed-error': status === 'error' }" :title="error || statusLabel">
          <span class="feed-indicator" :class="status" />
          <div><strong>{{ statusLabel }}</strong><span>Dernière synchronisation {{ lastSyncAt || '—' }}</span></div>
        </div>
      </div>
      <HomeDustMarkets
        :markets="markets"
        :weather-snapshots="weatherSnapshots"
        :weather-market-forecasts="weatherMarketForecasts"
        :loading="loading"
      />
    </div>
  </main>
</template>
