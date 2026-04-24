<template>
    <section>
        <h2>Rapport Polymarket — État en direct</h2>
        <div class="grid">
            <StateCard title="Dernier état" :data="state" />
            <div class="panel">
                <h3>Info</h3>
                <p>Clients SSE connectés: <strong>{{ sseClients }}</strong></p>
                <p>Dernière mise à jour: <strong>{{ state?.__receivedAt ?? '—' }}</strong></p>
            </div>
        </div>
    </section>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import StateCard from '~/components/StateCard.vue'

const state = ref(null)
const sseClients = ref(0)
let es = null

async function fetchState() {
    try {
        const r = await fetch('/state')
        if (r.ok) state.value = await r.json()
    } catch (e) { console.warn(e) }
}

onMounted(() => {
    fetchState()
    es = new EventSource('/events')
    es.onmessage = (e) => {
        try { state.value = JSON.parse(e.data) } catch { state.value = e.data }
    }
    es.onerror = () => { /* ignore */ }
})

onUnmounted(() => { if (es) es.close() })
</script>

<style scoped>
.grid {
    display: grid;
    grid-template-columns: 1fr 320px;
    gap: 18px;
    align-items: start
}

.panel {
    background: var(--card);
    padding: 16px;
    border-radius: 8px
}

h2 {
    margin-bottom: 12px
}
</style>
