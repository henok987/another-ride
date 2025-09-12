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

// Rate limiter - more restrictive for external service
app.use(
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 200, // Allow more requests for external service
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
  version: '1.0.0'
}));

app.use('/api/v1', apiRoutes);

// ---------- ERROR HANDLING ----------
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`
  });
});

// ---------- SERVER ----------
const server = http.createServer(app);

const PORT = process.env.PORT || 4000;
connectMongo()
  .then(() => {
    console.log(`🔑 JWT Secret: ${process.env.JWT_SECRET ? 'Custom' : 'Default (secret)'}`);
    console.log(`🌐 User Service listening on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🔗 API Base URL: http://localhost:${PORT}/api/v1`);
    
    server.listen(PORT, () => {
      console.log(`✅ User Service started successfully`);
    });
  })
  .catch((e) => {
    console.error('❌ Failed to connect to MongoDB:', e);
    process.exit(1);
  });

module.exports = app;