# Spider API - Traffic Data Application

A full-stack web application for retrieving traffic data. Authentication is temporarily disabled while the admin and traffic functionality is being developed; the implementation is kept separate for later reactivation.

## Project Structure

```
spider-api/
├── backend/
│   ├── src/
│   │   ├── auth/               # Dormant authentication module and types
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
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── main.ts
│       ├── App.vue
│       ├── auth/
│       │   └── LoginView.vue  # Dormant login view
│       └── views/
│           └── TrafficView.vue
├── docker-compose.yml
└── README.md
```

## Features

### Backend (Node.js + Express + TypeScript)

- **GET /api/traffic/:direction?**: Traffic data with optional direction parameter
- **GET/PUT /api/stops/config**: Read and update the configured stop
- **GET /api/stops/search**: Search for stops
- **GET /health**: Health check endpoint
- Real-time traffic data from Trafiklab API
- TypeScript for type safety and better developer experience

### Frontend (Vue 3)

- **Admin View**: Stop search, stop selection and traffic data
- Up to five browser-local stop favorites and a five-stop selection history for quick switching
- Vue Router for navigation
- Composition API with `<script setup>`
- TypeScript for frontend application code and Vite configuration
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

The backend will run on `http://localhost:3001` by default. Set `PORT` to use a different port.

#### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will run on `http://localhost:5173`

The frontend connects to `http://localhost:3001` by default. Set
`VITE_API_BASE_URL` in the frontend environment to use a different backend URL.

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
  -p 3001:3001 \
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
  -p 3001:3001 \
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
curl http://localhost:3001/health
```

#### Development with Container

For development with live code reloading:

```bash
# Using docker-compose (easiest - already configured)
docker-compose up --build

# Or manually with volume mounting (Docker)
docker run -d \
  --name spider-api-dev \
  -p 3001:3001 \
  --env-file .env \
  -v $(pwd):/app \
  -v /app/node_modules \
  spider-api-backend

# Or manually with volume mounting (Podman)
podman run -d \
  --name spider-api-dev \
  -p 3001:3001 \
  --env-file .env \
  -v $(pwd):/app:Z \
  -v /app/node_modules \
  spider-api-backend
```

## Authentication (temporarily disabled)

Authentication is not currently mounted in the running application. The backend
implementation is isolated in `backend/src/auth/`, and the login view is in
`frontend/src/auth/`; neither is connected to active routes. The application API
is currently unauthenticated for development. Re-enable authentication before
exposing the service to untrusted networks.

To re-enable it later, mount `createAuthModule(logger).router` under `/auth`,
register `cookie-parser`, and apply its `verifyJWT` middleware to the protected
API routes. Also restore credentialed CORS and connect the dormant login view
in the frontend router.

## API Endpoints

### Traffic Data

- `GET /api/traffic` - Get all current traffic data
- `GET /api/traffic/:direction` - Get traffic data filtered by direction
  - Example: `GET /api/traffic/Stockholm` returns only departures heading to Stockholm

### Stop administration

- `GET /api/stops/search?query=<text>` - Search stops using Trafiklab Stop Lookup
- `GET /api/stops/config` - Read the configured stop
- `PUT /api/stops/config` - Save the stop used for traffic data
  - Request body: `{ "areaId": "740065516", "stopName": "Example stop" }`

The selected stop is stored in `backend/src/config.json`. The backend reads this
file for each traffic request; if it does not exist, it uses area ID `740065516`.
Ensure this file location is writable by the backend process and persisted when
running in a container.

Stop search calls Trafiklab's `/v1/stops/name/{searchValue}/` endpoint. Its
`stop_groups` response is normalized to `{ stops: [{ id, name, stops: [...] }] }`;
the group ID is the ID stored and used for departure lookups. Each child stop
includes `id`, `name`, `lat`, and `lon` coordinates for future map views.

### Utility

- `GET /health` - Health check

## Environment Variables

Create a `.env` file in the backend directory:

```env
PORT=3001
API_KEY=your_trafiklab_api_key_here
NODE_ENV=development
```

### Required Environment Variables

- `API_KEY`: Your Trafiklab API key for traffic data
- `PORT`: Server port (default: 3001)
- `NODE_ENV`: Environment (development/production)

`JWT_SECRET` is needed only when authentication is re-enabled.

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
3. Choose a stop from the admin view; its ID is stored in `backend/src/config.json`

## Development Notes

- Backend built with **TypeScript** for type safety
- Uses **tsx** for development with hot reload
- ESLint + Prettier configured for code quality
- The frontend is configured for development only (not production-ready)
- CORS is configured to allow requests from `http://localhost:5173` and `http://localhost:5174`

## Technology Stack

### Backend
- Node.js 20+
- Express 4.x
- TypeScript 5.x
- JWT (jsonwebtoken; authentication module currently dormant)
- node-fetch for API calls
- ESLint + Prettier for code quality

### Frontend
- Vue 3 with Composition API
- Vue Router
- Vite build tool

## Security

- Authentication is temporarily disabled: application endpoints are accessible without credentials.
- CORS is configured with a specific origin allowlist.
- Container runs as non-root user
- Health check endpoint for monitoring

## Testing

1. Start backend and frontend servers (locally or with containers)
2. Navigate to `http://localhost:5173`
3. Search for a stop and save it to the configuration; the admin view then loads its traffic data
4. Test direction filtering: `GET /api/traffic/Stockholm`

### Testing with cURL

```bash
# Test health endpoint
curl http://localhost:3001/health

# Test traffic endpoint
curl http://localhost:3001/api/traffic

# Test traffic endpoint with direction filter
curl http://localhost:3001/api/traffic/Stockholm
````

### Testing with Container

```bash
# Start backend with docker-compose
docker-compose up -d

# Or start backend container manually
cd backend && docker run -d --name spider-api -p 3001:3001 --env-file .env spider-api-backend

# Start frontend locally
cd frontend && npm run dev

# Test health endpoint
curl http://localhost:3001/health
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
