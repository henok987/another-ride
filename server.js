const express = require('express');
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
