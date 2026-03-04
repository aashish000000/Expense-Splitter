const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const http = require('http');
const path = require('path');

const config = require('./src/config');
const authRoutes = require('./src/routes/auth');
const groupRoutes = require('./src/routes/groups');
const { db } = require('./src/db');
const { setupWebSocket } = require('./src/websocket');
const { errorHandler, notFoundHandler } = require('./src/middleware/errorHandler');
const { generalLimiter } = require('./src/middleware/rateLimiter');

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

// Request logging
if (config.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Compression and body parsing
app.use(compression());
app.use(express.json({ limit: '1mb' }));

// Rate limiting
app.use(generalLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use(authRoutes);
app.use('/groups', groupRoutes);
app.use('/api/groups', groupRoutes);

// Legacy route for loading user groups
app.get('/api/loadmygroup', async (req, res) => {
  try {
    const { id: userId } = req.query;
    if (!userId) return res.status(400).json({ success: false, message: 'User ID is required' });

    const userGroups = await db.find({ collection: 'groups', users: userId });
    const details = userGroups.map((g) => ({
      id: g.id,
      name: g.name,
      memberCount: g.users.length,
      expenseCount: g.expenses.length,
    }));
    res.json(details);
  } catch (err) {
    console.error('Load groups error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Static assets
app.use(express.static(path.join(__dirname, 'public')));

// 404 handler for HTML pages - serves index.html for unknown routes
app.use((req, res, next) => {
  if (req.accepts('html') && !req.path.startsWith('/api') && !req.path.startsWith('/groups')) {
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
  next();
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Create HTTP server and setup WebSocket
const server = http.createServer(app);
setupWebSocket(server);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Start server
server.listen(config.PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════╗
║         Expense Splitter Server Started           ║
╠═══════════════════════════════════════════════════╣
║  URL:  http://localhost:${config.PORT.toString().padEnd(25)}║
║  Mode: ${config.NODE_ENV.padEnd(37)}║
╚═══════════════════════════════════════════════════╝
  `);
});
