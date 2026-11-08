<template>
  <div class="stop-search">
    <label for="stop-search">Sök efter namn eller plats</label>
    <input
      id="stop-search"
      type="search"
      autocomplete="off"
      placeholder="Skriv minst två tecken..."
      class="search-input"
      :value="query"
      @input="$emit('update:query', ($event.target as HTMLInputElement).value)"
    />

    <p v-if="isSearching" class="search-hint" role="status">Söker hållplatser...</p>
    <ul v-else-if="results.length" class="search-results">
      <li v-for="stop in results" :key="stop.id" class="search-item">
        <div>
          <strong>{{ stop.name }}</strong>
          <code>{{ stop.id }}</code>
          <span v-if="stop.transport_modes?.length" class="transport-modes">
            Trafikslag: {{ stop.transport_modes.join(', ') }}
          </span>
          <span v-if="stop.area_type || stop.average_daily_stop_times !== undefined" class="stop-metadata">
            <template v-if="stop.area_type">Typ: {{ stop.area_type }}</template>
            <template v-if="stop.average_daily_stop_times !== undefined">
              <span v-if="stop.area_type"> · </span>
              {{ stop.average_daily_stop_times }} avgångar/dag
            </template>
          </span>
          <ul v-if="stop.stops.length > 1" class="child-stops">
            <li v-for="location in stop.stops" :key="location.id">
              {{ location.name }} (ID {{ location.id }}) · {{ location.lat }}, {{ location.lon }}
            </li>
          </ul>
        </div>
        <button
          type="button"
          class="save-stop-btn"
          :disabled="isSaving"
          @click="$emit('select', stop)"
        >
          {{ isSaving ? 'Sparar...' : 'Använd hållplats' }}
        </button>
      </li>
    </ul>
    <p v-if="error" class="search-hint search-error" role="alert">
      {{ error }}
    </p>
    <p
      v-else-if="hasSearched && query.trim().length >= 2 && !isSearching"
      class="search-hint"
      role="status"
    >
      Inga hållplatser hittades.
    </p>
  </div>
</template>

<script setup lang="ts">
import type { Stop } from '../types'

defineProps<{
  query: string
  results: Stop[]
  hasSearched: boolean
  isSearching: boolean
  isSaving: boolean
  error: string
}>()

defineEmits<{
  'update:query': [query: string]
  select: [stop: Stop]
}>()
</script>

<style scoped>
.stop-search > label {
  display: block;
  margin-bottom: 0.5rem;
  color: #333;
  font-weight: 600;
}

.search-input {
  display: block;
  box-sizing: border-box;
  padding: 0.75rem;
  border: 2px solid #ddd;
  border-radius: 6px;
  width: 100%;
  font-size: 1rem;
}

.search-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15);
}

.search-results {
  max-height: 320px;
  margin: 0.75rem 0 0;
  padding: 0;
  overflow-y: auto;
  background: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  list-style: none;
}

.search-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 0.85rem 1rem;
  border-bottom: 1px solid #eee;
}

.search-item:last-child {
  border-bottom: 0;
}

.search-item > div {
  display: grid;
  gap: 0.25rem;
}

.transport-modes {
  color: #555;
  font-size: 0.85rem;
}

.stop-metadata,
.child-stops {
  color: #666;
  font-size: 0.8rem;
}

.child-stops {
  display: grid;
  gap: 0.15rem;
  margin: 0.15rem 0 0;
  padding-left: 1rem;
}

.search-item code {
  color: #555;
  font-size: 0.85rem;
}

.save-stop-btn {
  flex-shrink: 0;
  padding: 0.55rem 0.75rem;
  border: 0;
  border-radius: 4px;
  background: #667eea;
  color: white;
  cursor: pointer;
}

.save-stop-btn:disabled {
  background: #999;
  cursor: wait;
}

.search-hint {
  padding: 1rem;
  color: #666;
  text-align: center;
}

.search-error {
  color: #721c24;
}

@media (max-width: 600px) {
  .search-item {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
