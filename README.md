# Spider API - Traffic Data Application

A full-stack web application for retrieving traffic data with JWT authentication. The project consists of a Node.js/Express backend and a Vue 3 frontend.

## Project Structure

```
spider-api/
├── backend/
│   ├── package.json
│   ├── server.js
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
- Responsive design
- Error handling and user feedback

## Quick Start

### 1. Backend Setup

```bash
cd backend
npm install
npm start
```

The backend will run on `http://localhost:3000`

### 2. Frontend Setup

```bash
cd frontend  
npm install
npm run dev
```

The frontend will run on `http://localhost:5173`

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
THIRD_PARTY_API_KEY=your_api_key_here
JWT_SECRET=your_jwt_secret_here_should_be_long_and_secure
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

## Testing

1. Start both backend and frontend servers
2. Navigate to `http://localhost:5173`
3. Use any demo token to authenticate
4. Click "Fetch Traffic Data" to test the protected endpoint

## Production Deployment

Before deploying to production:

1. Update CORS origin to your production domain
2. Set `NODE_ENV=production` for secure cookies
3. Use environment variables for all secrets
4. Implement proper token validation logic
5. Add input validation and sanitization
6. Configure HTTPS
7. Add rate limiting and other security middleware
