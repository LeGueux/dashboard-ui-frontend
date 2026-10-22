<script setup lang="ts">
import type { CityGroup, WeatherSnapshot } from '~/types/dust'
import { weatherForMarketDate } from '~/utils/marketWeather'
import { weatherTemperature, weatherPeakLabel } from '~/utils/dustWeather'
import { tzParts } from '~/utils/dustTime'

const props = defineProps<{ group: CityGroup, snapshot?: WeatherSnapshot }>()
const { now } = useDustClock()
const weather = computed(() => weatherForMarketDate(props.snapshot, props.group.date, props.group.tz))
const peakLabel = computed(() => weatherPeakLabel(weather.value, props.group.tz))
// Le libellé reste identique entre les secondes d'une même minute.
const timeLabel = computed(() => {
  if (!props.group.tz || !now.value) return props.group.localTime || '—'
  const { h, m } = tzParts(props.group.tz, now.value)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
})
</script>

<template>
  <a
    :href="`#station-${encodeURIComponent(group.key)}`"
    class="overview-reading"
  >
    <div class="overview-city"><strong>{{ group.city }}<span class="block">{{ group.dateLabel || 'Date inconnue' }}</span></strong><span>{{ group.airport }}</span></div>
    <span class="overview-temperature">{{ weather ? weatherTemperature(weather!.current?.temperature, weather!.unit) : '—' }}</span>
    <span class="overview-caption">{{ peakLabel ? `Pic ${peakLabel}` : 'Pic non disponible' }}</span>
    <span class="overview-clock">{{ timeLabel }}</span>
  </a>
</template>
