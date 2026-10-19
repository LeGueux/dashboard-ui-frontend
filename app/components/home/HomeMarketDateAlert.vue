<script setup lang="ts">
defineProps<{
  title: string
  details: string
}>()
</script>

<template>
  <div class="market-date-alert" role="alert">
    <UIcon name="i-lucide-flag" class="size-6 shrink-0" />
    <div>
      <p class="market-date-alert-title">
        {{ title }}
      </p>
      <p>{{ details }}</p>
      <p class="market-date-alert-note">
        Graphique et écarts de température masqués pour éviter une comparaison avec le mauvais jour.
      </p>
    </div>
  </div>
</template>
