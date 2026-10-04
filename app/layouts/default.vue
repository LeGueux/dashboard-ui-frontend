<script setup lang="ts">
const { dashboardLayout } = useDashboardLayout()
</script>

<template>
  <div>
    <LayoutSwitcher />
    <div :data-layout="dashboardLayout">
      <div class="weather-workspace">
        <slot />
      </div>
    </div>
  </div>
</template>
