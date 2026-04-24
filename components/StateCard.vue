<template>
    <div class="card">
        <h3>{{ title }}</h3>
        <pre v-if="data">{{ pretty }}</pre>
        <p v-else class="muted">Aucune donnée reçue</p>
    </div>
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps({ title: { type: String, default: 'State' }, data: { type: null, default: null } })
const pretty = computed(() => props.data ? JSON.stringify(props.data, null, 2) : '')
</script>

<style scoped>
.card {
    background: var(--card);
    padding: 16px;
    border-radius: 8px
}

pre {
    white-space: pre-wrap;
    word-break: break-word
}

.muted {
    color: var(--muted)
}
</style>
