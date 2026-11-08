<template>
  <section class="traffic-section">
    <div class="traffic-title">
      <h3>Trafikavgångar</h3>
      <button
        type="button"
        @click="$emit('refresh')"
        :disabled="isLoading || !hasConfiguredStop"
        class="fetch-btn"
      >
        {{ isLoading ? 'Hämtar...' : 'Uppdatera trafik' }}
      </button>
    </div>

    <div v-if="trafficError" class="message error" role="alert">
      {{ trafficError }}
    </div>
    <div v-if="trafficSuccess" class="message success" role="status">
      {{ trafficSuccess }}
    </div>
    <div v-if="favoriteMessage" class="message success" role="status">
      {{ favoriteMessage }}
    </div>

    <div v-if="trafficData" class="traffic-data">
      <div class="data-header">
        <h4>{{ stopName }}</h4>
        <span v-if="trafficData.meta?.timestamp" class="timestamp">
          Uppdaterad: {{ formatTimestamp(trafficData.meta.timestamp) }}
        </span>
      </div>

      <div class="destination-groups">
        <section
          v-for="group in departuresByDestination"
          :key="group.key"
          class="destination-group"
        >
          <h4 class="destination-heading">{{ group.destination }}</h4>
          <div class="traffic-grid">
            <div
              v-for="(departure, index) in group.departures"
              :key="`${departure.realtime}-${departure.route.designation}-${index}`"
              class="traffic-item"
            >
              <div class="location">
                <h4>{{ formatTimestamp(departure.realtime) }}</h4>
                <p>{{ showDepartureInMinutesFromNow(departure.realtime) }}</p>
              </div>
            </div>
          </div>
        </section>
      </div>
      <p v-if="trafficData.departures.length === 0" class="no-departures">
        Inga avgångar hittades för den här hållplatsen.
      </p>
    </div>

    <div v-else-if="!isLoading" class="no-data">
      <p>Välj en hållplats för att visa aktuella avgångar.</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TrafficApiResponse } from '../types'

const props = defineProps<{
  trafficData: TrafficApiResponse | null
  stopName: string
  hasConfiguredStop: boolean
  isLoading: boolean
  trafficError: string
  trafficSuccess: string
  favoriteMessage: string
}>()

defineEmits<{
  refresh: []
}>()

const departuresByDestination = computed(() => {
  const groups = new Map<
    string,
    { key: string; destination: string; departures: NonNullable<typeof props.trafficData>['departures'] }
  >()

  for (const departure of props.trafficData?.departures ?? []) {
    const destination = departure.route.direction.trim() || 'Okänd destination'
    const key = destination.toLocaleLowerCase('sv-SE')
    const group = groups.get(key)

    if (group) {
      group.departures.push(departure)
    } else {
      groups.set(key, { key, destination, departures: [departure] })
    }
  }

  return Array.from(groups.values())
})

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
</script>

<style scoped>
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
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.destination-groups {
  display: grid;
  gap: 1.5rem;
}

.destination-heading {
  margin: 0 0 0.75rem;
  color: #333;
}

.destination-group .traffic-grid {
  margin-bottom: 0;
}

.traffic-item {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  padding: 0.6rem 0.75rem;
  transition: background-color 0.2s, border-color 0.2s;
}

.traffic-item.congestion-light {
  border-color: #28a745;
  background: #f8fff9;
}

.traffic-item.congestion-moderate {
  border-color: #ffc107;
  background: #fffef8;
}

.location {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.5rem;
}

.location h4,
.location p {
  margin: 0;
}

.location h4 {
  color: #333;
  font-size: 1rem;
}

.location p {
  color: #666;
  font-size: 0.9rem;
}

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
  .traffic-title,
  .data-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .traffic-grid {
    grid-template-columns: repeat(auto-fit, minmax(95px, 1fr));
  }
}
</style>
