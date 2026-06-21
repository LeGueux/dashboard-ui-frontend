<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

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
  links?: MarketLink[] | null
  betmoardLinks?: string | null
  airportLinks?: string | null
  airportData?: { tz?: string | null; ignoreForTrading?: boolean | null } | null
}

interface MarketLink {
  label: string
  url: string
  source?: string
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

const toast = useToast()

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

function formatBetDateLabel(value?: string | null) {
  if (!value) return null

  const raw = String(value).trim()
  if (!raw) return null

  const parsed = new Date(raw)
  if (!Number.isNaN(parsed.getTime())) {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit'
    }).format(parsed)
  }

  const fallback = raw.replace(/\s+/g, ' ').trim()
  return fallback || null
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

  if (Number.isInteger(n)) {
    return n.toLocaleString('fr-FR')
  }

  return n.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

function formatUsd(price?: number | string | null, size?: number | string | null) {
  const value = Number(price ?? 0) * Number(size ?? 0)
  if (!Number.isFinite(value)) return '$0.00'

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)
}

function netYieldAfterFeesValue(price?: number | string | null, size?: number | string | null) {
  const p = Number(price ?? 0)
  const shares = Number(size ?? 0)

  if (!Number.isFinite(p) || !Number.isFinite(shares) || shares <= 0 || p <= 0 || p >= 1) {
    return null
  }

  const feeRate = 0.05
  return shares * (1 - p) - shares * feeRate * p * (1 - p)
}

function formatNetYieldAfterFees(price?: number | string | null, size?: number | string | null) {
  const netYield = netYieldAfterFeesValue(price, size)
  if (netYield === null) return ''

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })

  return `${netYield >= 0 ? '+' : '-'}${formatter.format(Math.abs(netYield))}`
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
  dateLabel: string | null
  tz: string | null
  minRemainingSeconds: number
  urgentCount: number
  markets: DustMarket[]
}

type ViewMode = 'all' | 'quick' | 'conviction'

const viewMode = ref<ViewMode>('all')

const cInput = ref('')
const fInput = ref('')

const fFromC = computed(() => {
  const raw = String(cInput.value ?? '').trim()
  if (!raw) return ''
  const c = Number(raw)
  if (!Number.isFinite(c)) return ''
  return ((c * 9) / 5 + 32).toFixed(1)
})

const cFromF = computed(() => {
  const raw = String(fInput.value ?? '').trim()
  if (!raw) return ''
  const f = Number(raw)
  if (!Number.isFinite(f)) return ''
  return (((f - 32) * 5) / 9).toFixed(1)
})

function remainingSecondsForTimezone(tz?: string | null) {
  if (!tz || !now.value) return Number.POSITIVE_INFINITY
  const { h, m, s } = tzParts(tz, now.value)
  return 86400 - (h * 3600 + m * 60 + s)
}

function spreadCents(market: DustMarket) {
  if (market.displaySpread) {
    const parsed = Number.parseFloat(String(market.displaySpread).replace(',', '.'))
    if (Number.isFinite(parsed)) return parsed
  }

  const spreadValue = Number(market.spread ?? 0)
  if (Number.isFinite(spreadValue) && spreadValue > 0) return spreadValue * 100
  return Number.POSITIVE_INFINITY
}

function bestAskCents(market: DustMarket) {
  const ask = Number(market.bestAsk ?? market.asks?.[0]?.price ?? Number.POSITIVE_INFINITY)
  return Number.isFinite(ask) ? ask * 100 : Number.POSITIVE_INFINITY
}

function askDepthTop3(market: DustMarket) {
  return (market.asks || [])
    .slice(0, 3)
    .reduce((acc, level) => acc + Number(level.size ?? 0), 0)
}

function marketGrade(market: DustMarket) {
  const remaining = remainingSecondsForTimezone(market.airportData?.tz)
  const ask = bestAskCents(market)
  const depth = askDepthTop3(market)

  if (remaining <= 2 * 3600 && ask <= 99.5 && depth >= 80) return { grade: 'A', emoji: '🟢', tone: 'text-emerald-200 bg-emerald-400/15' }
  if (remaining <= 4 * 3600 && ask <= 99.8 && depth >= 30) return { grade: 'B', emoji: '🟠', tone: 'text-amber-200 bg-amber-400/15' }
  return { grade: 'C', emoji: '🔴', tone: 'text-rose-200 bg-rose-400/15' }
}

