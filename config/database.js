const { Sequelize } = require('sequelize');
require('dotenv').config();

const database = process.env.DB_NAME || 'rideshare_db';
const username = process.env.DB_USER || 'root';
const password = process.env.DB_PASS || '2702@AD';
const host = process.env.DB_HOST || '127.0.0.1';
const port = Number(process.env.DB_PORT || 3306);
const dialect = process.env.DB_DIALECT || 'mysql';

const sequelize = new Sequelize(database, username, password, {
host,
port,
dialect,
logging: process.env.SEQ_LOG === 'true' ? console.log : false,
define: {
  underscored: true,
  timestamps: false,
},
});

module.exports = { sequelize };
