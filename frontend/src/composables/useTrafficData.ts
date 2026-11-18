import { computed, onBeforeUnmount, ref } from 'vue'
import type { TimedMessage, TrafficApiResponse } from '../types'
import { useStopApi } from './useStopApi'

const SUCCESS_DURATION_MS = 5000

export const useTrafficData = (getAreaId: () => string | undefined) => {
  const stopApi = useStopApi()
  const snapshot = ref<{ areaId: string; data: TrafficApiResponse } | null>(null)
  const data = computed(() => {
    const current = snapshot.value
    return current && current.areaId === getAreaId() ? current.data : null
  })
  const isLoading = ref(false)
  const error = ref('')
  const success = ref<TimedMessage | null>(null)
  let requestId = 0
  let controller: AbortController | undefined

  const dismissSuccess = (): void => {
    success.value = null
  }

  const cancel = (): void => {
    requestId += 1
    controller?.abort()
    controller = undefined
    isLoading.value = false
  }

  const fetchTrafficData = async (showSuccess = true): Promise<boolean> => {
    const areaId = getAreaId()
    if (!areaId) return false

    controller?.abort()
    const requestController = new AbortController()
    controller = requestController
    const currentRequestId = ++requestId
    isLoading.value = true
    error.value = ''
    dismissSuccess()

    try {
      const responseData = await stopApi.getTraffic(areaId, requestController.signal)
      if (currentRequestId !== requestId || areaId !== getAreaId()) return false

      snapshot.value = { areaId, data: responseData }
      if (showSuccess) {
        success.value = {
          id: currentRequestId,
          text: 'Trafikdata uppdaterad.',
          durationMs: SUCCESS_DURATION_MS,
        }
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

  onBeforeUnmount(cancel)

  return { data, isLoading, error, success, dismissSuccess, fetchTrafficData, cancel }
}
