# Spider API - Traffic Data Application

A full-stack web application for retrieving traffic data with JWT authentication. The project consists of a Node.js/Express backend and a Vue 3 frontend.

## Project Structure

```
spider-api/
├── backend/
│   ├── src/
│   │   ├── server.ts          # Main Express application
│   │   ├── types/
│   │   │   └── index.ts       # TypeScript type definitions
│   │   └── utils/
│   │       └── utils.ts       # Helper functions
│   ├── dist/                  # Compiled JavaScript output
│   ├── package.json
│   ├── tsconfig.json          # TypeScript configuration
│   ├── eslint.config.ts       # ESLint configuration
│   ├── .prettierrc            # Prettier configuration
│   ├── Dockerfile
│   ├── .dockerignore
│   └── .env
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.js
│       ├── App.vue
│       └── views/
│           ├── LoginView.vue
│           └── TrafficView.vue
├── docker-compose.yml
└── README.md
```

## Features

### Backend (Node.js + Express + TypeScript)

- **POST /auth/token/basic**: Basic Auth to JWT conversion (requires Basic Auth header)
- **POST /auth/token**: Token-based authentication with JWT
- **GET /api/traffic/:direction?**: Protected endpoint for traffic data with optional direction parameter
- **POST /auth/logout**: Clear authentication cookie
- **GET /health**: Health check endpoint
- Secure cookie-based JWT storage (HttpOnly, Secure, SameSite=Strict)
- CORS configuration with credentials support
- Real-time traffic data from Trafiklab API
- TypeScript for type safety and better developer experience

### Frontend (Vue 3)

- **Login View**: Token authentication interface
- **Traffic View**: Traffic data dashboard with real-time updates
- Vue Router for navigation
- Composition API with `<script setup>`
- Responsive design and error handling

## Quick Start

### Option 1: Local Development

#### 1. Backend Setup

```bash
cd backend
npm install

# Development mode (with hot reload)
npm run dev

# Or build and run production mode
npm run build
npm start
```

The backend will run on `http://localhost:3005` (development) or configured PORT

#### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will run on `http://localhost:5173`

### Option 2: Docker/Podman Container

#### Prerequisites

- Docker or Podman installed
- `.env` file configured in backend directory

#### Using Docker

```bash
# Simple start with docker-compose (recommended)
docker-compose up --build

# Or manually build and run
cd backend
docker build -t spider-api-backend .
docker run -d \
  --name spider-api \
  -p 3005:3005 \
  --env-file .env \
  spider-api-backend

# Check container status
docker ps

# View logs
docker logs spider-api

# Stop and remove container
docker stop spider-api
docker rm spider-api
```

#### Using Podman

```bash
# Build the image
cd backend
podman build -t spider-api-backend .

# Run the container
podman run -d \
  --name spider-api \
  -p 3005:3005 \
  --env-file .env \
  spider-api-backend

# Check container status
podman ps

# View logs
podman logs spider-api

# Stop and remove container
podman stop spider-api
podman rm spider-api
```

#### Container Health Check

```bash
# Check container health (Docker)
docker inspect --format='{{.State.Health.Status}}' spider-api

# Check container health (Podman)
podman inspect --format='{{.State.Health.Status}}' spider-api

# Manual health check
curl http://localhost:3000/health
```

#### Development with Container

For development with live code reloading:

```bash
# Using docker-compose (easiest - already configured)
docker-compose up --build

# Or manually with volume mounting (Docker)
docker run -d \
  --name spider-api-dev \
  -p 3005:3005 \
  --env-file .env \
  -v $(pwd):/app \
  -v /app/node_modules \
  spider-api-backend

# Or manually with volume mounting (Podman)
podman run -d \
  --name spider-api-dev \
  -p 3005:3005 \
  --env-file .env \
  -v $(pwd):/app:Z \
  -v /app/node_modules \
  spider-api-backend
```

## Authentication

The application supports two authentication methods:

### Method 1: Basic Authentication

Valid credentials (username:password):

- `api-client:secret-api-key-123`
- `mobile-app:mobile-secret-456`
- `web-app:web-secret-789`

### Method 2: Demo Tokens

- `demo-token-123`
- `test-token-456`
- `poc-token-789`

### Authentication Flow

**Basic Auth Flow:**

1. Client sends Basic Auth credentials (Base64 encoded username:password)
2. Backend validates credentials against hardcoded credential map
3. If valid, backend issues a JWT and sets it as an HttpOnly cookie
4. Frontend can access protected endpoints using the cookie

**Token Auth Flow:**

1. User enters a demo token in the login form
2. Backend validates the token against hardcoded token list
3. If valid, backend issues a JWT and sets it as an HttpOnly cookie
4. Frontend can access protected endpoints using the cookie

## API Endpoints

### Authentication

- `POST /auth/token/basic` - Authenticate with Basic Auth (returns JWT)
  - Requires `Authorization: Basic <base64(username:password)>` header
