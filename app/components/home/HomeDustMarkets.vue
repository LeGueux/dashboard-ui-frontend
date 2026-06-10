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

const cards = computed(() => props.markets || [])
</script>

<template>
  <UCard class="border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 shadow-2xl shadow-slate-950/30">
    <template #header>
      <div class="flex flex-col gap-4 border-b border-white/10 pb-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.35em] text-emerald-300/80">Dust feed</p>
          <h2 class="mt-2 text-2xl font-semibold text-white">Markets sélectionnés par le bot</h2>
          <p class="mt-2 max-w-2xl text-sm text-slate-300">
            Vue en direct des opportunités dust envoyées depuis le bot Discord vers Koyeb, mise à jour automatiquement.
          </p>
        </div>

        <div class="flex flex-wrap gap-3 text-sm text-slate-200">
          <UBadge color="success" variant="subtle" class="rounded-full px-3 py-1">{{ count }} marchés</UBadge>
          <UBadge color="neutral" variant="subtle" class="rounded-full px-3 py-1">Source: {{ source }}</UBadge>
          <UBadge v-if="lastUpdated" color="primary" variant="subtle" class="rounded-full px-3 py-1">MAJ {{ lastUpdated }}</UBadge>
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

    <div v-else class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <UCard
        v-for="market in cards"
        :key="market.id || market.slug || `${market.city}-${market.outcome}`"
        class="border border-white/10 bg-white/5 shadow-xl shadow-slate-950/30 transition hover:-translate-y-0.5 hover:border-emerald-400/40 hover:bg-white/8"
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-xs uppercase tracking-[0.25em] text-emerald-300/80">{{ market.airport || 'Market' }}</p>
            <h3 class="mt-1 text-xl font-semibold text-white">{{ market.groupItemTitle || market.city || 'Market dust' }}</h3>
            <p class="text-sm text-slate-300">{{ market.date || 'Date non disponible' }}</p>
          </div>
          <UBadge color="success" variant="soft" class="rounded-full">{{ formatPrice(market.bestAsk || market.currentPrice) }}</UBadge>
        </div>

        <div class="mt-4 flex flex-wrap gap-2">
          <UBadge color="neutral" variant="subtle">Outcome: {{ market.outcome || '—' }}</UBadge>
          <UBadge color="primary" variant="subtle">Spread: {{ formatSpread(market.spread) }}</UBadge>
          <UBadge color="warning" variant="subtle">City: {{ market.city || '—' }}</UBadge>
        </div>

        <div class="mt-4 rounded-xl border border-white/10 bg-slate-950/60 p-3 text-sm text-slate-200">
          <div class="flex items-center justify-between text-slate-300">
            <span>Best ask</span>
            <strong class="text-white">{{ formatPrice(market.bestAsk || market.currentPrice) }}</strong>
          </div>
          <div class="mt-1 flex items-center justify-between text-slate-300">
            <span>Current price</span>
            <strong class="text-white">{{ formatPrice(market.currentPrice) }}</strong>
          </div>
          <div class="mt-1 flex items-center justify-between text-slate-300">
            <span>Asks count</span>
            <strong class="text-white">{{ market.asks?.length || 0 }}</strong>
          </div>
        </div>

        <div class="mt-4 flex items-center justify-between gap-3">
          <UButton
            v-if="market.link"
            :to="market.link"
            target="_blank"
            rel="noreferrer"
            color="neutral"
            variant="soft"
            icon="i-lucide-external-link"
          >
            Open market
          </UButton>
          <span class="text-xs uppercase tracking-[0.25em] text-slate-400">{{ market.slug || 'dust market' }}</span>
        </div>
      </UCard>
    </div>
  </UCard>
</template>
