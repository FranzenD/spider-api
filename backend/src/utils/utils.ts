import type { SingleDepartureResponse, TrafficDeparture } from '../types/index.ts';

/**
 * Filters departures by direction.
 * @param departures - Array of TrafficDeparture objects.
 * @param direction - Optional direction to filter by.
 * @returns Filtered array of TrafficDeparture objects.
 */
export const getDeparturesByDirection = (
  departures: TrafficDeparture[],
  direction?: string
): TrafficDeparture[] => {
  if (!direction) {
    return departures;
  }

  return departures.filter(
    departure => departure.route.direction?.toLowerCase() === direction.toLowerCase()
  );
};

/**
 * Creates a response for a single departure.
 * @param departure - TrafficDeparture object.
 * @returns SingleDepartureResponse object.
 */
export const createSingleDepartureResponse = (
  departure: TrafficDeparture
): SingleDepartureResponse => {
  return {
    departure: {
      realtime: departure.realtime,
      nextDepartureIn: showDepartureInMinutesFromNow(departure.realtime),
      route: { direction: departure.route.direction, designation: departure.route.designation },
      destination: departure.destination,
      expected: departure.expected,
    },
  };
};

/**
 * Calculates the time in minutes from now to a given departure time.
 * @param departureTime - Departure time as string, number, or Date object.
 * @returns Time in minutes or 'Nu' if departure is now.
 */
export const showDepartureInMinutesFromNow = (departureTime: string | number | Date) => {
  const now = new Date();
  const departure = new Date(departureTime);
  const diffMs = departure.getTime() - now.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  return diffMins > 0 ? `${diffMins} min` : 'Nu';
};
