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
  nextDepartureIn: string;
  route: {
    direction: string;
    designation: string;
  };
  destination: string;
  expected?: string;
}

export interface TrafficApiResponse {
  departures: TrafficDeparture[];
  meta?: {
    requested_by?: string;
    auth_method?: string;
    timestamp: string;
  };
}

export interface SingleDepartureResponse {
  departure: TrafficDeparture;
  meta?: {
    requested_by?: string;
    auth_method?: string;
    timestamp?: string;
  };
}

export interface StandardApiResponse<T = unknown> {
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
