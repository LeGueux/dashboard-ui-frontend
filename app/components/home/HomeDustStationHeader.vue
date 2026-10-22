<script setup lang="ts">
import type { CityGroup } from '~/types/dust'
import type { MarketWeatherSnapshot } from '~/utils/marketWeather'
import { getGroupLinks, getQuickLinksForGroup, getResolutionBadgeForGroup } from '~/utils/dustLinks'

const props = defineProps<{ group: CityGroup, weather: MarketWeatherSnapshot | null, peakLabel: string | null, collapsed: boolean, marketMatchesToday: boolean }>()
const emit = defineEmits<{ toggle: [] }>()
const { dashboardLayout } = useDashboardLayout()
const { buildLinkMenuItems } = useDustMarketLinks()
const links = computed(() => getGroupLinks(props.group))
const quickLinks = computed(() => getQuickLinksForGroup(props.group))
const menuItems = computed(() => buildLinkMenuItems(links.value))
const resolutionBadge = computed(() => getResolutionBadgeForGroup(props.group))
</script>

<template>
  <div class="station-header">
    <span v-if="dashboardLayout === 'dossiers'" class="dossier-label">DOSSIER / {{ group.airport || group.city }}</span>
    <button
      type="button"
      class="flex w-full min-w-0 flex-1 items-center justify-between gap-2.5 rounded-md text-left transition hover:bg-slate-50"
      :aria-expanded="!collapsed"
      @click="emit('toggle')"
    >
      <div class="flex min-w-0 items-center gap-3">
        <UIcon
          :name="collapsed ? 'i-lucide-chevron-right' : 'i-lucide-chevron-down'"
          class="size-4 shrink-0 text-slate-500"
        />
        <div class="min-w-0">
          <h3 class="station-name">
            {{ group.city }}
            <span v-if="group.airport" class="ml-1 text-[11px] font-normal text-slate-500">{{ group.airport
            }}</span>
            <span
              v-if="resolutionBadge"
              :title="`Source de resolution : ${resolutionBadge!.label}`"
              class="ml-1.5 inline-flex select-none items-center rounded px-1.5 py-0.5 align-middle text-[9px] font-bold tracking-wide"
              :class="resolutionBadge!.matchesAirportCode === false
                ? 'border border-rose-400/40 bg-rose-400/15 text-rose-700'
                : 'border border-violet-400/40 bg-violet-400/15 text-violet-700'"
            >
              {{ resolutionBadge!.label }}
            </span>
          </h3>
          <div class="flex flex-wrap items-center gap-x-1.5 gap-y-1">
            <p v-if="peakLabel" class="break-words text-[11px] text-slate-500">
              Pic {{ peakLabel }}
            </p>
            <span v-if="group.dateLabel" class="inline-flex items-center rounded-sm bg-slate-50 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
              {{ group.dateLabel }}
            </span>
          </div>
        </div>
      </div>
      <div class="flex shrink-0 items-center gap-3">
        <HomeDustStationClock :group="group" :market-matches-today="marketMatchesToday" />
      </div>
    </button>

    <div class="flex w-full items-center justify-between gap-2 pl-7">
      <div class="flex min-w-0 flex-wrap items-center gap-1.5">
        <UButton
          v-for="quickLink in quickLinks"
          :key="`${group.city}-quick-${quickLink.label}`"
          color="primary"
          variant="link"
          size="xs"
          :to="quickLink.url"
          target="_blank"
          rel="noopener noreferrer"
          :title="`Ouvrir ${quickLink.label}`"
          class="h-6 px-2"
        >
          {{ quickLink.label }}
        </UButton>
      </div>

      <UDropdownMenu
        v-if="links.length"
        :items="menuItems"
        :content="{ align: 'end', side: 'bottom', collisionPadding: 12 }"
        :ui="{ content: 'w-72' }"
      >
        <UButton
          color="neutral"
          variant="soft"
          size="xs"
          icon="i-lucide-link-2"
          class="h-6 px-2"
        />
      </UDropdownMenu>
    </div>
    <HomeDustCurrentWeather
      v-if="dashboardLayout === 'dossiers' && weather && !weather.disabled"
      :weather="weather"
      :time-zone="group.tz"
    />
    <span v-if="dashboardLayout === 'dossiers' && group.tz" class="dossier-timezone">{{ group.tz }}</span>
  </div>
</template>
