# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Backend (Node.js / TypeScript)
- **Install dependencies**: `cd backend && npm install`
- **Start development server**: `cd backend && npm run dev` (with hot reload)
- **Build production assets**: `cd backend && npm run build`
- **Start production server**: `cd backend && npm start`
- **Linting**: `cd backend && npm run lint`
- **Type checking**: `cd backend && npm run type-check`
- **Formatting**: `cd backend && npm run format`

### Frontend (Vue.js / TypeScript)
- **Install dependencies**: `cd frontend && npm install`
- **Start development server**: `cd frontend && npm run dev`
- **Build production assets**: `cd frontend && npm run build`
- **Type checking**: `cd frontend && npm run type-check`

## Project Architecture

The project is a full-stack application for retrieving real-time traffic data, split into a backend API and a Vue.js frontend.

### Backend (Express + TypeScript)
- **Server**: Located in `backend/src/server.ts`. Handles routing, middleware, and authentication.
- **Routes**: Definitions for all API endpoints are in `backend/src/routes`.
- **Controllers/Services**: Business logic and external API calls (Trafiklab) reside in `backend/src/services`.
- **Middleware**: Authentication and logging middleware are in `backend/src/middleware`.
- **Types**: Shared types and interfaces are found in `backend/src/types`.
- **Auth**: Supports JWT-based authentication using HttpOnly cookies. Validates against a hardcoded list of demo tokens and credentials.

### Frontend (Vue 3 + Vite)
- **Application Structure**: A standard Vue 3 project structured with a `views` directory.
- **Components**: View-level components are primarily in `frontend/src/views`.
- **Vue Router**: Handles navigation between Login and Traffic views.
- **Technology**: Uses Composition API with `<script setup>` and Vite for fast development.

### Infrastructure
- **Docker**: Supported via `docker-compose.yml` and a `Dockerfile` in the backend directory.
- **Deployment**: The application is designed to run in containers, with specific support for Podman/Docker environment variables.

## Key Development Tasks
- **API Development**: New endpoints should be added to `backend/src/routes` and handled by services in `backend/src/services`.
- **Frontend UI**: New views/components should be added to `frontend/src/views`.
- **Authentication**: Ensure all protected routes have the appropriate authentication middleware applied.
- **Environment**: Always check `.env` configuration (specifically `API_KEY` and `JWT_SECRET`) before testing connectivity.
