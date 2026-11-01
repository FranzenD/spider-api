<template>
  <div class="traffic-container">
    <div class="traffic-card">
      <h2>Hållplatsadministration</h2>
      <p class="description">
        Sök upp hållplatsen som ska användas för trafikvisningen.
      </p>

      <section class="admin-panel">
        <div v-if="configuredStop" class="configured-stop">
          <div>
            <span class="configured-label">Aktiv hållplats</span>
            <strong>{{ configuredStop.stopName || 'Hållplats' }}</strong>
          </div>
          <code>{{ configuredStop.areaId }}</code>
        </div>

        <label for="stop-search">Sök efter namn eller plats</label>
        <input
          id="stop-search"
          v-model="searchQuery"
          type="search"
          autocomplete="off"
          placeholder="Skriv minst två tecken..."
          class="search-input"
        />

        <p v-if="isSearching" class="search-hint" role="status">Söker hållplatser...</p>
        <ul v-else-if="searchResults.length" class="search-results">
          <li v-for="stop in searchResults" :key="stop.id" class="search-item">
            <div>
              <strong>{{ stop.name }}</strong>
              <code>{{ stop.id }}</code>
            </div>
            <button
              type="button"
              class="save-stop-btn"
              :disabled="isSaving"
              @click="saveStop(stop)"
            >
              {{ isSaving ? 'Sparar...' : 'Använd hållplats' }}
            </button>
          </li>
        </ul>
        <p
          v-else-if="hasSearched && searchQuery.trim().length >= 2"
          class="search-hint"
          role="status"
        >
          Inga hållplatser hittades.
        </p>

        <div v-if="message" :class="['message', messageType]" role="status">
          {{ message }}
        </div>
      </section>

      <section class="traffic-section">
        <div class="traffic-title">
          <h3>Trafikavgångar</h3>
          <button
            type="button"
            @click="fetchTrafficData()"
            :disabled="isLoading || !configuredStop"
            class="fetch-btn"
          >
            {{ isLoading ? 'Hämtar...' : 'Uppdatera trafik' }}
          </button>
        </div>

        <div v-if="trafficData" class="traffic-data">
          <div class="data-header">
            <h4>{{ configuredStop?.stopName || `Hållplats ${configuredStop?.areaId}` }}</h4>
            <span v-if="trafficData.meta?.timestamp" class="timestamp">
              Uppdaterad: {{ formatTimestamp(trafficData.meta.timestamp) }}
            </span>
          </div>

          <div class="traffic-grid">
            <div
              v-for="(departure, index) in departures"
              :key="index"
              :class="['traffic-item']"
            >
              <div class="location">
                <h4>{{ formatTimestamp(departure.realtime) }}</h4>
                <p>{{ showDepartureInMinutesFromNow(departure.realtime) }}</p>
                <p>{{ departure.route.direction }}</p>
              </div>
            </div>
          </div>
          <p v-if="departures.length === 0" class="no-departures">
            Inga avgångar hittades för den här hållplatsen.
          </p>
        </div>

        <div v-else-if="!isLoading" class="no-data">
          <p>Välj en hållplats för att visa aktuella avgångar.</p>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount, onMounted, watch } from 'vue'
import { API_BASE_URL } from '../api'
import type {
  ApiErrorResponse,
  MessageType,
  Stop,
  StopConfiguration,
  StopSearchResponse,
  TrafficApiResponse,
} from '../types'

const trafficData = ref<TrafficApiResponse | null>(null)
const configuredStop = ref<StopConfiguration | null>(null)
const searchQuery = ref('')
const searchResults = ref<Stop[]>([])
const hasSearched = ref(false)
const isSearching = ref(false)
const isSaving = ref(false)
const isLoading = ref(false)
const message = ref('')
const messageType = ref<MessageType>('success')
let messageTimer: ReturnType<typeof setTimeout> | undefined

const departures = computed(() => {
  return trafficData.value?.departures ?? []
})

const getApiError = (data: unknown): string | undefined => {
  if (typeof data !== 'object' || data === null || !('error' in data)) return undefined
  const error = (data as ApiErrorResponse).error
  return typeof error === 'string' ? error : undefined
}

const showMessage = (text: string, type: MessageType): void => {
  if (messageTimer) clearTimeout(messageTimer)
  message.value = text
  messageType.value = type
  messageTimer = setTimeout(() => {
    message.value = ''
  }, 5000)
}

