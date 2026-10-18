<script setup lang="ts">
import type { WeatherChartGeometry } from '~/types/weatherChart'

const props = defineProps<{
  chart: WeatherChartGeometry
  airport: string
  unit: 'C' | 'F'
  timeZone?: string | null
}>()

const emit = defineEmits<{ resize: [width: number] }>()
const chartElement = ref<SVGSVGElement | null>(null)
let resizeObserver: ResizeObserver | null = null
const hourFormatter = computed(() => props.timeZone
  ? new Intl.DateTimeFormat('fr-FR', { timeZone: props.timeZone, hour: '2-digit', minute: '2-digit' })
  : null)

function weatherTemperature(value: number) {
  return Math.round(value * 10) / 10 + '°' + props.unit
}

function weatherHour(value: string) {
  const parsed = /(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ? new Date(value) : new Date(Number.NaN)
  return hourFormatter.value && !Number.isNaN(parsed.getTime())
    ? hourFormatter.value.format(parsed)
    : value.slice(11, 16) || value
}

onMounted(() => {
  let lastWidth = 0
  // Seule une vraie variation de largeur invalide la géométrie, jamais un survol ou le tick de l'horloge.
  resizeObserver = new ResizeObserver((entries) => {
    const width = Math.round(entries[0]?.contentRect.width || 0)
    if (width > 0 && width !== lastWidth) {
      lastWidth = width
      emit('resize', width)
    }
  })
  if (chartElement.value) resizeObserver.observe(chartElement.value)
})

onBeforeUnmount(() => resizeObserver?.disconnect())
</script>

<template>
  <svg
    ref="chartElement"
    :data-airport="airport"
    :viewBox="`0 0 ${chart.chartWidth} 320`"
    class="weather-temperature-plot w-full overflow-visible"
    role="img"
    aria-label="Températures mesurées, prévisions et seuils des bets, avec limite à minuit local et aperçu du lendemain"
  >
    <rect
      v-if="chart.afterMidnightX != null"
      :x="chart.afterMidnightX!"
      y="36"
      :width="chart.chartRight - chart.afterMidnightX!"
      height="232"
      class="weather-next-day-zone"
    >
      <title>Après minuit local : aperçu du lendemain, hors journée du bet</title>
    </rect>
    <line
      v-for="tick in chart.yAxisPoints"
      :key="`grid-y-${tick.value}`"
      :x1="chart.chartLeft"
      :y1="tick.y"
      :x2="chart.chartRight"
      :y2="tick.y"
      stroke="currentColor"
      class="text-slate-900"
    />
    <line
      v-for="point in chart.axisPoints"
      :key="`grid-x-${point.timeLocal}`"
      :x1="point.x"
      y1="36"
      :x2="point.x"
      y2="274"
      stroke="currentColor"
      class="text-slate-900"
    />
    <text
      v-for="tick in chart.yAxisPoints"
      :key="`axis-y-${tick.value}`"
      :x="chart.labelX"
      :y="tick.y + 5"
      text-anchor="end"
      fill="currentColor"
      class="weather-axis-label font-semibold text-slate-900"
    >
      {{ weatherTemperature(tick.value) }}
    </text>
    <line
      v-if="chart.boundaryX != null"
      :x1="chart.boundaryX!"
      y1="24"
      :x2="chart.boundaryX!"
      y2="274"
      stroke="currentColor"
      stroke-dasharray="2 3"
      class="text-slate-700"
    />
    <text
      v-if="chart.boundaryX != null"
      :x="chart.boundaryX!"
      y="18"
      text-anchor="middle"
      fill="currentColor"
      class="weather-axis-label font-semibold text-slate-900"
    >
      Maintenant
    </text>
    <g v-if="chart.midnightX != null" class="weather-midnight-marker">
      <title>Minuit local · fin de la journée du bet</title>
      <line
        :x1="chart.midnightX!"
        :x2="chart.midnightX!"
        y1="36"
        y2="280"
        stroke="currentColor"
        stroke-width="2"
      />
      <text
        :x="chart.midnightLabelX!"
        y="316"
        text-anchor="middle"
        fill="currentColor"
        class="font-semibold"
      >Minuit · fin du bet</text>
    </g>
    <g v-for="bet in chart.betLines" :key="bet.temperature" class="bet-threshold">
      <title>{{ bet.label }} · {{ weatherTemperature(bet.temperature) }}</title>
      <line
        :x1="chart.chartLeft"
        :x2="chart.betChartRight"
        :y1="bet.y"
        :y2="bet.y"
        stroke="currentColor"
        stroke-width="2"
        stroke-dasharray="8 4"
        class="weather-series-bet"
      />
      <text
        :x="chart.betChartRight - 2"
        :y="bet.labelY"
        text-anchor="end"
        fill="currentColor"
        stroke="white"
        stroke-width="3"
        paint-order="stroke"
        class="weather-axis-label font-bold text-slate-900"
      >{{ bet.label }} · {{ weatherTemperature(bet.temperature) }}</text>
    </g>
    <path
      v-if="chart.observed"
      :d="chart.observed"
      fill="none"
      stroke="currentColor"
      stroke-width="3.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="weather-series-observed"
    />
    <path
      v-if="chart.spread"
      :d="chart.spread"
      fill="#38bdf8"
      fill-opacity="0.10"
      stroke="none"
    />
    <path
      v-for="model in chart.modelPaths"
      :key="`model-${model.id}`"
      :d="model.path"
      fill="none"
      :stroke="model.color"
      stroke-width="2.25"
      :stroke-dasharray="model.dash"
      stroke-linecap="round"
      stroke-linejoin="round"
      opacity="1"
    />
    <path
      v-if="chart.forecast"
      :d="chart.forecast"
      fill="none"
      stroke="currentColor"
      stroke-width="2.5"
      stroke-dasharray="16 7"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="weather-series-consensus"
    />
    <path
      v-if="chart.primaryForecast"
      :d="chart.primaryForecast"
      fill="none"
      stroke="currentColor"
      stroke-width="3.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="weather-series-primary"
    />
    <rect
      v-for="point in chart.primaryPoints"
      :key="point.timeLocal"
      :x="point.x - 3.5"
      :y="point.y - 3.5"
      width="7"
      height="7"
      fill="white"
      stroke="currentColor"
      stroke-width="2"
      class="weather-series-primary"
    />
    <circle
      v-for="point in chart.observedPoints"
      :key="`observed-dot-${point.timeLocal}`"
      :cx="point.x"
      :cy="point.y"
      r="3.5"
      fill="currentColor"
      stroke="white"
      stroke-width="2"
      class="weather-series-observed"
    />
    <circle
      v-if="chart.peakPoint"
      :cx="chart.peakPoint!.x"
      :cy="chart.peakPoint!.y"
      r="6"
      fill="white"
      stroke="currentColor"
      stroke-width="2"
      class="weather-series-observed"
    />
    <text
      v-for="point in chart.axisPoints"
      :key="`axis-${point.timeLocal}`"
      :x="point.x"
      y="296"
      text-anchor="middle"
      fill="currentColor"
      class="weather-axis-label font-semibold text-slate-900"
    >
      {{ point.label || weatherHour(point.timeLocal) }}
    </text>
    <HomeWeatherChartInteraction
      :points="chart.points"
      :unit="unit"
      :time-zone="timeZone"
      :chart-width="chart.chartWidth"
    />
  </svg>
</template>
