<<<<<<< HEAD
﻿const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
require('dotenv').config();

const { sequelize } = require('./config/database');
const routes = require('./routes');

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.use('/uploads', express.static('uploads'));
app.use('/api', routes);

app.get('/', (req, res) => res.json({ status: 'ok' }));

const port = Number(process.env.PORT || 3000);

async function start() {
try {
await sequelize.authenticate();
await sequelize.sync();
app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
} catch (e) {
console.error('Failed to start', e);
process.exit(1);
}
}

start();
=======
const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { connectMongo } = require('./config/mongo');
const apiRoutes = require('./routes');

const app = express();

// ---------- MIDDLEWARE ----------
app.set('trust proxy', 1); // Fix for X-Forwarded-For header (rate-limit behind proxy)
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(morgan('dev'));

// Rate limiter - optimized for external service access
app.use(
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 300, // Increased limit for external service integration
    message: {
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: '60 seconds'
    }
  })
);

// ---------- ROUTES ----------
app.get('/health', (req, res) => res.json({ 
  service: 'user-service',
  status: 'healthy',
  timestamp: new Date().toISOString(),
  version: '2.0.0',
  features: {
    roleBasedAccess: true,
    externalServiceIntegration: true,
    dataFiltering: true,
    batchOperations: true
  }
}));

// Main API routes
app.use('/api', apiRoutes);

// ---------- ERROR HANDLING ----------
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  });
});

// ---------- SERVER ----------
const server = http.createServer(app);

const PORT = process.env.PORT || 3001;
connectMongo()
  .then(() => {
    console.log(`🔑 JWT Secret: ${process.env.JWT_SECRET ? 'Custom' : 'Default (secret)'}`);
    console.log(`🌐 User Service listening on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
    console.log(`📋 Service Info: http://localhost:${PORT}/api/info`);
    
    // External service integration info
    console.log(`\n🚀 External Service Integration Ready:`);
    console.log(`   • Role-based data filtering: ✅`);
    console.log(`   • Service-to-service authentication: ✅`);
    console.log(`   • Batch operations: ✅`);
    console.log(`   • Booking service endpoints: ✅`);
    
    server.listen(PORT, () => {
      console.log(`✅ User Service v2.0.0 started successfully`);
      console.log(`\n📖 Available Endpoints:`);
      console.log(`   • GET  /api/passenger/:id - Get passenger info`);
      console.log(`   • GET  /api/driver/:id - Get driver info`);
      console.log(`   • POST /api/passengers/batch - Batch get passengers`);
      console.log(`   • POST /api/drivers/batch - Batch get drivers`);
      console.log(`   • GET  /api/admin/users - Get all users (admin only)`);
    });
  })
  .catch((e) => {
    console.error('❌ Failed to connect to MongoDB:', e);
    process.exit(1);
  });

module.exports = app;
>>>>>>> 8271ecdbe39692a5ce15dcbc38ad8d9f11b7516b
