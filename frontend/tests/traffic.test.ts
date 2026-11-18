// @vitest-environment jsdom

import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { parseDepartureTime } from '../src/departureTime'
import StopSearch from '../src/components/StopSearch.vue'
import TrafficDepartures from '../src/components/TrafficDepartures.vue'
import { useStopApi } from '../src/composables/useStopApi'
import TrafficView from '../src/views/TrafficView.vue'

enableAutoUnmount(afterEach)

afterEach(() => {
  localStorage.clear()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const oldStop = { areaId: '1', stopName: 'Gamla hållplatsen', stops: [] }
const newStop = { id: '2', name: 'Nya hållplatsen', stops: [] }

const trafficFor = (direction: string, realtime = new Date(Date.now() + 60_000).toISOString()) => ({
  departures: [{ realtime, route: { direction, designation: '42' } }],
})

describe('StopSearch', () => {
  it('shows the empty message only when a completed search has no results', async () => {
    const search = mount(StopSearch, {
      props: {
        query: 'Nya',
        results: [newStop],
        hasSearched: true,
        isSearching: false,
        isSaving: false,
        error: '',
      },
    })

    expect(search.text()).toContain(newStop.name)
    expect(search.text()).not.toContain('Inga hållplatser hittades.')

    await search.setProps({ results: [] })
    expect(search.text()).toContain('Inga hållplatser hittades.')

    await search.get('button[aria-label="Stäng meddelandet"]').trigger('click')
    expect(search.text()).not.toContain('Inga hållplatser hittades.')

    await search.setProps({ error: 'Sökningen misslyckades' })
    expect(search.get('[role="alert"]').text()).toBe('Sökningen misslyckades')
    await search.get('button[aria-label="Stäng meddelandet"]').trigger('click')
    expect(search.find('[role="alert"]').exists()).toBe(false)
  })
})

describe('TrafficView', () => {
  it('restores the saved destination when switching between favorites and still shows all directions', async () => {
    const oldFavorite = { id: oldStop.areaId, name: oldStop.stopName, stops: oldStop.stops }
    localStorage.setItem('spider-api.favorite-stops', JSON.stringify([oldFavorite, newStop]))
    const savedDestinations = new Map([[oldStop.areaId, 'Tidigare destination']])
    const fetchMock = vi.fn(async (input: string, options?: RequestInit) => {
      const url = new URL(input)
      if (url.pathname === '/api/stops/config/destination') {
        const body = JSON.parse(String(options?.body))
        savedDestinations.set(body.areaId, body.destination)
        return Response.json({ areaId: body.areaId, stopName: newStop.name, destination: body.destination })
      }
      if (url.pathname === '/api/stops/config') {
        const stop = options?.method === 'PUT' ? JSON.parse(String(options.body)) : oldStop
        return Response.json({ ...stop, destination: savedDestinations.get(stop.areaId) })
      }
      expect(url.searchParams.get('all')).toBe('true')
      return Response.json({ departures: [...trafficFor('Slussen').departures, ...trafficFor('Älta').departures] })
    })
    vi.stubGlobal('fetch', fetchMock)

    const view = mount(TrafficView)
    await flushPromises()
    const destination = () => view.get<HTMLSelectElement>('#configured-destination')
    const allDirections = () => view.get<HTMLInputElement>('input[name="destination-filter"][value="all"]')
    const selectedDirection = () => view.get<HTMLInputElement>('input[name="destination-filter"][value="selected"]')
    const displayedDirections = () => view.findAll('.destination-heading').map(heading => heading.text())
    const selectFavorite = async (position: number) => {
      await view.get(`.stop-sidebar .stop-list-item:nth-child(${position}) .stop-select-btn`).trigger('click')
      await flushPromises()
    }
    expect(destination().element.value).toBe('Tidigare destination')
    expect(view.get('.configured-destination strong').text()).toBe('Tidigare destination')
    expect(allDirections().element.checked).toBe(true)
    await selectedDirection().setValue()
    expect(view.get('.no-departures').text()).toBe('Inga kommande avgångar till Tidigare destination.')

    await selectFavorite(2)
    expect(destination().element.value).toBe('')
    expect(view.find('.configured-destination').exists()).toBe(false)
    expect(allDirections().element.matches(':disabled')).toBe(true)
    expect(selectedDirection().element.matches(':disabled')).toBe(true)
    expect(allDirections().element.checked).toBe(true)
    expect(displayedDirections()).toEqual(['Slussen (42)', 'Älta (42)'])
    expect([...destination().element.options].map(option => option.value)).toEqual(['', 'Slussen', 'Älta'])

    await destination().setValue('Slussen')
    await view.get('.destination-form').trigger('submit')
    await flushPromises()

    expect(fetchMock).toHaveBeenLastCalledWith(
      expect.stringMatching(/\/api\/stops\/config\/destination$/),
      expect.objectContaining({ method: 'PUT', body: JSON.stringify({ areaId: newStop.id, destination: 'Slussen' }) })
    )
    expect(destination().element.value).toBe('Slussen')
    expect(view.get('.configured-destination strong').text()).toBe('Slussen')
    expect(view.get('.destination-form button').attributes('disabled')).toBeDefined()
    expect(selectedDirection().element.matches(':disabled')).toBe(false)
    expect(displayedDirections()).toEqual(['Slussen (42)', 'Älta (42)'])
    const requestCount = fetchMock.mock.calls.length
    await selectedDirection().setValue()
    expect(displayedDirections()).toEqual(['Slussen (42)'])
    await allDirections().setValue()
    expect(displayedDirections()).toEqual(['Slussen (42)', 'Älta (42)'])
    expect(fetchMock).toHaveBeenCalledTimes(requestCount)

    await selectFavorite(1)
    expect(destination().element.value).toBe('Tidigare destination')
    await selectFavorite(2)
    expect(destination().element.value).toBe('Slussen')
    expect(view.get('.configured-destination strong').text()).toBe('Slussen')
  })

  it('lets the favorite confirmation be dismissed without removing the favorite', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string) => Response.json(
      new URL(input).pathname === '/api/stops/config' ? oldStop : { departures: [] }
    )))

    const view = mount(TrafficView)
    await flushPromises()
    await view.get('.favorite-toggle-btn').trigger('click')

    const confirmation = view.get('.traffic-section .message.success')
    expect(confirmation.text()).toContain('har lagts till bland favoriterna')
    expect(confirmation.find('.progress-ring').exists()).toBe(true)
    await confirmation.get('button[aria-label="Stäng meddelandet"]').trigger('click')

    expect(view.find('.traffic-section .message.success').exists()).toBe(false)
    expect(view.get('.stop-select-btn').text()).toBe(oldStop.stopName)
  })

  it('shows a fresh countdown after each traffic refresh and allows dismissal', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn(async (input: string) => Response.json(
      new URL(input).pathname === '/api/stops/config' ? oldStop : { departures: [] }
    )))

    const view = mount(TrafficView)
    await flushPromises()
    expect(view.find('.traffic-success').exists()).toBe(false)

    await view.get('.fetch-btn').trigger('click')
    await flushPromises()
    const message = view.get('.traffic-success')
    expect(message.get('[role="status"]').text()).toBe('Trafikdata uppdaterad.')
    expect(message.get('.progress-ring').attributes('style')).toContain('5000ms')
    await message.get('button[aria-label="Stäng meddelandet"]').trigger('click')
    expect(view.find('.traffic-success').exists()).toBe(false)

    await vi.advanceTimersByTimeAsync(1000)
    await view.get('.fetch-btn').trigger('click')
    await flushPromises()
    await vi.advanceTimersByTimeAsync(4999)
    expect(view.find('.traffic-success button').exists()).toBe(true)
    await vi.advanceTimersByTimeAsync(1)
    expect(view.find('.traffic-success').exists()).toBe(false)
  })

  it('restarts the message countdown and supports both dismissal and expiry', async () => {
    vi.useFakeTimers()
    localStorage.setItem('spider-api.recent-stops', JSON.stringify([newStop]))
    vi.stubGlobal('fetch', vi.fn(async (input: string, options?: RequestInit) => {
      if (new URL(input).pathname !== '/api/stops/config') return Response.json({ departures: [] })
      return Response.json(
        options?.method === 'PUT' ? { areaId: newStop.id, stopName: newStop.name } : oldStop
      )
    }))

    const view = mount(TrafficView)
    await flushPromises()

    const saveStop = async () => {
      await view.get('.stop-select-btn').trigger('click')
      await flushPromises()
    }

    await saveStop()
    const dismissButton = '.admin-panel button[aria-label="Stäng meddelandet"]'
    const firstRing = view.get('.progress-ring').element
    await vi.advanceTimersByTimeAsync(3000)

    await saveStop()
    expect(view.get('.progress-ring').element).not.toBe(firstRing)
    await vi.advanceTimersByTimeAsync(3000)
    await view.get(dismissButton).trigger('click')
    expect(view.find(dismissButton).exists()).toBe(false)

    await saveStop()
    await vi.advanceTimersByTimeAsync(4999)
    expect(view.find(dismissButton).exists()).toBe(true)
    await vi.advanceTimersByTimeAsync(1)
    expect(view.find(dismissButton).exists()).toBe(false)
  })

  it('hides old departures during a stop change and recovers after a failed request', async () => {
    localStorage.setItem('spider-api.recent-stops', JSON.stringify([newStop]))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    let finishRequest!: (response: Response) => void
    const pendingTraffic = new Promise<Response>(resolve => {
      finishRequest = resolve
    })
    const fetchMock = vi.fn(async (input: string, options?: RequestInit) => {
      const url = new URL(input)
      if (url.pathname === '/api/stops/config') {
        return Response.json(
          options?.method === 'PUT' ? { areaId: newStop.id, stopName: newStop.name } : oldStop
        )
      }
      if (url.searchParams.get('areaId') === oldStop.areaId) {
        return Response.json(trafficFor('Gammal destination'))
      }
      if (url.searchParams.get('areaId') === newStop.id) return pendingTraffic
      throw new Error(`Unexpected request: ${input}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    const view = mount(TrafficView)
    await flushPromises()
    expect(view.get('.traffic-data').text()).toContain('Gammal destination')

    await view.get('.stop-select-btn').trigger('click')
    await flushPromises()
    expect(view.get('.configured-stop').text()).toContain(newStop.name)
    expect(view.get('.traffic-section').text()).toContain('Hämtar trafikdata...')
    expect(view.find('.traffic-data').exists()).toBe(false)

    finishRequest(new Response('<h1>Bad Gateway</h1>', { status: 502 }))
    await flushPromises()
    expect(view.get('[role="alert"]').text()).toBe('Kunde inte hämta trafikdata')
    expect(view.find('.traffic-data').exists()).toBe(false)
    await view.get('.traffic-section .message.error button').trigger('click')
    expect(view.find('[role="alert"]').exists()).toBe(false)

    fetchMock.mockResolvedValueOnce(Response.json(trafficFor('Ny destination')))
    await view.get('.fetch-btn').trigger('click')
    await flushPromises()
    expect(view.get('.traffic-data').text()).toContain(newStop.name)
    expect(view.get('.traffic-data').text()).toContain('Ny destination')
    expect(fetchMock.mock.lastCall?.[0]).toMatch(/\/api\/traffic\?areaId=2&all=true$/)
  })

  it('loads valid history even if the stored favorites cannot be parsed', async () => {
    localStorage.setItem('spider-api.favorite-stops', '{')
    localStorage.setItem('spider-api.recent-stops', JSON.stringify([newStop]))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal('fetch', vi.fn(async (input: string) => Response.json(
      new URL(input).pathname === '/api/stops/config' ? oldStop : { departures: [] }
    )))

    const view = mount(TrafficView)
    await flushPromises()

    expect(view.get('.stop-select-btn').text()).toBe(newStop.name)
    expect(view.text()).toContain('Kunde inte läsa sparade favoriter.')
  })
})

it('rejects malformed successful API responses before rendering them', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => Response.json({ departures: [{ route: null }] })))

  await expect(useStopApi().getTraffic(oldStop.areaId)).rejects.toThrow(
    'Servern skickade ett oväntat svar.'
  )
})

it('shows the next three departures per destination and replaces them as they pass', async () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2030-01-01T11:59:00Z'))

  const departures = mount(TrafficDepartures, {
    props: {
      trafficData: {
        departures: [
          ...trafficFor('Slussen', '2030-01-01T12:03:00Z').departures,
          ...trafficFor('Slussen', '2030-01-01T12:02:00Z').departures,
          { ...trafficFor('Slussen', '2030-01-01T11:59:05Z').departures[0]!, canceled: true },
          ...trafficFor('Slussen', '2030-01-01T13:00:00').departures,
          ...trafficFor('Slussen', '2030-01-01T12:01:00Z').departures,
          ...trafficFor('Älta', '2030-01-01T12:02:30Z').departures,
          ...trafficFor('Passerad', '2030-01-01T11:58:00Z').departures,
          ...trafficFor('Okänd', 'invalid').departures,
        ],
      },
      stopName: 'Exempel',
      hasConfiguredStop: true,
      isLoading: false,
      isSaving: false,
      trafficError: '',
      trafficSuccess: null,
      favoriteMessage: null,
    },
  })

  const displayedDepartures = () =>
    departures.findAll('.destination-group').map(group => ({
      destination: group.get('.destination-heading').text(),
      times: group.findAll('.traffic-item p').map(time => time.text()),
    }))

  expect(displayedDepartures()).toEqual([
    { destination: 'Slussen (42)', times: ['1 min', '2 min', '3 min'] },
    { destination: 'Älta (42)', times: ['4 min'] },
  ])

  vi.advanceTimersByTime(31_000)
  await nextTick()
  expect(departures.get('.traffic-item p').text()).toBe('Nu')

  vi.advanceTimersByTime(30_000)
  await nextTick()
  expect(displayedDepartures()).toEqual([
    { destination: 'Slussen (42)', times: ['1 min', '2 min', '3 min'] },
    { destination: 'Älta (42)', times: ['2 min'] },
  ])

  vi.advanceTimersByTime(180_000)
  await nextTick()
  expect(displayedDepartures()).toEqual([])
  expect(departures.get('.no-departures').text()).toBe('Inga kommande avgångar för den här hållplatsen.')
})

it.each([
  ['2030-01-01T13:00:00', '2030-01-01T12:00:00Z'],
  ['2030-07-01T13:00:00.500', '2030-07-01T11:00:00.500Z'],
  ['2030-07-01T13:00:00+03:00', '2030-07-01T10:00:00Z'],
])('interprets departure time %s as %s', (value, expected) => {
  expect(parseDepartureTime(value)).toBe(Date.parse(expected))
})
