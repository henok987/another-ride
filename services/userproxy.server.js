const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const responseFormatter = require('../middleware/responseFormatter');
const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(morgan('dev'));
app.use(responseFormatter());

// Mount user directory routes (read-only)
app.use('/v1/passengers', require('../routes/v1/passenger.routes'));
// Optional: create read-only driver routes that expose list/get only via driver.controller
app.use('/v1/drivers', require('../routes/v1/driver.routes'));

const port = process.env.USERPROXY_PORT || 4003;
const server = http.createServer(app);
server.listen(port, () => {
  console.log(`User Directory Proxy listening on :${port}`);
});


