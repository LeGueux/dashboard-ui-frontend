<script setup lang="ts">
const route = useRoute()
const runtime = useRuntimeConfig()
</script>

<template>
  <aside class="workspace-nav">
    <NuxtLink to="/" class="wordmark" aria-label="Dust, dossiers météo">
      <UIcon name="i-lucide-cloud-sun" class="size-7" />
      <span>DUST<span class="wordmark-sub">DOSSIERS MÉTÉO</span></span>
    </NuxtLink>
    <nav class="workspace-tabs" aria-label="Navigation principale">
      <NuxtLink to="/" :aria-current="route.path === '/' ? 'page' : undefined">
        <UIcon name="i-lucide-panel-left" />Veille des marchés
      </NuxtLink>
      <NuxtLink to="/weather-links" :aria-current="route.path === '/weather-links' ? 'page' : undefined">
        <UIcon name="i-lucide-library" />Stations & sources
      </NuxtLink>
    </nav>
    <span class="workspace-version">DUST / v{{ runtime.public.appVersion }}</span>
  </aside>
</template>
