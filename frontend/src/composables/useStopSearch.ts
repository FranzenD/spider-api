import { onBeforeUnmount, ref, watch } from 'vue'
import type { Stop } from '../types'
import { useStopApi } from './useStopApi'

export const useStopSearch = () => {
  const stopApi = useStopApi()
  const query = ref('')
  const results = ref<Stop[]>([])
  const hasSearched = ref(false)
  const isSearching = ref(false)
  const error = ref('')
  let activeController: AbortController | undefined
  let searchTimer: ReturnType<typeof setTimeout> | undefined
  let requestId = 0

  const cancel = (): void => {
    requestId += 1
    if (searchTimer) clearTimeout(searchTimer)
    activeController?.abort()
    activeController = undefined
    isSearching.value = false
  }

  watch(query, (value, _previousValue, onCleanup) => {
    const searchQuery = value.trim()
    results.value = []
    hasSearched.value = false
    error.value = ''

    if (searchQuery.length < 2) {
      isSearching.value = false
      return
    }

    const controller = new AbortController()
    activeController = controller
    const currentRequestId = ++requestId
    searchTimer = setTimeout(async () => {
      isSearching.value = true
      try {
        const data = await stopApi.searchStops(searchQuery, controller.signal)
        if (!controller.signal.aborted && currentRequestId === requestId) {
          results.value = data.stops
          hasSearched.value = true
        }
      } catch (caughtError) {
        if (caughtError instanceof Error && caughtError.name === 'AbortError') return
        if (currentRequestId !== requestId) return
        console.error('Stop search failed:', caughtError)
        error.value =
          caughtError instanceof Error
            ? caughtError.message
            : 'Hållplatssökningen misslyckades'
      } finally {
        if (currentRequestId === requestId) {
          isSearching.value = false
          activeController = undefined
        }
      }
    }, 300)

    onCleanup(() => {
      if (searchTimer) clearTimeout(searchTimer)
      controller.abort()
    })
  })

  onBeforeUnmount(cancel)

  return { query, results, hasSearched, isSearching, error, cancel }
}
