<script setup lang="ts">
import type { CityGroup, WeatherSnapshot, WeatherMarketForecast } from '~/types/dust'

const props = defineProps<{ group: CityGroup, snapshot?: WeatherSnapshot, forecasts: WeatherMarketForecast[], collapsed: boolean }>()
const emit = defineEmits<{ toggle: [] }>()
const { dashboardLayout } = useDashboardLayout()
const { weather, peakLabel, dateGuard, forecast } = useDustStation(props)
</script>

<template>
  <section
    :id="`station-${group.key}`"
    class="station-panel"
    :class="{ 'dossier-collapsed': dashboardLayout === 'dossiers' && collapsed, 'station-date-mismatch': dateGuard?.warning }"
  >
    <HomeMarketDateAlert
      v-if="dateGuard?.warning"
      :title="dateGuard!.warning!.title"
      :details="dateGuard!.warning!.details"
    />
    <HomeDustStationHeader
      :group="group"
      :weather="weather"
      :peak-label="peakLabel"
      :collapsed="collapsed"
      :market-matches-today="!!dateGuard?.marketMatchesToday"
      @toggle="emit('toggle')"
    />

    <div
      v-if="!collapsed"
      class="station-body"
    >
      <div
        v-if="group.markets.some(m => m.airportData?.ignoreForTrading)"
        class="rounded-sm border-l-4 border-amber-500 bg-amber-500/15 p-2.5 text-xs text-amber-700"
      >
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-alert-triangle" class="size-4 flex-shrink-0" />
          <span class="font-semibold">Ville marquée IGNORE FOR TRADING</span>
        </div>
      </div>

      <HomeDustStationWeather
        :group="group"
        :weather="weather"
        :forecasts="forecasts"
        :forecast="forecast"
        :can-show-chart="!!dateGuard?.canShowChart"
      />

      <div class="station-markets">
        <h4 class="instrument-heading">
          MARCHÉS · {{ group.markets.length }} SEUILS
        </h4>
        <HomeDustOrderBook v-for="market in group.markets" :key="market.id || market.slug || `${market.city}-${market.groupItemTitle}-${market.outcome}`" :market="market" />
      </div>
    </div>
  </section>
</template>
