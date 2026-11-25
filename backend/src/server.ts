import express, { Request, Response } from 'express';
import {
  createSingleDepartureResponse,
  getDeparturesByDirection,
  getNextDepartureByDirection,
} from './utils/utils.js';
import cors from 'cors';
import dotenv from 'dotenv';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { TrafficApiResponse, StopConfiguration } from './types/index.js';
import { StopService } from './services/StopService.js';

dotenv.config();

const logger = pino({
  timestamp: pino.stdTimeFunctions.isoTime,
  transport:
    process.env.NODE_ENV === 'development'
      ? {
          targets: [
            { target: 'pino/file', options: { destination: 'app.log' } },
            { target: 'pino-pretty', options: { colorize: true } },
          ],
        }
      : {
          targets: [
            { target: 'pino/file', options: { destination: 'app.log' } },
            { target: 'pino/file', options: { destination: 1 } },
          ],
        },
});

// Global error handling for uncaught exceptions and unhandled rejections
process.on('uncaughtException', error => {
  logger.fatal({ err: error }, 'Uncaught Exception detected. Shutting down process...');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error({ promise, reason }, 'Unhandled Rejection detected');
});

const app = express();
const PORT: number = parseInt(process.env.PORT || '3001', 10);

// Middleware setup
app.use(express.json());

