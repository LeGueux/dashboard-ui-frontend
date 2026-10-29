<script setup lang="ts">
import type { CityGroup, WeatherMarketForecast } from '~/types/dust'
import type { MarketWeatherSnapshot } from '~/utils/marketWeather'
import { buildWeatherChart } from '~/utils/dustWeatherChart'
import { weatherConditionLabel, weatherTemperature, weatherHour, weatherForecastLabel, hasMetarObservations, calculateDailyMaximumTemperature, metarTemperature, betTemperatureGap, temperatureTrend } from '~/utils/dustWeather'

const props = defineProps<{
  group: CityGroup
  weather: MarketWeatherSnapshot | null
  forecasts: WeatherMarketForecast[]
  forecast: WeatherMarketForecast | null
  canShowChart: boolean
}>()
const { dashboardLayout } = useDashboardLayout()
const compact = useMediaQuery('(max-width: 767px)')
const chartWidth = ref(0)
// Un redimensionnement ne recalcule que la station concernée.
const chart = computed(() => props.weather ? buildWeatherChart(props.weather, props.group.markets, props.forecasts, chartWidth.value || (compact.value ? 320 : 420)) : null)
const dailyMaximum = computed(() => props.weather ? calculateDailyMaximumTemperature(props.weather) : null)
const trend = computed(() => props.weather ? temperatureTrend(props.weather) : null)
</script>

