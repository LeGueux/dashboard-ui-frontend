<script setup lang="ts">
const { dashboardLayout, dashboardLayouts } = useDashboardLayout()
</script>

<template>
  <div class="layout-switcher" aria-label="Choix de la disposition">
    <span class="layout-switcher-label">Disposition</span>
    <div class="layout-switcher-buttons" role="group" aria-label="Disposition du tableau">
      <button
        v-for="option in dashboardLayouts"
        :key="option.value"
        type="button"
        :aria-pressed="dashboardLayout === option.value"
        :title="option.description"
        @click="dashboardLayout = option.value"
      >
        {{ option.label }}
      </button>
    </div>
    <select v-model="dashboardLayout" class="layout-switcher-select" aria-label="Disposition du tableau">
      <option v-for="option in dashboardLayouts" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>
    <span class="layout-switcher-hint">Choix mémorisé sur cet appareil</span>
  </div>
</template>
