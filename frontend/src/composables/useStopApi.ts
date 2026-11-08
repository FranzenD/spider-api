import { API_BASE_URL } from '../api'
import type {
  Stop,
  StopConfiguration,
  StopSearchResponse,
  TrafficApiResponse,
} from '../types'
import { getApiError } from './useApiError'

const requestJson = async <T>(
  path: string,
  options: RequestInit,
  failureMessage: string
): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, options)
  const data: unknown = await response.json()

  if (!response.ok) {
    throw new Error(getApiError(data) || failureMessage)
  }

  return data as T
}

export const useStopApi = () => ({
  searchStops(query: string, signal?: AbortSignal): Promise<StopSearchResponse> {
    return requestJson(
      `/api/stops/search?query=${encodeURIComponent(query)}`,
      signal ? { signal } : {},
      'Hållplatssökningen misslyckades'
    )
  },

  getStopConfiguration(signal?: AbortSignal): Promise<StopConfiguration> {
    return requestJson(
      '/api/stops/config',
      signal ? { signal } : {},
      'Kunde inte läsa konfigurationen'
    )
  },

  saveStopConfiguration(stop: Stop): Promise<StopConfiguration> {
    return requestJson(
      '/api/stops/config',
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          areaId: stop.id,
          stopName: stop.name,
          stops: stop.stops,
        }),
      },
      'Kunde inte spara hållplatsen'
    )
  },

  getTraffic(signal?: AbortSignal): Promise<TrafficApiResponse> {
    return requestJson(
      '/api/traffic',
      signal ? { signal } : {},
      'Kunde inte hämta trafikdata'
    )
  },
})
