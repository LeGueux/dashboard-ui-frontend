<script setup lang="ts">
import type { MarketWeatherSnapshot } from '~/utils/marketWeather'
import { weatherConditionLabel, weatherTemperature, weatherHour } from '~/utils/dustWeather'

defineProps<{ weather: MarketWeatherSnapshot, timeZone?: string | null }>()
const { dashboardLayout } = useDashboardLayout()
</script>

<template>
  <div :class="dashboardLayout === 'dossiers' ? 'dossier-current' : 'flex min-w-[72px] items-center gap-2'">
    <span class="text-2xl" role="img" :aria-label="weatherConditionLabel(weather.current?.condition)">
      {{ weather.current?.conditionIcon || '🌡️' }}
    </span>
    <div>
      <p class="current-temperature">
        {{ weatherTemperature(weather.current?.temperature, weather.unit) }}
      </p>
      <p v-if="weather.observedAt" class="mt-1 text-[9px] text-slate-500">
        Dernière valeur à {{ weatherHour(weather.observedAt, timeZone) }}
      </p>
      <p class="mt-1 max-w-40 text-[10px] font-medium leading-tight text-slate-700" :title="weatherConditionLabel(weather.current?.condition)">
        {{ weatherConditionLabel(weather.current?.condition) }}
      </p>
    </div>
  </div>
</template>
