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

// Mount read-only proxy routes that forward to external User Service
app.use('/v1/passengers', require('../routes/v1/userproxy.passengers.routes'));
app.use('/v1/drivers', require('../routes/v1/userproxy.drivers.routes'));

const port = process.env.USERPROXY_PORT || 4003;
const server = http.createServer(app);
server.listen(port, () => {
  console.log(`User Directory Proxy listening on :${port}`);
});


