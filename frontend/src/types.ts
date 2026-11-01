export interface TrafficDeparture {
  realtime: string
  nextDepartureIn: string
  route: {
    direction: string
    designation: string
  }
  destination?: string
  expected?: string
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
}

export interface ApiErrorResponse {
  error?: string
  message?: string
}

export type MessageType = 'success' | 'error'
