<script setup lang="ts">
interface DustAsk {
  price?: number | string
  size?: number | string
}

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
  spread?: number | string | null
  currentPrice?: number | string | null
  bestAsk?: number | string | null
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

function formatPrice(value?: number | string | null) {
  const n = Number(value ?? 0)
  if (!Number.isFinite(n)) return '—'
  return n.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4
  })
}

function formatSpread(value?: number | string | null) {
  const n = Number(value ?? 0)
  if (!Number.isFinite(n)) return '—'
  return `${(n * 100).toFixed(1)}¢`
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

const cards = computed(() => dedupeMarkets(props.markets || []))
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
          <UBadge v-if="lastUpdated" color="primary" variant="subtle" class="rounded-full px-2.5 py-1">MAJ {{ lastUpdated }}</UBadge>
        </div>
      </div>
    </template>

    <div v-if="loading" class="flex items-center gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-4 text-emerald-100">
      <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin" />
      Chargement des markets dust…
    </div>

    <div v-else-if="!cards.length" class="rounded-2xl border border-dashed border-white/10 bg-white/5 p-10 text-center text-slate-300">
      <UIcon name="i-lucide-sparkles" class="mx-auto mb-3 size-8 text-emerald-300" />
      Aucun market dust n’est encore disponible. Le bot Discord devra en envoyer pour alimenter cette vue.
    </div>

    <div v-else class="space-y-2">
      <article
        v-for="market in cards"
        :key="market.id || market.slug || `${market.city}-${market.outcome}`"
        class="rounded-2xl border border-white/10 bg-white/5 p-3 shadow-sm shadow-slate-950/30 transition hover:border-emerald-400/40 hover:bg-white/8"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-emerald-300/80">
              <span>{{ market.airport || 'Market' }}</span>
              <span class="text-slate-500">•</span>
              <span>{{ market.outcome || '—' }}</span>
            </div>
            <h3 class="mt-1 text-sm font-semibold text-white">{{ market.groupItemTitle || market.city || 'Market dust' }}</h3>
            <p class="text-xs text-slate-300">{{ market.date || 'Date non disponible' }}</p>
          </div>

          <div class="flex items-center gap-2 text-xs text-slate-200">
            <UBadge color="success" variant="soft" class="rounded-full">{{ formatPrice(market.bestAsk || market.currentPrice) }}</UBadge>
            <UBadge color="primary" variant="subtle" class="rounded-full">Spread {{ formatSpread(market.spread) }}</UBadge>
          </div>
        </div>

        <div class="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-300">
          <span>{{ market.city || 'Ville non disponible' }}</span>
          <span>{{ market.asks?.length || 0 }} ask(s)</span>
          <a
            v-if="market.link"
            :href="market.link"
            target="_blank"
            rel="noreferrer"
            class="text-emerald-200 hover:text-white"
          >
            Voir
          </a>
        </div>
      </article>
    </div>
  </UCard>
</template>
