<script setup lang="ts">
import type { DustMarket } from '~/types/dust'
import { orderBook, isYes } from '~/utils/dustMarkets'
import { formatCents, formatSpread, formatShares, formatUsd, netYieldAfterFeesValue, formatNetYieldAfterFees } from '~/utils/dustFormatters'

const props = defineProps<{ market: DustMarket }>()
// Le carnet est calculé une seule fois par mise à jour des niveaux.
const book = computed(() => orderBook(props.market))
</script>

<template>
  <article
    class="market-book"
    :class="isYes(market.outcome)
      ? 'market-yes' : 'market-no'"
  >
    <div class="flex items-center justify-between gap-3">
      <div class="flex min-w-0 items-center gap-2">
        <span class="market-outcome">{{ market.outcome || '—' }}</span>
        <h4 class="truncate text-sm font-semibold text-slate-900">
          {{ market.groupItemTitle || 'Seuil' }}
        </h4>
      </div>

      <div class="flex shrink-0 items-center gap-1.5 text-xs">
        <span
          class="rounded-sm px-2 py-0.5 font-semibold"
          :class="isYes(market.outcome)
            ? 'bg-emerald-400/15 text-emerald-700'
            : 'bg-rose-400/15 text-rose-700'"
        >{{ formatCents(market.bestAsk) }}</span>
      </div>
    </div>

    <!-- Order book : asks (rouge) en haut, séparateur, bids (vert) en bas -->
    <div class="mt-2 grid grid-cols-1 overflow-hidden rounded-md border border-slate-200 bg-slate-50 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
      <!-- Asks (max 3) : meilleur ask juste au-dessus du séparateur -->
      <section class="min-w-0 bg-rose-400/[0.025]">
        <div class="flex items-center justify-between border-b border-slate-200 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-rose-700">
          <span>Asks</span>
          <span>Prix · Qté · Valeur</span>
        </div>
        <template v-if="book.asks.length">
          <div
            v-for="(level, i) in book.asks"
            :key="`ask-${i}`"
            class="relative grid grid-cols-[auto_1fr_auto] items-center gap-3 px-2 py-1 text-[11px] tabular-nums"
          >
            <span class="absolute inset-y-0 right-0 bg-rose-400/15" :style="{ width: `${level.depth}%` }" />
            <span class="relative font-semibold text-rose-700">{{ formatCents(level.price) }}</span>
            <span class="relative text-right text-slate-600">{{ formatShares(level.size) }}</span>
            <div class="relative flex flex-col items-end text-right">
              <span class="text-slate-500">{{ formatUsd(level.price, level.size) }}</span>
              <span class="text-[10px]" :class="(netYieldAfterFeesValue(level.price, level.size) ?? 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'">
                {{ formatNetYieldAfterFees(level.price, level.size) }}
              </span>
            </div>
          </div>
        </template>
        <div v-else class="px-2 py-1 text-[11px] italic text-slate-500">
          Pas d'asks
        </div>
      </section>

      <!-- Séparateur bids / asks -->
      <div
        class="flex items-center justify-center border-y border-slate-200 px-2 py-1 text-[9px] uppercase tracking-wider text-slate-500 md:w-20 md:border-x md:border-y-0"
      >
        <span v-if="market.displaySpread || market.spread" class="text-center">Spread {{ market.displaySpread
          || formatSpread(market.spread) }}</span>
      </div>

      <!-- Bids (max 3) : meilleur bid juste sous le séparateur -->
      <section class="min-w-0 bg-emerald-400/[0.025]">
        <div class="flex items-center justify-between border-b border-slate-200 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-emerald-700">
          <span>Bids</span>
          <span>Prix · Qté · Valeur</span>
        </div>
        <template v-if="book.bids.length">
          <div
            v-for="(level, i) in book.bids"
            :key="`bid-${i}`"
            class="relative grid grid-cols-[auto_1fr_auto] items-center gap-3 px-2 py-1 text-[11px] tabular-nums"
          >
            <span class="absolute inset-y-0 right-0 bg-emerald-400/15" :style="{ width: `${level.depth}%` }" />
            <span class="relative font-semibold text-emerald-700">{{ formatCents(level.price) }}</span>
            <span class="relative text-right text-slate-600">{{ formatShares(level.size) }}</span>
            <span class="relative text-right text-slate-500">{{ formatUsd(level.price, level.size)
            }}</span>
          </div>
        </template>
        <div v-else class="px-2 py-1 text-[11px] italic text-slate-500">
          No bids
        </div>
      </section>
    </div>
  </article>
</template>
