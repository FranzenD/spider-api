import express, { Request, Response } from 'express';
import { createSingleDepartureResponse, getDeparturesByDirection } from './utils/utils.js';
import cors from 'cors';
import dotenv from 'dotenv';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  TrafficApiResponse,
  TrafficDeparture,
  SingleDepartureResponse,
  StopConfiguration,
} from './types/index.js';
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
app.use(
  cors({
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    methods: ['GET', 'PUT', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
  })
);

const CONFIG_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/config.json');
const DEFAULT_AREA_ID = '740065516';

function isAreaId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(value);
}

function getStopConfiguration(): StopConfiguration {
  if (!fs.existsSync(CONFIG_PATH)) {
    return { areaId: DEFAULT_AREA_ID };
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

  return {
    areaId: config.areaId,
    ...('stopName' in config && typeof config.stopName === 'string'
      ? { stopName: config.stopName }
      : {}),
    ...('stops' in config && isStopLocations(config.stops) ? { stops: config.stops } : {}),
  };
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

function saveStopConfiguration(config: StopConfiguration): void {
  const temporaryPath = `${CONFIG_PATH}.${process.pid}.tmp`;
  fs.writeFileSync(temporaryPath, JSON.stringify(config, null, 2), 'utf-8');
  fs.renameSync(temporaryPath, CONFIG_PATH);
}

app.get('/api/traffic/:direction?', async (req: Request, res: Response): Promise<void> => {
  try {
    const direction: string | undefined = req.params.direction;
    const { areaId } = getStopConfiguration();
    const trafficData = await StopService.getTraffic(areaId);

    if (!Array.isArray(trafficData.departures)) {
      logger.error('Traffic API returned an invalid response');
      res.status(502).json({ error: 'Traffic API returned an invalid response' });
      return;
    }

    let singleDeparture: TrafficDeparture | null = null;

    if (direction) {
      singleDeparture = getDeparturesByDirection(trafficData.departures, direction)[0];
      if (!singleDeparture) {
        res.status(400).json({
          error: `No departures found for direction: ${direction}`,
        });
        return;
      }

      const singleDepartureResponse: SingleDepartureResponse =
        createSingleDepartureResponse(singleDeparture);

      res.json(singleDepartureResponse);
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
    const config = getStopConfiguration();
    if (!config.stops?.length && config.stopName && process.env.API_KEY) {
      try {
        const searchResults = await StopService.searchStops(config.stopName);
        const matchingStop = searchResults.stops.find(stop => stop.id === config.areaId);
        if (matchingStop?.stops.length) {
          config.stops = matchingStop.stops;
          saveStopConfiguration(config);
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

  const config: StopConfiguration = {
    areaId,
    ...(typeof stopName === 'string' && stopName.trim() ? { stopName: stopName.trim() } : {}),
    ...(stops ? { stops } : {}),
  };

  try {
    saveStopConfiguration(config);
    logger.info({ areaId }, 'Stop configuration updated');
    res.json(config);
  } catch (error) {
    logger.error({ err: error }, 'Error saving stop configuration');
    res.status(500).json({ error: 'Failed to save stop configuration' });
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
