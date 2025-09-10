const mongoose = require('mongoose');
const { LocationSchema, VehicleTypeEnum } = require('./common');

const BookingStatus = ['requested', 'accepted', 'ongoing', 'completed', 'canceled'];

const FareBreakdownSchema = new mongoose.Schema({
  base: { type: Number, default: 0 },
  distanceCost: { type: Number, default: 0 },
  timeCost: { type: Number, default: 0 },
  waitingCost: { type: Number, default: 0 },
  surgeMultiplier: { type: Number, default: 1 }
}, { _id: false });

const BookingSchema = new mongoose.Schema({
  passengerId: { type: String, required: true },
  passengerName: { type: String },
  passengerPhone: { type: String },
  driverId: { type: String },
  vehicleType: { type: String, enum: VehicleTypeEnum, default: 'mini' },
  pickup: { type: LocationSchema, required: true },
  dropoff: { type: LocationSchema, required: true },
  status: { type: String, enum: BookingStatus, default: 'requested', index: true },
  fareEstimated: { type: Number, default: 0 },
  fareFinal: { type: Number, default: 0 },
  fareBreakdown: { type: FareBreakdownSchema, default: () => ({}) },
  distanceKm: { type: Number, default: 0 },
  acceptedAt: { type: Date },
  startedAt: { type: Date },
  completedAt: { type: Date },
  // Rating fields
  passengerRating: { type: Number, min: 1, max: 5 },
  driverRating: { type: Number, min: 1, max: 5 },
  passengerComment: { type: String },
  driverComment: { type: String }
}, { timestamps: true, toJSON: { versionKey: false }, toObject: { versionKey: false } });

const BookingAssignmentSchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  dispatcherId: { type: String },
  driverId: { type: String, required: true },
  passengerId: { type: String, required: true }
}, { timestamps: true, toJSON: { versionKey: false }, toObject: { versionKey: false } });

const TripHistorySchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  driverId: { type: String },
  passengerId: { type: String },
  dateOfTravel: { type: Date, default: Date.now },
  status: { type: String, enum: BookingStatus, required: true }
}, { timestamps: true, toJSON: { versionKey: false }, toObject: { versionKey: false } });

const LiveSchema = new mongoose.Schema({
  tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'TripHistory' },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  driverId: { type: String },
  passengerId: { type: String },
  timestamp: { type: Date, default: Date.now },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  status: { type: String, enum: BookingStatus },
  locationType: { type: String, enum: ['pickup', 'dropoff', 'current'], default: 'current' }
}, { timestamps: true, toJSON: { versionKey: false }, toObject: { versionKey: false } });

module.exports = {
  Booking: mongoose.model('Booking', BookingSchema),
  BookingAssignment: mongoose.model('BookingAssignment', BookingAssignmentSchema),
  TripHistory: mongoose.model('TripHistory', TripHistorySchema),
  Live: mongoose.model('Live', LiveSchema),
  BookingStatus
};

