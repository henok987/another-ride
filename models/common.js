const mongoose = require('mongoose');

const LocationSchema = new mongoose.Schema({
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  address: { type: String }
}, { _id: false });

const VehicleTypeEnum = ['mini', 'sedan', 'van'];

module.exports = { LocationSchema, VehicleTypeEnum };

