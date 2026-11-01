import fetch, { type Response as FetchResponse } from 'node-fetch';
import { StopSearchResponse, TrafficApiResponse } from '../types/index.js';

export class StopService {
  static async searchStops(query: string): Promise<StopSearchResponse> {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error('API key not configured');
    }
    const url = new URL('https://realtime-api.trafiklab.se/v1/stops');
    url.searchParams.set('query', query);
    url.searchParams.set('key', apiKey);

    const response = await this.fetchWithTimeout(url, 'Failed to search stops');
    return (await response.json()) as StopSearchResponse;
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
