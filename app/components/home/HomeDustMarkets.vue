<script setup lang="ts">
interface DustLevel {
  price?: number | string
  size?: number | string
}

type DustAsk = DustLevel
type DustBid = DustLevel

interface DustMarket {
  id?: string | number | null
  slug?: string | null
  city?: string | null
  airport?: string | null
  outcome?: string | null
  date?: string | null
  groupItemTitle?: string | null
  link?: string | null
  asks?: DustAsk[]
  bids?: DustBid[]
  spread?: number | string | null
  currentPrice?: number | string | null
  bestAsk?: number | string | null
  bestBid?: number | string | null
  displaySpread?: string | null
  localTime?: string | null
  peakLabel?: string | null
  airportData?: { tz?: string | null } | null
}

const props = withDefaults(defineProps<{
  markets?: DustMarket[]
  loading?: boolean
  lastUpdated?: string | null
  count?: number
  source?: string | null
}>(), {
  markets: () => [],
  loading: false,
  lastUpdated: null,
  count: 0,
  source: 'Ingest backend'
})

function formatCents(value?: number | string | null) {
  const n = Number(value ?? 0)
  if (!Number.isFinite(n)) return '—'
  const rounded = Math.round(n * 1000) / 10
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}¢`
}

function isYes(outcome?: string | null) {
  return String(outcome || '').trim().toLowerCase() === 'yes'
}

// Formate une date (ISO ou texte) en français lisible : "16 juin à 16:17"
function formatFrDate(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

// Horloge live (mise à jour chaque seconde, côté client uniquement)
// now reste null au SSR pour garantir un rendu identique à l'hydratation client
const now = ref<Date | null>(null)
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

// Extrait h/m/s pour un fuseau horaire donné
function tzParts(tz: string, date: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).formatToParts(date)

  const get = (t: string) => Number(parts.find(p => p.type === t)?.value || 0)
  let h = get('hour')
  if (h === 24) h = 0
  return { h, m: get('minute'), s: get('second') }
}

// Heure locale courante de la ville (HH:MM)
function cityTime(tz?: string | null, fallback?: string | null) {
  if (!tz || !now.value) return fallback || '—'
  const { h, m } = tzParts(tz, now.value)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// Temps restant avant minuit dans le fuseau de la ville
function timeToMidnight(tz?: string | null) {
  if (!tz || !now.value) return null
  const { h, m, s } = tzParts(tz, now.value)
  const remaining = 86400 - (h * 3600 + m * 60 + s)
  const hh = Math.floor(remaining / 3600)
  const mm = Math.floor((remaining % 3600) / 60)
  const ss = remaining % 60
  return {
    label: hh > 0 ? `${hh}h ${String(mm).padStart(2, '0')}m` : `${mm}m ${String(ss).padStart(2, '0')}s`,
    urgent: remaining <= 3600
  }
}

function formatSpread(value?: number | string | null) {
  const n = Number(value ?? 0)
  if (!Number.isFinite(n)) return '—'
  return `${(n * 100).toFixed(1)}¢`
}

function formatShares(value?: number | string | null) {
  const n = Number(value ?? 0)
  if (!Number.isFinite(n)) return '0'
  return Math.round(n).toLocaleString('fr-FR')
}

function formatUsd(price?: number | string | null, size?: number | string | null) {
  const value = Number(price ?? 0) * Number(size ?? 0)
  if (!Number.isFinite(value)) return '$0'
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`
  return `$${value < 10 ? value.toFixed(1) : Math.round(value)}`
}

// Extrait la température du seuil ("18°C", "26°C or higher") pour trier les markets
function thresholdValue(title?: string | null) {
  const match = String(title || '').match(/-?\d+(?:\.\d+)?/)
  return match ? Number(match[0]) : Number.POSITIVE_INFINITY
}

// Prépare les niveaux d'asks triés (meilleur prix d'abord) avec ratio de profondeur
const MAX_LEVELS = 3

interface BookLevel {
  price: number
  size: number
  depth: number
}

interface OrderBook {
  asks: BookLevel[]
  bids: BookLevel[]
}

// Construit le carnet d'ordres : max 3 asks (en haut, meilleur ask le plus bas)
// + max 3 bids (en bas, meilleur bid le plus haut), depth bars partagées.
function orderBook(market: DustMarket): OrderBook {
  const clean = (levels?: DustLevel[]) => (levels || [])
    .map(l => ({ price: Number(l.price ?? 0), size: Number(l.size ?? 0) }))
    .filter(l => Number.isFinite(l.price) && l.price > 0 && l.size > 0)

  // Asks : on garde les 3 meilleurs (prix les plus bas), affichés du + haut au + bas
  const asks = clean(market.asks)
    .sort((a, b) => a.price - b.price)
    .slice(0, MAX_LEVELS)
    .reverse()

  // Bids : on garde les 3 meilleurs (prix les plus hauts), affichés du + haut au + bas
  const bids = clean(market.bids)
    .sort((a, b) => b.price - a.price)
    .slice(0, MAX_LEVELS)

  const maxSize = [...asks, ...bids].reduce((m, l) => Math.max(m, l.size), 0) || 1
  const withDepth = (l: { price: number, size: number }) => ({
    ...l,
    depth: Math.max(6, Math.round((l.size / maxSize) * 100))
  })

  return { asks: asks.map(withDepth), bids: bids.map(withDepth) }
}

