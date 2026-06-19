<script setup lang="ts">
const { filteredLinks, searchQuery, loading, error, totalAirports } = useWeatherLinks()

// ─── Filters ────────────────────────────────────────────────────────────────
const filterUnit = ref<'' | 'C' | 'F'>('')
const filterTrading = ref<'' | 'tradable' | 'ignored'>('')
const filterRegion = ref<'' | 'Asia' | 'Europe' | 'America' | 'Africa' | 'Pacific'>('')
const filterTradingHourMax = ref<number | ''>(24)
const filterDustHourMax = ref<number | ''>(24)
const filterHasWU = ref(false)
const filterHasWETHR = ref(false)
const filterHasMETAR = ref(false)
const filterHasNWS = ref(false)

const hasActiveFilters = computed(() =>
  filterUnit.value !== ''
  || filterTrading.value !== ''
  || filterRegion.value !== ''
  || (filterTradingHourMax.value !== '' && Number(filterTradingHourMax.value) < 24)
  || (filterDustHourMax.value !== '' && Number(filterDustHourMax.value) < 24)
  || filterHasWU.value
  || filterHasWETHR.value
  || filterHasMETAR.value
  || filterHasNWS.value
)

function resetFilters() {
  filterUnit.value = ''
  filterTrading.value = ''
  filterRegion.value = ''
  filterTradingHourMax.value = 24
  filterDustHourMax.value = 24
  filterHasWU.value = false
  filterHasWETHR.value = false
  filterHasMETAR.value = false
  filterHasNWS.value = false
}

function hasLink(airport: (typeof filteredLinks.value)[number], label: string) {
  return airport.links?.some(l => l.label.toUpperCase() === label.toUpperCase())
}

function regionFromTz(tz?: string | null) {
  if (!tz) return ''
  if (tz.startsWith('Asia') || tz.startsWith('Pacific/Auckland') || tz.startsWith('Pacific/Port') || tz.startsWith('Pacific/Guam')) return 'Asia'
  if (tz.startsWith('Europe') || tz.startsWith('Atlantic')) return 'Europe'
  if (tz.startsWith('America') || tz.startsWith('US/')) return 'America'
  if (tz.startsWith('Africa')) return 'Africa'
  if (tz.startsWith('Pacific')) return 'Pacific'
  return ''
}

const activeFilteredLinks = computed(() => {
  return filteredLinks.value.filter((airport) => {
    if (filterUnit.value && airport.airportData?.unit !== filterUnit.value) return false
    if (filterTrading.value === 'tradable' && airport.airportData?.ignoreForTrading) return false
    if (filterTrading.value === 'ignored' && !airport.airportData?.ignoreForTrading) return false
    if (filterRegion.value && regionFromTz(airport.tz) !== filterRegion.value) return false
    if (filterTradingHourMax.value !== '' && Number(filterTradingHourMax.value) < 24) {
      const h = airport.airportData?.tradingMinLocalHour
      if (h === null || h === undefined || h > Number(filterTradingHourMax.value)) return false
    }
    if (filterDustHourMax.value !== '' && Number(filterDustHourMax.value) < 24) {
      const h = airport.airportData?.dustMinLocalHour
      if (h === null || h === undefined || h > Number(filterDustHourMax.value)) return false
    }
    if (filterHasWU.value && !hasLink(airport, 'WU')) return false
    if (filterHasWETHR.value && !hasLink(airport, 'WETHR')) return false
    if (filterHasMETAR.value && !hasLink(airport, 'METAR')) return false
    if (filterHasNWS.value && !hasLink(airport, 'NWS')) return false
    return true
  })
})

// ─── Clock ───────────────────────────────────────────────────────────────────
const now = ref<Date>(new Date())
let clock: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  now.value = new Date()
  clock = setInterval(() => {
    now.value = new Date()
  }, 1000)
})

onBeforeUnmount(() => {
  if (clock) clearInterval(clock)
})

function getUtcOffsetMinutes(timeZone: string, date = new Date()) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })

  const parts = Object.fromEntries(dtf.formatToParts(date).map(p => [p.type, p.value]))
  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  )

  return Math.round((asUTC - date.getTime()) / 60000)
}

