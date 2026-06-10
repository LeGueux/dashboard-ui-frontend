<script setup lang="ts">
const { markets, loading, lastUpdated, source } = useDustMarkets()
</script>

<template>
  <UDashboardPanel id="home">
    <template #header>
      <UDashboardNavbar
        title="Polymarket Dust Dashboard"
        :ui="{ title: 'text-white font-semibold tracking-wide', wrapper: 'bg-slate-950/90 border-b border-white/10' }"
      />

      <UDashboardToolbar>
        <template #left>
          <div class="flex flex-wrap items-center gap-3">
            <UBadge color="success" variant="subtle" class="rounded-full px-3 py-1">Bot ↔ Koyeb ↔ Vercel</UBadge>
            <UBadge color="neutral" variant="subtle" class="rounded-full px-3 py-1">{{ markets.length }} markets actifs</UBadge>
            <UBadge v-if="lastUpdated" color="primary" variant="subtle" class="rounded-full px-3 py-1">Dernière MAJ {{ lastUpdated }}</UBadge>
          </div>
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <div class="space-y-6">
        <UCard class="border border-white/10 bg-gradient-to-r from-emerald-400/10 via-slate-950 to-slate-900 shadow-2xl shadow-emerald-950/10">
          <div class="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
            <div class="space-y-2">
              <p class="text-[11px] uppercase tracking-[0.35em] text-emerald-300/80">Overview</p>
              <h1 class="text-2xl font-semibold text-white md:text-3xl">Interface dust dédiée aux markets sélectionnés par le bot Discord</h1>
              <p class="max-w-2xl text-sm text-slate-300">
                Lecture des résultats envoyés par le bot vers Koyeb, puis affichage des markets dust dans une vue claire et compacte.
              </p>
            </div>

            <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <UCard class="border border-white/10 bg-white/5" :ui="{ body: 'space-y-1' }">
                <p class="text-[11px] uppercase tracking-[0.25em] text-emerald-300/80">Source</p>
                <p class="text-base font-semibold text-white">{{ source }}</p>
                <p class="text-xs text-slate-300">Lecture directe depuis le backend de synchronisation.</p>
              </UCard>
              <UCard class="border border-white/10 bg-white/5" :ui="{ body: 'space-y-1' }">
                <p class="text-[11px] uppercase tracking-[0.25em] text-emerald-300/80">Refresh</p>
                <p class="text-base font-semibold text-white">Auto-refresh 60s</p>
                <p class="text-xs text-slate-300">Le feed reste aligné avec les dernières sélections du bot.</p>
              </UCard>
            </div>
          </div>
        </UCard>

        <HomeDustMarkets :markets="markets" :loading="loading" :last-updated="lastUpdated" :count="markets.length" :source="source" />
      </div>
    </template>
  </UDashboardPanel>
</template>