function isQuickSetup(market: DustMarket) {
  const remaining = remainingSecondsForTimezone(market.airportData?.tz)
  return remaining <= 3 * 3600 || bestAskCents(market) <= 99.5
}

function isHighConviction(market: DustMarket) {
  return marketGrade(market).grade === 'A'
}

function marketSort(a: DustMarket, b: DustMarket) {
  const yesA = isYes(a.outcome) ? 0 : 1
  const yesB = isYes(b.outcome) ? 0 : 1
  if (yesA !== yesB) return yesA - yesB

  const remainingA = remainingSecondsForTimezone(a.airportData?.tz)
  const remainingB = remainingSecondsForTimezone(b.airportData?.tz)
  if (remainingA !== remainingB) return remainingA - remainingB

  const askA = bestAskCents(a)
  const askB = bestAskCents(b)
  if (askA !== askB) return askA - askB

  return thresholdValue(a.groupItemTitle) - thresholdValue(b.groupItemTitle)
}

const groups = computed<CityGroup[]>(() => {
  const cards = dedupeMarkets(props.markets || [])
  const filteredCards = cards.filter((market) => {
    if (viewMode.value === 'quick') return isQuickSetup(market)
    if (viewMode.value === 'conviction') return isHighConviction(market)
    return true
  })
  const map = new Map<string, CityGroup>()

  for (const market of filteredCards) {
    const city = market.city || 'Ville inconnue'
    if (!map.has(city)) {
      map.set(city, {
        city,
        airport: market.airport || '',
        peakLabel: market.peakLabel || null,
        localTime: market.localTime || null,
        dateLabel: formatBetDateLabel(market.date),
        tz: market.airportData?.tz || null,
        minRemainingSeconds: Number.POSITIVE_INFINITY,
        urgentCount: 0,
        markets: []
      })
    }

    const group = map.get(city)!
    group.markets.push(market)

    if (!group.dateLabel && market.date) {
      group.dateLabel = formatBetDateLabel(market.date)
    }

    const remaining = remainingSecondsForTimezone(market.airportData?.tz)
    if (remaining < group.minRemainingSeconds) group.minRemainingSeconds = remaining
    if (remaining <= 3600) group.urgentCount += 1
  }

  const list = Array.from(map.values()).sort((a, b) => {
    if (a.minRemainingSeconds !== b.minRemainingSeconds) return a.minRemainingSeconds - b.minRemainingSeconds

    const aBest = Math.min(...a.markets.map(bestAskCents))
    const bBest = Math.min(...b.markets.map(bestAskCents))
    if (aBest !== bBest) return aBest - bBest

    return a.city.localeCompare(b.city)
  })

  for (const group of list) {
    group.markets.sort(marketSort)
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

function parseMarkdownLinks(raw: string, source: MarketLink['source']): MarketLink[] {
  const links: MarketLink[] = []
  const regex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g
  let match: RegExpExecArray | null = regex.exec(raw)

  while (match) {
    const label = match[1]
    const url = match[2]

    if (label && url) {
      links.push({
        label,
        url,
        source
      })
    }

    match = regex.exec(raw)
  }

  return links
}

function getMarketLinks(market: DustMarket): MarketLink[] {
  const marketUrl = typeof market.link === 'string' && market.link.trim() ? market.link.trim() : ''

  if (Array.isArray(market.links) && market.links.length > 0) {
    const baseLinks: MarketLink[] = marketUrl
      ? [{ label: 'POLYMARKET', url: marketUrl, source: 'polymarket' }]
      : []

    const sanitized = market.links
      .filter(link => !!link?.label && !!link?.url)
      .map(link => ({
        label: link.label,
        url: link.url,
        source: link.source || 'airport'
      }))

    const uniqueStructured = new Map<string, MarketLink>()
    for (const link of [...baseLinks, ...sanitized]) {
      if (!uniqueStructured.has(link.url)) {
        uniqueStructured.set(link.url, link)
      }
    }

    return Array.from(uniqueStructured.values())
  }

  const all = [
    ...(marketUrl ? [{ label: 'POLYMARKET', url: marketUrl, source: 'polymarket' as const }] : []),
    ...parseMarkdownLinks(market.betmoardLinks || '', 'betmoar'),
    ...parseMarkdownLinks(market.airportLinks || '', 'airport')
  ]

  const unique = new Map<string, MarketLink>()
  for (const link of all) {
    if (!unique.has(link.url)) {
      unique.set(link.url, link)
    }
  }

  return Array.from(unique.values())
}

function getGroupLinks(group: CityGroup) {
  const unique = new Map<string, MarketLink>()

  for (const market of group.markets) {
    for (const link of getMarketLinks(market)) {
      if (!unique.has(link.url)) {
        unique.set(link.url, link)
      }
    }
  }

  return Array.from(unique.values())
}

function hasGroupLinks(group: CityGroup) {
  return getGroupLinks(group).length > 0
}

function linkCountGroup(group: CityGroup) {
  return getGroupLinks(group).length
}

async function copyLinkToClipboard(link: MarketLink) {
  try {
    await navigator.clipboard.writeText(link.url)
    toast.add({
      title: 'Lien copie',
      description: `${link.label} ajoute au presse-papiers.`
    })
  } catch {
    toast.add({
      title: 'Copie impossible',
      description: 'Le navigateur a bloque l\'acces au presse-papiers.',
      color: 'error'
    })
  }
}

function buildLinkMenuItems(links: MarketLink[]): DropdownMenuItem[] {
  if (!links.length) {
    return [{
      label: 'Aucun lien disponible'
    }]
  }

  const sorted = [...links].sort((a, b) => a.label.localeCompare(b.label))

  return sorted.map((link) => ({
    label: link.label,
    icon: link.source === 'betmoar' ? 'i-lucide-chart-line' : link.source === 'polymarket' ? 'i-lucide-store' : 'i-lucide-cloud',
    children: [{
      label: 'Ouvrir dans un nouvel onglet',
      icon: 'i-lucide-external-link',
      href: link.url,
      target: '_blank',
      rel: 'noopener noreferrer'
    }, {
      label: 'Copier le lien',
      icon: 'i-lucide-copy',
      onSelect() {
        void copyLinkToClipboard(link)
      }
    }],
    trailingIcon: 'i-lucide-chevron-right'
  }))
}

function getLinkMenuItemsForGroup(group: CityGroup) {
  return buildLinkMenuItems(getGroupLinks(group))
}
</script>

<template>
  <UCard
    class="border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 shadow-xl shadow-slate-950/30">
    <template #header>
      <div class="flex flex-col gap-2 border-b border-white/10 pb-3">
        <div class="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p class="text-[10px] uppercase tracking-[0.35em] text-emerald-300/80">Dust feed</p>
            <h2 class="mt-1 text-xl font-semibold text-white">Markets sélectionnés</h2>
            <p class="mt-1 text-xs text-slate-300">Vue compacte des opportunités dust envoyées par le bot.</p>
          </div>

          <div class="flex flex-wrap gap-2 text-xs text-slate-200">
            <UBadge color="success" variant="subtle" class="rounded-full px-2.5 py-1">{{ count }} marchés</UBadge>
            <UBadge color="neutral" variant="subtle" class="rounded-full px-2.5 py-1">{{ source }}</UBadge>
            <UBadge v-if="lastUpdated" color="primary" variant="subtle" class="rounded-full px-2.5 py-1">Mis à jour le
              {{ formatFrDate(lastUpdated) }}</UBadge>
          </div>
        </div>

        <div class="mt-1 flex flex-wrap gap-1.5 text-xs">
          <UButton size="xs" :color="viewMode === 'all' ? 'primary' : 'neutral'"
            :variant="viewMode === 'all' ? 'solid' : 'soft'" title="Affiche tous les marchés disponibles, sans filtre."
            aria-label="Filtre Tous: affiche tous les marchés" @click="viewMode = 'all'">Tous</UButton>
          <UButton size="xs" :color="viewMode === 'quick' ? 'warning' : 'neutral'"
            :variant="viewMode === 'quick' ? 'solid' : 'soft'"
            title="Montre les setups les plus actionnables: proches de minuit ou avec prix attractif."
            aria-label="Filtre Setup rapides: urgents ou prix attractif" @click="viewMode = 'quick'">Setup rapides
          </UButton>
          <UButton size="xs" :color="viewMode === 'conviction' ? 'success' : 'neutral'"
            :variant="viewMode === 'conviction' ? 'solid' : 'soft'"
            title="Montre uniquement les marchés notés A (forte conviction)."
            aria-label="Filtre High conviction: marchés notés A" @click="viewMode = 'conviction'">High conviction
          </UButton>
        </div>

        <details class="group mt-2 rounded-lg border border-white/10 bg-black/15">
          <summary class="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-xs text-slate-200">
            <span class="inline-flex items-center gap-1">
              <UIcon name="i-lucide-sliders-horizontal" class="size-3.5" />
              Aide & outils
            </span>
            <UIcon name="i-lucide-chevron-down" class="size-4 transition-transform group-open:rotate-180" />
          </summary>

          <div class="border-t border-white/10 p-3 text-xs text-slate-300">
            <div class="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
              <div class="rounded-md border border-white/10 bg-white/5 p-2.5">
                <p class="font-semibold text-slate-100">Critères utilisés</p>
                <div class="mt-2 flex flex-wrap gap-1.5">
                  <span
                    class="inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2 py-0.5 text-emerald-200">🟢
                    A: ≤ 2h + ask ≤ 99.5¢ + profondeur ≥ 80</span>
                  <span
                    class="inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-amber-200">🟠 B:
                    ≤ 4h + ask ≤ 99.8¢ + profondeur ≥ 30</span>
                  <span class="inline-flex items-center gap-1 rounded-full bg-rose-400/15 px-2 py-0.5 text-rose-200">🔴
                    C: le reste</span>
                </div>
                <div class="mt-2 space-y-1">
                  <p class="text-slate-300"><span class="rounded bg-primary/15 px-1 py-0.5 text-primary">Tous</span>:
                    affiche tous les marchés sans filtre.</p>
                  <p class="text-slate-300"><span class="rounded bg-amber-400/15 px-1 py-0.5 text-amber-200">Setup
                      rapides</span>: ≤ 3h avant minuit ou ask ≤ 99.5¢.</p>
                  <p class="text-slate-300"><span class="rounded bg-emerald-400/15 px-1 py-0.5 text-emerald-200">High
                      conviction</span>: affiche uniquement les marchés notés A.</p>
                  <p class="text-slate-300"><span
                      class="rounded bg-violet-400/15 px-1 py-0.5 text-violet-200">Tri</span>: Yes/No, puis temps
                    restant avant minuit, puis meilleur ask.</p>
                </div>
              </div>

              <div class="space-y-2">
                <div class="rounded-md border border-white/10 bg-white/5 p-2.5">
                  <p class="mb-1 text-slate-100">°C → °F</p>
                  <UInput v-model="cInput" size="xs" type="number" placeholder="°C" />
                  <p class="mt-1 text-slate-400">Résultat: <span class="font-semibold text-white">{{ fFromC ? `${fFromC}
                      °F` : '—' }}</span></p>
                </div>

                <div class="rounded-md border border-white/10 bg-white/5 p-2.5">
                  <p class="mb-1 text-slate-100">°F → °C</p>
                  <UInput v-model="fInput" size="xs" type="number" placeholder="°F" />
                  <p class="mt-1 text-slate-400">Résultat: <span class="font-semibold text-white">{{ cFromF ? `${cFromF}
                      °C` : '—' }}</span></p>
                </div>
              </div>
            </div>
          </div>
        </details>
      </div>
    </template>

    <div v-if="loading"
      class="flex items-center gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-4 text-emerald-100">
      <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin" />
      Chargement des markets dust…
    </div>

    <div v-else-if="!groups.length"
      class="rounded-2xl border border-dashed border-white/10 bg-white/5 p-10 text-center text-slate-300">
      <UIcon name="i-lucide-sparkles" class="mx-auto mb-3 size-8 text-emerald-300" />
      Aucun market dust n’est encore disponible. Le bot Discord devra en envoyer pour alimenter cette vue.
    </div>

    <div v-else class="grid grid-cols-1 items-start gap-2 sm:gap-3 lg:grid-cols-2 2xl:grid-cols-3">
      <section v-for="group in groups" :key="group.city"
        class="overflow-hidden rounded-xl border border-white/5 bg-white/5 sm:rounded-2xl sm:border-white/10">
        <div class="flex w-full items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
          <button type="button"
            class="flex min-w-0 flex-1 items-center justify-between gap-2.5 text-left transition hover:bg-white/5"
            @click="toggleCity(group.city)">
            <div class="flex min-w-0 items-center gap-3">
              <UIcon :name="isCollapsed(group.city) ? 'i-lucide-chevron-right' : 'i-lucide-chevron-down'"
                class="size-4 shrink-0 text-slate-400" />
              <div class="min-w-0">
                <h3 class="truncate text-sm font-semibold text-white">
                  {{ group.city }}
                  <span v-if="group.airport" class="ml-1 text-[11px] font-normal text-slate-400">{{ group.airport
                    }}</span>
                </h3>
                <div class="flex items-center gap-1.5">
                  <p v-if="group.peakLabel" class="truncate text-[11px] text-slate-400">
                    Peak {{ group.peakLabel }}
                  </p>
                  <span v-if="group.dateLabel" class="inline-flex items-center rounded-full bg-white/5 px-1.5 py-0.5 text-[11px] font-medium text-slate-300">
                    {{ group.dateLabel }}
                  </span>
                </div>
              </div>
            </div>
            <div class="flex shrink-0 items-center gap-3">
              <div class="text-right leading-none">
                <p class="font-mono text-lg font-bold tabular-nums text-white">{{ cityTime(group.tz, group.localTime) }}
                </p>
                <p v-if="timeToMidnight(group.tz)" class="mt-0.5 text-[11px] font-medium tabular-nums"
                  :class="timeToMidnight(group.tz)!.urgent ? 'text-rose-300' : 'text-amber-300/80'">
                  <UIcon name="i-lucide-moon" class="-mt-0.5 mr-0.5 inline-block size-3" />minuit dans {{
                    timeToMidnight(group.tz)!.label }}
                </p>
              </div>
              <div class="flex items-center gap-1.5">
                <UBadge v-if="group.urgentCount > 0" color="warning" variant="subtle" class="shrink-0 rounded-full">⏳ {{
                  group.urgentCount }}</UBadge>
              </div>
            </div>
          </button>

          <UDropdownMenu v-if="hasGroupLinks(group)"
            :items="getLinkMenuItemsForGroup(group)"
            :content="{ align: 'end', side: 'bottom', collisionPadding: 12 }"
            :ui="{ content: 'w-72' }">
            <UButton color="neutral" variant="soft" size="xs" icon="i-lucide-link-2" class="h-6 px-2 text-[10px]">
              {{ linkCountGroup(group) }}
            </UButton>
          </UDropdownMenu>
        </div>

        <div v-if="!isCollapsed(group.city)"
          class="space-y-1.5 border-t border-white/5 p-2 sm:space-y-2 sm:border-white/10 sm:p-3">
          <div
            v-if="group.markets.some(m => m.airportData?.ignoreForTrading)"
            class="rounded-lg border-l-4 border-amber-500 bg-amber-500/15 p-2.5 text-xs text-amber-200"
          >
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-alert-triangle" class="size-4 flex-shrink-0" />
              <span class="font-semibold">Ville marquée IGNORE FOR TRADING</span>
            </div>
          </div>

          <article v-for="market in group.markets"
            :key="market.id || market.slug || `${market.city}-${market.groupItemTitle}-${market.outcome}`"
            class="rounded-lg border border-white/10 p-2.5 transition sm:rounded-xl sm:p-3"
            :class="isYes(market.outcome)
              ? 'bg-emerald-400/5 sm:border-emerald-400/30 sm:hover:border-emerald-400/50'
              : 'bg-rose-400/5 sm:border-rose-400/30 sm:hover:border-rose-400/50'"
          >
            <div class="flex items-center justify-between gap-3">
              <div class="flex min-w-0 items-center gap-2">
                <span class="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider" :class="isYes(market.outcome)
                  ? 'bg-emerald-400/15 text-emerald-300'
                  : 'bg-rose-400/15 text-rose-300'">{{ market.outcome || '—' }}</span>
                <span class="rounded-full px-2 py-0.5 text-[10px] font-semibold" :class="marketGrade(market).tone">
                  {{ marketGrade(market).emoji }} {{ marketGrade(market).grade }}
                </span>
                <h4 class="truncate text-sm font-semibold text-white">{{ market.groupItemTitle || 'Seuil' }}</h4>
              </div>

              <div class="flex shrink-0 items-center gap-1.5 text-xs">
                <span class="rounded-full px-2 py-0.5 font-semibold" :class="isYes(market.outcome)
                  ? 'bg-emerald-400/15 text-emerald-300'
                  : 'bg-rose-400/15 text-rose-300'">{{ formatCents(market.bestAsk) }}</span>
              </div>
            </div>

            <!-- Order book : asks (rouge) en haut, séparateur, bids (vert) en bas -->
            <div class="mt-2 overflow-hidden rounded-md border border-white/5 sm:border-transparent">
              <!-- Asks (max 3) : meilleur ask juste au-dessus du séparateur -->
              <template v-if="orderBook(market).asks.length">
                <div v-for="(level, i) in orderBook(market).asks" :key="`ask-${i}`"
                  class="relative flex items-center px-2 py-1 text-[11px] tabular-nums">
                  <span class="absolute inset-y-0 right-0 bg-rose-400/15" :style="{ width: `${level.depth}%` }" />
                  <span class="relative w-[28%] font-semibold text-rose-300">{{ formatCents(level.price) }}</span>
                  <span class="relative w-[36%] text-right text-slate-300">{{ formatShares(level.size) }}</span>
                  <div class="relative flex w-[36%] flex-col items-end text-right">
                    <span class="text-slate-400">{{ formatUsd(level.price, level.size) }}</span>
                    <span class="text-[10px]" :class="(netYieldAfterFeesValue(level.price, level.size) ?? 0) >= 0 ? 'text-emerald-300' : 'text-rose-300'">
                      {{ formatNetYieldAfterFees(level.price, level.size) }}
                    </span>
                  </div>
                </div>
              </template>
              <div v-else class="px-2 py-1 text-[11px] italic text-slate-500">Pas d'asks</div>

              <!-- Séparateur bids / asks -->
              <div
                class="my-0.5 flex items-center justify-between border-y border-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wider text-slate-500 sm:border-white/10">
                <span v-if="market.displaySpread || market.spread">Spread {{ market.displaySpread ||
                  formatSpread(market.spread) }}</span>
              </div>

              <!-- Bids (max 3) : meilleur bid juste sous le séparateur -->
              <template v-if="orderBook(market).bids.length">
                <div v-for="(level, i) in orderBook(market).bids" :key="`bid-${i}`"
                  class="relative flex items-center px-2 py-1 text-[11px] tabular-nums">
                  <span class="absolute inset-y-0 right-0 bg-emerald-400/15" :style="{ width: `${level.depth}%` }" />
                  <span class="relative w-[28%] font-semibold text-emerald-300">{{ formatCents(level.price) }}</span>
                  <span class="relative w-[36%] text-right text-slate-300">{{ formatShares(level.size) }}</span>
                  <span class="relative w-[36%] text-right text-slate-400">{{ formatUsd(level.price, level.size)
                    }}</span>
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
