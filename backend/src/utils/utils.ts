import type { SingleDepartureResponse, TrafficDeparture } from '../types/index.ts';

const swedishTime = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Europe/Stockholm',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

function departureDelayMs(departureTime: string | number | Date, now: Date): number {
  // Trafiklab sends Swedish wall-clock times without an offset.
  if (
    typeof departureTime === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(departureTime)
  ) {
    const swedishNow = swedishTime.format(now).replace(' ', 'T');
    return (
      Date.parse(`${departureTime}Z`) - Date.parse(`${swedishNow}Z`) - now.getUTCMilliseconds()
    );
  }
  return new Date(departureTime).getTime() - now.getTime();
}

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
    departure => departure.route?.direction?.trim().toLowerCase() === direction.trim().toLowerCase()
  );
};

export const getNextDepartureByDirection = (
  departures: TrafficDeparture[],
  direction: string,
  now = new Date()
): TrafficDeparture | undefined => {
  let next: TrafficDeparture | undefined;
  let shortestDelay = Infinity;
  for (const departure of getDeparturesByDirection(departures, direction)) {
    if (departure.canceled) continue;
    const delay = departureDelayMs(departure.realtime, now);
    if (delay >= 0 && delay < shortestDelay) {
      next = departure;
      shortestDelay = delay;
    }
  }
  return next;
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
  const diffMs = departureDelayMs(departureTime, new Date());
  const diffMins = Math.floor(diffMs / 60000);
  return diffMins > 0 ? `${diffMins} min` : 'Nu';
};
