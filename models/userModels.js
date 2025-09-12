const mongoose = require('mongoose');

// Role and Permission schemas
const RoleSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true,
    enum: ['passenger', 'driver', 'staff', 'admin']
  },
  description: String,
  permissions: [{ type: String }]
}, { 
  timestamps: true,
  toJSON: { versionKey: false },
  toObject: { versionKey: false }
});

// Passenger Schema - Basic information for external access
const PassengerSchema = new mongoose.Schema({
  externalId: { type: String, index: true, unique: true },
  name: { type: String, required: true },
  phone: { type: String, index: true, unique: true, required: true },
  email: { type: String, index: true, unique: true, required: true },
  password: { type: String, required: true },
  profilePicture: String,
  emergencyContacts: [{ 
    name: String, 
    phone: String,
    relationship: String 
  }],
  preferences: {
    language: { type: String, default: 'en' },
    notifications: { type: Boolean, default: true }
  },
  isActive: { type: Boolean, default: true },
  lastLoginAt: Date,
  roles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }]
}, { 
  timestamps: true, 
  toJSON: { versionKey: false }, 
  toObject: { versionKey: false } 
});

// Driver Schema - Basic information for external access
const DriverSchema = new mongoose.Schema({
  externalId: { type: String, index: true, unique: true },
  name: { type: String, required: true },
  phone: { type: String, index: true, unique: true, required: true },
  email: { type: String, index: true, unique: true, required: true },
  password: { type: String, required: true },
  profilePicture: String,
  vehicleType: { 
    type: String, 
    enum: ['mini', 'sedan', 'van'], 
    default: 'mini' 
  },
  vehicleInfo: {
    plateNumber: String,
    model: String,
    color: String,
    year: Number
  },
  licenseInfo: {
    licenseNumber: String,
    expiryDate: Date,
    isVerified: { type: Boolean, default: false }
  },
  rating: { 
    type: Number, 
    default: 5.0, 
    min: 1, 
    max: 5 
  },
  ratingCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  lastLoginAt: Date,
  roles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }]
}, { 
  timestamps: true, 
  toJSON: { versionKey: false }, 
  toObject: { versionKey: false } 
});

// Staff Schema - Basic information for external access
const StaffSchema = new mongoose.Schema({
  externalId: { type: String, index: true, unique: true },
  fullName: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, index: true, unique: true, required: true },
  phone: { type: String, index: true, unique: true },
  password: { type: String, required: true },
  profilePicture: String,
  department: String,
  position: String,
  employeeId: { type: String, unique: true },
  isActive: { type: Boolean, default: true },
  lastLoginAt: Date,
  roles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }]
}, { 
  timestamps: true, 
  toJSON: { versionKey: false }, 
  toObject: { versionKey: false } 
});

// Admin Schema - Basic information for external access
const AdminSchema = new mongoose.Schema({
  externalId: { type: String, index: true, unique: true },
  fullName: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, index: true, unique: true, required: true },
  phone: { type: String, index: true, unique: true },
  password: { type: String, required: true },
  profilePicture: String,
  department: String,
  position: String,
  adminLevel: { 
    type: String, 
    enum: ['super', 'admin', 'manager'], 
    default: 'admin' 
  },
  isActive: { type: Boolean, default: true },
  lastLoginAt: Date,
  roles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }]
}, { 
  timestamps: true, 
  toJSON: { versionKey: false }, 
  toObject: { versionKey: false } 
});

// Transform functions to remove sensitive data and format for external access
PassengerSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    ret.id = String(ret._id);
    delete ret._id;
    delete ret.password;
    delete ret.__v;
    return ret;
  }
});

DriverSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    ret.id = String(ret._id);
    delete ret._id;
    delete ret.password;
    delete ret.__v;
    return ret;
  }
});

StaffSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    ret.id = String(ret._id);
    delete ret._id;
    delete ret.password;
    delete ret.__v;
    return ret;
  }
});

AdminSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    ret.id = String(ret._id);
    delete ret._id;
    delete ret.password;
    delete ret.__v;
    return ret;
  }
});

// Indexes for better performance
PassengerSchema.index({ externalId: 1 });
PassengerSchema.index({ phone: 1 });
PassengerSchema.index({ email: 1 });

DriverSchema.index({ externalId: 1 });
DriverSchema.index({ phone: 1 });
DriverSchema.index({ email: 1 });
DriverSchema.index({ vehicleType: 1 });

StaffSchema.index({ externalId: 1 });
StaffSchema.index({ username: 1 });
StaffSchema.index({ email: 1 });

AdminSchema.index({ externalId: 1 });
AdminSchema.index({ username: 1 });
AdminSchema.index({ email: 1 });

module.exports = {
  Role: mongoose.model('Role', RoleSchema),
  Passenger: mongoose.model('Passenger', PassengerSchema),
  Driver: mongoose.model('Driver', DriverSchema),
  Staff: mongoose.model('Staff', StaffSchema),
  Admin: mongoose.model('Admin', AdminSchema)
};