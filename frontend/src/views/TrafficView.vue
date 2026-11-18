<template>
  <div class="traffic-container">
    <div class="traffic-card">
      <h2>Hållplatsadministration</h2>
      <p class="description">
        Sök upp hållplatsen som ska användas för trafikvisningen.
      </p>

      <div class="admin-layout">
        <aside class="stop-sidebar" aria-label="Sparade hållplatser">
          <Favorites
            :stops="favorites"
            :disabled="isSaving || isLoadingConfiguration"
            @select="selectFavorite"
            @remove="removeFavorite"
          />
          <History
            :stops="recentStops"
            :disabled="isSaving || isLoadingConfiguration"
            @select="selectHistoryStop"
            @clear="clearHistory"
          />
        </aside>

        <div class="admin-content">
          <section class="admin-panel">
            <ConfiguredStop
              :stop="configuredStop"
              :is-favorite="isCurrentStopFavorite"
              @toggle-favorite="toggleCurrentStopFavorite"
            />

            <StopSearch
              v-model:query="searchQuery"
              :results="searchResults"
              :has-searched="hasSearched"
              :is-searching="isSearching"
              :is-saving="isSaving"
              :selection-disabled="isLoadingConfiguration"
              :error="searchError"
              @select="selectSearchStop"
            />

            <form v-if="configuredStop" class="destination-form" @submit.prevent="saveDestination">
              <label for="configured-destination">Destination för den externa appen</label>
              <div class="destination-controls">
                <select
                  id="configured-destination"
                  v-model="destinationDraft"
                  :disabled="isSaving || isLoading || !destinations.length"
                  required
                >
                  <option disabled value="">{{ isLoading ? 'Hämtar destinationer…' : 'Välj destination' }}</option>
                  <option
                    v-if="configuredStop.destination && !destinations.includes(configuredStop.destination)"
                    :value="configuredStop.destination"
                  >
                    {{ configuredStop.destination }}
                  </option>
                  <option v-for="destination in destinations" :key="destination" :value="destination">
                    {{ destination }}
                  </option>
                </select>
                <button type="submit" :disabled="!canSaveDestination">Spara destination</button>
              </div>
              <p v-if="trafficData && !isLoading && !destinations.length" class="destination-hint">
                Inga destinationer hittades bland hållplatsens aktuella avgångar.
              </p>
            </form>

            <DismissibleMessage
              v-if="message"
              :class="['message', messageType]"
              :text="message"
              :role="messageType === 'error' ? 'alert' : 'status'"
              :duration-ms="MESSAGE_DURATION_MS"
              :reset-key="messageId"
              @dismiss="dismissMessage"
            />
          </section>

          <TrafficDepartures
            :traffic-data="trafficData"
            :stop-name="configuredStop?.stopName || `Hållplats ${configuredStop?.areaId ?? ''}`"
            :selected-destination="configuredStop?.destination"
            :has-configured-stop="Boolean(configuredStop)"
            :is-loading="isLoading || isLoadingConfiguration"
            :is-saving="isSaving"
            :traffic-error="trafficError"
            :traffic-success="trafficSuccess"
            :favorite-message="favoriteMessage"
            @refresh="fetchTrafficData()"
            @dismiss-success="dismissTrafficSuccess"
            @dismiss-favorite="dismissFavoriteMessage"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import ConfiguredStop from '../components/ConfiguredStop.vue'
import DismissibleMessage from '../components/DismissibleMessage.vue'
import Favorites from '../components/Favorites.vue'
import History from '../components/History.vue'
import StopSearch from '../components/StopSearch.vue'
import TrafficDepartures from '../components/TrafficDepartures.vue'
import { useSavedStops } from '../composables/useSavedStops'
import { useStopSearch } from '../composables/useStopSearch'
import { useStopApi } from '../composables/useStopApi'
import { useTrafficData } from '../composables/useTrafficData'
import type { MessageType, Stop, StopConfiguration } from '../types'

const configuredStop = ref<StopConfiguration | null>(null)
const configurationController = new AbortController()
const isLoadingConfiguration = ref(true)
const isSaving = ref(false)
const MESSAGE_DURATION_MS = 5000
const message = ref('')
const messageType = ref<MessageType>('success')
const messageId = ref(0)
const dismissMessage = (): void => {
  message.value = ''
}

const showMessage = (text: string, type: MessageType): void => {
  message.value = text
  messageType.value = type
  messageId.value += 1
}

const {
  query: searchQuery,
  results: searchResults,
  hasSearched,
  isSearching,
  error: searchError,
  cancel: cancelStopSearch,
} = useStopSearch()

const {
  favorites,
  recentStops,
  favoriteMessage,
  dismissFavoriteMessage,
  initialize: initializeSavedStops,
  removeFavorite,
  clearHistory,
  selectStop: updateSavedStopsForSelection,
  toggleFavorite,
} = useSavedStops(text => showMessage(text, 'error'))

const isCurrentStopFavorite = computed(() =>
  configuredStop.value
    ? favorites.value.some(stop => stop.id === configuredStop.value?.areaId)
    : false
)

