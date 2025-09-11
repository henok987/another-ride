// authController.js (User Service)
const jwt = require('jsonwebtoken');
const { models } = require('../models');
const { hashPassword, comparePassword } = require('../utils/password');
const { generateUserInfoToken } = require('../utils/jwt'); // This utility would also be part of User Service
const rateLimit = require('../middleware/rateLimit'); // Assuming rateLimit middleware is for User Service

// Ensure dotenv is configured for USER_SERVICE_JWT_SECRET
require('dotenv').config();

exports.registerPassenger = async (req, res) => {
  try {
    const { name, phone, email, password, emergencyContacts } = req.body;
    const exists = await models.Passenger.findOne({ where: { phone } });
    if (exists) return res.status(409).json({ message: 'Phone already registered' });
    const hashed = await hashPassword(password);
    const passenger = await models.Passenger.create({ name, phone, email, emergencyContacts, password: hashed });
    // Passenger starts with no specific roles, can be assigned later
    const token = generateUserInfoToken(passenger, 'passenger', [], []);
    return res.status(201).json({ token, passenger });
  } catch (e) {
    console.error('Error registering passenger:', e);
    return res.status(500).json({ message: e.message });
  }
};

exports.loginPassenger = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });
    const passenger = await models.Passenger.findOne({ where: { email }, include: ['roles'] });
    if (!passenger) return res.status(404).json({ message: 'Passenger not found' }); // More specific message
    const ok = await comparePassword(password, passenger.password);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
    const roleNames = (passenger.roles || []).map(r => r.name);
    const token = generateUserInfoToken(passenger, 'passenger', roleNames, []); // Permissions usually not directly on passenger
    return res.json({ token, passenger });
  } catch (e) {
    console.error('Error logging in passenger:', e);
    return res.status(500).json({ message: e.message });
  }
};

exports.registerDriver = async (req, res) => {
  try {
    const { name, phone, email, password } = req.body;
    const exists = await models.Driver.findOne({ where: { phone } });
    if (exists) return res.status(409).json({ message: 'Phone already registered' });
    const hashed = await hashPassword(password);
    const driver = await models.Driver.create({ name, phone, email, password: hashed, status: 'pending' }); // Drivers start as pending
    // Driver starts with no specific roles, can be assigned later
    const token = generateUserInfoToken(driver, 'driver', [], []);
    return res.status(201).json({ token, driver });
  } catch (e) {
    console.error('Error registering driver:', e);
    return res.status(500).json({ message: e.message });
  }
};

exports.loginDriver = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });
    const driver = await models.Driver.findOne({ where: { email }, include: ['roles'] });
    if (!driver) return res.status(404).json({ message: 'Driver not found' }); // More specific message
    const ok = await comparePassword(password, driver.password);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
    const roleNames = (driver.roles || []).map(r => r.name);
    const token = generateUserInfoToken(driver, 'driver', roleNames, []); // Permissions usually not directly on driver
    return res.json({ token, driver });
  } catch (e) {
    console.error('Error logging in driver:', e);
    return res.status(500).json({ message: e.message });
  }
};

exports.registerStaff = async (req, res) => {
  try {
    const { fullName, username, password } = req.body;
    const exists = await models.Staff.findOne({ where: { username } });
    if (exists) return res.status(409).json({ message: 'Username already exists' });
    const hashed = await hashPassword(password);
    const staff = await models.Staff.create({ fullName, username, password: hashed });
    // Staff starts with no specific roles, can be assigned later
    const token = generateUserInfoToken(staff, 'staff', [], []);
    return res.status(201).json({ token, staff });
  } catch (e) {
    console.error('Error registering staff:', e);
    return res.status(500).json({ message: e.message });
  }
};

exports.loginStaff = async (req, res) => {
  try {
    const { username, password } = req.body;
    const staff = await models.Staff.findOne({ where: { username }, include: [{ association: 'roles', include: ['permissions'] }] });
    if (!staff) return res.status(404).json({ message: 'Staff user not found' }); // More specific message
    const ok = await comparePassword(password, staff.password);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
    const roles = (staff.roles || []).map(r => r.name);
    const perms = Array.from(new Set((staff.roles || []).flatMap(r => (r.permissions || []).map(p => p.name))));
    const token = generateUserInfoToken(staff, 'staff', roles, perms);
    return res.json({ token, staff });
  } catch (e) {
    console.error('Error logging in staff:', e);
    return res.status(500).json({ message: e.message });
  }
};

exports.registerAdmin = async (req, res) => {
  try {
    const { fullName, username, password, email } = req.body; // Added email here
    const exists = await models.Admin.findOne({ where: { username } });
    if (exists) return res.status(409).json({ message: 'Username already exists' });
    const hashed = await hashPassword(password);
    const admin = await models.Admin.create({ fullName, username, password: hashed, email }); // Used email
    // Super admin gets empty permissions array to keep token short.
    // Assign a 'superadmin' role to the newly registered admin.
    const superAdminRole = await models.Role.findOne({ where: { name: 'superadmin' } });
    if (superAdminRole) {
      await admin.addRole(superAdminRole);
    } else {
      console.warn('Superadmin role not found. Please ensure it is created.');
    }

    const token = generateUserInfoToken(admin, 'admin', ['superadmin'], []);

    // Return clean admin object without sensitive information
    const cleanAdmin = {
      id: admin.id,
      fullName: admin.fullName,
      username: admin.username,
      email: admin.email,
      roles: ['superadmin'] // Just the role names
    };

    return res.status(201).json({ token, admin: cleanAdmin });
  } catch (e) {
    console.error('Error registering admin:', e);
    return res.status(500).json({ message: e.message });
  }
};

exports.loginAdmin = async (req, res) => {
  try {
    const { username, password } = req.body;
    const admin = await models.Admin.findOne({ where: { username }, include: [{ association: 'roles', include: ['permissions'] }] });
    if (!admin) return res.status(404).json({ message: 'Admin not found' }); // More specific message
    const ok = await comparePassword(password, admin.password);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
    const roles = (admin.roles || []).map(r => r.name);
    // For super admin, exclude permissions from token to keep it short
    // RBAC middleware will handle admin privileges based on type and roles
    const isSuperAdmin = roles.includes('superadmin');
    const token = generateUserInfoToken(admin, 'admin', roles, isSuperAdmin ? [] : Array.from(new Set((admin.roles || []).flatMap(r => (r.permissions || []).map(p => p.name)))));

    // Return clean admin object without detailed role/permission information
    const cleanAdmin = {
      id: admin.id,
      fullName: admin.fullName,
      username: admin.username,
      email: admin.email,
      roles: roles // Just the role names, not the full objects
    };

    return res.json({ token, admin: cleanAdmin });
  } catch (e) {
    console.error('Error logging in admin:', e);
    return res.status(500).json({ message: e.message });
  }
};