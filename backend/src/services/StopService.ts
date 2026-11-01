import fetch, { type Response as FetchResponse } from 'node-fetch';
import type {
  Stop,
  StopLookupResponse,
  StopLookupGroup,
  StopLocation,
  StopSearchResponse,
  TrafficApiResponse,
} from '../types/index.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStopLookupGroup(value: unknown): value is StopLookupGroup {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    Array.isArray(value.stops) &&
    value.stops.every(isStopLocation)
  );
}

function isStopLocation(value: unknown): value is StopLocation {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.lat === 'number' &&
    typeof value.lon === 'number'
  );
}

function isStopLookupResponse(value: unknown): value is StopLookupResponse {
  return (
    isRecord(value) &&
    Array.isArray(value.stop_groups) &&
    value.stop_groups.every(isStopLookupGroup)
  );
}

export class StopService {
  static async searchStops(query: string): Promise<StopSearchResponse> {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error('API key not configured');
    }
    const url = new URL(
      `https://realtime-api.trafiklab.se/v1/stops/name/${encodeURIComponent(query)}/`
    );
    url.searchParams.set('key', apiKey);

    const response = await this.fetchWithTimeout(url, 'Failed to search stops');
    const result: unknown = await response.json();
    if (!isStopLookupResponse(result)) {
      throw new Error('Stop Lookup API returned an invalid response');
    }

    const stops: Stop[] = result.stop_groups.map(({ id, name, stops }) => ({
      id,
      name,
      stops,
    }));

    return { stops };
  }

  static async getTraffic(areaId: string): Promise<TrafficApiResponse> {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error('API key not configured');
    }
    const url = new URL(
      `https://realtime-api.trafiklab.se/v1/departures/${encodeURIComponent(areaId)}`
    );
    url.searchParams.set('key', apiKey);
    const response = await this.fetchWithTimeout(url, 'Failed to fetch traffic');
    return (await response.json()) as TrafficApiResponse;
  }

  private static async fetchWithTimeout(url: URL, failureMessage: string): Promise<FetchResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(url.toString(), { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`${failureMessage}: ${response.status} ${response.statusText}`);
      }
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
