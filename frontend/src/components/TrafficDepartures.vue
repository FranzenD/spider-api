<template>
  <section class="traffic-section">
    <div class="traffic-title">
      <h3>Trafikavgångar</h3>
      <button
        type="button"
        @click="$emit('refresh')"
        :disabled="isLoading || isSaving || !hasConfiguredStop"
        class="fetch-btn"
      >
        {{ isLoading ? 'Hämtar...' : 'Uppdatera trafik' }}
      </button>
    </div>

    <fieldset v-if="hasConfiguredStop" class="destination-filter" :disabled="!selectedDestination">
      <legend>Visa avgångar</legend>
      <div class="destination-filter-options">
        <label>
          <input v-model="destinationFilter" type="radio" name="destination-filter" value="all" />
          Alla destinationer
        </label>
        <label>
          <input
            v-model="destinationFilter"
            type="radio"
            name="destination-filter"
            value="selected"
          />
          Vald destination
        </label>
      </div>
    </fieldset>

    <DismissibleMessage v-if="trafficError" class="message error" :text="trafficError" role="alert" />
    <DismissibleMessage
      v-if="trafficSuccess"
      class="message success traffic-success"
      :text="trafficSuccess.text"
      :duration-ms="trafficSuccess.durationMs"
      :reset-key="trafficSuccess.id"
      @dismiss="$emit('dismiss-success')"
    />
    <DismissibleMessage
      v-if="favoriteMessage"
      class="message success"
      :text="favoriteMessage.text"
      :duration-ms="favoriteMessage.durationMs"
      :reset-key="favoriteMessage.id"
      @dismiss="$emit('dismiss-favorite')"
    />

    <div v-if="trafficData" class="traffic-data">
      <div class="data-header">
        <h4>{{ stopName }}</h4>
        <span v-if="trafficData.meta?.timestamp" class="timestamp">
          Uppdaterad: {{ formatTimestamp(trafficData.meta.timestamp) }}
        </span>
      </div>

      <div class="destination-groups">
        <section
          v-for="group in visibleDepartures"
          :key="group.key"
          class="destination-group"
        >
          <h4 class="destination-heading">
            {{ group.destination }}<span v-if="group.designations.length">
              ({{ group.designations.join(', ') }})
            </span>
          </h4>
          <div class="traffic-grid">
            <div
              v-for="(departure, index) in group.departures"
              :key="`${departure.realtime}-${departure.route.designation}-${index}`"
              class="traffic-item"
            >
              <div class="location">
                <h4>{{ formatTimestamp(departure.timestampMs) }}</h4>
                <p>{{ showDepartureInMinutesFromNow(departure.timestampMs) }}</p>
              </div>
            </div>
          </div>
        </section>
      </div>
      <DismissibleMessage
        v-if="visibleDepartures.length === 0"
        class="no-departures"
        :reset-key="trafficData.meta?.timestamp"
        :text="filteredDestination
          ? `Inga kommande avgångar till ${filteredDestination}.`
          : 'Inga kommande avgångar för den här hållplatsen.'"
      />
    </div>

    <DismissibleMessage v-else-if="isLoading" class="no-data" text="Hämtar trafikdata..." />
    <DismissibleMessage
      v-else-if="!hasConfiguredStop && !isSaving"
      class="no-data"
      text="Välj en hållplats för att visa aktuella avgångar."
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { TimedMessage, TrafficApiResponse, TrafficDeparture } from '../types'
import DismissibleMessage from './DismissibleMessage.vue'

const props = defineProps<{
  trafficData: TrafficApiResponse | null
  stopName: string
  selectedDestination?: string
  hasConfiguredStop: boolean
  isLoading: boolean
  isSaving: boolean
  trafficError: string
  trafficSuccess: TimedMessage | null
  favoriteMessage: TimedMessage | null
}>()

defineEmits<{
  refresh: []
  'dismiss-success': []
  'dismiss-favorite': []
}>()

const MAX_DEPARTURES_PER_DESTINATION = 3
const destinationFilter = ref<'all' | 'selected'>('all')
const filteredDestination = computed(() =>
  destinationFilter.value === 'selected' ? props.selectedDestination : undefined
)
const now = ref(Date.now())
let clock: ReturnType<typeof setInterval> | undefined

watch(() => props.selectedDestination, destination => {
  if (!destination) destinationFilter.value = 'all'
})

type TimedDeparture = TrafficDeparture & { timestampMs: number }

const timedDepartures = computed(() =>
  (props.trafficData?.departures ?? [])
    .map(departure => ({ ...departure, timestampMs: Date.parse(departure.realtime) }))
    .filter(departure => Number.isFinite(departure.timestampMs))
    .sort((a, b) => a.timestampMs - b.timestampMs)
)

const departuresByDestination = computed(() => {
  const groups = new Map<
    string,
    {
      key: string
      destination: string
      departures: TimedDeparture[]
      designations: string[]
    }
  >()

  for (const departure of timedDepartures.value) {
    if (departure.timestampMs < now.value) continue

    const destination = departure.route.direction.trim() || 'Okänd destination'
    const key = destination.toLocaleLowerCase('sv-SE')
    const group = groups.get(key)
    const designation = departure.route.designation.trim()

    if (group) {
      if (group.departures.length >= MAX_DEPARTURES_PER_DESTINATION) continue

      group.departures.push(departure)
      if (designation && !group.designations.includes(designation)) {
        group.designations.push(designation)
      }
    } else {
      groups.set(key, {
        key,
        destination,
        departures: [departure],
        designations: designation ? [designation] : [],
      })
    }
  }

  return Array.from(groups.values())
})

const visibleDepartures = computed(() => {
  const destinationKey = filteredDestination.value?.trim().toLocaleLowerCase('sv-SE')
  const groups = departuresByDestination.value
  return destinationKey ? groups.filter(group => group.key === destinationKey) : groups
})

const formatTimestamp = (timestamp: string | number): string => {
  const date = new Date(typeof timestamp === 'string' ? Date.parse(timestamp) : timestamp)
  return Number.isNaN(date.getTime())
    ? 'Okänd tid'
    : date.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit', hour12: false })
}

onMounted(() => {
  clock = setInterval(() => {
    now.value = Date.now()
  }, 1000)
})

onBeforeUnmount(() => clearInterval(clock))

const showDepartureInMinutesFromNow = (timestampMs: number): string => {
  const diffMins = Math.round((timestampMs - now.value) / 60000)
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

.destination-filter {
  min-width: 0;
  margin: 0 0 1rem;
  padding: 0.5rem 0.75rem 0.75rem;
  border: 1px solid #e1e4e8;
  border-radius: 6px;
  color: #333;
}

.destination-filter legend {
  padding: 0 0.25rem;
  font-weight: 600;
}

.destination-filter:disabled {
  color: #666;
}

.destination-filter-options {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1.25rem;
}

.destination-filter-options label {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.destination-filter-options input {
  margin: 0;
  accent-color: #5263cb;
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
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