- `POST /auth/token` - Authenticate with demo token (returns JWT)
  - Request body: `{ "token": "demo-token-123" }`
- `POST /auth/logout` - Clear authentication cookie

### Traffic Data

- `GET /api/traffic` - Get all current traffic data (requires authentication)
- `GET /api/traffic/:direction` - Get traffic data filtered by direction (requires authentication)
  - Example: `GET /api/traffic/Stockholm` returns only departures heading to Stockholm

### Utility

- `GET /health` - Health check

## Environment Variables

Create a `.env` file in the backend directory:

```env
PORT=3000
API_KEY=your_trafiklab_api_key_here
JWT_SECRET=your_jwt_secret_here_should_be_long_and_secure
NODE_ENV=development
```

### Required Environment Variables

- `API_KEY`: Your Trafiklab API key for traffic data
- `JWT_SECRET`: Secret key for JWT signing (min 32 characters recommended)
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (development/production)

````

## Third-Party API Integration

The application is integrated with **Trafiklab's Real-time API** for live Swedish public transport data.

### Current Implementation
- Real-time departure data from Trafiklab API
- Area ID: `740065516` (configurable)
- Supports filtering by direction/destination
- Automatic error handling and fallback responses

### Configuration
1. Get your free API key from [Trafiklab](https://www.trafiklab.se/)
2. Add the API key to your `.env` file
3. Optionally modify the `areaId` in `server.ts` for different stations

## Development Notes

- Backend built with **TypeScript** for type safety
- Uses **tsx** for development with hot reload
- ESLint + Prettier configured for code quality
- The frontend is configured for development only (not production-ready)
- All fetch requests include `credentials: 'include'` for cookie support
- CORS is configured to allow requests from `http://localhost:5173` and `http://localhost:5174`
- JWT cookies are set with security flags appropriate for the environment

## Technology Stack

### Backend
- Node.js 20+
- Express 4.x
- TypeScript 5.x
- JWT (jsonwebtoken)
- node-fetch for API calls
- ESLint + Prettier for code quality

### Frontend
- Vue 3 with Composition API
- Vue Router
- Vite build tool

## Security Features

- JWT stored in HttpOnly cookies (XSS protection)
- SameSite=Strict cookie attribute (CSRF protection)
- Secure cookie flag in production
- Token expiration (24 hours)
- CORS configuration with specific origin allowlist
- Container runs as non-root user
- Health check endpoint for monitoring

## Testing

1. Start backend and frontend servers (locally or with containers)
2. Navigate to `http://localhost:5173`
3. Authenticate using either:
   - **Basic Auth**: Use credentials like `api-client:secret-api-key-123`
   - **Demo Token**: Use tokens like `demo-token-123`
4. Click "Fetch Traffic Data" to test the protected endpoint
5. Test direction filtering: `GET /api/traffic/Stockholm`

### Testing with cURL

```bash
# Test health endpoint
curl http://localhost:3005/health

# Test Basic Auth
curl -X POST http://localhost:3005/auth/token/basic \
  -H "Authorization: Basic $(echo -n 'api-client:secret-api-key-123' | base64)" \
  -c cookies.txt

# Test token auth
curl -X POST http://localhost:3005/auth/token \
  -H "Content-Type: application/json" \
  -d '{"token":"demo-token-123"}' \
  -c cookies.txt

# Test traffic endpoint (requires cookie from auth)
curl http://localhost:3005/api/traffic \
  -b cookies.txt

# Test traffic endpoint with direction filter
curl http://localhost:3005/api/traffic/Stockholm \
  -b cookies.txt
````

### Testing with Container

```bash
# Start backend with docker-compose
docker-compose up -d

# Or start backend container manually
cd backend && docker run -d --name spider-api -p 3005:3005 --env-file .env spider-api-backend

# Start frontend locally
cd frontend && npm run dev

# Test health endpoint
curl http://localhost:3000/health
```

## Container Best Practices

- ✅ **Non-root user** for security (nodejs:nodejs)
- ✅ **Multi-layered caching** for faster builds
- ✅ **Health check implementation** with proper timeouts
- ✅ **.dockerignore** for smaller build context
- ✅ **Alpine Linux** for minimal attack surface
- ✅ **Production-only dependencies** in container
- ✅ **Volume mounting** for development workflow

## Production Deployment

Before deploying to production:

1. Update CORS origin to your production domain
2. Set `NODE_ENV=production` for secure cookies
3. Use environment variables for all secrets
4. Use a proper container orchestration solution (Kubernetes, Docker Swarm)
5. Add input validation and sanitization
6. Configure HTTPS/TLS termination
7. Add rate limiting and other security middleware
8. Use a production-ready database for token validation
9. Implement proper logging and monitoring
10. Use multi-stage Docker builds for smaller production images
11. Configure HTTPS
12. Add rate limiting and other security middleware
