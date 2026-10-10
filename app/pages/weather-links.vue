<script setup lang="ts">
const { dashboardLayout } = useDashboardLayout()
// Les deux présentations partagent les filtres, les calculs et le flux de données.

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
// Horloge "grossière" (30s) pour le regroupement par fuseau : l'offset UTC ne
// change jamais à la seconde, inutile de recalculer tous les aéroports chaque tick
const coarseNow = ref<Date>(now.value)
let clock: ReturnType<typeof setInterval> | null = null
let coarseClock: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  now.value = new Date()
  coarseNow.value = now.value
  clock = setInterval(() => {
    now.value = new Date()
  }, 1000)
  coarseClock = setInterval(() => {
    coarseNow.value = new Date()
  }, 30_000)
})

onBeforeUnmount(() => {
  if (clock) clearInterval(clock)
  if (coarseClock) clearInterval(coarseClock)
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

// Texte d'heure courante par groupe, évalué au rendu (peu de groupes vs. beaucoup d'aéroports)
function groupNowText(group: { tzNames: Set<string> }) {
  const tz = group.tzNames.values().next().value
  return tz ? tzNowLabel(tz) : '--:--:--'
}

const groupedByTimezone = computed(() => {
  type AirportItem = (typeof filteredLinks.value)[number]
  const map = new Map<string, {
    key: string
    offset: number
    offsetText: string
    tzNames: Set<string>
    airports: AirportItem[]
  }>()

  for (const airport of activeFilteredLinks.value) {
    const tz = airport.tz || 'Timezone inconnue'
    const offset = tz === 'Timezone inconnue' ? Number.POSITIVE_INFINITY : getUtcOffsetMinutes(tz, coarseNow.value)
    const key = Number.isFinite(offset) ? `offset:${offset}` : 'offset:unknown'

    if (!map.has(key)) {
      map.set(key, {
        key,
        offset,
        offsetText: Number.isFinite(offset) ? offsetLabel(offset) : 'UTC ??:??',
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
</script>

<template>
  <template v-if="dashboardLayout === 'weather'">
    <main class="observatory">
      <header class="workspace-nav">
        <NuxtLink to="/" class="wordmark">
          <UIcon name="i-lucide-cloud-sun" class="size-6" />
          <span>DUST<span class="wordmark-sub">OBSERVATOIRE MÉTÉO</span></span>
        </NuxtLink>
        <nav class="workspace-tabs" aria-label="Navigation principale">
          <NuxtLink to="/">Tableau de veille</NuxtLink>
          <NuxtLink to="/weather-links" aria-current="page">Stations & sources</NuxtLink>
        </nav>
        <span class="workspace-version">RÉPERTOIRE</span>
      </header>
      <div class="workspace-content station-directory">
        <div class="page-heading">
          <div>
            <p class="eyebrow">
              RÉSEAU D'OBSERVATION
            </p>
            <h1>Stations & sources</h1>
            <p class="page-description">
              {{ totalAirports }} stations référencées · classées par heure locale
            </p>
          </div>
          <UInput
            v-model="searchQuery"
            placeholder="Ville ou code ICAO"
            icon="i-lucide-search"
            aria-label="Rechercher une station"
            class="directory-search"
          />
        </div>
        <div class="directory-filters">
          <label><span>Unité</span><select v-model="filterUnit"><option value="">Toutes</option><option value="C">°C</option><option value="F">°F</option></select></label>
          <label><span>Trading</span><select v-model="filterTrading"><option value="">Tous statuts</option><option value="tradable">Autorisé</option><option value="ignored">Ignoré</option></select></label>
          <label><span>Région</span><select v-model="filterRegion"><option value="">Toutes régions</option><option value="Asia">Asie / Pacifique</option><option value="Europe">Europe</option><option value="America">Amérique</option><option value="Africa">Afrique</option><option value="Pacific">Pacifique (îles)</option></select></label>
          <label><span>Trading ≤</span><input
            v-model.number="filterTradingHourMax"
            type="number"
            min="0"
            max="24"
            aria-label="Heure trading maximale"
          > h</label>
          <label><span>Dust ≤</span><input
            v-model.number="filterDustHourMax"
            type="number"
            min="0"
            max="24"
            aria-label="Heure dust maximale"
          > h</label>
          <fieldset class="source-filters">
            <legend>Sources disponibles</legend>
            <label><input v-model="filterHasWU" type="checkbox">WU</label>
            <label><input v-model="filterHasWETHR" type="checkbox">WETHR</label>
            <label><input v-model="filterHasMETAR" type="checkbox">METAR</label>
            <label><input v-model="filterHasNWS" type="checkbox">NWS</label>
          </fieldset>
        </div>
        <div class="directory-results">
          <span>{{ activeFilteredLinks.length }} stations affichées</span><button v-if="hasActiveFilters" type="button" @click="resetFilters">
            Réinitialiser les filtres
          </button><span class="directory-key">T : début trading · D : début dust · heures locales</span>
        </div>
        <div v-if="loading" class="directory-loading">
          Chargement des stations…
        </div>
        <UAlert
          v-else-if="error"
          color="error"
          title="Connexion indisponible"
          :description="error"
        />
        <div v-else-if="!activeFilteredLinks.length" class="directory-loading">
          Aucune station ne correspond à cette recherche.
        </div>
        <div v-else class="timezone-directory">
          <section v-for="group in groupedByTimezone" :key="group.key" class="timezone-group">
            <button
              type="button"
              class="timezone-heading"
              :aria-expanded="!isTzCollapsed(group.key)"
              @click="toggleTz(group.key)"
            >
              <UIcon :name="isTzCollapsed(group.key) ? 'i-lucide-chevron-right' : 'i-lucide-chevron-down'" class="size-4" />
              <strong>{{ group.offsetText }}</strong><span class="timezone-clock">{{ groupNowText(group) }}</span><span>{{ group.airports.length }} stations</span><span class="timezone-names">{{ group.tzSummary }}</span>
            </button>
            <div v-if="!isTzCollapsed(group.key)" class="directory-table-wrap">
              <table class="directory-table">
                <thead>
                  <tr>
                    <th scope="col">
                      Station / ville
                    </th><th scope="col">
                      Heure locale
                    </th><th scope="col">
                      T / D
                    </th><th scope="col">
                      Unité
                    </th><th scope="col">
                      Trading
                    </th><th scope="col">
                      Sources météo
                    </th><th scope="col">
                      Résolution Polymarket
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="airport in group.airports" :key="airport.code">
                    <th scope="row">
                      <span class="station-code">{{ airport.code }}</span><span class="directory-city">{{ airport.city || 'Ville non renseignée' }}</span>
                    </th>
                    <td class="directory-time">
                      {{ airportLocalNow(airport) }}
                    </td>
                    <td class="directory-time">
                      <div>T {{ timeLabel(airport.airportData?.tradingMinLocalHour, airport.airportData?.tradingMinLocalMinute) }}</div><div class="text-slate-500">
                        D {{ timeLabel(airport.airportData?.dustMinLocalHour, airport.airportData?.dustMinLocalMinute) }}
                      </div>
                    </td>
                    <td>{{ airport.airportData?.unit ? `°${airport.airportData.unit}` : '—' }}</td>
                    <td :class="airport.airportData?.ignoreForTrading ? 'trading-ignored' : 'trading-allowed'">
                      {{ airport.airportData?.ignoreForTrading ? 'Ignoré' : 'Autorisé' }}
                    </td>
                    <td>
                      <div class="directory-links">
                        <a
                          v-for="link in airport.links"
                          :key="`${airport.code}-${link.label}`"
                          :href="link.url"
                          target="_blank"
                          rel="noopener noreferrer"
                        >{{ link.label }}<UIcon name="i-lucide-arrow-up-right" class="size-3" /></a><span v-if="!airport.links?.length">—</span>
                      </div>
                    </td>
                    <td>
                      <div v-if="airport.resolutionSources?.length" class="resolution-links">
                        <a
                          v-for="source in airport.resolutionSources"
                          :key="source.eventSlug || `${source.date}-${source.resolutionSource}`"
                          :href="source.resolutionSource || undefined"
                          target="_blank"
                          rel="noopener noreferrer"
                          :class="{ 'resolution-warning': source.matchesAirportCode === false }"
                        ><span>{{ source.date || 'Date inconnue' }} · {{ source.resolutionProvider || 'Source inconnue' }}</span><strong>{{ source.resolutionAirportCode || '?' }}</strong><UIcon :name="source.matchesAirportCode === false ? 'i-lucide-triangle-alert' : 'i-lucide-arrow-up-right'" class="size-3" /></a>
                      </div><span v-else>—</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </main>
  </template>
  <template v-else-if="dashboardLayout === 'dossiers'">
    <main class="observatory">
      <DossierNavigation />
      <div class="workspace-content station-directory">
        <div class="page-heading">
          <div>
            <p class="eyebrow">
              DOSSIERS / RÉSEAU D’OBSERVATION
            </p><h1>Stations & sources</h1><p class="page-description">
              {{ totalAirports }} stations référencées · tous les horaires sont locaux
            </p>
          </div>
          <UInput
            v-model="searchQuery"
            placeholder="Ville ou code ICAO"
            icon="i-lucide-search"
            aria-label="Rechercher une station"
            class="directory-search"
          />
        </div>
        <div class="directory-filters">
          <label><span>Unité</span><select v-model="filterUnit"><option value="">Toutes</option><option value="C">°C</option><option value="F">°F</option></select></label>
          <label><span>Trading</span><select v-model="filterTrading"><option value="">Tous statuts</option><option value="tradable">Autorisé</option><option value="ignored">Ignoré</option></select></label>
          <label><span>Région</span><select v-model="filterRegion"><option value="">Toutes régions</option><option value="Asia">Asie / Pacifique</option><option value="Europe">Europe</option><option value="America">Amérique</option><option value="Africa">Afrique</option><option value="Pacific">Pacifique (îles)</option></select></label>
          <label><span>Trading ≤</span><input
            v-model.number="filterTradingHourMax"
            type="number"
            min="0"
            max="24"
            aria-label="Heure trading maximale"
          > h</label>
          <label><span>Dust ≤</span><input
            v-model.number="filterDustHourMax"
            type="number"
            min="0"
            max="24"
            aria-label="Heure dust maximale"
          > h</label>
          <fieldset class="source-filters">
            <legend>Sources disponibles</legend><label><input v-model="filterHasWU" type="checkbox">WU</label><label><input v-model="filterHasWETHR" type="checkbox">WETHR</label><label><input v-model="filterHasMETAR" type="checkbox">METAR</label><label><input v-model="filterHasNWS" type="checkbox">NWS</label>
          </fieldset>
        </div>
        <div class="directory-results">
          <span>{{ activeFilteredLinks.length }} stations affichées</span><button v-if="hasActiveFilters" type="button" @click="resetFilters">
            Réinitialiser les filtres
          </button><span class="directory-key">Trading : début de prise de position · Dust : début dust</span>
        </div>
        <div v-if="loading" class="directory-loading">
          Chargement des stations…
        </div>
        <UAlert
          v-else-if="error"
          color="error"
          title="Connexion indisponible"
          :description="error"
        />
        <div v-else-if="!activeFilteredLinks.length" class="directory-loading">
          Aucune station ne correspond à cette recherche.
        </div>
        <div v-else class="timezone-directory">
          <nav class="timezone-index" aria-label="Accéder à un fuseau">
            <p class="index-label">
              PAR FUSEAU HORAIRE
            </p>
            <a v-for="group in groupedByTimezone" :key="group.key" :href="`#timezone-${group.key.replaceAll(':', '-')}`"><strong>{{ group.offsetText }}</strong><span>{{ group.airports.length }} stations · {{ groupNowText(group) }}</span></a>
          </nav>
          <section
            v-for="group in groupedByTimezone"
            :id="`timezone-${group.key.replaceAll(':', '-')}`"
            :key="group.key"
            class="timezone-group"
          >
            <button
              type="button"
              class="timezone-heading"
              :aria-expanded="!isTzCollapsed(group.key)"
              @click="toggleTz(group.key)"
            >
              <UIcon :name="isTzCollapsed(group.key) ? 'i-lucide-chevron-right' : 'i-lucide-chevron-down'" class="size-4" /><strong>{{ group.offsetText }}</strong><span class="timezone-clock">{{ groupNowText(group) }}</span><span>{{ group.airports.length }} stations</span><span class="timezone-names">{{ group.tzSummary }}</span>
            </button>
            <div v-if="!isTzCollapsed(group.key)" class="directory-records">
              <article v-for="airport in group.airports" :key="airport.code" class="station-record">
                <header class="record-identity">
                  <span class="station-code">{{ airport.code }}</span><h2>{{ airport.city || 'Ville non renseignée' }}</h2><span class="record-timezone">{{ airport.airportData?.tz || airport.tz || 'Fuseau non renseigné' }}</span><span class="record-clock">{{ airportLocalNow(airport) }}<small>heure locale</small></span>
                </header>
                <div class="record-content">
                  <dl class="record-metadata">
                    <div><dt>Début trading</dt><dd>{{ timeLabel(airport.airportData?.tradingMinLocalHour, airport.airportData?.tradingMinLocalMinute) }}</dd></div><div><dt>Début dust</dt><dd>{{ timeLabel(airport.airportData?.dustMinLocalHour, airport.airportData?.dustMinLocalMinute) }}</dd></div><div><dt>Unité</dt><dd>{{ airport.airportData?.unit ? `°${airport.airportData.unit}` : '—' }}</dd></div><div>
                      <dt>Trading</dt><dd :class="airport.airportData?.ignoreForTrading ? 'trading-ignored' : 'trading-allowed'">
                        {{ airport.airportData?.ignoreForTrading ? 'Ignoré' : 'Autorisé' }}
                      </dd>
                    </div>
                  </dl>
                  <div class="record-reference-columns">
                    <section class="record-weather-links">
                      <h3>Sources météo</h3><div class="directory-links">
                        <a
                          v-for="link in airport.links"
                          :key="`${airport.code}-${link.label}`"
                          :href="link.url"
                          target="_blank"
                          rel="noopener noreferrer"
                        >{{ link.label }}<UIcon name="i-lucide-arrow-up-right" class="size-3" /></a><span v-if="!airport.links?.length">Aucune source référencée</span>
                      </div>
                    </section>
                    <section class="record-resolution">
                      <h3>Résolution Polymarket</h3><div v-if="airport.resolutionSources?.length" class="resolution-links">
                        <a
                          v-for="source in airport.resolutionSources"
                          :key="source.eventSlug || `${source.date}-${source.resolutionSource}`"
                          :href="source.resolutionSource || undefined"
                          target="_blank"
                          rel="noopener noreferrer"
                          :class="{ 'resolution-warning': source.matchesAirportCode === false }"
                        ><span>{{ source.date || 'Date inconnue' }} · {{ source.resolutionProvider || 'Source inconnue' }}</span><strong>{{ source.resolutionAirportCode || '?' }}</strong><UIcon :name="source.matchesAirportCode === false ? 'i-lucide-triangle-alert' : 'i-lucide-arrow-up-right'" class="size-3" /></a>
                      </div><p v-else>
                        Aucune résolution référencée
                      </p>
                    </section>
                  </div>
                </div>
              </article>
            </div>
          </section>
        </div>
      </div>
    </main>
  </template>
</template>
