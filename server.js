const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');
require('dotenv').config();

const { connectMongo } = require('./config/mongo');
const responseFormatter = require('./middleware/responseFormatter');
const { attachSocketHandlers } = require('./sockets');
const positionUpdateService = require('./services/positionUpdate');

const app = express();

// ---------- MIDDLEWARE ----------
app.set('trust proxy', 1);
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(morgan('dev'));
app.use(responseFormatter());

app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 100,
  })
);

// ---------- ROUTES mounted in one process ----------
app.get('/v1/health', (req, res) => res.json({ ok: true }));
app.use('/v1/auth', require('./routes/v1/auth.routes'));
app.use('/v1/bookings', require('./routes/v1/booking.routes'));
app.use('/v1/assignments', require('./routes/v1/assignment.routes'));
app.use('/v1/trips', require('./routes/v1/trip.routes'));
app.use('/v1/live', require('./routes/v1/live.routes'));
app.use('/v1/drivers', require('./routes/v1/driver.routes'));
app.use('/v1/mapping', require('./routes/v1/mapping.routes'));
app.use('/v1/pricing', require('./routes/v1/pricing.routes'));
app.use('/v1/passengers', require('./routes/v1/passenger.routes'));
app.use('/v1/analytics', require('./routes/v1/analytics.routes'));

// ---------- SERVER ----------
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
attachSocketHandlers(io);

const PORT = process.env.PORT || 4000;
connectMongo()
  .then(() => {
    console.log(`🔑 JWT Secret: ${process.env.JWT_SECRET ? 'Custom' : 'Default (secret)'}`);
    positionUpdateService.start();
    server.listen(PORT, () => console.log(`Server listening on :${PORT}`));
  })
  .catch((e) => {
    console.error('Failed to connect Mongo', e);
    process.exit(1);
  });
