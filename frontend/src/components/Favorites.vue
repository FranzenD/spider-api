<template>
  <section class="sidebar-section">
    <h3>Favoriter</h3>
    <p v-if="stops.length === 0" class="sidebar-empty">Inga favoriter ännu.</p>
    <ul v-else class="stop-list">
      <li v-for="stop in stops" :key="stop.id" class="stop-list-item">
        <button
          type="button"
          class="stop-select-btn"
          :disabled="disabled"
          @click="$emit('select', stop)"
        >
          <strong>{{ stop.name }}</strong>
          <code>{{ stop.id }}</code>
        </button>
        <button
          type="button"
          class="stop-remove-btn"
          :aria-label="`Ta bort ${stop.name} från favoriter`"
          @click="$emit('remove', stop.id)"
        >
          ×
        </button>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import type { Stop } from '../types'

defineProps<{
  stops: Stop[]
  disabled: boolean
}>()

defineEmits<{
  select: [stop: Stop]
  remove: [areaId: string]
}>()
</script>

<style scoped>
.sidebar-section {
  padding: 1rem;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  background: #f8f9fa;
}

.sidebar-section h3 {
  margin: 0 0 0.75rem;
  color: #333;
  font-size: 1.05rem;
}

.sidebar-empty {
  margin: 0;
  color: #666;
  font-size: 0.9rem;
}

.stop-list {
  display: grid;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.stop-list-item {
  display: flex;
  align-items: stretch;
  gap: 0.25rem;
}

.stop-select-btn {
  display: grid;
  flex: 1;
  gap: 0.25rem;
  padding: 0.65rem;
  border: 1px solid #e1e4e8;
  border-radius: 5px;
  background: white;
  color: #333;
  text-align: left;
  cursor: pointer;
}

.stop-select-btn:hover {
  border-color: #667eea;
  background: #f5f6ff;
}

.stop-select-btn:disabled {
  cursor: wait;
}

.stop-select-btn code {
  color: #666;
  font-size: 0.8rem;
}

.stop-remove-btn {
  width: 2rem;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: #666;
  font-size: 1.25rem;
  cursor: pointer;
}

.stop-remove-btn:hover {
  background: #f8d7da;
  color: #721c24;
}
</style>
