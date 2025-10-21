import type { SingleDepartureResponse, TrafficDeparture } from '../types/index.ts';

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

export const showDepartureInMinutesFromNow = (departureTime: string | number | Date) => {
  const now = new Date();
  const departure = new Date(departureTime);
  const diffMs = departure.getTime() - now.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  return diffMins > 0 ? `${diffMins} min` : 'Nu';
};
