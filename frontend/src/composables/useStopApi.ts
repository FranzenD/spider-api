import { API_BASE_URL } from '../api'
import type {
  Stop,
  StopConfiguration,
  StopSearchResponse,
  TrafficApiResponse,
} from '../types'
import { isStopConfiguration, isStopSearchResponse, isTrafficApiResponse } from '../validation'
import { getApiError } from './useApiError'

const requestJson = async <T>(
  path: string,
  options: RequestInit,
  failureMessage: string,
  isValid: (data: unknown) => data is T
): Promise<T> => {
  let response: Response
  let data: unknown
  try {
    response = await fetch(`${API_BASE_URL}${path}`, options)
    data = await response.json()
  } catch (error) {
    if (options.signal?.aborted) throw error
    throw new Error(failureMessage)
  }

  if (!response.ok) {
    throw new Error(getApiError(data) || failureMessage)
  }

  if (!isValid(data)) {
    throw new Error(`${failureMessage}. Servern skickade ett oväntat svar.`)
  }

  return data
}

export const useStopApi = () => ({
  searchStops(query: string, signal?: AbortSignal): Promise<StopSearchResponse> {
    return requestJson(
      `/api/stops/search?query=${encodeURIComponent(query)}`,
      signal ? { signal } : {},
      'Hållplatssökningen misslyckades',
      isStopSearchResponse
    )
  },

  getStopConfiguration(signal?: AbortSignal): Promise<StopConfiguration> {
    return requestJson(
      '/api/stops/config',
      signal ? { signal } : {},
      'Kunde inte läsa konfigurationen',
      isStopConfiguration
    )
  },

  saveStopConfiguration(stop: Stop, signal?: AbortSignal): Promise<StopConfiguration> {
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
        signal,
      },
      'Kunde inte spara hållplatsen',
      (data): data is StopConfiguration => isStopConfiguration(data) && data.areaId === stop.id
    )
  },

  saveStopDestination(areaId: string, destination: string, signal?: AbortSignal): Promise<StopConfiguration> {
    return requestJson(
      '/api/stops/config/destination',
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ areaId, destination }),
        signal,
      },
      'Kunde inte spara destinationen',
      (data): data is StopConfiguration =>
        isStopConfiguration(data) &&
        data.areaId === areaId &&
        data.destination?.toLowerCase() === destination.toLowerCase()
    )
  },

  getTraffic(areaId: string, signal?: AbortSignal): Promise<TrafficApiResponse> {
    return requestJson(
      `/api/traffic?areaId=${encodeURIComponent(areaId)}&all=true`,
      signal ? { signal } : {},
      'Kunde inte hämta trafikdata',
      isTrafficApiResponse
    )
  },
})