// CORS configuration
const frontendOrigins = (process.env.FRONTEND_ORIGIN ?? '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);
const allowedOrigins = ['http://localhost:5173', 'http://localhost:5174', ...frontendOrigins];

app.use(
  cors({
    origin: allowedOrigins,
    methods: ['GET', 'PUT', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
  })
);

const CONFIG_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/config.json');
const DEFAULT_AREA_ID = '740065516';

function isAreaId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(value);
}

function isDestination(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= 200;
}

function getStopConfiguration(): {
  activeStop: StopConfiguration;
  destinationsByAreaId: Map<string, string>;
} {
  const destinationsByAreaId = new Map<string, string>();
  if (!fs.existsSync(CONFIG_PATH)) {
    return { activeStop: { areaId: DEFAULT_AREA_ID }, destinationsByAreaId };
  }

  const config: unknown = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  if (
    typeof config !== 'object' ||
    config === null ||
    !('areaId' in config) ||
    !isAreaId(config.areaId)
  ) {
    throw new Error('Stop configuration is invalid');
  }

  if (
    'destinationsByAreaId' in config &&
    typeof config.destinationsByAreaId === 'object' &&
    config.destinationsByAreaId !== null &&
    !Array.isArray(config.destinationsByAreaId)
  ) {
    for (const [areaId, destination] of Object.entries(config.destinationsByAreaId)) {
      if (isAreaId(areaId) && isDestination(destination)) {
        destinationsByAreaId.set(areaId, destination.trim());
      }
    }
  }

  // Preserve the destination from configurations saved before destinations were stored per stop.
  if ('destination' in config && isDestination(config.destination)) {
    destinationsByAreaId.set(config.areaId, config.destination.trim());
  }

  const destination = destinationsByAreaId.get(config.areaId);
  const activeStop: StopConfiguration = {
    areaId: config.areaId,
    ...('stopName' in config && typeof config.stopName === 'string'
      ? { stopName: config.stopName }
      : {}),
    ...('stops' in config && isStopLocations(config.stops) ? { stops: config.stops } : {}),
    ...(destination ? { destination } : {}),
  };
  return { activeStop, destinationsByAreaId };
}

function isStopLocations(value: unknown): value is StopConfiguration['stops'] {
  return (
    Array.isArray(value) &&
    value.every(
      stop =>
        typeof stop === 'object' &&
        stop !== null &&
        'id' in stop &&
        typeof stop.id === 'string' &&
        'name' in stop &&
        typeof stop.name === 'string' &&
        'lat' in stop &&
        typeof stop.lat === 'number' &&
        Number.isFinite(stop.lat) &&
        'lon' in stop &&
        typeof stop.lon === 'number' &&
        Number.isFinite(stop.lon)
    )
  );
}

function saveStopConfiguration(
  activeStop: StopConfiguration,
  destinationsByAreaId: Map<string, string>
): void {
  const temporaryPath = `${CONFIG_PATH}.${process.pid}.tmp`;
  const stored = { ...activeStop, destinationsByAreaId: Object.fromEntries(destinationsByAreaId) };
  fs.writeFileSync(temporaryPath, JSON.stringify(stored, null, 2), 'utf-8');
  fs.renameSync(temporaryPath, CONFIG_PATH);
}

app.get('/api/traffic/:direction?', async (req: Request, res: Response): Promise<void> => {
  try {
    const explicitDirection: string | undefined = req.params.direction;
    const requestedAreaId = req.query.areaId;
    if (requestedAreaId !== undefined && !isAreaId(requestedAreaId)) {
      res.status(400).json({ error: 'A valid stop areaId is required' });
      return;
    }
    const config: StopConfiguration =
      requestedAreaId === undefined
        ? getStopConfiguration().activeStop
        : { areaId: requestedAreaId };
    const { areaId } = config;
    const showAll = req.query.all === 'true' || requestedAreaId !== undefined;
    const direction = explicitDirection ?? (showAll ? undefined : config.destination);

    if (!direction && !showAll) {
      res.status(409).json({ error: 'No destination configured for the selected stop' });
      return;
    }

    const trafficData = await StopService.getTraffic(areaId);

    if (!Array.isArray(trafficData.departures)) {
      logger.error('Traffic API returned an invalid response');
      res.status(502).json({ error: 'Traffic API returned an invalid response' });
      return;
    }

    if (direction) {
      const singleDeparture = explicitDirection
        ? getDeparturesByDirection(trafficData.departures, direction)[0]
        : getNextDepartureByDirection(trafficData.departures, direction);
      if (!singleDeparture) {
        res.status(explicitDirection ? 400 : 404).json({
          error: `No departures found for direction: ${direction}`,
        });
        return;
      }

      res.json(createSingleDepartureResponse(singleDeparture));
      return;
    }

    const enhancedData: TrafficApiResponse = {
      ...trafficData,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };

    res.json(enhancedData);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      logger.error('Traffic API request timed out');
      res.status(504).json({
        error: 'Gateway Timeout',
        message: 'Traffic API took too long to respond',
      });
      return;
    }
    logger.error({ err: error }, 'Error fetching traffic data');
    res.status(500).json({
      error: 'Failed to fetch traffic data',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.get('/api/stops/search', async (req: Request, res: Response): Promise<void> => {
  const query = typeof req.query.query === 'string' ? req.query.query.trim() : '';
  if (query.length < 2 || query.length > 100) {
    res.status(400).json({ error: 'Search query must be between 2 and 100 characters' });
    return;
  }
  if (!process.env.API_KEY) {
    res.status(500).json({ error: 'API key not configured' });
    return;
  }

  try {
    const results = await StopService.searchStops(query);
    if (!Array.isArray(results.stops)) {
      logger.error('Stop search API returned an invalid response');
      res.status(502).json({ error: 'Stop search API returned an invalid response' });
      return;
    }
    res.json(results);
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'AbortError';
    logger.error({ err: error }, 'Error searching stops');
    res.status(timedOut ? 504 : 502).json({
      error: timedOut ? 'Stop search request timed out' : 'Failed to search stops',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.get('/api/stops/config', async (_req: Request, res: Response): Promise<void> => {
  try {
    let config = getStopConfiguration().activeStop;
    if (!config.stops?.length && config.stopName && process.env.API_KEY) {
      try {
        const searchResults = await StopService.searchStops(config.stopName);
        const matchingStop = searchResults.stops.find(stop => stop.id === config.areaId);
        const { activeStop: latest, destinationsByAreaId } = getStopConfiguration();
        if (
          matchingStop?.stops.length &&
          latest.areaId === config.areaId &&
          latest.stopName === config.stopName &&
          !latest.stops?.length
        ) {
          config = { ...latest, stops: matchingStop.stops };
          saveStopConfiguration(config, destinationsByAreaId);
        } else {
          config = latest;
        }
      } catch (error) {
        logger.warn(
          { err: error, areaId: config.areaId },
          'Could not load coordinates for the configured stop'
        );
      }
    }
    res.json(config);
  } catch (error) {
    logger.error({ err: error }, 'Error reading stop configuration');
    res.status(500).json({ error: 'Failed to read stop configuration' });
  }
});

app.put('/api/stops/config', (req: Request, res: Response): void => {
  const { areaId, stopName, stops } = req.body ?? {};
  if (!isAreaId(areaId)) {
    res.status(400).json({ error: 'A valid stop areaId is required' });
    return;
  }
  if (stopName !== undefined && (typeof stopName !== 'string' || stopName.length > 200)) {
    res.status(400).json({ error: 'stopName must be a string of at most 200 characters' });
    return;
  }
  if (stops !== undefined && !isStopLocations(stops)) {
    res.status(400).json({ error: 'stops must be an array of stops with valid coordinates' });
    return;
  }

  try {
    const { destinationsByAreaId } = getStopConfiguration();
    const destination = destinationsByAreaId.get(areaId);
    const config: StopConfiguration = {
      areaId,
      ...(typeof stopName === 'string' && stopName.trim() ? { stopName: stopName.trim() } : {}),
      ...(stops ? { stops } : {}),
      ...(destination ? { destination } : {}),
    };
    saveStopConfiguration(config, destinationsByAreaId);
    logger.info({ areaId }, 'Stop configuration updated');
    res.json(config);
  } catch (error) {
    logger.error({ err: error }, 'Error saving stop configuration');
    res.status(500).json({ error: 'Failed to save stop configuration' });
  }
});

app.put('/api/stops/config/destination', async (req: Request, res: Response): Promise<void> => {
  const { areaId, destination } = req.body ?? {};
  if (!isAreaId(areaId) || !isDestination(destination)) {
    res.status(400).json({ error: 'Ange en giltig hållplats och destination.' });
    return;
  }

  try {
    const { activeStop: current } = getStopConfiguration();
    if (current.areaId !== areaId) {
      res.status(409).json({ error: 'Den aktiva hållplatsen har ändrats. Ladda om sidan.' });
      return;
    }

    const traffic = await StopService.getTraffic(areaId);
    if (!Array.isArray(traffic.departures)) {
      res.status(502).json({ error: 'Kunde inte läsa hållplatsens destinationer.' });
      return;
    }
    const match = getDeparturesByDirection(traffic.departures, destination)[0];
    if (!match) {
      res
        .status(422)
        .json({ error: 'Destinationen finns inte bland hållplatsens aktuella avgångar.' });
      return;
    }

    // Another request may have changed the configuration while Trafiklab responded.
    const { activeStop: latest, destinationsByAreaId } = getStopConfiguration();
    if (latest.areaId !== areaId) {
      res.status(409).json({ error: 'Den aktiva hållplatsen har ändrats. Ladda om sidan.' });
      return;
    }

    const savedDestination = match.route.direction.trim();
    destinationsByAreaId.set(areaId, savedDestination);
    const config = { ...latest, destination: savedDestination };
    saveStopConfiguration(config, destinationsByAreaId);
    res.json(config);
  } catch (error) {
    logger.error({ err: error, areaId }, 'Error saving stop destination');
    const timedOut = error instanceof Error && error.name === 'AbortError';
    res.status(timedOut ? 504 : 500).json({ error: 'Kunde inte spara destinationen.' });
  }
});

app.get('/health', (req: Request, res: Response): void => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

app.listen(PORT, (): void => {
  logger.info({ port: PORT }, 'Server running');
});

const shutdown = () => {
  logger.info('Server is shutting down...');
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

export default app;
