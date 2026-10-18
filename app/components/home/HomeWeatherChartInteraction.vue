<script setup lang="ts">
import type { WeatherChartPoint } from '~/types/weatherChart'

const props = defineProps<{
  points: WeatherChartPoint[]
  unit: 'C' | 'F'
  timeZone?: string | null
  chartWidth: number
}>()

const interactionLayer = ref<SVGGElement | null>(null)
const hourFormatter = computed(() => props.timeZone
  ? new Intl.DateTimeFormat('fr-FR', { timeZone: props.timeZone, hour: '2-digit', minute: '2-digit' })
  : null)

// Les libellés et les zones de survol restent stables tant que les données météo ne changent pas.
const formattedPoints = computed(() => props.points.map((point) => {
  const parsed = /(?:Z|[+-]\d{2}:\d{2})$/i.test(point.timeLocal) ? new Date(point.timeLocal) : new Date(Number.NaN)
  const hour = hourFormatter.value && !Number.isNaN(parsed.getTime())
    ? hourFormatter.value.format(parsed)
    : point.timeLocal.slice(11, 16) || point.timeLocal
  const temperatureLabel = `${Math.round(point.temperature * 10) / 10}°${props.unit}`
  const seriesLabel = point.kind === 'observed' ? 'Mesuré' : point.label || 'Consensus'
  return {
    ...point,
    key: `${point.kind}-${point.label || 'default'}-${point.timeLocal}`,
    hour,
    temperatureLabel,
    seriesLabel,
    ariaLabel: `${hour}, ${temperatureLabel}, ${seriesLabel}`
  }
}))

type FormattedPoint = (typeof formattedPoints.value)[number]

// L'état reste local à ce calque : déplacer la souris ne relance pas le rendu des autres stations.
const hoveredPoint = shallowRef<FormattedPoint | null>(null)
let pendingPoint: FormattedPoint | null = null
let frameId: number | null = null
let chartElement: SVGSVGElement | null = null

function cancelPendingPoint() {
  if (frameId !== null) cancelAnimationFrame(frameId)
  frameId = null
  pendingPoint = null
}

function queuePoint(point: FormattedPoint) {
  if (point === hoveredPoint.value && pendingPoint === null) return
  pendingPoint = point
  // Plusieurs entrées pendant une même image n'affichent que le dernier point visé.
  if (frameId !== null) return
  frameId = requestAnimationFrame(() => {
    frameId = null
    if (hoveredPoint.value !== pendingPoint) hoveredPoint.value = pendingPoint
    pendingPoint = null
  })
}

function showPoint(point: FormattedPoint) {
  cancelPendingPoint()
  if (hoveredPoint.value !== point) hoveredPoint.value = point
}

function hideTooltip() {
  cancelPendingPoint()
  hoveredPoint.value = null
}

const tooltip = computed(() => hoveredPoint.value
  ? {
      ...hoveredPoint.value,
      boxX: Math.max(6, Math.min(hoveredPoint.value.x + 10, props.chartWidth - 214)),
      boxY: Math.max(36, Math.min(210, hoveredPoint.value.y - 64))
    }
  : null)

watch(formattedPoints, hideTooltip)

onMounted(() => {
  chartElement = interactionLayer.value?.ownerSVGElement || null
  chartElement?.addEventListener('pointerleave', hideTooltip)
})

onBeforeUnmount(() => {
  chartElement?.removeEventListener('pointerleave', hideTooltip)
  cancelPendingPoint()
})
</script>

<template>
  <g ref="interactionLayer" class="weather-chart-interaction">
    <g v-memo="[formattedPoints]">
      <circle
        v-for="point in formattedPoints"
        :key="point.key"
        :cx="point.x"
        :cy="point.y"
        r="9"
        fill="transparent"
        class="cursor-crosshair"
        tabindex="0"
        :aria-label="point.ariaLabel"
        @pointerenter="queuePoint(point)"
        @focus="showPoint(point)"
        @blur="hideTooltip"
        @click="showPoint(point)"
      />
    </g>
    <g v-if="tooltip" class="pointer-events-none">
      <line
        :x1="tooltip.x"
        y1="32"
        :x2="tooltip.x"
        y2="274"
        stroke="currentColor"
        stroke-dasharray="3 3"
        class="text-slate-900"
      />
      <circle
        :cx="tooltip.x"
        :cy="tooltip.y"
        r="4"
        fill="white"
        stroke="white"
        stroke-width="2"
      />
      <rect
        :x="tooltip.boxX"
        :y="tooltip.boxY"
        width="208"
        height="52"
        rx="4"
        fill="#020617"
        stroke="#94a3b8"
        stroke-width="0.8"
      />
      <text
        :x="tooltip.boxX + 6"
        :y="tooltip.boxY + 18"
        fill="white"
        class="weather-tooltip-label font-semibold"
      >
        {{ tooltip.hour }} · {{ tooltip.seriesLabel }}
      </text>
      <text
        :x="tooltip.boxX + 6"
        :y="tooltip.boxY + 40"
        fill="white"
        class="weather-tooltip-temperature font-bold"
      >
        {{ tooltip.temperatureLabel }}
      </text>
    </g>
  </g>
</template>
