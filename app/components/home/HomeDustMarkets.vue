<script setup lang="ts">
import type { DustMarket, WeatherSnapshot, WeatherMarketForecast } from '~/types/dust'

const props = withDefaults(defineProps<{
  markets?: DustMarket[]
  loading?: boolean
  weatherSnapshots?: Record<string, WeatherSnapshot>
  weatherMarketForecasts?: WeatherMarketForecast[]
}>(), {
  markets: () => [], loading: false, weatherSnapshots: () => ({}), weatherMarketForecasts: () => []
})
const { dashboardLayout } = useDashboardLayout()
const { coarseNow } = provideDustClock()
const hideOnly999Asks = ref(false)
// Le cookie conserve le filtre sur cet appareil et l'applique dès le rendu serveur.
const hideFahrenheit = useCookie<boolean>('dust-hide-fahrenheit', {
  default: () => false,
  maxAge: 60 * 60 * 24 * 365,
  sameSite: 'lax',
  path: '/'
})
const { groups } = useDustMarketGroups(props, hideOnly999Asks, coarseNow, hideFahrenheit)
// Cet état reste dans l'orchestrateur pour survivre aux changements de présentation.

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
</script>

<template>
  <div class="station-board">
    <HomeDustControls v-model="hideOnly999Asks" v-model:hide-fahrenheit="hideFahrenheit" />

    <div
      v-if="loading"
      class="flex items-center gap-3 rounded-sm border border-emerald-400/20 bg-emerald-400/5 p-4 text-emerald-700"
    >
      <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin" />
      Chargement des markets dust…
    </div>

    <div
      v-else-if="!groups.length"
      class="rounded-sm border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-slate-600"
    >
      <UIcon name="i-lucide-sparkles" class="mx-auto mb-3 size-8 text-emerald-700" />
      <template v-if="markets.length">
        Aucun marché ne correspond aux filtres sélectionnés. Cliquez sur « Tous » pour les réafficher.
      </template>
      <template v-else>
        Aucun market dust n'est encore disponible. Le bot Discord devra en envoyer pour alimenter cette vue.
      </template>
    </div>

    <div v-if="!loading && groups.length" class="station-overview" :aria-label="dashboardLayout === 'dossiers' ? 'Accéder au dossier d’une ville et d’une date' : 'Aperçu de toutes les villes'">
      <HomeDustStationOverview
        v-for="group in groups"
        :key="group.key"
        :group="group"
        :snapshot="weatherSnapshots[group.airport]"
      />
    </div>

    <div v-if="!loading && groups.length" class="station-grid">
      <HomeDustStationPanel
        v-for="group in groups"
        :key="group.key"
        :group="group"
        :snapshot="weatherSnapshots[group.airport]"
        :forecasts="weatherMarketForecasts"
        :collapsed="collapsed.has(group.key)"
        @toggle="toggleCity(group.key)"
      />
    </div>
  </div>
</template>
