let fetchFn = typeof fetch === 'function' ? fetch : null;
if (!fetchFn) {
  try { fetchFn = require('node-fetch'); } catch (_) { /* ignore */ }
}

function buildUrlFromTemplate(template, params) {
  if (!template) return null;
  return Object.keys(params || {}).reduce((acc, key) => acc.replace(new RegExp(`{${key}}`, 'g'), encodeURIComponent(String(params[key]))), template);
}

async function safeJson(res) {
  try { return await res.json(); } catch (_) { return null; }
}

async function getPassengerById(passengerId) {
  try {
    const template = process.env.PASSENGER_LOOKUP_URL_TEMPLATE; // e.g. https://authservice.../api/passengers/{id}
    if (!fetchFn || !template || !passengerId) return null;
    const url = buildUrlFromTemplate(template, { id: passengerId });
    const headers = { 'Accept': 'application/json' };
    if (process.env.AUTH_SERVICE_BEARER) headers['Authorization'] = `Bearer ${process.env.AUTH_SERVICE_BEARER}`;
    const res = await fetchFn(url, { headers });
    if (!res.ok) return null;
    const data = await safeJson(res);
    if (!data) return null;
    // Try common shapes
    const candidate = data.data || data.user || data.passenger || data.account || data;
    const name = candidate.name || candidate.fullName || candidate.fullname || (candidate.profile && candidate.profile.name) || undefined;
    const phone = candidate.phone || candidate.phoneNumber || candidate.mobile || candidate.msisdn || (candidate.contact && candidate.contact.phone) || (candidate.profile && candidate.profile.phone) || undefined;
    return { id: passengerId, name, phone };
  } catch (_) { return null; }
}

module.exports = { getPassengerById };

async function getDriverById(driverId) {
  try {
    const template = process.env.DRIVER_LOOKUP_URL_TEMPLATE; // e.g. https://authservice.../api/drivers/{id}
    if (!fetchFn || !template || !driverId) return null;
    const url = buildUrlFromTemplate(template, { id: driverId });
    const headers = { 'Accept': 'application/json' };
    if (process.env.AUTH_SERVICE_BEARER) headers['Authorization'] = `Bearer ${process.env.AUTH_SERVICE_BEARER}`;
    const res = await fetchFn(url, { headers });
    if (!res.ok) return null;
    const data = await safeJson(res);
    if (!data) return null;
    const candidate = data.data || data.user || data.driver || data.account || data;
    const name = candidate.name || candidate.fullName || candidate.fullname || (candidate.profile && candidate.profile.name) || undefined;
    const phone = candidate.phone || candidate.phoneNumber || candidate.mobile || candidate.msisdn || (candidate.contact && candidate.contact.phone) || (candidate.profile && candidate.profile.phone) || undefined;
    return { id: driverId, name, phone };
  } catch (_) { return null; }
}

module.exports.getDriverById = getDriverById;

async function listPassengers(query = {}) {
  try {
    const base = process.env.AUTH_BASE_URL;
    if (!fetchFn || !base) return [];
    const url = new URL(`${base.replace(/\/$/, '')}/passengers`);
    Object.entries(query).forEach(([k, v]) => { if (v != null) url.searchParams.set(k, v); });
    const headers = { 'Accept': 'application/json' };
    if (process.env.AUTH_SERVICE_BEARER) headers['Authorization'] = `Bearer ${process.env.AUTH_SERVICE_BEARER}`;
    const res = await fetchFn(url.toString(), { headers });
    if (!res.ok) return [];
    const data = await safeJson(res);
    const arr = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
    return arr.map(u => ({ id: String(u.id || u._id || u.userId || ''), name: u.name || u.fullName, phone: u.phone || u.msisdn }));
  } catch (_) { return []; }
}