function offsetLabel(min: number) {
  const sign = min >= 0 ? '+' : '-'
  const abs = Math.abs(min)
  const h = Math.floor(abs / 60)
  const m = abs % 60
  return `UTC${sign}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function tzNowLabel(tz: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(now.value)
}

function timeLabel(hour?: number | null, minute?: number | null) {
  if (hour === null || hour === undefined) return '--:--'
  const m = minute ?? 0
  return `${String(hour).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function airportLocalNow(airport: (typeof filteredLinks.value)[number]) {
  const tz = airport.airportData?.tz || airport.tz
  if (!tz) return '--:--:--'
  return tzNowLabel(tz)
}

const groupedByTimezone = computed(() => {
  type AirportItem = (typeof filteredLinks.value)[number]
  const map = new Map<string, {
    key: string
    offset: number
    offsetText: string
    nowText: string
    tzNames: Set<string>
    airports: AirportItem[]
  }>()

  for (const airport of activeFilteredLinks.value) {
    const tz = airport.tz || 'Timezone inconnue'
    const offset = tz === 'Timezone inconnue' ? Number.POSITIVE_INFINITY : getUtcOffsetMinutes(tz, now.value)
    const key = Number.isFinite(offset) ? `offset:${offset}` : 'offset:unknown'

    if (!map.has(key)) {
      map.set(key, {
        key,
        offset,
        offsetText: Number.isFinite(offset) ? offsetLabel(offset) : 'UTC ??:??',
        nowText: tz === 'Timezone inconnue' ? '--:--:--' : tzNowLabel(tz),
        tzNames: new Set(),
        airports: []
      })
    }

    const group = map.get(key)!
    group.airports.push(airport)
    if (airport.tz) group.tzNames.add(airport.tz)
  }

  const groups = Array.from(map.values()).map((group) => {
    const sortedAirports = [...group.airports].sort((a, b) => {
      const aCity = (a.city || '').toLowerCase()
      const bCity = (b.city || '').toLowerCase()
      if (aCity !== bCity) return aCity.localeCompare(bCity)
      return a.code.localeCompare(b.code)
    })

    return {
      ...group,
      tzSummary: Array.from(group.tzNames).sort().join(' • '),
      airports: sortedAirports
    }
  })

  groups.sort((a, b) => {
    if (a.offset !== b.offset) return b.offset - a.offset
    return a.tzSummary.localeCompare(b.tzSummary)
  })

  return groups
})

// ─── Collapsible timezone groups ────────────────────────────────────────────
const collapsedTz = ref<Set<string>>(new Set())

function toggleTz(tz: string) {
  const next = new Set(collapsedTz.value)
  if (next.has(tz)) next.delete(tz)
  else next.add(tz)
  collapsedTz.value = next
}

function isTzCollapsed(tz: string) {
  return collapsedTz.value.has(tz)
}

const copyToClipboard = async (text: string) => {
  await navigator.clipboard.writeText(text)
  // TODO: Show toast notification
}
</script>

<template>
  <UDashboardPanel id="weather-links" :ui="{ body: 'lg:py-12' }">
    <template #header>
      <div class="space-y-1">
        <UDashboardNavbar
          title="Weather Links Wiki"
          :ui="{ title: 'text-white font-semibold tracking-wide' }"
        >
          <template #right>
            <div class="flex items-center gap-2 text-xs">
              <UButton to="/" color="neutral" variant="soft" size="xs" icon="i-lucide-arrow-left">Dashboard</UButton>
              <span class="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-slate-200">
                {{ filteredLinks.length }} / {{ totalAirports }} aéroports
              </span>
            </div>
          </template>
        </UDashboardNavbar>

        <div class="px-4 sm:px-6 space-y-2">
          <!-- Search + reset -->
          <div class="flex items-center gap-2">
            <UInput
              v-model="searchQuery"
              placeholder="Rechercher par code ICAO ou ville..."
              icon="i-lucide-search"
              color="neutral"
              variant="soft"
              class="flex-1 max-w-sm"
            />
            <button
              v-if="hasActiveFilters"
              class="rounded-full border border-rose-400/40 bg-rose-400/10 px-3 py-1.5 text-xs text-rose-200 hover:bg-rose-400/20 transition-colors"
              @click="resetFilters"
            >
              Réinitialiser filtres
            </button>
            <span class="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-400">
              {{ activeFilteredLinks.length }} résultats
            </span>
          </div>

          <!-- Filters row -->
          <div class="flex flex-wrap gap-2 text-xs">
            <!-- Unité -->
            <select v-model="filterUnit" class="h-7 rounded-md border border-white/15 bg-slate-900 px-2 text-slate-100 outline-none transition focus:border-primary-400/60 [&>option]:bg-slate-900">
              <option value="">Toutes unités</option>
              <option value="C">°C</option>
              <option value="F">°F</option>
            </select>

            <!-- Statut trading -->
            <select v-model="filterTrading" class="h-7 rounded-md border border-white/15 bg-slate-900 px-2 text-slate-100 outline-none transition focus:border-primary-400/60 [&>option]:bg-slate-900">
              <option value="">Tradable + Ignored</option>
              <option value="tradable">Tradable uniquement</option>
              <option value="ignored">Ignored uniquement</option>
            </select>

            <!-- Région -->
            <select v-model="filterRegion" class="h-7 rounded-md border border-white/15 bg-slate-900 px-2 text-slate-100 outline-none transition focus:border-primary-400/60 [&>option]:bg-slate-900">
              <option value="">Toutes régions</option>
              <option value="Asia">Asie / Pacifique</option>
              <option value="Europe">Europe</option>
              <option value="America">Amérique</option>
              <option value="Africa">Afrique</option>
              <option value="Pacific">Pacifique (îles)</option>
            </select>

            <!-- Heure trading max -->
            <label class="flex items-center gap-1.5 rounded-md border border-white/15 bg-white/5 px-2 h-7 text-slate-300">
              Trading ≤
              <input v-model.number="filterTradingHourMax" type="number" min="0" max="24" class="w-12 bg-transparent text-slate-100 outline-none text-center" />
              h
            </label>

            <!-- Heure dust max -->
            <label class="flex items-center gap-1.5 rounded-md border border-white/15 bg-white/5 px-2 h-7 text-slate-300">
              Dust ≤
              <input v-model.number="filterDustHourMax" type="number" min="0" max="24" class="w-12 bg-transparent text-slate-100 outline-none text-center" />
              h
            </label>

            <!-- Filtres liens -->
            <label class="flex cursor-pointer items-center gap-1.5 rounded-md border px-2 h-7 transition-colors" :class="filterHasWU ? 'border-sky-400/50 bg-sky-400/15 text-sky-200' : 'border-white/15 bg-white/5 text-slate-300 hover:bg-white/10'">
              <input v-model="filterHasWU" type="checkbox" class="sr-only" />
              WU
            </label>
            <label class="flex cursor-pointer items-center gap-1.5 rounded-md border px-2 h-7 transition-colors" :class="filterHasWETHR ? 'border-sky-400/50 bg-sky-400/15 text-sky-200' : 'border-white/15 bg-white/5 text-slate-300 hover:bg-white/10'">
              <input v-model="filterHasWETHR" type="checkbox" class="sr-only" />
              WETHR
            </label>
            <label class="flex cursor-pointer items-center gap-1.5 rounded-md border px-2 h-7 transition-colors" :class="filterHasMETAR ? 'border-sky-400/50 bg-sky-400/15 text-sky-200' : 'border-white/15 bg-white/5 text-slate-300 hover:bg-white/10'">
              <input v-model="filterHasMETAR" type="checkbox" class="sr-only" />
              METAR
            </label>
            <label class="flex cursor-pointer items-center gap-1.5 rounded-md border px-2 h-7 transition-colors" :class="filterHasNWS ? 'border-sky-400/50 bg-sky-400/15 text-sky-200' : 'border-white/15 bg-white/5 text-slate-300 hover:bg-white/10'">
              <input v-model="filterHasNWS" type="checkbox" class="sr-only" />
              NWS
            </label>
          </div>
        </div>
      </div>
    </template>

    <template #body>
      <div class="w-full">
        <!-- Loading state -->
        <div v-if="loading" class="space-y-4">
          <div v-for="n in 3" :key="n" class="h-16 bg-white/5 rounded-lg animate-pulse" />
        </div>

        <!-- Error state -->
        <UAlert
          v-else-if="error"
          color="error"
          icon="i-lucide-alert-circle"
          title="Erreur"
          :description="error"
          class="mb-4"
        />

        <!-- Empty state -->
        <UAlert
          v-else-if="filteredLinks.length === 0"
          color="warning"
          icon="i-lucide-info"
          title="Aucun lien trouvé"
          description="Les liens météo seront remplis à mesure que les bets dust seront détectés."
          class="mb-4"
        />

        <!-- Links grouped by timezone -->
        <div v-else class="space-y-3">
          <section
            v-for="group in groupedByTimezone"
            :key="group.key"
            class="rounded-xl border border-white/10 bg-white/5 overflow-hidden"
          >
            <!-- Header cliquable pour replier -->
            <button
              type="button"
              class="w-full flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-white/5 transition-colors text-left"
              @click="toggleTz(group.key)"
            >
              <div class="flex items-center gap-3">
                <UIcon
                  :name="isTzCollapsed(group.key) ? 'i-lucide-chevron-right' : 'i-lucide-chevron-down'"
                  class="size-4 shrink-0 text-slate-400"
                />
                <span class="text-sm font-semibold text-sky-200">Heure locale {{ group.nowText }}</span>
              </div>
              <div class="flex items-center gap-2 text-xs">
                <span class="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-slate-300">
                  {{ group.offsetText }}
                </span>
                <span class="rounded-full border border-sky-300/30 bg-sky-300/10 px-2 py-0.5 font-mono text-sky-100">
                  {{ group.nowText }}
                </span>
                <span class="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-slate-300">
                  {{ group.airports.length }} stations
                </span>
              </div>
            </button>

            <div class="px-4 pb-2 text-[11px] text-slate-400 border-t border-white/5" v-if="group.tzSummary">
              {{ group.tzSummary }}
            </div>

            <!-- Corps repliable -->
            <div v-if="!isTzCollapsed(group.key)" class="border-t border-white/10 p-3">
              <div class="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                <div
                  v-for="airport in group.airports"
                  :key="airport.code"
                  class="bg-white/5 border border-white/10 rounded-lg p-3 hover:bg-white/10 transition-colors"
                >
                  <!-- En-tête: code + ville + heure -->
                  <div class="flex items-start justify-between gap-2 mb-2">
                    <div class="min-w-0">
                      <div class="font-mono font-bold text-sm text-sky-300 leading-none">
                        {{ airport.code }}
                      </div>
                      <div v-if="airport.city" class="text-xs text-slate-300 mt-0.5 truncate">
                        {{ airport.city }}
                      </div>
                    </div>
                    <span class="rounded-full border border-sky-300/30 bg-sky-300/10 px-2 py-0.5 font-mono text-[11px] text-sky-100 shrink-0">
                      {{ airportLocalNow(airport) }}
                    </span>
                  </div>

                  <!-- Badges infos -->
                  <div class="flex flex-wrap gap-1 mb-2 text-[10px]">
                    <span class="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-slate-400">
                      T {{ timeLabel(airport.airportData?.tradingMinLocalHour, airport.airportData?.tradingMinLocalMinute) }}
                    </span>
                    <span class="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-slate-400">
                      D {{ timeLabel(airport.airportData?.dustMinLocalHour, airport.airportData?.dustMinLocalMinute) }}
                    </span>
                    <span class="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-slate-400">
                      {{ airport.airportData?.unit || '-' }}
                    </span>
                    <span
                      class="rounded border px-1.5 py-0.5"
                      :class="airport.airportData?.ignoreForTrading ? 'border-amber-400/30 bg-amber-400/10 text-amber-300' : 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'"
                    >
                      {{ airport.airportData?.ignoreForTrading ? 'Ignored' : 'OK' }}
                    </span>
                  </div>

                  <!-- Liens compacts inline -->
                  <div class="flex flex-wrap gap-1">
                    <a
                      v-for="link in airport.links"
                      :key="`${airport.code}-${link.label}`"
                      :href="link.url"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="inline-flex items-center gap-1 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-white/50 hover:text-white hover:border-white/30 hover:bg-white/10 transition-colors"
                    >
                      {{ link.label }}
                      <UIcon name="i-lucide-external-link" class="size-2.5 shrink-0" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
