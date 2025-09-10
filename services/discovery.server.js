const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const responseFormatter = require('../middleware/responseFormatter');
const { authenticate } = require('../middleware/auth');
const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(morgan('dev'));
app.use(responseFormatter());

// Mount discovery/pricing related routes
app.use('/v1/drivers', require('../routes/v1/driver.routes'));
app.use('/v1/mapping', require('../routes/v1/mapping.routes'));
app.use('/v1/pricing', require('../routes/v1/pricing.routes'));

const port = process.env.DISCOVERY_PORT || 4002;
const server = http.createServer(app);
server.listen(port, () => {
  console.log(`Discovery/Pricing Service listening on :${port}`);
});


