const jwt = require('jsonwebtoken');
const { models } = require('../models');
const { hashPassword, comparePassword } = require('../utils/password');
const rateLimit = require('../middleware/rateLimit');
require('dotenv').config();

function sign(payload) {
return jwt.sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
}

exports.registerPassenger = async (req, res) => {
try {
const { name, phone, email, password, emergencyContacts } = req.body;
const exists = await models.Passenger.findOne({ where: { phone } });
if (exists) return res.status(409).json({ message: 'Phone already registered' });
const hashed = await hashPassword(password);
const passenger = await models.Passenger.create({ name, phone, email, emergencyContacts, password: hashed });
const token = sign({ id: passenger.id, type: 'passenger', roles: [], permissions: [] });
return res.status(201).json({ token, passenger });
} catch (e) { return res.status(500).json({ message: e.message }); }
}

exports.loginPassenger = async (req, res) => {
try {
const { email, password } = req.body;
if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });
const passenger = await models.Passenger.findOne({ where: { email }, include: ['roles'] });
if (!passenger) return res.status(404).json({ message: 'Not found' });
const ok = await comparePassword(password, passenger.password);
if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
const roleNames = (passenger.roles || []).map(r => r.name);
const token = sign({ id: passenger.id, type: 'passenger', roles: roleNames, permissions: [] });
return res.json({ token, passenger });
} catch (e) { return res.status(500).json({ message: e.message }); }
}

exports.registerDriver = async (req, res) => {
try {
const { name, phone, email, password } = req.body;
const exists = await models.Driver.findOne({ where: { phone } });
if (exists) return res.status(409).json({ message: 'Phone already registered' });
const hashed = await hashPassword(password);
const driver = await models.Driver.create({ name, phone, email, password: hashed });
const token = sign({ id: driver.id, type: 'driver', roles: [], permissions: [] });
return res.status(201).json({ token, driver });
} catch (e) { return res.status(500).json({ message: e.message }); }
}

exports.loginDriver = async (req, res) => {
try {
const { email, password } = req.body;
if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });
const driver = await models.Driver.findOne({ where: { email }, include: ['roles'] });
if (!driver) return res.status(404).json({ message: 'Not found' });
const ok = await comparePassword(password, driver.password);
if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
const roleNames = (driver.roles || []).map(r => r.name);
const token = sign({ id: driver.id, type: 'driver', roles: roleNames, permissions: [] });
return res.json({ token, driver });
} catch (e) { return res.status(500).json({ message: e.message }); }
}

exports.registerStaff = async (req, res) => {
try {
const { fullName, username, password } = req.body;
const exists = await models.Staff.findOne({ where: { username } });
if (exists) return res.status(409).json({ message: 'Username already exists' });
const hashed = await hashPassword(password);
const staff = await models.Staff.create({ fullName, username, password: hashed });
const token = sign({ id: staff.id, type: 'staff', roles: [], permissions: [] });
return res.status(201).json({ token, staff });
} catch (e) { return res.status(500).json({ message: e.message }); }
}

exports.loginStaff = async (req, res) => {
try {
const { username, password } = req.body;
const staff = await models.Staff.findOne({ where: { username }, include: [{ association: 'roles', include: ['permissions'] }] });
if (!staff) return res.status(404).json({ message: 'Not found' });
const ok = await comparePassword(password, staff.password);
if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
const roles = (staff.roles || []).map(r => r.name);
const perms = Array.from(new Set((staff.roles || []).flatMap(r => (r.permissions || []).map(p => p.name))));
const token = sign({ id: staff.id, type: 'staff', roles, permissions: perms });
return res.json({ token, staff });
} catch (e) { return res.status(500).json({ message: e.message }); }
}

exports.registerAdmin = async (req, res) => {
try {
const { fullName, username, password } = req.body;
const exists = await models.Admin.findOne({ where: { username } });
if (exists) return res.status(409).json({ message: 'Username already exists' });
const hashed = await hashPassword(password);
const admin = await models.Admin.create({ fullName, username, password: hashed });
// Super admin gets empty permissions array to keep token short
const token = sign({ id: admin.id, type: 'admin', roles: ['superadmin'], permissions: [] });

// Return clean admin object without sensitive information
const cleanAdmin = {
  id: admin.id,
  fullName: admin.fullName,
  username: admin.username,
  email: admin.email,
  roles: ['superadmin']
};

return res.status(201).json({ token, admin: cleanAdmin });
} catch (e) { return res.status(500).json({ message: e.message }); }
}

exports.loginAdmin = async (req, res) => {
try {
const { username, password } = req.body;
const admin = await models.Admin.findOne({ where: { username }, include: [{ association: 'roles', include: ['permissions'] }] });
if (!admin) return res.status(404).json({ message: 'Not found' });
const ok = await comparePassword(password, admin.password);
if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
const roles = (admin.roles || []).map(r => r.name);
// For super admin, exclude permissions from token to keep it short
// RBAC middleware will handle admin privileges based on type and roles
const isSuperAdmin = roles.includes('superadmin');
const token = sign({ 
  id: admin.id, 
  type: 'admin', 
  roles, 
  permissions: isSuperAdmin ? [] : Array.from(new Set((admin.roles || []).flatMap(r => (r.permissions || []).map(p => p.name))))
});

// Return clean admin object without detailed role/permission information
const cleanAdmin = {
  id: admin.id,
  fullName: admin.fullName,
  username: admin.username,
  email: admin.email,
  roles: roles // Just the role names, not the full objects
};

return res.json({ token, admin: cleanAdmin });
} catch (e) { return res.status(500).json({ message: e.message }); }
}


