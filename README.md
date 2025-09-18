# Spider API - Traffic Data Application

A full-stack web application for retrieving traffic data with JWT authentication. The project consists of a Node.js/Express backend and a Vue 3 frontend.

## Project Structure

```
spider-api/
├── backend/
│   ├── package.json
│   ├── server.js
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

### Backend (Node.js + Express)
- **POST /auth/token**: Token-based authentication with JWT
- **GET /api/traffic**: Protected endpoint for traffic data
- **POST /auth/logout**: Clear authentication cookie
- **GET /health**: Health check endpoint
- Secure cookie-based JWT storage (HttpOnly, Secure, SameSite=Strict)
- CORS configuration with credentials support
- Mock traffic data (ready for third-party API integration)

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
npm start
```

The backend will run on `http://localhost:3000`

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

The application uses demo tokens for authentication:
- `demo-token-123`
- `test-token-456` 
- `poc-token-789`

### Authentication Flow
1. User enters a token in the login form
2. Backend validates the token (currently hardcoded)
3. If valid, backend issues a JWT and sets it as an HttpOnly cookie
4. Frontend can access protected endpoints using the cookie

## API Endpoints

### Authentication
- `POST /auth/token` - Authenticate with token
- `POST /auth/logout` - Clear authentication cookie

### Traffic Data
- `GET /api/traffic` - Get current traffic data (requires authentication)

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
```

## Third-Party API Integration

To integrate with a real traffic API, modify the `/api/traffic` endpoint in `server.js`:

1. Uncomment the axios request code
2. Replace the mock API URL with your actual endpoint  
3. Configure the API key in your `.env` file
4. Update request headers as needed

## Development Notes

- The frontend is configured for development only (not production-ready)
- All fetch requests include `credentials: 'include'` for cookie support
- CORS is configured to allow requests from `http://localhost:5173`
- JWT cookies are set with security flags appropriate for the environment

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
3. Use any demo token to authenticate
4. Click "Fetch Traffic Data" to test the protected endpoint

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
6. Configure HTTPS
7. Add rate limiting and other security middleware
