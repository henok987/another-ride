const jwt = require('jsonwebtoken');
const { hashPassword, comparePassword } = require('../utils/password');
const { Passenger, Driver, Staff, Admin } = require('../models/userModels');
require('dotenv').config();

function sign(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
}

exports.registerPassenger = async (req, res) => {
  try {
    const { name, phone, email, password, emergencyContacts } = req.body;
    const exists = await Passenger.findOne({ phone });
    if (exists) return res.status(409).json({ message: 'Phone already registered' });
    const hashed = await hashPassword(password);
    const passenger = await Passenger.create({ name, phone, email, emergencyContacts, password: hashed });
    const token = sign({ 
      id: passenger.id, 
      type: 'passenger', 
      roles: [], 
      permissions: [],
      name: passenger.name,
      phone: passenger.phone,
      email: passenger.email
    });
    return res.status(201).json({ token, passenger });
  } catch (e) { return res.status(500).json({ message: e.message }); }
}

exports.loginPassenger = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });
    const passenger = await Passenger.findOne({ email }).populate('roles');
    if (!passenger) return res.status(404).json({ message: 'Not found' });
    const ok = await comparePassword(password, passenger.password);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
    const roleNames = (passenger.roles || []).map(r => r.name);
    const token = sign({ 
      id: passenger.id, 
      type: 'passenger', 
      roles: roleNames, 
      permissions: [],
      name: passenger.name,
      phone: passenger.phone,
      email: passenger.email
    });
    return res.json({ token, passenger });
  } catch (e) { return res.status(500).json({ message: e.message }); }
}

exports.registerDriver = async (req, res) => {
  try {
    const { name, phone, email, password, vehicleType } = req.body;
    const exists = await Driver.findOne({ phone });
    if (exists) return res.status(409).json({ message: 'Phone already registered' });
    const hashed = await hashPassword(password);
    const driver = await Driver.create({ name, phone, email, vehicleType, password: hashed });
    const token = sign({ 
      id: driver.id, 
      type: 'driver', 
      roles: [], 
      permissions: [],
      name: driver.name,
      phone: driver.phone,
      email: driver.email,
      vehicleType: driver.vehicleType
    });
    return res.status(201).json({ token, driver });
  } catch (e) { return res.status(500).json({ message: e.message }); }
}

exports.loginDriver = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });
    const driver = await Driver.findOne({ email }).populate('roles');
    if (!driver) return res.status(404).json({ message: 'Not found' });
    const ok = await comparePassword(password, driver.password);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
    const roleNames = (driver.roles || []).map(r => r.name);
    const token = sign({ 
      id: driver.id, 
      type: 'driver', 
      roles: roleNames, 
      permissions: [],
      name: driver.name,
      phone: driver.phone,
      email: driver.email,
      vehicleType: driver.vehicleType
    });
    return res.json({ token, driver });
  } catch (e) { return res.status(500).json({ message: e.message }); }
}

exports.registerStaff = async (req, res) => {
  try {
    const { fullName, username, password } = req.body;
    const exists = await Staff.findOne({ username });
    if (exists) return res.status(409).json({ message: 'Username already exists' });
    const hashed = await hashPassword(password);
    const staff = await Staff.create({ fullName, username, password: hashed });
    const token = sign({ id: staff.id, type: 'staff', roles: [], permissions: [] });
    return res.status(201).json({ token, staff });
  } catch (e) { return res.status(500).json({ message: e.message }); }
}

exports.loginStaff = async (req, res) => {
  try {
    const { username, password } = req.body;
    const staff = await Staff.findOne({ username }).populate({ path: 'roles' });
    if (!staff) return res.status(404).json({ message: 'Not found' });
    const ok = await comparePassword(password, staff.password);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
    const roles = (staff.roles || []).map(r => r.name);
    const perms = []; // extend if permission documents used
    const token = sign({ id: staff.id, type: 'staff', roles, permissions: perms });
    return res.json({ token, staff });
  } catch (e) { return res.status(500).json({ message: e.message }); }
}

exports.registerAdmin = async (req, res) => {
  try {
    const { fullName, username, password } = req.body;
    const exists = await Admin.findOne({ username });
    if (exists) return res.status(409).json({ message: 'Username already exists' });
    const hashed = await hashPassword(password);
    const admin = await Admin.create({ fullName, username, password: hashed });
    const token = sign({ id: admin.id, type: 'admin', roles: ['superadmin'], permissions: [] });
    return res.status(201).json({ token, admin });
  } catch (e) { return res.status(500).json({ message: e.message }); }
}

exports.loginAdmin = async (req, res) => {
  try {
    const { username, password } = req.body;
    const admin = await Admin.findOne({ username }).populate({ path: 'roles' });
    if (!admin) return res.status(404).json({ message: 'Not found' });
    const ok = await comparePassword(password, admin.password);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
    const roles = (admin.roles || []).map(r => r.name);
    const perms = [];
    const token = sign({ id: admin.id, type: 'admin', roles, permissions: perms });
    return res.json({ token, admin });
  } catch (e) { return res.status(500).json({ message: e.message }); }
}

