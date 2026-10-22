<script setup lang="ts">
import type { WeatherSnapshot } from '~/types/dust'
import { formatFrDate } from '~/utils/dustFormatters'

const props = defineProps<{ weather: WeatherSnapshot }>()
const { coarseNow } = useDustClock()
const label = computed(() => {
  if (props.weather.stale) return 'ancien'
  const fetched = new Date(props.weather.fetchedAt).getTime()
  if (!coarseNow.value) return 'a jour'
  const reference = coarseNow.value.getTime()
  if (!Number.isFinite(fetched)) return 'fraicheur inconnue'
  const minutes = Math.max(0, Math.round((reference - fetched) / 60_000))
  return minutes < 1 ? 'a l\'instant' : `il y a ${minutes} min`
})
</script>

<template>
  <span
    class="rounded-sm border px-1.5 py-0.5 text-[9px]"
    :class="weather.stale ? 'border-slate-400/30 bg-slate-400/10 text-slate-600' : 'border-emerald-400/25 bg-emerald-400/10 text-emerald-700'"
    :title="weather.nextRefreshAt ? `Prochain refresh: ${formatFrDate(weather.nextRefreshAt)}` : ''"
  >{{ label }}</span>
</template>
