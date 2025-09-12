const mongoose = require('mongoose');

const PricingSchema = new mongoose.Schema({
  vehicleType: { type: String, enum: ['mini', 'sedan', 'van'], default: 'mini', index: true },
  baseFare: { type: Number, default: 2 },
  perKm: { type: Number, default: 1 },
  perMinute: { type: Number, default: 0.2 },
  waitingPerMinute: { type: Number, default: 0.1 },
  surgeMultiplier: { type: Number, default: 1 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Prevent duplicates for same vehicleType and active state
PricingSchema.index({ vehicleType: 1, baseFare: 1, perKm: 1, perMinute: 1, waitingPerMinute: 1, surgeMultiplier: 1 }, { unique: true });

module.exports = { Pricing: mongoose.model('Pricing', PricingSchema) };

