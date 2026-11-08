<template>
  <div v-if="stop" class="configured-stop">
    <div>
      <span class="configured-label">Aktiv hållplats</span>
      <strong>{{ stop.stopName || 'Hållplats' }}</strong>
    </div>
    <div class="configured-id-info">
      <code>{{ stop.areaId }}</code>
      <ul v-if="stop.stops?.length" class="configured-coordinates">
        <li v-for="location in stop.stops" :key="location.id">
          <span v-if="stop.stops.length > 1">{{ location.name }}:</span>
          Lon: {{ location.lon }}, Lat: {{ location.lat }}
        </li>
      </ul>
    </div>
    <button
      type="button"
      class="favorite-toggle-btn"
      :aria-pressed="isFavorite"
      @click="$emit('toggle-favorite')"
    >
      {{ isFavorite ? '★ Favorit' : '☆ Lägg till favorit' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import type { StopConfiguration } from '../types'

defineProps<{
  stop: StopConfiguration | null
  isFavorite: boolean
}>()

defineEmits<{
  'toggle-favorite': []
}>()
</script>

<style scoped>
.configured-stop {
  display: grid;
  grid-template-columns: 1fr auto;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.25rem;
  padding: 0.9rem 1rem;
  border: 1px solid #c3e6cb;
  border-radius: 6px;
  background: #d4edda;
  color: #155724;
}

.configured-stop > div {
  display: grid;
  gap: 0.2rem;
}

.configured-coordinates {
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 0.9rem;
}

.configured-id-info {
  display: grid;
  justify-items: end;
  gap: 0.25rem;
  text-align: right;
}

.favorite-toggle-btn {
  justify-self: start;
  padding: 0.55rem 0.75rem;
  border: 1px solid #d5c56b;
  border-radius: 5px;
  background: #fff9db;
  color: #594900;
  cursor: pointer;
}

.configured-label {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.configured-stop code {
  color: #555;
  font-size: 0.85rem;
}

@media (max-width: 600px) {
  .configured-stop {
    grid-template-columns: 1fr;
    align-items: flex-start;
  }

  .configured-id-info {
    justify-items: start;
    text-align: left;
  }
}
</style>
