<template>
    <UApp>
        <NuxtPage />
    </UApp>
</template>

<script setup>
import { useState } from '#app'
// import TopBar from '~/components/TopBar.vue'

const dark = useState('darkMode', () => false)
const isDark = computed(() => dark.value)
function toggleDark() { dark.value = !dark.value }
</script>

<style scoped>
.container {
    max-width: 1100px;
    margin: 28px auto;
    padding: 0 16px
}
</style>
