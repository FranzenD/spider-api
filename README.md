# Spider API - Traffic Data Application

Spider API is a full-stack application for live Swedish public transport departures
from [Trafiklab](https://www.trafiklab.se/). The admin view lets you configure the
stop and destination used by an external client. The Express backend calls Trafiklab
and keeps the API key on the server.

## Admin workflow

1. Open the admin view at `/traffic` and search for a stop by name or location.
2. Select a stop from the search results, favorites, or history.
3. Choose a direction under **Destination för den externa appen** and click
   **Spara destination**. The active-stop card shows the saved destination.
4. Use **Visa avgångar** to switch between all directions and the saved destination.
   The view starts with all directions and shows up to three upcoming departures
   per destination. Both radio options are disabled until the stop has a saved
   destination.

The backend remembers each stop's destination and restores it when you return
to that stop. Favorites and selection history are stored in the browser, with
up to five entries in each list.

## Project structure

```text
spider-api/
├── backend/
│   ├── src/
│   │   ├── server.ts                 # Express routes, middleware, and stop settings
│   │   ├── services/StopService.ts   # Trafiklab stop lookup and departure requests
│   │   ├── types/                    # Backend TypeScript types
│   │   ├── utils/                    # Direction matching and departure times
│   │   └── auth/                     # Dormant authentication module
│   ├── .env-example
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── main.ts                   # Vue entry point and router
│   │   ├── views/TrafficView.vue     # Stop and destination administration
│   │   ├── components/               # Stop lists, departures, and status messages
│   │   ├── composables/              # API requests and frontend state
│   │   ├── api.ts                    # Backend URL
│   │   ├── types.ts                  # Frontend API types
│   │   ├── validation.ts             # Runtime checks for API and saved data
│   │   └── auth/LoginView.vue        # Dormant login view
│   ├── tests/traffic.test.ts         # Vitest component regression tests
│   ├── index.html
│   └── vite.config.ts
├── docker-compose.yml
└── AGENTS.md
```

The backend uses Node.js, Express, and TypeScript. The frontend uses Vue 3,
Vue Router, TypeScript, and Vite. Each package has its own npm lockfile and build
output in `dist/`.

## Local development

Use Node.js 24 LTS and npm. Start the backend and frontend from separate terminals.

### Backend

```bash
cd backend
cp -n .env-example .env
npm ci
```

Set `API_KEY` in `backend/.env` to your Trafiklab key, then run `npm run dev`.
The Express server listens on `http://localhost:3001` by default. Nodemon
reloads backend code and ignores writes to the saved stop configuration.

### Frontend

```bash
cd frontend
npm ci
npm run dev
```

Open [the admin view](http://localhost:5173/traffic). The browser calls the
backend at `http://localhost:3001` by default.

### Configuration

| Variable | Location | Purpose |
| --- | --- | --- |
| `API_KEY` | `backend/.env` | Trafiklab API key for stop search and live departures |
| `PORT` | `backend/.env` | Backend port, defaults to `3001` |
| `NODE_ENV` | Backend environment | `npm run dev` sets `development` and enables readable console logs |
| `FRONTEND_ORIGIN` | `backend/.env` | Comma-separated list of additional frontend origins for CORS |
| `VITE_API_BASE_URL` | `frontend/.env.local` | Override the backend URL used by the browser |
| `JWT_SECRET` | `backend/.env` | Used when the authentication module is enabled |

The backend stores the active stop and destinations by stop ID in
`backend/src/config.json`. Before the first save, the active area ID defaults
to `740065516`. Keep the configuration file and environment files local. The
backend process needs write access to `backend/src/` to save changes.

### Raspberry Pi frontend

Browser requests are allowed from `http://localhost:5173` and
`http://localhost:5174` by default. To also allow Vite dev on port `5173` and
the PM2 frontend on port `8080`, add both origins to `backend/.env` on the
machine running the API.

```dotenv
FRONTEND_ORIGIN=http://192.168.50.34:5173,http://192.168.50.34:8080
```

Use the scheme, host, and port from the browser URL, with no trailing slash.
Restart the backend to apply the setting. If the backend runs under PM2, rebuild
it after updating the code and run `pm2 restart SPIDER-API`.

Set `VITE_API_BASE_URL` in `frontend/.env.local` to the backend address that the
browser can reach. If the API also runs on the Pi on its default port, use
`VITE_API_BASE_URL=http://192.168.50.34:3001`. Restart Vite to apply the dev
setting. For production, run `npm run build` from `frontend/` and serve `dist/`
with `npm run start:pm2`.

## API endpoints

### Traffic data

| Endpoint | Response |
| --- | --- |
| `GET /api/traffic` | `{ departure: ... }` for the next upcoming, non-cancelled departure toward the saved destination |
| `GET /api/traffic?all=true` | A `departures` array and `meta.timestamp` for all directions at the active stop |
| `GET /api/traffic?areaId=<id>` | All directions for the specified area, also used with `all=true` by admin |
| `GET /api/traffic/:direction` | `{ departure: ... }` for the first matching direction, optionally at a specified `areaId` |
| `GET /health` | Backend health status, timestamp, and version |

`GET /api/traffic` returns HTTP `409` when there is no saved destination and
`404` when there is no upcoming departure toward it. The explicit direction
endpoint returns `400` when there is no matching departure.

### Stop administration

| Endpoint | Purpose |
| --- | --- |
| `GET /api/stops/search?query=<text>` | Search Trafiklab stop groups with a query of 2–100 characters |
| `GET /api/stops/config` | Read the active stop, its coordinates when available, and its saved destination |
| `PUT /api/stops/config` | Set the active stop using `areaId` and optional `stopName` and `stops` fields |
| `PUT /api/stops/config/destination` | Save `destination` for the active `areaId` |

Use the stop group ID returned by search as the `areaId`. To set a destination,
use one of the directions from that stop's current departures. The backend
returns `409` if the active stop changed and `422` if the direction is no
longer among its departures.

The stop and destination updates use these request bodies.

```json
{ "areaId": "740065516", "stopName": "Example stop" }
```

```json
{ "areaId": "740065516", "destination": "Stockholm" }
```

## Build and verify

| Directory | Command | Purpose |
| --- | --- | --- |
| Both packages | `npm run type-check` | Type-check the package |
| Both packages | `npm run build` | Compile the backend or type-check and bundle the frontend |
| `backend/` | `npm start` | Start the compiled Express server |
| `backend/` | `npm run lint`, `npm run format:check` | Run ESLint and check Prettier formatting |
| `frontend/` | `npm test` | Run Vitest with mocked API responses and no Trafiklab key |
| `frontend/` | `npm run preview` | Preview the built frontend |

For a manual smoke test, select a stop and save a destination in admin. Switch
to another stop and back, then confirm the saved destination is restored and
compare the responses below.

```bash
curl http://localhost:3001/health
curl http://localhost:3001/api/traffic
curl 'http://localhost:3001/api/traffic?all=true'
```

## Containers

The Dockerfile builds and runs the compiled backend as a non-root user. Build
the image from a checkout without a generated `backend/src/config.json`.
The Docker build context includes `backend/src/`.

```bash
cd backend
docker build -t spider-api-backend .
docker run --rm --name spider-api -p 3001:3001 --env-file .env \
  -v spider-api-state:/app/src spider-api-backend
```

The named volume preserves the configuration directory across runs. The
container user needs write access to it.
You can use `podman` in place of `docker`. Run the frontend separately
using the local development instructions.

The Compose file defines a backend service and a health check. Its bind mount
uses the host's `backend/` as `/app`, so build the backend on the host first
with `npm run build` and make the mounted directory writable by the container
user. Then run `docker compose up --build backend` from the repository root.

## Authentication

Authentication is temporarily disabled. Keep the service on a trusted network.
The backend auth module in `backend/src/auth/` and the login view in
`frontend/src/auth/` are available for future reactivation.

To re-enable authentication, mount the auth router, register `cookie-parser`,
apply `verifyJWT` to protected routes, configure credentialed CORS, and connect
the login view in the frontend router.