<template>
  <div
    v-if="!weather"
    class="flex items-center gap-2 rounded-sm border border-dashed border-slate-200 bg-slate-50 px-2.5 py-2 text-[11px] text-slate-700"
  >
    <UIcon name="i-lucide-cloud-off" class="size-3.5 shrink-0" />
    Météo indisponible pour le {{ group.dateLabel || 'jour du pari' }}
  </div>

  <div
    v-else-if="!weather.disabled"
    class="weather-instruments"
  >
    <h4 class="instrument-heading">
      OBSERVATIONS & PRÉVISIONS
    </h4>
    <div :class="dashboardLayout === 'dossiers' ? 'dossier-forecast-summary' : 'grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2.5'">
      <HomeDustCurrentWeather v-if="dashboardLayout === 'weather'" :weather="weather!" :time-zone="group.tz" />

      <div class="col-span-2 row-start-2 min-w-0">
        <div v-if="weather.hourly?.length" class="flex gap-1 overflow-x-auto pb-1">
          <div
            v-for="point in weather.hourly!.slice(0, 6)"
            :key="`hourly-${group.airport}-${point.timeLocal}`"
            class="min-w-14 flex-1 rounded bg-slate-50 px-1 py-1 text-center"
            :title="weatherConditionLabel(point.condition)"
          >
            <p class="truncate text-[9px] font-medium tabular-nums text-slate-700">
              {{ weatherHour(point.timeLocal, group.tz) }}
            </p>
            <p class="my-0.5 text-xs leading-none">
              {{ point.conditionIcon || '🌤️' }}
            </p>
            <p class="truncate text-[10px] font-semibold tabular-nums text-slate-700">
              {{ weatherTemperature(point.temperature, weather.unit).replace(weather.unit, '') }}
            </p>
          </div>
        </div>
        <p v-else class="flex h-full items-center text-[10px] text-slate-600">
          Prevision horaire indisponible
        </p>
      </div>

      <div class="col-start-2 row-start-1 flex min-w-0 max-w-44 flex-wrap items-center justify-end gap-1 self-start">
        <a
          v-if="weather.sourceUrl"
          :href="weather.sourceUrl || undefined"
          :title="weather.reason || weather.sourceLabel"
          target="_blank"
          rel="noopener noreferrer"
          class="rounded-sm border border-sky-400/25 bg-sky-400/10 px-1.5 py-0.5 text-[9px] font-semibold text-sky-700 hover:bg-sky-400/20"
        >
          {{ weather.sourceLabel }}
        </a>
        <span v-else class="rounded-sm border border-slate-400/20 bg-slate-50 px-1.5 py-0.5 text-[9px] text-slate-600">
          {{ weather.sourceLabel }}
        </span>
        <HomeDustWeatherFreshness :weather="weather" />
      </div>
    </div>

    <p
      v-if="weather.source === 'open-meteo' && weather.reason"
      class="mt-1.5 flex items-start gap-1 text-[9px] font-medium text-sky-700"
      :title="weather.reason || ''"
    >
      <UIcon name="i-lucide-info" class="mt-0.5 size-3 shrink-0" />
      Prévisions principales indisponibles
    </p>

    <div v-if="canShowChart && chart?.points.length" class="temperature-chart">
      <div class="weather-chart-heading flex items-center justify-between gap-2 px-1 font-semibold text-slate-900">
        <span class="uppercase tracking-wide">Température du {{ group.dateLabel }}</span>
        <div class="weather-chart-summary flex flex-wrap items-center gap-2">
          <span v-if="chart!.modelPaths.length" class="font-mono tabular-nums text-sky-700">
            {{ chart!.modelPaths.length }} modèles · écart {{ weatherTemperature(chart!.spreadMax, weather.unit) }}
          </span>
          <span v-if="trend" class="font-semibold text-slate-900">
            {{ trend!.icon }} {{ trend!.label }}
          </span>
          <span v-if="chart!.primaryMax != null" class="font-mono tabular-nums weather-series-primary" :title="weather.sourceLabel">
            Max prévu {{ weather.source === 'wunderground-weather-com' ? 'WU' : weather.sourceLabel }} {{ weatherTemperature(chart!.primaryMax, weather.unit) }}
          </span>
          <span v-if="chart!.peakPoint" class="font-mono tabular-nums weather-series-observed">
            Max mesuré {{ weatherTemperature(chart!.peakPoint!.temperature, weather.unit) }}
          </span>
        </div>
      </div>
      <HomeWeatherChart
        :chart="chart!"
        :airport="group.airport"
        :unit="weather.unit"
        :time-zone="group.tz"
        @resize="width => chartWidth = width"
      />
      <div class="weather-chart-legend flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-1 py-2 font-medium text-slate-900">
        <div class="weather-chart-series flex flex-wrap items-center gap-2">
          <span v-if="chart!.observedPoints.length" class="inline-flex items-center gap-1"><span class="weather-series-key weather-observed-key" aria-hidden="true" /> Mesuré · ronds</span>
          <span v-if="chart!.primaryPoints.length" class="inline-flex items-center gap-1">
            <span class="weather-series-key weather-primary-key" aria-hidden="true" /> {{ weather.sourceLabel }} · carrés
          </span>
          <span v-if="chart!.modelPaths.length" class="inline-flex flex-wrap items-center gap-2">
            <span v-for="model in chart!.modelPaths" :key="model.id" class="inline-flex items-center gap-1">
              <span class="weather-series-key" :style="{ backgroundImage: model.legend }" aria-hidden="true" /> {{ model.label }}
            </span>
            <span class="inline-flex items-center gap-1"><span class="weather-series-key weather-consensus-key" aria-hidden="true" /> Moyenne modèles</span>
          </span>
        </div>
        <span v-if="chart!.betLines.length" class="inline-flex items-center gap-1"><span class="weather-series-key weather-bet-key" aria-hidden="true" /> Seuils bets</span>
        <span v-if="chart!.betBands.length" class="inline-flex items-center gap-1"><span class="inline-block h-2.5 w-5 border border-[#2563a6]/50 bg-[#2563a6]/15" aria-hidden="true" /><span class="inline-block h-2.5 w-5 border border-[#ad681b]/50 bg-[#ad681b]/15" aria-hidden="true" /> Plages bets</span>
        <span v-if="forecast" class="min-w-0 truncate" :title="forecast!.reason">{{ weatherForecastLabel(forecast!) }}</span>
      </div>
      <div v-if="chart!.bets.length" class="bet-distances border-t border-slate-200 px-1 py-2 text-[10px] text-slate-700">
        <p class="mb-1 font-medium">
          Écarts bets = seuil − température · actuelle / max relevé
        </p>
        <div class="weather-bet-list grid gap-2">
          <div v-for="bet in chart!.bets" :key="bet.id" class="weather-bet-card rounded border border-slate-300 bg-slate-50 px-2 py-2">
            <p class="font-semibold text-slate-900">
              {{ bet.id }} · {{ bet.outcome }} · {{ bet.title }}
            </p>
            <p class="mt-0.5 font-mono tabular-nums">
              <span>Écart à la dernière valeur {{ betTemperatureGap(bet.temperatures, weather.current?.temperature, weather.unit) }}</span>
              <span>Écart au max {{ betTemperatureGap(bet.temperatures, dailyMaximum, weather.unit) }}</span>
            </p>
          </div>
        </div>
      </div>
    </div>

    <section v-if="weather.recentObservations?.length" class="mt-2 min-w-0 border-t border-slate-200 pt-2">
      <div class="flex items-center justify-between gap-2 px-1 py-1 text-[9px] font-semibold uppercase tracking-wide text-slate-700">
        <span>8 derniers relevés METAR</span>
        <span
          v-if="hasMetarObservations(weather)"
          class="rounded border border-emerald-400/25 bg-emerald-400/10 px-1 py-0.5 text-emerald-700"
        >
          Station météo
        </span>
      </div>
      <div class="observation-strip">
        <div
          v-for="observation in weather.recentObservations!.slice(-8)"
          :key="`obs-${group.airport}-${observation.timeLocal}`"
          class="observation-reading"
          :title="weatherConditionLabel(observation.condition || observation.cloudCover)"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="font-semibold text-slate-700">{{ weatherHour(observation.timeLocal, group.tz) }}</span>
          </div>
          <div class="mt-1 min-w-0">
            <p class="flex items-center gap-1 text-sm font-bold">
              <span :class="observation.temperature !== null && Number(observation.temperature) === dailyMaximum ? 'text-purple-800' : 'text-blue-800'">
                {{ metarTemperature(observation, weather.unit) }}
              </span>
              <span
                v-if="observation.temperature !== null && Number(observation.temperature) === dailyMaximum"
                class="rounded border border-purple-800/30 bg-purple-100 px-1 py-0.5 text-[7px] font-bold leading-none text-purple-800"
                title="Maximum relevé sur cette journée"
              >MAX</span>
              <span
                v-if="observation.temperaturePrecision === 'tenth'"
                class="rounded border border-sky-400/25 bg-sky-400/10 px-1 py-0.5 text-[7px] font-semibold leading-none text-sky-700"
                title="Température METAR disponible au dixième de degré Celsius"
              >
                0,1°C
              </span>
            </p>
            <p class="mt-0.5 min-w-0 truncate text-[8px] font-medium text-slate-700">
              {{ weatherConditionLabel(observation.condition || observation.cloudCover) }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <p v-if="weather.source === 'unknown' || weather.error" class="mt-1.5 text-[10px] font-medium text-slate-700">
      Donnees structurees indisponibles<span v-if="weather.reason"> · {{ weather.reason }}</span>
    </p>
  </div>
</template>
