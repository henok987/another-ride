const mongoose = require('mongoose');

const RoleSchema = new mongoose.Schema({ name: { type: String, required: true, unique: true } }, { timestamps: true });
const PermissionSchema = new mongoose.Schema({ name: { type: String, required: true, unique: true } }, { timestamps: true });

const PassengerSchema = new mongoose.Schema({
  phone: { type: String, index: true, unique: true, required: true },
  status: { type: String, enum: ['pending', 'active'], default: 'pending', required: true }
}, { timestamps: true });

const DriverSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  name: { type: String },
  phone: { type: String },
  email: { type: String },
  password: { type: String },
  vehicleType: { type: String, enum: ['mini', 'sedan', 'van'], default: 'mini' },
  available: { type: Boolean, default: false },
  lastKnownLocation: { latitude: Number, longitude: Number },
  roles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }]
}, { timestamps: true, _id: false });

// Ensure unique only when phone/email are present
DriverSchema.index(
  { phone: 1 },
  { unique: true, partialFilterExpression: { phone: { $exists: true, $type: 'string' } } }
);
DriverSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { email: { $exists: true, $type: 'string' } } }
);

const StaffSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  roles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }]
}, { timestamps: true });

const AdminSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  roles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }]
}, { timestamps: true });

module.exports = {
  Role: mongoose.model('Role', RoleSchema),
  Permission: mongoose.model('Permission', PermissionSchema),
  Passenger: mongoose.model('Passenger', PassengerSchema),
  Driver: mongoose.model('Driver', DriverSchema),
  Staff: mongoose.model('Staff', StaffSchema),
  Admin: mongoose.model('Admin', AdminSchema)
};

