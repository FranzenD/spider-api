import type {
  Stop,
  StopConfiguration,
  StopLocation,
  StopSearchResponse,
  TrafficApiResponse,
  TrafficDeparture,
} from './types'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const isOptionalString = (value: unknown): boolean =>
  value === undefined || typeof value === 'string'

const isStopLocation = (value: unknown): value is StopLocation =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  typeof value.name === 'string' &&
  isFiniteNumber(value.lat) &&
  isFiniteNumber(value.lon)

const isStopLocationList = (value: unknown): value is StopLocation[] =>
  Array.isArray(value) && value.every(isStopLocation)

export const isStop = (value: unknown): value is Stop =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  typeof value.name === 'string' &&
  isStopLocationList(value.stops) &&
  isOptionalString(value.area_type) &&
  (value.average_daily_stop_times === undefined || isFiniteNumber(value.average_daily_stop_times)) &&
  (value.transport_modes === undefined ||
    (Array.isArray(value.transport_modes) &&
      value.transport_modes.every(mode => typeof mode === 'string')))

export const isStopSearchResponse = (value: unknown): value is StopSearchResponse =>
  isRecord(value) && Array.isArray(value.stops) && value.stops.every(isStop)

export const isStopConfiguration = (value: unknown): value is StopConfiguration =>
  isRecord(value) &&
  typeof value.areaId === 'string' &&
  value.areaId.length > 0 &&
  isOptionalString(value.stopName) &&
  isOptionalString(value.destination) &&
  (value.stops === undefined || isStopLocationList(value.stops))

const isTrafficDeparture = (value: unknown): value is TrafficDeparture =>
  isRecord(value) &&
  typeof value.realtime === 'string' &&
  isRecord(value.route) &&
  typeof value.route.direction === 'string' &&
  typeof value.route.designation === 'string'

export const isTrafficApiResponse = (value: unknown): value is TrafficApiResponse =>
  isRecord(value) &&
  Array.isArray(value.departures) &&
  value.departures.every(isTrafficDeparture) &&
  (value.meta === undefined || (isRecord(value.meta) && typeof value.meta.timestamp === 'string'))
