export interface AuthenticatedUser {
  userId: string;
  username?: string;
  authMethod: 'basic_auth' | 'demo_token';
  timestamp: number;
}

export interface CredentialMap {
  [username: string]: string;
}

export interface TrafficDeparture {
  realtime: string;
  route: {
    direction: string;
    line: string;
  };
  destination: string;
  expected?: string;
}

export interface TrafficApiResponse {
  departures: TrafficDeparture[];
  timestamp: string;
  meta?: {
    requested_by?: string;
    auth_method?: string;
    timestamp: string;
  };
}

export interface StandardApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface TokenAuthRequest {
  token: string;
}

export interface JwtPayload {
  userId: string;
  username?: string;
  token?: string;
  authMethod: 'basic_auth' | 'demo_token';
  timestamp: number;
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}