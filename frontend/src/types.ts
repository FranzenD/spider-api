export interface TrafficDeparture {
  realtime: string
  route: {
    direction: string
    designation: string
  }
}

export interface TrafficApiResponse {
  departures: TrafficDeparture[]
  meta?: {
    timestamp: string
  }
}

export interface Stop {
  id: string
  name: string
  stops: StopLocation[]
  transport_modes?: string[]
  area_type?: string
  average_daily_stop_times?: number
}

export interface StopLocation {
  id: string
  name: string
  lat: number
  lon: number
}

export interface StopSearchResponse {
  stops: Stop[]
}

export interface StopConfiguration {
  areaId: string
  stopName?: string
  stops?: StopLocation[]
  destination?: string
}

export interface ApiErrorResponse {
  error?: string
  message?: string
}

export type MessageType = 'success' | 'error'

export interface TimedMessage {
  id: number
  text: string
  durationMs: number
}
