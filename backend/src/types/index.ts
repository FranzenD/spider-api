export interface TrafficDeparture {
  realtime: string;
  nextDepartureIn: string;
  route: {
    direction: string;
    designation: string;
  };
  destination?: string;
  expected?: string;
}

export interface TrafficApiResponse {
  departures: TrafficDeparture[];
  meta?: {
    timestamp: string;
  };
}

export interface SingleDepartureResponse {
  departure: TrafficDeparture;
}

export interface Stop {
  id: string;
  name: string;
  stops: StopLocation[];
  transport_modes?: string[];
  area_type?: string;
  average_daily_stop_times?: number;
}

export interface StopLocation {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

export interface StopSearchResponse {
  stops: Stop[];
}

export interface StopLookupResponse {
  stop_groups: StopLookupGroup[];
}

export interface StopLookupGroup {
  id: string;
  name: string;
  stops: StopLocation[];
  transport_modes?: string[];
  area_type?: string;
  average_daily_stop_times?: number;
}

export interface StopConfiguration {
  areaId: string;
  stopName?: string;
  stops?: StopLocation[];
}
