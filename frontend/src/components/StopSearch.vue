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
