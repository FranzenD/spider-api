import { onBeforeUnmount, ref } from 'vue'
import { API_BASE_URL } from '../api'
import type { TrafficApiResponse } from '../types'
import { getApiError } from './useApiError'

export const useTrafficData = () => {
  const data = ref<TrafficApiResponse | null>(null)
  const isLoading = ref(false)
  const error = ref('')
  const success = ref('')
  let successTimer: ReturnType<typeof setTimeout> | undefined
  let requestId = 0
  let controller: AbortController | undefined

  const cancel = (): void => {
    requestId += 1
    controller?.abort()
    controller = undefined
    isLoading.value = false
  }

  const fetchTrafficData = async (showSuccess = true): Promise<boolean> => {
    controller?.abort()
    const requestController = new AbortController()
    controller = requestController
    const currentRequestId = ++requestId
    isLoading.value = true
    error.value = ''
    success.value = ''
    if (successTimer) clearTimeout(successTimer)

    try {
      const response = await fetch(`${API_BASE_URL}/api/traffic`, {
        signal: requestController.signal,
      })
      const responseData: unknown = await response.json()
      if (!response.ok) {
        throw new Error(getApiError(responseData) || 'Kunde inte hämta trafikdata')
      }
      if (currentRequestId !== requestId) return false

      data.value = responseData as TrafficApiResponse
      if (showSuccess) {
        success.value = 'Trafikdata uppdaterad.'
        successTimer = setTimeout(() => {
          success.value = ''
        }, 5000)
      }
      return true
    } catch (caughtError) {
      if (caughtError instanceof Error && caughtError.name === 'AbortError') return false
      if (currentRequestId !== requestId) return false
      console.error('Traffic data load failed:', caughtError)
      error.value =
        caughtError instanceof Error ? caughtError.message : 'Kunde inte hämta trafikdata'
      return false
    } finally {
      if (currentRequestId === requestId) {
        isLoading.value = false
        controller = undefined
      }
    }
  }

  onBeforeUnmount(() => {
    cancel()
    if (successTimer) clearTimeout(successTimer)
  })

  return { data, isLoading, error, success, fetchTrafficData, cancel }
}
