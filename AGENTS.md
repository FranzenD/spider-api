# Repository Guidelines

## Project Structure

Spider API displays live Swedish public transport departures from Trafiklab. `backend/src/server.ts` defines the Express routes and middleware. Trafiklab stop lookup and departure logic lives in `backend/src/services/`, with backend types in `backend/src/types/`. The Vue 3 frontend lives in `frontend/src/`, with route-level views in `views/`, reusable UI in `components/`, and shared behavior in `composables/`. Frontend API types live in `frontend/src/types.ts`. Vite's HTML entry point is `frontend/index.html`, and component styles live in the `.vue` files.

## Build and Development

Use Node.js 24 LTS and run `npm ci` in both `backend/` and `frontend/`.

- Run `npm run dev` in each package in separate terminals. The backend defaults to port `3001` and Vite to `5173`.
- Run `npm run build` in each package to compile the backend and type-check and bundle the frontend. Run `npm start` in `backend/` to start the compiled server.
- Run `npm run type-check` in both packages. In `backend/`, run `npm run lint` and `npm run format:check`, or apply Prettier with `npm run format`.

## Coding Style

Use two-space indentation and single quotes. Backend Prettier uses semicolons and a 100-character print width. Follow the frontend's semicolon-free TypeScript style and use Vue's `<script setup lang="ts">`. Name Vue components in PascalCase (`StopSearch.vue`) and composables in camelCase with a `use` prefix (`useStopApi.ts`). Keep `.js` extensions on relative backend imports for Node ESM.

## Testing

Run `npm test` in `frontend/` for Vitest regression tests in `tests/*.test.ts`. For a manual smoke test, check `curl http://localhost:3001/health`, then search for a stop in the frontend, save it, and confirm departures load. For direction filtering, check `/api/traffic/Stockholm`.

## Commits and Pull Requests

Follow the history's `feat:` and `fix:` prefixes with an action verb and a specific summary. In the PR, describe the change, record verification steps and results, link an issue when available, and include screenshots for visible UI changes.

## Local Configuration

Copy `backend/.env-example` to `backend/.env` and set `API_KEY` for Trafiklab requests. Keep that file and the generated `backend/src/config.json` local. Set `VITE_API_BASE_URL` if the backend URL differs from the default.