const {
  data: trafficData,
  isLoading,
  error: trafficError,
  success: trafficSuccess,
  dismissSuccess: dismissTrafficSuccess,
  fetchTrafficData,
  cancel: cancelTrafficRequest,
} = useTrafficData(() => configuredStop.value?.areaId)
const stopApi = useStopApi()
const destinationDraft = ref('')
const destinations = computed(() => {
  const names = new Map<string, string>()
  const saved = configuredStop.value?.destination
  for (const departure of trafficData.value?.departures ?? []) {
    const direction = departure.route.direction.trim()
    if (!direction) continue
    const key = direction.toLowerCase()
    names.set(key, saved?.toLowerCase() === key ? saved : direction)
  }
  return [...names.values()].sort((a, b) => a.localeCompare(b, 'sv-SE'))
})
const canSaveDestination = computed(() =>
  !isSaving.value &&
  !isLoading.value &&
  destinationDraft.value !== configuredStop.value?.destination &&
  destinations.value.includes(destinationDraft.value)
)

watch(configuredStop, stop => {
  destinationDraft.value = stop?.destination ?? ''
})

const saveDestination = async (): Promise<void> => {
  const stop = configuredStop.value
  if (!stop || !canSaveDestination.value) return

  isSaving.value = true
  try {
    const config = await stopApi.saveStopDestination(
      stop.areaId, destinationDraft.value, configurationController.signal
    )
    configuredStop.value = config
    showMessage(`Destinationen ${config.destination} har sparats.`, 'success')
  } catch (error) {
    if (configurationController.signal.aborted) return
    console.error('Stop destination save failed:', error)
    showMessage(
      error instanceof Error ? error.message : 'Kunde inte spara destinationen',
      'error'
    )
  } finally {
    isSaving.value = false
  }
}

const loadConfiguration = async (): Promise<boolean> => {
  try {
    configuredStop.value = await stopApi.getStopConfiguration(configurationController.signal)
    return true
  } catch (error) {
    if (configurationController.signal.aborted) return false
    console.error('Configuration load failed:', error)
    showMessage(
      error instanceof Error ? error.message : 'Kunde inte läsa konfigurationen',
      'error'
    )
    return false
  } finally {
    isLoadingConfiguration.value = false
  }
}

const selectStop = async (
  stop: Stop,
  source: 'search' | 'favorite' | 'history'
): Promise<void> => {
  if (isSaving.value || isLoadingConfiguration.value) return

  cancelTrafficRequest()
  cancelStopSearch()
  isSaving.value = true
  try {
    configuredStop.value = await stopApi.saveStopConfiguration(stop, configurationController.signal)
    updateSavedStopsForSelection(stop, source)
    searchQuery.value = ''
    showMessage(`Hållplatsen ${stop.name} (${stop.id}) har sparats.`, 'success')
    await fetchTrafficData(false)
  } catch (error) {
    if (configurationController.signal.aborted) return
    console.error('Stop configuration save failed:', error)
    showMessage(
      error instanceof Error ? error.message : 'Kunde inte spara hållplatsen',
      'error'
    )
  } finally {
    isSaving.value = false
  }
}

const selectSearchStop = (stop: Stop): void => {
  void selectStop(stop, 'search')
}

const selectFavorite = (stop: Stop): void => {
  void selectStop(stop, 'favorite')
}

const selectHistoryStop = (stop: Stop): void => {
  void selectStop(stop, 'history')
}

const toggleCurrentStopFavorite = (): void => {
  if (configuredStop.value) toggleFavorite(configuredStop.value)
}

onMounted(async () => {
  initializeSavedStops()
  if (await loadConfiguration()) await fetchTrafficData(false)
})

onBeforeUnmount(() => {
  configurationController.abort()
})
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

.admin-layout {
  display: grid;
  grid-template-columns: minmax(220px, 270px) minmax(0, 1fr);
  gap: 1.5rem;
  align-items: start;
}

.stop-sidebar {
  display: grid;
  gap: 1rem;
}

.admin-content {
  min-width: 0;
}

.destination-form {
  margin-top: 1rem;
}

.destination-form label {
  display: block;
  margin-bottom: 0.5rem;
  color: #333;
  font-weight: 600;
}

.destination-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.destination-controls select,
.destination-controls button {
  padding: 0.6rem 0.75rem;
  border-radius: 5px;
  font: inherit;
}

.destination-controls select {
  flex: 1;
  min-width: 0;
  border: 1px solid #d5d9de;
  background: white;
  color: #333;
}

.destination-controls button {
  border: 0;
  background: #5263cb;
  color: white;
  cursor: pointer;
}

.destination-controls button:disabled {
  background: #e5e7eb;
  color: #666;
  cursor: default;
}

.destination-hint {
  margin: 0.5rem 0 0;
  color: #666;
  font-size: 0.9rem;
}

.message {
  margin-top: 0.75rem;
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

@media (max-width: 600px) {
  .traffic-card {
    padding: 1.25rem;
  }

  .admin-layout {
    grid-template-columns: 1fr;
  }
}
</style>
