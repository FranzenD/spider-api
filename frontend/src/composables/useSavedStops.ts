import { onBeforeUnmount, ref } from 'vue'
import type { Stop, StopConfiguration, StopLocation } from '../types'

const FAVORITES_STORAGE_KEY = 'spider-api.favorite-stops'
const RECENT_STOPS_STORAGE_KEY = 'spider-api.recent-stops'
const MAX_SAVED_STOPS = 5

const isStopLocation = (value: unknown): value is StopLocation => {
  if (typeof value !== 'object' || value === null) return false
  if (!('id' in value) || typeof value.id !== 'string') return false
  if (!('name' in value) || typeof value.name !== 'string') return false
  if (!('lat' in value) || typeof value.lat !== 'number' || !Number.isFinite(value.lat)) {
    return false
  }
  return 'lon' in value && typeof value.lon === 'number' && Number.isFinite(value.lon)
}

const isStop = (value: unknown): value is Stop =>
  typeof value === 'object' &&
  value !== null &&
  'id' in value &&
  typeof value.id === 'string' &&
  'name' in value &&
  typeof value.name === 'string' &&
  'stops' in value &&
  Array.isArray(value.stops) &&
  value.stops.every(isStopLocation)

const loadStops = (key: string): Stop[] => {
  const storedValue = localStorage.getItem(key)
  if (!storedValue) return []

  const parsed: unknown = JSON.parse(storedValue)
  if (!Array.isArray(parsed) || !parsed.every(isStop)) {
    throw new Error(`Ogiltig sparad hållplatslista: ${key}`)
  }
  return parsed.slice(0, MAX_SAVED_STOPS)
}

export const useSavedStops = (onStorageError: (message: string) => void) => {
  const favorites = ref<Stop[]>([])
  const recentStops = ref<Stop[]>([])
  const favoriteMessage = ref('')
  let favoriteMessageTimer: ReturnType<typeof setTimeout> | undefined

  const persistStops = (key: string, stops: Stop[]): void => {
    try {
      localStorage.setItem(key, JSON.stringify(stops))
    } catch (error) {
      console.error('Could not save stop list:', error)
      onStorageError('Kunde inte spara hållplatslistan i webbläsaren.')
    }
  }

  const initialize = (): void => {
    try {
      favorites.value = loadStops(FAVORITES_STORAGE_KEY)
      recentStops.value = loadStops(RECENT_STOPS_STORAGE_KEY)
    } catch (error) {
      console.error('Saved stop lists could not be loaded:', error)
      onStorageError('Kunde inte läsa sparade favoriter eller sökhistorik.')
    }
  }

  const rememberStop = (stop: Stop): void => {
    recentStops.value = [
      stop,
      ...recentStops.value.filter(recentStop => recentStop.id !== stop.id),
    ].slice(0, MAX_SAVED_STOPS)
    persistStops(RECENT_STOPS_STORAGE_KEY, recentStops.value)
  }

  const removeRecentStop = (areaId: string): void => {
    recentStops.value = recentStops.value.filter(stop => stop.id !== areaId)
    persistStops(RECENT_STOPS_STORAGE_KEY, recentStops.value)
  }

  const clearHistory = (): void => {
    recentStops.value = []
    persistStops(RECENT_STOPS_STORAGE_KEY, recentStops.value)
  }

  const removeFavorite = (areaId: string): void => {
    favorites.value = favorites.value.filter(stop => stop.id !== areaId)
    persistStops(FAVORITES_STORAGE_KEY, favorites.value)
  }

  const showFavoriteMessage = (message: string): void => {
    if (favoriteMessageTimer) clearTimeout(favoriteMessageTimer)
    favoriteMessage.value = message
    favoriteMessageTimer = setTimeout(() => {
      favoriteMessage.value = ''
    }, 5000)
  }

  const toggleFavorite = (configuredStop: StopConfiguration): void => {
    const stop: Stop = {
      id: configuredStop.areaId,
      name: configuredStop.stopName || `Hållplats ${configuredStop.areaId}`,
      stops: configuredStop.stops || [],
    }

    if (favorites.value.some(favorite => favorite.id === stop.id)) {
      removeFavorite(stop.id)
      showFavoriteMessage(`${stop.name} har tagits bort från favoriter.`)
      return
    }

    favorites.value = [
      stop,
      ...favorites.value.filter(favorite => favorite.id !== stop.id),
    ].slice(0, MAX_SAVED_STOPS)
    persistStops(FAVORITES_STORAGE_KEY, favorites.value)
    showFavoriteMessage(`${stop.name} har lagts till bland favoriterna.`)
  }

  const selectStop = (stop: Stop, source: 'search' | 'favorite' | 'history'): void => {
    if (source === 'favorite') removeRecentStop(stop.id)
    if (source === 'search') rememberStop(stop)
  }

  onBeforeUnmount(() => {
    if (favoriteMessageTimer) clearTimeout(favoriteMessageTimer)
  })

  return {
    favorites,
    recentStops,
    favoriteMessage,
    initialize,
    removeFavorite,
    clearHistory,
    selectStop,
    toggleFavorite,
  }
}