async function listDrivers(query = {}) {
  try {
    const base = process.env.AUTH_BASE_URL;
    if (!fetchFn || !base) return [];
    const url = new URL(`${base.replace(/\/$/, '')}/drivers`);
    Object.entries(query).forEach(([k, v]) => { if (v != null) url.searchParams.set(k, v); });
    const headers = { 'Accept': 'application/json' };
    if (process.env.AUTH_SERVICE_BEARER) headers['Authorization'] = `Bearer ${process.env.AUTH_SERVICE_BEARER}`;
    const res = await fetchFn(url.toString(), { headers });
    if (!res.ok) return [];
    const data = await safeJson(res);
    const arr = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
    return arr.map(u => ({ id: String(u.id || u._id || u.userId || ''), name: u.name || u.fullName, phone: u.phone || u.msisdn }));
  } catch (_) { return []; }
}

module.exports.listPassengers = listPassengers;
module.exports.listDrivers = listDrivers;

async function getStaffById(staffId) {
  try {
    const base = process.env.AUTH_BASE_URL;
    if (!fetchFn || !base || !staffId) return null;
    const url = `${base.replace(/\/$/, '')}/staff/${encodeURIComponent(String(staffId))}`;
    const headers = { 'Accept': 'application/json' };
    if (process.env.AUTH_SERVICE_BEARER) headers['Authorization'] = `Bearer ${process.env.AUTH_SERVICE_BEARER}`;
    const res = await fetchFn(url, { headers });
    if (!res.ok) return null;
    const data = await safeJson(res);
    const u = data?.data || data || {};
    return { id: String(u.id || u._id || staffId), name: u.name || u.fullName, phone: u.phone || u.msisdn };
  } catch (_) { return null; }
}

async function listStaff(query = {}) {
  try {
    const base = process.env.AUTH_BASE_URL;
    if (!fetchFn || !base) return [];
    const url = new URL(`${base.replace(/\/$/, '')}/staff`);
    Object.entries(query).forEach(([k, v]) => { if (v != null) url.searchParams.set(k, v); });
    const headers = { 'Accept': 'application/json' };
    if (process.env.AUTH_SERVICE_BEARER) headers['Authorization'] = `Bearer ${process.env.AUTH_SERVICE_BEARER}`;
    const res = await fetchFn(url.toString(), { headers });
    if (!res.ok) return [];
    const data = await safeJson(res);
    const arr = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
    return arr.map(u => ({ id: String(u.id || u._id || ''), name: u.name || u.fullName, phone: u.phone || u.msisdn }));
  } catch (_) { return []; }
}

async function getAdminById(adminId) {
  try {
    const base = process.env.AUTH_BASE_URL;
    if (!fetchFn || !base || !adminId) return null;
    const url = `${base.replace(/\/$/, '')}/admins/${encodeURIComponent(String(adminId))}`;
    const headers = { 'Accept': 'application/json' };
    if (process.env.AUTH_SERVICE_BEARER) headers['Authorization'] = `Bearer ${process.env.AUTH_SERVICE_BEARER}`;
    const res = await fetchFn(url, { headers });
    if (!res.ok) return null;
    const data = await safeJson(res);
    const u = data?.data || data || {};
    return { id: String(u.id || u._id || adminId), name: u.name || u.fullName, phone: u.phone || u.msisdn };
  } catch (_) { return null; }
}

async function listAdmins(query = {}) {
  try {
    const base = process.env.AUTH_BASE_URL;
    if (!fetchFn || !base) return [];
    const url = new URL(`${base.replace(/\/$/, '')}/admins`);
    Object.entries(query).forEach(([k, v]) => { if (v != null) url.searchParams.set(k, v); });
    const headers = { 'Accept': 'application/json' };
    if (process.env.AUTH_SERVICE_BEARER) headers['Authorization'] = `Bearer ${process.env.AUTH_SERVICE_BEARER}`;
    const res = await fetchFn(url.toString(), { headers });
    if (!res.ok) return [];
    const data = await safeJson(res);
    const arr = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
    return arr.map(u => ({ id: String(u.id || u._id || ''), name: u.name || u.fullName, phone: u.phone || u.msisdn }));
  } catch (_) { return []; }
}

module.exports.getStaffById = getStaffById;
module.exports.listStaff = listStaff;
module.exports.getAdminById = getAdminById;
module.exports.listAdmins = listAdmins;


