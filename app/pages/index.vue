<script setup lang="ts">
const { isNotificationsSlideoverOpen } = useDashboard()
const { markets, loading, lastUpdated, source, loadFromBackend } = useDustMarkets()

const items = [[{
  label: 'Refresh dust feed',
  icon: 'i-lucide-refresh-cw',
  click: () => {
    void loadFromBackend()
  }
}]]
</script>

<template>
  <UDashboardPanel id="home">
    <template #header>
      <UDashboardNavbar title="Polymarket Dust Dashboard" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UTooltip text="Notifications" :shortcuts="['N']">
            <UButton
              color="neutral"
              variant="ghost"
              square
              @click="isNotificationsSlideoverOpen = true"
            >
              <UChip color="error" inset>
                <UIcon name="i-lucide-bell" class="size-5 shrink-0" />
              </UChip>
            </UButton>
          </UTooltip>

          <UDropdownMenu :items="items">
            <UButton icon="i-lucide-plus" size="md" class="rounded-full" />
          </UDropdownMenu>
        </template>
      </UDashboardNavbar>

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
          <div class="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p class="text-xs uppercase tracking-[0.35em] text-emerald-300/80">Overview</p>
              <h1 class="mt-3 text-3xl font-semibold text-white md:text-4xl">Interface dust dédiée aux markets sélectionnés par le bot Discord</h1>
              <p class="mt-4 max-w-2xl text-slate-300">
                Cette page lit les résultats envoyés par le bot vers Koyeb puis les affiche dans un format clair et moderne, sans surcharger l’UI.
              </p>
            </div>

            <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <UCard class="border border-white/10 bg-white/5" :ui="{ body: 'space-y-2' }">
                <p class="text-xs uppercase tracking-[0.25em] text-emerald-300/80">Source</p>
                <p class="text-lg font-semibold text-white">{{ source }}</p>
                <p class="text-sm text-slate-300">Lecture directe depuis le backend de synchronisation.</p>
              </UCard>
              <UCard class="border border-white/10 bg-white/5" :ui="{ body: 'space-y-2' }">
                <p class="text-xs uppercase tracking-[0.25em] text-emerald-300/80">Refresh</p>
                <p class="text-lg font-semibold text-white">Auto-refresh every 60s</p>
                <p class="text-sm text-slate-300">Le feed se met à jour automatiquement pour garder la vue en phase avec le bot.</p>
              </UCard>
            </div>
          </div>
        </UCard>

        <HomeDustMarkets :markets="markets" :loading="loading" :last-updated="lastUpdated" :count="markets.length" :source="source" />
      </div>
    </template>
  </UDashboardPanel>
</template>
