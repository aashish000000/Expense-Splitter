const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const http = require('http');
const path = require('path');

const config = require('./src/config');
const authRoutes = require('./src/routes/auth');
const groupRoutes = require('./src/routes/groups');
const { db } = require('./src/db');
const { setupWebSocket } = require('./src/websocket');

const app = express();

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'", 'ws:', 'wss:'],
      },
    },
  })
);

// CORS configuration
const corsOptions = {
  origin: config.NODE_ENV === 'production' ? config.CORS_ORIGINS.split(',').filter(Boolean) : true,
  credentials: true,
};
app.use(cors(corsOptions));

// Compression and body parsing
app.use(compression());
app.use(express.json({ limit: '1mb' }));

// API routes
app.use(authRoutes);
app.use('/groups', groupRoutes);
app.use('/api/groups', groupRoutes);

// Legacy route for loading user groups
app.get('/api/loadmygroup', async (req, res) => {
  try {
    const { id: userId } = req.query;
    if (!userId) return res.status(400).json({ message: 'User ID is required' });

    const userGroups = await db.find({ collection: 'groups', users: userId });
    const details = userGroups.map((g) => ({ id: g.id, name: g.name }));
    res.status(200).json(details);
  } catch (err) {
    console.error('Load groups error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Static assets
app.use(express.static(path.join(__dirname, 'public')));

// Create HTTP server and setup WebSocket
const server = http.createServer(app);
setupWebSocket(server);

// Start server
server.listen(config.PORT, () => {
  console.log(`Server running on http://localhost:${config.PORT} (${config.NODE_ENV})`);
});
