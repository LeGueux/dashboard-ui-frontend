<script setup lang="ts">
import type { CityGroup } from '~/types/dust'
import { tzParts, remainingSecondsForTimezone } from '~/utils/dustTime'

const props = defineProps<{ group: CityGroup, marketMatchesToday: boolean }>()
const { now, coarseNow } = useDustClock()
const cityTime = computed(() => {
  if (!props.group.tz || !now.value) return props.group.localTime || '—'
  const { h, m } = tzParts(props.group.tz, now.value)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
})
const midnight = computed(() => {
  if (!props.group.tz || !now.value) return null
  const remaining = remainingSecondsForTimezone(props.group.tz, now.value)
  const hh = Math.floor(remaining / 3600)
  const mm = Math.floor((remaining % 3600) / 60)
  const ss = remaining % 60
  return { label: hh > 0 ? `${hh}h ${String(mm).padStart(2, '0')}m` : `${mm}m ${String(ss).padStart(2, '0')}s`, urgent: remaining <= 3600 }
})
const urgentCount = computed(() => props.group.markets.filter(market => remainingSecondsForTimezone(market.airportData?.tz, coarseNow.value) <= 3600).length)
</script>

<template>
  <div class="text-right leading-none">
    <p class="font-mono text-lg font-bold tabular-nums text-slate-900">
      {{ cityTime }}
    </p>
    <p
      v-if="marketMatchesToday && midnight"
      class="mt-0.5 text-[11px] font-medium tabular-nums"
      :class="midnight!.urgent ? 'text-rose-700' : 'text-amber-700'"
    >
      <UIcon name="i-lucide-moon" class="-mt-0.5 mr-0.5 inline-block size-3" />minuit dans {{
        midnight!.label }}
    </p>
  </div>
  <div class="flex items-center gap-1.5">
    <UBadge
      v-if="marketMatchesToday && urgentCount > 0"
      color="warning"
      variant="subtle"
      class="shrink-0 rounded-sm"
    >
      ⏳ {{
        urgentCount }}
    </UBadge>
  </div>
</template>
