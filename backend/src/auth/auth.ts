import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { Logger } from 'pino';
import { AuthenticatedUser, CredentialMap, TokenAuthRequest } from './types.js';

const VALID_CREDENTIALS: CredentialMap = {
  'api-client': 'secret-api-key-123',
  'mobile-app': 'mobile-secret-456',
  'web-app': 'web-secret-789',
};

const VALID_TOKENS: string[] = ['demo-token-123', 'test-token-456', 'poc-token-789'];

export function createAuthModule(logger: Logger) {
  const router = Router();

  const basicAuth = (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Basic ')) {
      res.status(401).json({
        error: 'Access denied. Basic authentication required.',
        hint: 'Include Authorization: Basic <base64(username:password)> header',
      });
      return;
    }

    try {
      const credentials = Buffer.from(authHeader.slice(6), 'base64').toString('utf-8');
      const [username, password] = credentials.split(':');

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
    } catch (error) {
      logger.error({ err: error }, 'Basic auth error');
      res.status(401).json({
        error: 'Invalid authorization header format',
        expected: 'Authorization: Basic <base64(username:password)>',
      });
    }
  };

  const verifyJWT = (req: Request, res: Response, next: NextFunction): void => {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      res.status(500).json({ error: 'Server configuration error' });
      return;
    }

    const token: unknown = req.cookies?.authToken;
    if (typeof token !== 'string' || !token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    try {
      const decoded = jwt.verify(token, jwtSecret);
      if (
        typeof decoded === 'string' ||
        typeof decoded.userId !== 'string' ||
        (decoded.authMethod !== 'basic_auth' && decoded.authMethod !== 'demo_token')
      ) {
        res.status(401).json({ error: 'Invalid authentication token' });
        return;
      }

      req.user = {
        userId: decoded.userId,
        username: typeof decoded.username === 'string' ? decoded.username : undefined,
        authMethod: decoded.authMethod,
        timestamp: typeof decoded.timestamp === 'number' ? decoded.timestamp : 0,
      };
      next();
    } catch (error) {
      logger.warn({ err: error }, 'JWT verification failed');
      res.status(401).json({ error: 'Invalid or expired authentication token' });
    }
  };

  router.post('/token/basic', basicAuth, (req: Request, res: Response): void => {
    const username = req.user?.username;
    const jwtSecret = process.env.JWT_SECRET;
    if (!username) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    if (!jwtSecret) {
      res.status(500).json({ error: 'Server configuration error' });
      return;
    }

    const timestamp = Date.now();
    const jwtToken = jwt.sign(
      { userId: username, username, authMethod: 'basic_auth' as const, timestamp },
      jwtSecret,
      { expiresIn: '24h' }
    );
    res.cookie('authToken', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000,
    });

    const response: AuthenticatedUser = {
      userId: username,
      username,
      authMethod: 'basic_auth',
      timestamp,
    };
    res.json({
      success: true,
      message: 'Authentication successful via Basic Auth',
      data: response,
    });
  });

  router.post('/token', (req: Request, res: Response): void => {
    const { token }: TokenAuthRequest = req.body;
    if (!token) {
      res.status(400).json({ error: 'Token is required' });
      return;
    }
    if (!VALID_TOKENS.includes(token)) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      res.status(500).json({ error: 'Server configuration error' });
      return;
    }

    const jwtToken = jwt.sign(
      {
        userId: 'user123',
        token,
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
    res.json({ success: true, message: 'Authentication successful' });
  });

  router.post('/logout', (_req: Request, res: Response): void => {
    res.clearCookie('authToken');
    res.json({ success: true, message: 'Logged out successfully' });
  });

  return { router, verifyJWT };
}
