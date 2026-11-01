export interface AuthenticatedUser {
  userId: string;
  username?: string;
  authMethod: 'basic_auth' | 'demo_token';
  timestamp: number;
}

export interface CredentialMap {
  [username: string]: string;
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

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