function dedupeMarkets(markets: DustMarket[] = []) {
  const unique = new Map<string, DustMarket>()

  for (const market of markets) {
    const key = [market.id ?? '', market.slug ?? '', market.airport ?? '', market.city ?? '', market.outcome ?? '', market.date ?? '', market.groupItemTitle ?? '']
      .filter(Boolean)
      .join('::')

    if (!unique.has(key)) {
      unique.set(key, market)
    }
  }

  return Array.from(unique.values())
}

interface CityGroup {
  city: string
  airport: string
  peakLabel: string | null
  localTime: string | null
  tz: string | null
  markets: DustMarket[]
}

const groups = computed<CityGroup[]>(() => {
  const cards = dedupeMarkets(props.markets || [])
  const map = new Map<string, CityGroup>()

  for (const market of cards) {
    const city = market.city || 'Ville inconnue'
    if (!map.has(city)) {
      map.set(city, {
        city,
        airport: market.airport || '',
        peakLabel: market.peakLabel || null,
        localTime: market.localTime || null,
        tz: market.airportData?.tz || null,
        markets: []
      })
    }
    map.get(city)!.markets.push(market)
  }

  const list = Array.from(map.values()).sort((a, b) => a.city.localeCompare(b.city))
  for (const group of list) {
    group.markets.sort((a, b) => thresholdValue(a.groupItemTitle) - thresholdValue(b.groupItemTitle))
  }
  return list
})

// Villes pliées (Set vide = toutes dépliées par défaut)
const collapsed = ref<Set<string>>(new Set())

function toggleCity(city: string) {
  const next = new Set(collapsed.value)
  if (next.has(city)) {
    next.delete(city)
  } else {
    next.add(city)
  }
  collapsed.value = next
}

function isCollapsed(city: string) {
  return collapsed.value.has(city)
}
</script>

