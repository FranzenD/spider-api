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
            :disabled="isSaving"
            @select="selectFavorite"
            @remove="removeFavorite"
          />
          <History
            :stops="recentStops"
            :disabled="isSaving"
            @select="selectHistoryStop"
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
              :error="searchError"
              @select="selectSearchStop"
            />

            <div v-if="message" :class="['message', messageType]" role="status">
              {{ message }}
            </div>
          </section>

          <TrafficDepartures
            :traffic-data="trafficData"
            :stop-name="configuredStop?.stopName || `Hållplats ${configuredStop?.areaId ?? ''}`"
            :has-configured-stop="Boolean(configuredStop)"
            :is-loading="isLoading"
            :traffic-error="trafficError"
            :traffic-success="trafficSuccess"
            :favorite-message="favoriteMessage"
            @refresh="fetchTrafficData()"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import ConfiguredStop from '../components/ConfiguredStop.vue'
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
const isSaving = ref(false)
const message = ref('')
const messageType = ref<MessageType>('success')
let messageTimer: ReturnType<typeof setTimeout> | undefined

const showMessage = (text: string, type: MessageType): void => {
  if (messageTimer) clearTimeout(messageTimer)
  message.value = text
  messageType.value = type
  messageTimer = setTimeout(() => {
    message.value = ''
  }, 5000)
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
  initialize: initializeSavedStops,
  removeFavorite,
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
  fetchTrafficData,
  cancel: cancelTrafficRequest,
} = useTrafficData()
const stopApi = useStopApi()

const loadConfiguration = async (): Promise<boolean> => {
  try {
    configuredStop.value = await stopApi.getStopConfiguration()
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

const selectStop = async (
  stop: Stop,
  source: 'search' | 'favorite' | 'history'
): Promise<void> => {
  cancelTrafficRequest()
  cancelStopSearch()
  isSaving.value = true
  try {
    configuredStop.value = await stopApi.saveStopConfiguration(stop)
    updateSavedStopsForSelection(stop, source)
    searchQuery.value = ''
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
  if (messageTimer) clearTimeout(messageTimer)
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

@media (max-width: 600px) {
  .traffic-card {
    padding: 1.25rem;
  }

  .admin-layout {
    grid-template-columns: 1fr;
  }
}
</style>
