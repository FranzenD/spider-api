import express, { Request, Response, NextFunction } from 'express';
import { createSingleDepartureResponse, getDeparturesByDirection } from './utils/utils.js';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import {
  AuthenticatedUser,
  CredentialMap,
  TrafficApiResponse,
  StandardApiResponse,
  TokenAuthRequest,
  // JwtPayload,
  TrafficDeparture,
  SingleDepartureResponse,
} from './types/index.js';

dotenv.config();

const app = express();
const PORT: number = parseInt(process.env.PORT || '3000', 10);

// Middleware setup
app.use(express.json());
app.use(cookieParser());

// CORS configuration
app.use(
  cors({
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Configuration constants
const VALID_CREDENTIALS: CredentialMap = {
  'api-client': 'secret-api-key-123',
  'mobile-app': 'mobile-secret-456',
  'web-app': 'web-secret-789',
};

const VALID_TOKENS: string[] = ['demo-token-123', 'test-token-456', 'poc-token-789'];

// Basic Authentication middleware
const basicAuth = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader: string | undefined = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.status(401).json({
      error: 'Access denied. Basic authentication required.',
      hint: 'Include Authorization: Basic <base64(username:password)> header',
    });
    return;
  }

  try {
    const credentials: string = Buffer.from(authHeader.split(' ')[1], 'base64').toString('utf-8');
    const [username, password]: string[] = credentials.split(':');

    if (!username || !password || VALID_CREDENTIALS[username] !== password) {
      res.status(401).json({
        error: 'Invalid credentials',
        provided_username: username || 'missing',
      });
      return;
    }

    req.user = {
      userId: username,
      username,
      authMethod: 'basic_auth',
      timestamp: Date.now(),
    };
    next();
  } catch (error: unknown) {
    console.error('Basic auth error:', error);
    res.status(401).json({
      error: 'Invalid authorization header format',
      expected: 'Authorization: Basic <base64(username:password)>',
    });
  }
};

// JWT verification middleware
// const verifyJWT = (req: Request, res: Response, next: NextFunction): void => {
//   const token: string = req.cookies.authToken;

//   if (!token) {
//     res.status(401).json({ error: 'Access denied. No token provided.' });
//     return;
//   }

//   try {
//     const jwtSecret: string = process.env.JWT_SECRET || '';
//     if (!jwtSecret) {
//       throw new Error('JWT_SECRET not configured');
//     }

//     const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
//     req.user = decoded;
//     next();
//   } catch (error: unknown) {
//     console.error('JWT verification error:', error);
//     res.status(401).json({ error: 'Invalid token.' });
//   }
// };

// Route handlers
app.post('/auth/token/basic', basicAuth, (req: Request, res: Response): void => {
  const { username } = req.user!;

  const jwtSecret: string = process.env.JWT_SECRET || '';
  if (!jwtSecret) {
    res.status(500).json({ error: 'Server configuration error' });
    return;
  }

  const jwtToken: string = jwt.sign(
    {
      userId: username!,
      username: username,
      authMethod: 'basic_auth' as const,
      timestamp: Date.now(),
    },
    jwtSecret,
    { expiresIn: '24h' }
  );

  res.cookie('authToken', jwtToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000,
  });

  const response: StandardApiResponse<AuthenticatedUser> = {
    success: true,
    message: 'Authentication successful via Basic Auth',
    data: {
      userId: username!,
      username: username,
      authMethod: 'basic_auth',
      timestamp: Date.now(),
    },
  };

  res.json(response);
});

app.post('/auth/token', (req: Request, res: Response): void => {
  const { token }: TokenAuthRequest = req.body;

  if (!token) {
    res.status(400).json({ error: 'Token is required' });
    return;
  }

  if (!VALID_TOKENS.includes(token)) {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }

  const jwtSecret: string = process.env.JWT_SECRET || '';
  if (!jwtSecret) {
    res.status(500).json({ error: 'Server configuration error' });
    return;
  }

  const jwtToken: string = jwt.sign(
    {
      userId: 'user123',
      token: token,
      authMethod: 'demo_token' as const,
      timestamp: Date.now(),
    },
    jwtSecret,
    { expiresIn: '24h' }
  );

  res.cookie('authToken', jwtToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000,
  });

  const response: StandardApiResponse = {
    success: true,
    message: 'Authentication successful',
  };

  res.json(response);
});

app.get(
  '/api/traffic/:direction?',
  /* verifyJWT, */ async (req: Request, res: Response): Promise<void> => {
    try {
      const apiKey: string | undefined = process.env.API_KEY;
      if (!apiKey) {
        res.status(500).json({
          error: 'API key not configured',
        });
        return;
      }

      const direction: string | undefined = req.params.direction;

      const areaId: string = '740065516';
      const url: string = `https://realtime-api.trafiklab.se/v1/departures/${areaId}?key=${apiKey}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const trafficData = (await response.json()) as TrafficApiResponse;

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
          requested_by: req.user?.username || req.user?.userId || 'unknown',
          auth_method: req.user?.authMethod,
          timestamp: new Date().toISOString(),
        },
      };

      res.json(enhancedData);
    } catch (error) {
      console.error('Error fetching traffic data:', error);
      res.status(500).json({
        error: 'Failed to fetch traffic data',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// app.get('/api/traffic/:destination', /* verifyJWT, */ async (req: Request, res: Response): Promise<void> => {
//   // Traffic API logic here
// });

app.post('/auth/logout', (req: Request, res: Response): void => {
  res.clearCookie('authToken');

  const response: StandardApiResponse = {
    success: true,
    message: 'Logged out successfully',
  };

  res.json(response);
});

app.get('/health', (req: Request, res: Response): void => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

app.listen(PORT, (): void => {
  console.log(`Server running on port ${PORT}`);
  console.log(`CORS enabled for: http://localhost:5173 and http://localhost:5174`);
  console.log(`Available endpoints:`);
  console.log(`  POST /auth/token/basic - Get JWT with Basic Auth`);
  console.log(`  POST /auth/token - Get JWT with demo token`);
  console.log(`  GET /api/traffic - Get traffic data`);
  console.log(`  GET /health - Health check`);
});

export default app;
