const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { Server } = require('socket.io');
require('dotenv').config();

const { attachSocketHandlers } = require('../sockets');
const responseFormatter = require('../middleware/responseFormatter');
const liveRoutes = require('../routes/v1/live.routes');

const app = express();
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(morgan('dev'));
app.use(responseFormatter());
app.use('/v1/live', liveRoutes);

const port = process.env.REALTIME_PORT || 4004;
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
attachSocketHandlers(io);

server.listen(port, () => {
  console.log(`Realtime Gateway listening on :${port}`);
});