<template>
  <UCard class="border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 shadow-xl shadow-slate-950/30">
    <template #header>
      <div class="flex flex-col gap-2 border-b border-white/10 pb-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p class="text-[10px] uppercase tracking-[0.35em] text-emerald-300/80">Dust feed</p>
          <h2 class="mt-1 text-xl font-semibold text-white">Markets sélectionnés</h2>
          <p class="mt-1 text-xs text-slate-300">Vue compacte des opportunités dust envoyées par le bot.</p>
        </div>

        <div class="flex flex-wrap gap-2 text-xs text-slate-200">
          <UBadge color="success" variant="subtle" class="rounded-full px-2.5 py-1">{{ count }} marchés</UBadge>
          <UBadge color="neutral" variant="subtle" class="rounded-full px-2.5 py-1">{{ source }}</UBadge>
          <UBadge v-if="lastUpdated" color="primary" variant="subtle" class="rounded-full px-2.5 py-1">Mis à jour le {{ formatFrDate(lastUpdated) }}</UBadge>
        </div>
      </div>
    </template>

    <div v-if="loading" class="flex items-center gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-4 text-emerald-100">
      <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin" />
      Chargement des markets dust…
    </div>

    <div v-else-if="!groups.length" class="rounded-2xl border border-dashed border-white/10 bg-white/5 p-10 text-center text-slate-300">
      <UIcon name="i-lucide-sparkles" class="mx-auto mb-3 size-8 text-emerald-300" />
      Aucun market dust n’est encore disponible. Le bot Discord devra en envoyer pour alimenter cette vue.
    </div>

    <div v-else class="grid grid-cols-1 items-start gap-3 lg:grid-cols-2 2xl:grid-cols-3">
      <section
        v-for="group in groups"
        :key="group.city"
        class="overflow-hidden rounded-2xl border border-white/10 bg-white/5"
      >
        <button
          type="button"
          class="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-white/5"
          @click="toggleCity(group.city)"
        >
          <div class="flex min-w-0 items-center gap-3">
            <UIcon
              :name="isCollapsed(group.city) ? 'i-lucide-chevron-right' : 'i-lucide-chevron-down'"
              class="size-4 shrink-0 text-slate-400"
            />
            <div class="min-w-0">
              <h3 class="truncate text-sm font-semibold text-white">
                {{ group.city }}
                <span v-if="group.airport" class="ml-1 text-[11px] font-normal text-slate-400">{{ group.airport }}</span>
              </h3>
              <p v-if="group.peakLabel" class="truncate text-[11px] text-slate-400">
                Peak {{ group.peakLabel }}
              </p>
            </div>
          </div>
          <div class="flex shrink-0 items-center gap-3">
            <div class="text-right leading-none">
              <p class="font-mono text-lg font-bold tabular-nums text-white">{{ cityTime(group.tz, group.localTime) }}</p>
              <p
                v-if="timeToMidnight(group.tz)"
                class="mt-0.5 text-[11px] font-medium tabular-nums"
                :class="timeToMidnight(group.tz)!.urgent ? 'text-rose-300' : 'text-amber-300/80'"
              >
                <UIcon name="i-lucide-moon" class="-mt-0.5 mr-0.5 inline-block size-3" />minuit dans {{ timeToMidnight(group.tz)!.label }}
              </p>
            </div>
            <UBadge color="neutral" variant="subtle" class="shrink-0 rounded-full">{{ group.markets.length }}</UBadge>
          </div>
        </button>

        <div v-if="!isCollapsed(group.city)" class="space-y-2 border-t border-white/10 p-3">
          <article
            v-for="market in group.markets"
            :key="market.id || market.slug || `${market.city}-${market.groupItemTitle}-${market.outcome}`"
            class="rounded-xl border p-3 transition"
            :class="isYes(market.outcome)
              ? 'border-emerald-400/30 bg-emerald-400/5 hover:border-emerald-400/50'
              : 'border-rose-400/30 bg-rose-400/5 hover:border-rose-400/50'"
          >
            <div class="flex items-center justify-between gap-3">
              <div class="flex min-w-0 items-center gap-2">
                <span
                  class="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                  :class="isYes(market.outcome)
                    ? 'bg-emerald-400/15 text-emerald-300'
                    : 'bg-rose-400/15 text-rose-300'"
                >{{ market.outcome || '—' }}</span>
                <h4 class="truncate text-sm font-semibold text-white">{{ market.groupItemTitle || 'Seuil' }}</h4>
              </div>

              <div class="flex shrink-0 items-center gap-1.5 text-xs">
                <span
                  class="rounded-full px-2 py-0.5 font-semibold"
                  :class="isYes(market.outcome)
                    ? 'bg-emerald-400/15 text-emerald-300'
                    : 'bg-rose-400/15 text-rose-300'"
                >{{ formatCents(market.bestAsk) }}</span>
                <a
                  v-if="market.link"
                  :href="market.link"
                  target="_blank"
                  rel="noreferrer"
                  class="text-sky-300 hover:text-white"
                >↗</a>
              </div>
            </div>

            <!-- Order book : asks (rouge) en haut, séparateur, bids (vert) en bas -->
            <div class="mt-2 overflow-hidden rounded-md">
              <!-- Asks (max 3) : meilleur ask juste au-dessus du séparateur -->
              <template v-if="orderBook(market).asks.length">
                <div
                  v-for="(level, i) in orderBook(market).asks"
                  :key="`ask-${i}`"
                  class="relative flex items-center px-2 py-1 text-[11px] tabular-nums"
                >
                  <span
                    class="absolute inset-y-0 right-0 bg-rose-400/15"
                    :style="{ width: `${level.depth}%` }"
                  />
                  <span class="relative w-[28%] font-semibold text-rose-300">{{ formatCents(level.price) }}</span>
                  <span class="relative w-[36%] text-right text-slate-300">{{ formatShares(level.size) }}</span>
                  <span class="relative w-[36%] text-right text-slate-400">{{ formatUsd(level.price, level.size) }}</span>
                </div>
              </template>
              <div v-else class="px-2 py-1 text-[11px] italic text-slate-500">Pas d'asks</div>

              <!-- Séparateur bids / asks -->
              <div class="my-0.5 flex items-center justify-between border-y border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-slate-500">
                <span>Bids</span>
                <span v-if="market.displaySpread || market.spread">Spread {{ market.displaySpread || formatSpread(market.spread) }}</span>
                <span>Asks</span>
              </div>

              <!-- Bids (max 3) : meilleur bid juste sous le séparateur -->
              <template v-if="orderBook(market).bids.length">
                <div
                  v-for="(level, i) in orderBook(market).bids"
                  :key="`bid-${i}`"
                  class="relative flex items-center px-2 py-1 text-[11px] tabular-nums"
                >
                  <span
                    class="absolute inset-y-0 right-0 bg-emerald-400/15"
                    :style="{ width: `${level.depth}%` }"
                  />
                  <span class="relative w-[28%] font-semibold text-emerald-300">{{ formatCents(level.price) }}</span>
                  <span class="relative w-[36%] text-right text-slate-300">{{ formatShares(level.size) }}</span>
                  <span class="relative w-[36%] text-right text-slate-400">{{ formatUsd(level.price, level.size) }}</span>
                </div>
              </template>
              <div v-else class="px-2 py-1 text-[11px] italic text-slate-500">No bids</div>
            </div>
          </article>
        </div>
      </section>
    </div>
  </UCard>
</template>
