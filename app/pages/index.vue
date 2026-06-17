<script setup lang="ts">
const { markets, loading, lastUpdated, source, status, lastSyncAt, error } = useDustMarkets()

const runtime = useRuntimeConfig()
const appVersion = runtime.public.appVersion as string

const statusLabel = computed(() => {
  if (status.value === 'live') return 'Live feed OK'
  if (status.value === 'loading') return 'Chargement...'
  if (status.value === 'error') return 'Erreur de connexion'
  return 'En attente'
})

const statusTone = computed(() => {
  if (status.value === 'live') return 'text-emerald-200 border-emerald-300/30 bg-emerald-300/10'
  if (status.value === 'loading') return 'text-sky-200 border-sky-300/30 bg-sky-300/10'
  if (status.value === 'error') return 'text-rose-200 border-rose-300/30 bg-rose-300/10'
  return 'text-slate-200 border-white/15 bg-white/5'
})

const statusDotTone = computed(() => {
  if (status.value === 'live') return 'bg-emerald-300'
  if (status.value === 'loading') return 'bg-sky-300'
  if (status.value === 'error') return 'bg-rose-300'
  return 'bg-slate-300'
})
</script>

<template>
  <UDashboardPanel id="home">
    <template #header>
      <div class="space-y-1">
        <UDashboardNavbar
          title="Polymarket Dust Dashboard"
          :ui="{ title: 'text-white font-semibold tracking-wide' }"
        >
          <template #right>
            <div class="flex flex-wrap items-center gap-2 text-xs">
              <span class="inline-flex items-center gap-1 rounded-full border px-2 py-1" :class="statusTone">
                <span class="size-1.5 rounded-full" :class="statusDotTone" />
                {{ statusLabel }}
              </span>
              <span class="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-slate-200">Sync: {{ lastSyncAt || '—' }}</span>
              <span class="rounded-full border border-white/10 bg-white/5 px-2 py-1 font-mono tabular-nums text-slate-200">v{{ appVersion }}</span>
            </div>
          </template>
        </UDashboardNavbar>
      </div>
    </template>

    <template #body>
      <div class="space-y-6">
        <HomeDustMarkets :markets="markets" :loading="loading" :last-updated="lastUpdated" :count="markets.length" :source="source" />

        <UCard class="border border-white/10 bg-white/5" :ui="{ body: 'py-3' }">
          <div class="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
            <p>Source: {{ source }}</p>
            <p>{{ error || 'Connexion backend OK' }}</p>
          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
