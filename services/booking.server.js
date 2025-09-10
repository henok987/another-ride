const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const { authenticate, authorize } = require('../middleware/auth');
const responseFormatter = require('../middleware/responseFormatter');
const api = express();

api.use(cors());
api.use(helmet());
api.use(express.json());
api.use(morgan('dev'));
api.use(responseFormatter());

// Mount booking-domain routes
api.use('/v1/bookings', require('../routes/v1/booking.routes'));
api.use('/v1/assignments', require('../routes/v1/assignment.routes'));
api.use('/v1/trips', require('../routes/v1/trip.routes'));
// Additional domain routes to align with Postman
api.use('/v1/live', require('../routes/v1/live.routes'));
api.use('/v1/analytics', require('../routes/v1/analytics.routes'));
api.use('/v1/passengers', require('../routes/v1/passenger.routes'));

const port = process.env.BOOKING_PORT || 4001;
const server = http.createServer(api);
server.listen(port, () => {
  console.log(`Booking Service listening on :${port}`);
});


