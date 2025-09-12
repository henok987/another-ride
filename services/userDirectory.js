const axios = require('axios');
const httpClient = axios.create();

function buildUrlFromTemplate(template, params) {
  if (!template) return null;
  return Object.keys(params || {}).reduce((acc, key) => acc.replace(new RegExp(`{${key}}`, 'g'), encodeURIComponent(String(params[key]))), template);
}

async function safeData(res) {
  try { return res && res.data != null ? res.data : null; } catch (_) { return null; }
}

// Local models for optional enrichment/persistence
let PassengerModel, DriverModel, StaffModel, AdminModel;
try {
  const models = require('../models/userModels');
  PassengerModel = models.Passenger;
  DriverModel = models.Driver;
  StaffModel = models.Staff;
  AdminModel = models.Admin;
} catch (_) { /* optional */ }

async function getPassengerById(passengerId, options = undefined) {
  try {
    const template = process.env.PASSENGER_LOOKUP_URL_TEMPLATE; // e.g. https://authservice.../api/passengers/{id}
    if (!template || !passengerId) return null;

    // Try local first if model available
    if (PassengerModel) {
      try {
        const local = await PassengerModel.findById(passengerId).lean();
        if (local && (local.name || local.phone)) {
          return { id: String(local._id), name: local.name, phone: local.phone, email: local.email };
        }
      } catch (_) {}
    }

    const url = buildUrlFromTemplate(template, { id: passengerId });
    const headers = { 'Accept': 'application/json' };
    const authHeader = options && options.headers && options.headers.Authorization ? options.headers.Authorization : undefined;
    if (authHeader) headers['Authorization'] = authHeader;
    else if (process.env.AUTH_SERVICE_BEARER) headers['Authorization'] = `Bearer ${process.env.AUTH_SERVICE_BEARER}`;
    const res = await httpClient.get(url, { headers });
    const data = await safeData(res);
    if (!data) return null;
    // Try common shapes
    const candidate = data.data || data.user || data.passenger || data.account || data;
    const name = candidate.name || candidate.fullName || candidate.fullname || (candidate.profile && candidate.profile.name) || undefined;
    const phone = candidate.phone || candidate.phoneNumber || candidate.mobile || candidate.msisdn || (candidate.contact && candidate.contact.phone) || (candidate.profile && candidate.profile.phone) || undefined;
    const email = candidate.email || (candidate.profile && candidate.profile.email) || undefined;

    // Upsert locally if model is available
    if (PassengerModel) {
      try {
        await PassengerModel.findOneAndUpdate(
          { _id: String(passengerId) },
          { name, phone, email, externalId: String(passengerId) },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      } catch (_) {}
    }
    return { id: String(passengerId), name, phone, email };
  } catch (_) { return null; }
}

module.exports = { getPassengerById };

async function getDriverById(driverId, options = undefined) {
  try {
    let template = process.env.DRIVER_LOOKUP_URL_TEMPLATE; // e.g. https://authservice.../api/drivers/{id}
    if (!template && process.env.AUTH_BASE_URL) {
      const base = process.env.AUTH_BASE_URL.replace(/\/$/, '');
      template = `${base}/drivers/{id}`;
    }
    if (!template || !driverId) return null;
    const url = buildUrlFromTemplate(template, { id: driverId });
    const headers = { 'Accept': 'application/json' };
    const authHeader = options && options.headers && options.headers.Authorization ? options.headers.Authorization : undefined;
    if (authHeader) headers['Authorization'] = authHeader;
    else if (process.env.AUTH_SERVICE_BEARER) headers['Authorization'] = `Bearer ${process.env.AUTH_SERVICE_BEARER}`;
    const res = await httpClient.get(url, { headers });
    const data = await safeData(res);
    if (!data) return null;
    const candidate = data.data || data.user || data.driver || data.account || data;
    const name = candidate.name || candidate.fullName || candidate.fullname || (candidate.profile && candidate.profile.name) || undefined;
    const phone = candidate.phone || candidate.phoneNumber || candidate.mobile || candidate.msisdn || (candidate.contact && candidate.contact.phone) || (candidate.profile && candidate.profile.phone) || undefined;
    const email = candidate.email || (candidate.profile && candidate.profile.email) || undefined;

    // Upsert locally if model available
    if (DriverModel) {
      try {
        await DriverModel.findOneAndUpdate(
          { _id: String(driverId) },
          { name, phone, email, externalId: String(driverId) },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      } catch (_) {}
    }
    return { id: String(driverId), name, phone, email };
  } catch (_) { return null; }
}

module.exports.getDriverById = getDriverById;

async function getDriversByIds(ids = [], options = undefined) {
  try {
    const base = process.env.AUTH_BASE_URL;
    if (!base || !Array.isArray(ids) || ids.length === 0) return [];
    const url = `${base.replace(/\/$/, '')}/drivers/batch`;
    const headers = { 'Accept': 'application/json', 'Content-Type': 'application/json' };
    const authHeader = options && options.headers && options.headers.Authorization ? options.headers.Authorization : undefined;
    if (authHeader) headers['Authorization'] = authHeader;
    else if (process.env.AUTH_SERVICE_BEARER) headers['Authorization'] = `Bearer ${process.env.AUTH_SERVICE_BEARER}`;
    const res = await httpClient.post(url, { ids }, { headers });
    const data = await safeData(res);
    const arr = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
    return arr.map(u => ({ id: String(u.id || u._id || ''), name: u.name || u.fullName, phone: u.phone || u.msisdn }));
  } catch (_) {
    // Fallback to per-id
    const results = await Promise.all((ids || []).map(id => getDriverById(id, options)));
    return results.filter(Boolean);
  }
}

module.exports.getDriversByIds = getDriversByIds;

async function listPassengers(query = {}, options = undefined) {
  try {
    const base = process.env.AUTH_BASE_URL;
    if (!base) return [];
    const url = new URL(`${base.replace(/\/$/, '')}/passengers`);
    Object.entries(query).forEach(([k, v]) => { if (v != null) url.searchParams.set(k, v); });
    const headers = { 'Accept': 'application/json' };
    const authHeader = options && options.headers && options.headers.Authorization ? options.headers.Authorization : undefined;
    if (authHeader) headers['Authorization'] = authHeader;
    else if (process.env.AUTH_SERVICE_BEARER) headers['Authorization'] = `Bearer ${process.env.AUTH_SERVICE_BEARER}`;
    const res = await httpClient.get(url.toString(), { headers });
    const data = await safeData(res);
    const arr = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
    return arr.map(u => ({ id: String(u.id || u._id || u.userId || ''), name: u.name || u.fullName, phone: u.phone || u.msisdn }));
  } catch (_) { return []; }
}

async function listDrivers(query = {}, options = undefined) {
  try {
    const base = process.env.AUTH_BASE_URL;
    if (!base) return [];
    const url = new URL(`${base.replace(/\/$/, '')}/drivers`);
    Object.entries(query).forEach(([k, v]) => { if (v != null) url.searchParams.set(k, v); });
    const headers = { 'Accept': 'application/json' };
    const authHeader = options && options.headers && options.headers.Authorization ? options.headers.Authorization : undefined;
    if (authHeader) headers['Authorization'] = authHeader;
    else if (process.env.AUTH_SERVICE_BEARER) headers['Authorization'] = `Bearer ${process.env.AUTH_SERVICE_BEARER}`;
    const res = await httpClient.get(url.toString(), { headers });
    const data = await safeData(res);
    const arr = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
    return arr.map(u => ({ id: String(u.id || u._id || u.userId || ''), name: u.name || u.fullName, phone: u.phone || u.msisdn }));
  } catch (_) { return []; }
}

module.exports.listPassengers = listPassengers;
module.exports.listDrivers = listDrivers;

async function getStaffById(staffId) {
  try {
    const base = process.env.AUTH_BASE_URL;
    if (!base || !staffId) return null;
    const url = `${base.replace(/\/$/, '')}/staff/${encodeURIComponent(String(staffId))}`;
    const headers = { 'Accept': 'application/json' };
    if (process.env.AUTH_SERVICE_BEARER) headers['Authorization'] = `Bearer ${process.env.AUTH_SERVICE_BEARER}`;
    const res = await httpClient.get(url, { headers });
    const data = await safeData(res);
    const u = data?.data || data || {};
    return { id: String(u.id || u._id || staffId), name: u.name || u.fullName, phone: u.phone || u.msisdn };
  } catch (_) { return null; }
}

async function listStaff(query = {}) {
  try {
    const base = process.env.AUTH_BASE_URL;
    if (!base) return [];
    const url = new URL(`${base.replace(/\/$/, '')}/staff`);
    Object.entries(query).forEach(([k, v]) => { if (v != null) url.searchParams.set(k, v); });
    const headers = { 'Accept': 'application/json' };
    if (process.env.AUTH_SERVICE_BEARER) headers['Authorization'] = `Bearer ${process.env.AUTH_SERVICE_BEARER}`;
    const res = await httpClient.get(url.toString(), { headers });
    const data = await safeData(res);
    const arr = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
    return arr.map(u => ({ id: String(u.id || u._id || ''), name: u.name || u.fullName, phone: u.phone || u.msisdn }));
  } catch (_) { return []; }
}

async function getAdminById(adminId) {
  try {
    const base = process.env.AUTH_BASE_URL;
    if (!base || !adminId) return null;
    const url = `${base.replace(/\/$/, '')}/admins/${encodeURIComponent(String(adminId))}`;
    const headers = { 'Accept': 'application/json' };
    if (process.env.AUTH_SERVICE_BEARER) headers['Authorization'] = `Bearer ${process.env.AUTH_SERVICE_BEARER}`;
    const res = await httpClient.get(url, { headers });
    const data = await safeData(res);
    const u = data?.data || data || {};
    return { id: String(u.id || u._id || adminId), name: u.name || u.fullName, phone: u.phone || u.msisdn };
  } catch (_) { return null; }
}

async function listAdmins(query = {}) {
  try {
    const base = process.env.AUTH_BASE_URL;
    if (!base) return [];
    const url = new URL(`${base.replace(/\/$/, '')}/admins`);
    Object.entries(query).forEach(([k, v]) => { if (v != null) url.searchParams.set(k, v); });
    const headers = { 'Accept': 'application/json' };
    if (process.env.AUTH_SERVICE_BEARER) headers['Authorization'] = `Bearer ${process.env.AUTH_SERVICE_BEARER}`;
    const res = await httpClient.get(url.toString(), { headers });
    const data = await safeData(res);
    const arr = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
    return arr.map(u => ({ id: String(u.id || u._id || ''), name: u.name || u.fullName, phone: u.phone || u.msisdn }));
  } catch (_) { return []; }
}

module.exports.getStaffById = getStaffById;
module.exports.listStaff = listStaff;
module.exports.getAdminById = getAdminById;
module.exports.listAdmins = listAdmins;


