const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cookieParser());

// CORS configuration - allow only frontend origin with credentials
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'], // Vue 3 dev server ports
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Mock token validation (replace with real validation logic)
const VALID_TOKENS = [
  'demo-token-123',
  'test-token-456',
  'poc-token-789'
];

// Middleware to verify JWT from cookie
const verifyJWT = (req, res, next) => {
  const token = req.cookies.authToken;
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token.' });
  }
};

// Routes

// POST /auth/token - Authenticate with token and issue JWT
app.post('/auth/token', (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  // Mock token validation (replace with real validation)
  if (!VALID_TOKENS.includes(token)) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  // Create JWT
  const jwtToken = jwt.sign(
    { 
      userId: 'user123', // Mock user ID
      token: token,
      timestamp: Date.now()
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  // Set JWT as HttpOnly, Secure, SameSite cookie
  res.cookie('authToken', jwtToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Only secure in production
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  });

  res.json({ 
    success: true, 
    message: 'Authentication successful',
    user: { id: 'user123' }
  });
});

// GET /api/traffic - Get traffic data from third-party API
app.get('/api/traffic', /* verifyJWT, */ async (req, res) => {
  try {

    const apiKey = process.env.API_KEY;
    const areaId = '740065516';

    const url = `https://realtime-api.trafiklab.se/v1/departures/${areaId}?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const trafficData = await response.json();

    res.json(trafficData);

    // Mock third-party API call
    // Replace with actual API endpoint and logic
    const mockTrafficData = {
      timestamp: new Date().toISOString(),
      data: [
        {
          location: 'Highway 101 North',
          speed: 45,
          congestion: 'moderate',
          incidents: 0
        },
        {
          location: 'Highway 101 South', 
          speed: 35,
          congestion: 'heavy',
          incidents: 1
        },
        {
          location: 'I-280 North',
          speed: 65,
          congestion: 'light',
          incidents: 0
        },
        {
          location: 'I-280 South',
          speed: 55,
          congestion: 'moderate',
          incidents: 0
        }
      ],
      source: 'Third Party Traffic API'
    };

    // Uncomment and modify this section when you have a real API
    /*
    const response = await axios.get('https://your-third-party-api.com/traffic', {
      headers: {
        'Authorization': `Bearer ${process.env.THIRD_PARTY_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    res.json(response.data);
    */
    
    // For now, return mock data
    //res.json(mockTrafficData);
    
  } catch (error) {
    console.error('Error fetching traffic data:', error);
    res.status(500).json({ 
      error: 'Failed to fetch traffic data',
      message: error.message 
    });
  }
});

// POST /auth/logout - Clear authentication cookie
app.post('/auth/logout', (req, res) => {
  res.clearCookie('authToken');
  res.json({ success: true, message: 'Logged out successfully' });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`CORS enabled for: http://localhost:5173 and http://localhost:5174`);
});

module.exports = app;
