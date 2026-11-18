import { ref } from 'vue'
import { isStop } from '../validation'
import type { Stop, StopConfiguration, TimedMessage } from '../types'

const FAVORITES_STORAGE_KEY = 'spider-api.favorite-stops'
const RECENT_STOPS_STORAGE_KEY = 'spider-api.recent-stops'
const MAX_SAVED_STOPS = 5

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
  const favoriteMessage = ref<TimedMessage | null>(null)
  let favoriteMessageId = 0

  const persistStops = (key: string, stops: Stop[]): void => {
    try {
      localStorage.setItem(key, JSON.stringify(stops))
    } catch (error) {
      console.error('Could not save stop list:', error)
      onStorageError('Kunde inte spara hållplatslistan i webbläsaren.')
    }
  }

  const initialize = (): void => {
    const lists = [
      { key: FAVORITES_STORAGE_KEY, target: favorites, label: 'sparade favoriter' },
      { key: RECENT_STOPS_STORAGE_KEY, target: recentStops, label: 'sökhistoriken' },
    ]
    const failedLists: string[] = []
    for (const { key, target, label } of lists) {
      try {
        target.value = loadStops(key)
      } catch (error) {
        console.error('Saved stop list could not be loaded:', error)
        failedLists.push(label)
      }
    }
    if (failedLists.length) {
      onStorageError(`Kunde inte läsa ${failedLists.join(' eller ')}.`)
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

  const showFavoriteMessage = (text: string): void => {
    favoriteMessage.value = { id: ++favoriteMessageId, text, durationMs: 5000 }
  }

  const dismissFavoriteMessage = (): void => {
    favoriteMessage.value = null
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

  return {
    favorites,
    recentStops,
    favoriteMessage,
    dismissFavoriteMessage,
    initialize,
    removeFavorite,
    clearHistory,
    selectStop,
    toggleFavorite,
  }
}