const loadConfiguration = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/stops/config`)
    const data: unknown = await response.json()
    if (!response.ok) {
      throw new Error(getApiError(data) || 'Kunde inte läsa konfigurationen')
    }
    configuredStop.value = data as StopConfiguration
    return true
  } catch (error) {
    console.error('Configuration load failed:', error)
    showMessage(
      error instanceof Error ? error.message : 'Kunde inte läsa konfigurationen',
      'error'
    )
    return false
  }
}

const fetchTrafficData = async (showSuccess = true): Promise<boolean> => {
  isLoading.value = true
  try {
    const response = await fetch(`${API_BASE_URL}/api/traffic`)
    const data: unknown = await response.json()
    if (!response.ok) {
      throw new Error(getApiError(data) || 'Kunde inte hämta trafikdata')
    }
    trafficData.value = data as TrafficApiResponse
    if (showSuccess) showMessage('Trafikdata uppdaterad.', 'success')
    return true
  } catch (error) {
    console.error('Traffic data load failed:', error)
    showMessage(
      error instanceof Error ? error.message : 'Kunde inte hämta trafikdata',
      'error'
    )
    return false
  } finally {
    isLoading.value = false
  }
}

watch(searchQuery, (value, _previousValue, onCleanup) => {
  const query = value.trim()
  searchResults.value = []
  hasSearched.value = false
  if (query.length < 2) {
    isSearching.value = false
    return
  }

  const controller = new AbortController()
  const searchTimer = setTimeout(async () => {
    isSearching.value = true
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/stops/search?query=${encodeURIComponent(query)}`,
        { signal: controller.signal }
      )
      const data: unknown = await response.json()
      if (!response.ok) {
        throw new Error(getApiError(data) || 'Hållplatssökningen misslyckades')
      }
      if (!controller.signal.aborted) {
        searchResults.value = (data as StopSearchResponse).stops
        hasSearched.value = true
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return
      console.error('Stop search failed:', error)
      showMessage(
        error instanceof Error ? error.message : 'Hållplatssökningen misslyckades',
        'error'
      )
    } finally {
      if (!controller.signal.aborted) isSearching.value = false
    }
  }, 300)

  onCleanup(() => {
    clearTimeout(searchTimer)
    controller.abort()
  })
})

const saveStop = async (stop: Stop): Promise<void> => {
  isSaving.value = true
  try {
    const response = await fetch(`${API_BASE_URL}/api/stops/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ areaId: stop.id, stopName: stop.name }),
    })
    const data: unknown = await response.json()
    if (!response.ok) {
      throw new Error(getApiError(data) || 'Kunde inte spara hållplatsen')
    }

    configuredStop.value = data as StopConfiguration
    searchQuery.value = ''
    searchResults.value = []
    showMessage(`Hållplatsen ${stop.name} (${stop.id}) har sparats.`, 'success')
    await fetchTrafficData(false)
  } catch (error) {
    console.error('Stop configuration save failed:', error)
    showMessage(
      error instanceof Error ? error.message : 'Kunde inte spara hållplatsen',
      'error'
    )
  } finally {
    isSaving.value = false
  }
}

const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp)
  return Number.isNaN(date.getTime())
    ? 'Okänd tid'
    : date.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit', hour12: false })
}

const showDepartureInMinutesFromNow = (departureTime: string): string => {
  const diffMins = Math.round((new Date(departureTime).getTime() - Date.now()) / 60000)
  return diffMins > 0 ? `${diffMins} min` : 'Nu'
}

onMounted(async () => {
  if (await loadConfiguration()) await fetchTrafficData(false)
})

onBeforeUnmount(() => clearTimeout(messageTimer))
</script>

<style scoped>
.traffic-container {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: 60vh;
  padding: 1rem;
  min-width: 60%;
}

.traffic-card {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  max-width: 1200px;
  width: 100%;
}

.traffic-card h2 {
  text-align: center;
  margin-bottom: 0.5rem;
  color: #333;
}

.description {
  text-align: center;
  color: #666;
  margin-bottom: 2rem;
}

.admin-panel {
  max-width: 720px;
  margin: 0 auto 2rem;
  padding: 1.5rem;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  background: #f8f9fa;
}

.admin-panel > label {
  display: block;
  margin-bottom: 0.5rem;
  color: #333;
  font-weight: 600;
}

.configured-stop {
  display: flex;
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

.configured-label {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.configured-stop code,
.search-item code {
  color: #555;
  font-size: 0.85rem;
}

.fetch-btn {
  background: #667eea;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.3s;
}

.fetch-btn:hover:not(:disabled) {
  background: #5a6fd8;
}

.fetch-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.message {
  margin-bottom: 1rem;
  padding: 0.75rem;
  border-radius: 4px;
  text-align: center;
}

.message.success {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.message.error {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.traffic-section {
  max-width: 900px;
  margin: 0 auto;
}

.traffic-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.traffic-title h3 {
  margin: 0;
  color: #333;
}

.traffic-data {
  margin-top: 1rem;
}

.data-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #eee;
}

.data-header h4 {
  margin: 0;
  color: #333;
}

.timestamp {
  color: #666;
  font-size: 0.9rem;
}

.traffic-grid {
  display: flex;
  flex-direction: column;
  /* grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); */
  gap: 1rem;
  margin-bottom: 2rem;
}

.traffic-item {
  background: #f8f9fa;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  padding: 1.5rem;
  transition: all 0.3s;
}

.traffic-item.congestion-light {
  border-color: #28a745;
  background: #f8fff9;
}

.traffic-item.congestion-moderate {
  border-color: #ffc107;
  background: #fffef8;
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

.search-hint,
.no-data,
.no-departures {
  padding: 1rem;
  color: #666;
  text-align: center;
}

.no-data {
  padding: 2rem 1rem;
}

@media (max-width: 600px) {
  .traffic-card {
    padding: 1.25rem;
  }

  .configured-stop,
  .search-item,
  .traffic-title,
  .data-header {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
