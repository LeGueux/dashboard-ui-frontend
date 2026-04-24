<template>
    <header class="topbar">
        <div class="brand">Polymarket Dashboard</div>
        <div class="controls">
            <button class="btn" @click="$emit('toggleDark')">{{ isDark ? '☀️' : '🌙' }}</button>
        </div>
    </header>
</template>

<script setup>
defineProps({ isDark: Boolean })
</script>

<style scoped>
.topbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 0
}

.brand {
    font-weight: 700
}

.btn {
    background: transparent;
    border: 1px solid var(--muted);
    padding: 6px 10px;
    border-radius: 8px;
    cursor: pointer
}
</style>
